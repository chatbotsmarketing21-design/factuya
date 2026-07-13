"""Product catalog CRUD — per-user products/services reusable in invoices."""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import os
import uuid

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

from utils.auth import get_current_user_id

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

router = APIRouter(prefix="/products", tags=["Products"])

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


class ProductCreate(BaseModel):
    code: Optional[str] = ""
    description: str
    price: float = Field(default=0, ge=0)
    unit: Optional[str] = ""


class ProductOut(BaseModel):
    id: str
    code: str
    description: str
    price: float
    unit: str
    createdAt: str


def _to_out(doc) -> ProductOut:
    return ProductOut(
        id=doc["id"],
        code=doc.get("code", "") or "",
        description=doc.get("description", ""),
        price=doc.get("price", 0) or 0,
        unit=doc.get("unit", "") or "",
        createdAt=doc.get("createdAt", ""),
    )


@router.get("", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    query = {"userId": user_id}
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.products.find(query).sort("description", 1).to_list(500)
    return [_to_out(d) for d in docs]


@router.post("", response_model=ProductOut)
async def create_product(data: ProductCreate, user_id: str = Depends(get_current_user_id)):
    description = data.description.strip()
    if not description:
        raise HTTPException(status_code=400, detail="La descripción es obligatoria")
    doc = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "code": (data.code or "").strip(),
        "description": description,
        "price": data.price or 0,
        "unit": (data.unit or "").strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc)
    return _to_out(doc)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: str, data: ProductCreate, user_id: str = Depends(get_current_user_id)):
    description = data.description.strip()
    if not description:
        raise HTTPException(status_code=400, detail="La descripción es obligatoria")
    result = await db.products.find_one_and_update(
        {"id": product_id, "userId": user_id},
        {"$set": {
            "code": (data.code or "").strip(),
            "description": description,
            "price": data.price or 0,
            "unit": (data.unit or "").strip(),
        }},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _to_out(result)


@router.delete("/{product_id}")
async def delete_product(product_id: str, user_id: str = Depends(get_current_user_id)):
    result = await db.products.delete_one({"id": product_id, "userId": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}
