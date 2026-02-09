from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models.invoice import InvoiceCreate, InvoiceUpdate, InvoiceInDB, InvoiceListItem, InvoiceStats
from utils.auth import get_current_user_id
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Database connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
        result.append(InvoiceListItem(
            id=inv["id"],
            number=inv["number"],
            clientName=inv["to"]["name"],
            date=inv["date"],
            dueDate=inv["dueDate"],
            total=inv["total"],
            status=inv["status"],
            createdAt=inv["createdAt"]
        ))
    
    return result

@router.get("/stats", response_model=InvoiceStats)
async def get_invoice_stats(user_id: str = Depends(get_current_user_id)):
    """Get invoice statistics for current user"""
    invoices = await db.invoices.find({"userId": user_id}).to_list(1000)
    
    total_revenue = sum(inv["total"] for inv in invoices)
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
    # Get user's company info as default "from" address
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create invoice
    invoice_dict = invoice.dict(by_alias=True)
    invoice_dict["userId"] = user_id
    
    invoice_in_db = InvoiceInDB(**invoice_dict)
    await db.invoices.insert_one(invoice_in_db.dict(by_alias=True))
    
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