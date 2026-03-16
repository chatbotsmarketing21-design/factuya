from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse
from typing import List, Optional
from models.invoice import InvoiceCreate, InvoiceUpdate, InvoiceInDB, InvoiceListItem, InvoiceStats, AddPaymentRequest
from utils.auth import get_current_user_id
from utils.subscription_check import check_can_create_invoice, increment_trial_invoice_count
import os
import uuid
import base64
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)

# PDF storage directory
PDF_STORAGE_DIR = ROOT_DIR / "pdf_storage"
PDF_STORAGE_DIR.mkdir(exist_ok=True)
db = client[os.environ['DB_NAME']]

# Document type prefixes
DOCUMENT_PREFIXES = {
    "invoice": "FAC",
    "proforma": "PRO", 
    "quotation": "COT",
    "receipt": "REC",
    "bill": "COB"
}

@router.get("/next-number/{document_type}")
async def get_next_invoice_number(
    document_type: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get the next invoice number for a document type"""
    # Validate document type
    if document_type not in DOCUMENT_PREFIXES:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    prefix = DOCUMENT_PREFIXES[document_type]
    
    # Find or create counter for this user and document type
    counter = await db.invoice_counters.find_one({
        "userId": user_id,
        "documentType": document_type
    })
    
    if counter:
        next_number = counter["lastNumber"] + 1
    else:
        # Check if user has existing invoices of this type to continue sequence
        existing = await db.invoices.find({
            "userId": user_id,
            "documentType": document_type
        }).sort("createdAt", -1).limit(1).to_list(1)
        
        if existing and existing[0].get("number", "").startswith(prefix):
            # Extract number from existing invoice
            try:
                last_num = int(existing[0]["number"].split("-")[1])
                next_number = last_num + 1
            except:
                next_number = 1
        else:
            next_number = 1
    
    # Format number with leading zeros (001, 002, etc.)
    formatted_number = f"{prefix}-{next_number:03d}"
    
    return {
        "number": formatted_number,
        "nextSequence": next_number,
        "prefix": prefix,
        "documentType": document_type
    }

@router.get("", response_model=List[InvoiceListItem])
async def get_invoices(
    user_id: str = Depends(get_current_user_id),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get all invoices for current user"""
    query = {"userId": user_id}
    
    # Add search filter
    if search:
        query["$or"] = [
            {"number": {"$regex": search, "$options": "i"}},
            {"to.name": {"$regex": search, "$options": "i"}}
        ]
    
    # Add status filter
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query).sort("createdAt", -1).to_list(1000)
    
    # Transform to list items
    result = []
    for inv in invoices:
        total_paid = inv.get("totalPaid", 0)
        total = inv.get("total", 0)
        balance = inv.get("balance", total - total_paid if total_paid > 0 else None)
        
        result.append(InvoiceListItem(
            id=inv["id"],
            number=inv["number"],
            clientName=inv["to"]["name"],
            date=inv["date"],
            dueDate=inv["dueDate"],
            total=inv["total"],
            status=inv["status"],
            createdAt=inv["createdAt"],
            totalPaid=total_paid,
            balance=balance,
            documentType=inv.get("documentType", "invoice")
        ))
    
    return result

@router.get("/stats", response_model=InvoiceStats)
async def get_invoice_stats(user_id: str = Depends(get_current_user_id)):
    """Get invoice statistics for current user"""
    invoices = await db.invoices.find({"userId": user_id}).to_list(1000)
    
    # Solo sumar ingresos de facturas pagadas
    total_revenue = sum(inv["total"] for inv in invoices if inv["status"] == "paid")
    total_invoices = len(invoices)
    paid_invoices = len([inv for inv in invoices if inv["status"] == "paid"])
    pending_invoices = len([inv for inv in invoices if inv["status"] == "pending"])
    draft_invoices = len([inv for inv in invoices if inv["status"] == "draft"])
    overdue_invoices = len([inv for inv in invoices if inv["status"] == "overdue"])
    
    return InvoiceStats(
        totalRevenue=total_revenue,
        totalInvoices=total_invoices,
        paidInvoices=paid_invoices,
        pendingInvoices=pending_invoices,
        draftInvoices=draft_invoices,
        overdueInvoices=overdue_invoices
    )

@router.get("/{invoice_id}", response_model=InvoiceInDB)
async def get_invoice(
    invoice_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return InvoiceInDB(**invoice)

@router.post("", response_model=InvoiceInDB)
async def create_invoice(
    invoice: InvoiceCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new invoice"""
    # Check if user can create invoice
    can_create, message = await check_can_create_invoice(user_id, db)
    
    if not can_create:
        raise HTTPException(
            status_code=403, 
            detail=message
        )
    
    # Get user's company info as default "from" address
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create invoice
    invoice_dict = invoice.dict(by_alias=True)
    invoice_dict["userId"] = user_id
    
    # Update counter for this document type
    document_type = invoice_dict.get("documentType", "invoice")
    if document_type in DOCUMENT_PREFIXES:
        prefix = DOCUMENT_PREFIXES[document_type]
        invoice_number = invoice_dict.get("number", "")
        
        # Extract sequence number from invoice number
        if invoice_number.startswith(prefix):
            try:
                sequence = int(invoice_number.split("-")[1])
                # Update or create counter
                await db.invoice_counters.update_one(
                    {"userId": user_id, "documentType": document_type},
                    {"$set": {"lastNumber": sequence, "updatedAt": datetime.utcnow()}},
                    upsert=True
                )
            except:
                pass
    
    invoice_in_db = InvoiceInDB(**invoice_dict)
    await db.invoices.insert_one(invoice_in_db.dict(by_alias=True))
    
    # Increment trial count if applicable
    await increment_trial_invoice_count(user_id, db)
    
    return invoice_in_db

@router.put("/{invoice_id}", response_model=InvoiceInDB)
async def update_invoice(
    invoice_id: str,
    invoice: InvoiceUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update an invoice"""
    # Check if invoice exists and belongs to user
    existing = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update invoice
    invoice_dict = invoice.dict(by_alias=True)
    invoice_dict["updatedAt"] = datetime.utcnow()
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": invoice_dict}
    )
    
    # Get updated invoice
    updated = await db.invoices.find_one({"id": invoice_id})
    return InvoiceInDB(**updated)

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete an invoice"""
    # Check if invoice exists and belongs to user
    existing = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete invoice
    await db.invoices.delete_one({"id": invoice_id})
    
    return {"message": "Invoice deleted successfully"}


@router.post("/upload-pdf")
async def upload_pdf(
    pdf_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Upload a PDF and return a shareable URL"""
    try:
        # Get base64 PDF data
        base64_pdf = pdf_data.get("pdf")
        invoice_number = pdf_data.get("invoiceNumber", "factura")
        
        if not base64_pdf:
            raise HTTPException(status_code=400, detail="No PDF data provided")
        
        # Remove data URL prefix if present
        if "," in base64_pdf:
            base64_pdf = base64_pdf.split(",")[1]
        
        # Decode base64 to binary
        pdf_binary = base64.b64decode(base64_pdf)
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{invoice_number}_{unique_id}.pdf"
        filepath = PDF_STORAGE_DIR / filename
        
        # Save PDF file
        with open(filepath, "wb") as f:
            f.write(pdf_binary)
        
        # Store metadata in database for cleanup later
        await db.pdf_files.insert_one({
            "userId": user_id,
            "filename": filename,
            "createdAt": datetime.utcnow(),
            "expiresAt": datetime.utcnow() + timedelta(days=7)  # Expires in 7 days
        })
        
        return {"filename": filename}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")

@router.get("/pdf/{filename}")
async def get_pdf(filename: str):
    """Get a PDF file for sharing"""
    filepath = PDF_STORAGE_DIR / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename
    )


# ==================== ENDPOINTS DE ABONOS ====================

@router.post("/{invoice_id}/payments")
async def add_payment(
    invoice_id: str,
    payment: AddPaymentRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Agregar un abono/pago parcial a una factura"""
    # Buscar la factura
    invoice = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # No permitir abonos en cotizaciones
    if invoice.get("documentType") == "quotation":
        raise HTTPException(status_code=400, detail="Las cotizaciones no pueden tener abonos")
    
    # Crear el registro de pago
    payment_record = {
        "id": str(uuid.uuid4()),
        "amount": payment.amount,
        "date": payment.date or datetime.now().strftime("%Y-%m-%d"),
        "note": payment.note,
        "createdAt": datetime.now()
    }
    
    # Obtener pagos existentes
    existing_payments = invoice.get("payments", [])
    existing_payments.append(payment_record)
    
    # Calcular total pagado
    total_paid = sum(p.get("amount", 0) for p in existing_payments)
    total = invoice.get("total", 0)
    balance = total - total_paid
    
    # Determinar el nuevo estado
    if balance <= 0:
        new_status = "paid"
        balance = 0
    else:
        new_status = "partial"
    
    # Actualizar la factura
    await db.invoices.update_one(
        {"id": invoice_id, "userId": user_id},
        {
            "$set": {
                "payments": existing_payments,
                "totalPaid": total_paid,
                "balance": balance,
                "status": new_status,
                "updatedAt": datetime.now()
            }
        }
    )
    
    return {
        "message": "Abono registrado exitosamente",
        "payment": payment_record,
        "totalPaid": total_paid,
        "balance": balance,
        "status": new_status
    }

@router.get("/{invoice_id}/payments")
async def get_payments(
    invoice_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Obtener historial de abonos de una factura"""
    invoice = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    payments = invoice.get("payments", [])
    total_paid = invoice.get("totalPaid", 0)
    total = invoice.get("total", 0)
    balance = invoice.get("balance", total - total_paid)
    
    return {
        "payments": payments,
        "totalPaid": total_paid,
        "total": total,
        "balance": balance
    }

@router.delete("/{invoice_id}/payments/{payment_id}")
async def delete_payment(
    invoice_id: str,
    payment_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Eliminar un abono de una factura"""
    invoice = await db.invoices.find_one({"id": invoice_id, "userId": user_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Filtrar el pago a eliminar
    existing_payments = invoice.get("payments", [])
    new_payments = [p for p in existing_payments if p.get("id") != payment_id]
    
    if len(new_payments) == len(existing_payments):
        raise HTTPException(status_code=404, detail="Abono no encontrado")
    
    # Recalcular totales
    total_paid = sum(p.get("amount", 0) for p in new_payments)
    total = invoice.get("total", 0)
    balance = total - total_paid
    
    # Determinar el nuevo estado
    if total_paid == 0:
        new_status = "pending"
    elif balance <= 0:
        new_status = "paid"
        balance = 0
    else:
        new_status = "partial"
    
    # Actualizar la factura
    await db.invoices.update_one(
        {"id": invoice_id, "userId": user_id},
        {
            "$set": {
                "payments": new_payments,
                "totalPaid": total_paid,
                "balance": balance,
                "status": new_status,
                "updatedAt": datetime.now()
            }
        }
    )
    
    return {
        "message": "Abono eliminado exitosamente",
        "totalPaid": total_paid,
        "balance": balance,
        "status": new_status
    }
