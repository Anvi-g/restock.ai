from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from schemas import InventoryItem, SourcingResult, BusinessProfile
from agent import run_researcher_agent
from paypal import create_order, capture_order
from fastapi.responses import StreamingResponse
from receipt import generate_receipt_pdf

app = FastAPI(title="Restock.ai API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-Tenant Business Profiles for Hackathon Demo
PROFILES = {
    "coffee": {
        "business": BusinessProfile(
            business_name="Bean & Brew Roastery",
            business_type="Specialty Coffee Shop",
            owner_email="buyer-sandbox@restock.ai",
            currency="USD"
        ),
        "inventory": InventoryItem(
            id="inv_coffee_01",
            name="Organic Colombian Espresso Beans (1kg)",
            category="Perishables / Coffee",
            current_stock=24,
            min_threshold=10,
            optimal_stock=30,
            unit="bags"
        )
    },
    "tech": {
        "business": BusinessProfile(
            business_name="Apex Drone & Tech Labs",
            business_type="Electronics & Hardware Repair",
            owner_email="tech-buyer@restock.ai",
            currency="USD"
        ),
        "inventory": InventoryItem(
            id="inv_tech_02",
            name="LiPo Battery Packs 4S 1500mAh",
            category="Hardware / Batteries",
            current_stock=40,
            min_threshold=15,
            optimal_stock=50,
            unit="units"
        )
    },
    "retail": {
        "business": BusinessProfile(
            business_name="EcoBox Packaging Co",
            business_type="E-commerce Packaging Warehouse",
            owner_email="shipping-buyer@restock.ai",
            currency="USD"
        ),
        "inventory": InventoryItem(
            id="inv_box_03",
            name="Corrugated Shipping Boxes (Medium)",
            category="Supplies / Packaging",
            current_stock=160,
            min_threshold=50,
            optimal_stock=200,
            unit="boxes"
        )
    }
}

CURRENT_PROFILE_KEY = "coffee"
CURRENT_BUSINESS = PROFILES["coffee"]["business"]
CURRENT_INVENTORY = PROFILES["coffee"]["inventory"]

CURRENT_BUDGET_CAP = 75.0

class SwitchProfileRequest(BaseModel):
    profile_key: str

@app.get("/api/profiles")
def get_profiles():
    return {
        "current_key": CURRENT_PROFILE_KEY,
        "profiles": [
            {"key": "coffee", "name": "Bean & Brew Roastery", "type": "Coffee Roastery", "icon": "☕"},
            {"key": "tech", "name": "Apex Drone & Tech Labs", "type": "Electronics Repair", "icon": "🚁"},
            {"key": "retail", "name": "EcoBox Packaging Co", "type": "E-Commerce Logistics", "icon": "📦"},
        ]
    }

@app.post("/api/business/switch")
def switch_profile(body: SwitchProfileRequest):
    global CURRENT_PROFILE_KEY, CURRENT_BUSINESS, CURRENT_INVENTORY
    if body.profile_key in PROFILES:
        CURRENT_PROFILE_KEY = body.profile_key
        CURRENT_BUSINESS = PROFILES[body.profile_key]["business"]
        CURRENT_INVENTORY = PROFILES[body.profile_key]["inventory"]
    return {
        "current_key": CURRENT_PROFILE_KEY,
        "business": CURRENT_BUSINESS,
        "inventory": CURRENT_INVENTORY
    }

class BudgetCapUpdate(BaseModel):
    budget_cap: float

@app.get("/api/business", response_model=BusinessProfile)
def get_business():
    return CURRENT_BUSINESS

@app.get("/api/inventory", response_model=InventoryItem)
def get_inventory():
    return CURRENT_INVENTORY

@app.post("/api/inventory/simulate-low", response_model=InventoryItem)
def simulate_low_inventory():
    """Drops stock to 40% of min threshold to trigger agent deficit"""
    CURRENT_INVENTORY.current_stock = max(2, int(CURRENT_INVENTORY.min_threshold * 0.4))
    return CURRENT_INVENTORY

@app.post("/api/inventory/reset", response_model=InventoryItem)
def reset_inventory():
    """Restores healthy baseline stock (80% of optimal target)"""
    CURRENT_INVENTORY.current_stock = int(CURRENT_INVENTORY.optimal_stock * 0.8)
    return CURRENT_INVENTORY

@app.get("/api/budget-cap")
def get_budget_cap():
    return {"budget_cap": CURRENT_BUDGET_CAP}

@app.post("/api/budget-cap")
def set_budget_cap(body: BudgetCapUpdate):
    global CURRENT_BUDGET_CAP
    CURRENT_BUDGET_CAP = body.budget_cap
    return {"budget_cap": CURRENT_BUDGET_CAP}

@app.post("/api/agent/source", response_model=SourcingResult)
async def trigger_agent_sourcing():
    """Wakes the Researcher Agent to scan suppliers and return scored quotes"""
    return await run_researcher_agent(
        CURRENT_INVENTORY, 
        business=CURRENT_BUSINESS, 
        budget_cap=CURRENT_BUDGET_CAP
    )

from typing import Optional

class CreateOrderRequest(BaseModel):
    amount: float
    supplier_name: str
    item_name: str
    quantity: int

class CaptureOrderRequest(BaseModel):
    order_id: Optional[str] = None
    quantity: int = 26

@app.post("/api/paypal/create-order")
async def api_create_paypal_order(body: CreateOrderRequest):
    """Execution Agent: Creates PayPal Orders API transaction"""
    return await create_order(
        amount=body.amount,
        supplier_name=body.supplier_name,
        item_name=body.item_name,
        quantity=body.quantity
    )

@app.post("/api/paypal/capture-order")
async def api_capture_paypal_order(body: CaptureOrderRequest):
    """Execution Agent: Captures payment & reconciles inventory"""
    result = await capture_order(body.order_id)
    
    if result.get("status") == "COMPLETED":
        # Reconcile inventory: restore stock to optimal level
        CURRENT_INVENTORY.current_stock += body.quantity
        result["new_stock"] = CURRENT_INVENTORY.current_stock
    return result

class ReceiptRequest(BaseModel):
    supplier_name: str
    item_name: str
    quantity: int
    unit: str
    unit_price: float
    shipping_fee: float
    total_cost: float
    order_id: str
    transaction_id: str

@app.post("/api/receipt/download")
def download_receipt(body: ReceiptRequest):
    """Generates & streams the PDF receipt for accounting reconciliation"""
    pdf_buffer = generate_receipt_pdf(
        business_name=CURRENT_BUSINESS.business_name,
        buyer_email=CURRENT_BUSINESS.owner_email,
        supplier_name=body.supplier_name,
        item_name=body.item_name,
        quantity=body.quantity,
        unit=body.unit,
        unit_price=body.unit_price,
        shipping_fee=body.shipping_fee,
        total_cost=body.total_cost,
        order_id=body.order_id,
        transaction_id=body.transaction_id
    )
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Restock_Receipt_{body.transaction_id[:8]}.pdf"
        }
    )