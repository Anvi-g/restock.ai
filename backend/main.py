import uuid
from typing import Optional, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from schemas import InventoryItem, SourcingResult, BusinessProfile, BulkOpportunity
from agent import run_researcher_agent
from paypal import create_order, capture_order
from fastapi.responses import StreamingResponse
from receipt import generate_receipt_pdf

app = FastAPI(title="Restock.ai API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-Tenant Business Profiles & Multi-Item Catalogs
PROFILES = {
    "coffee": {
        "business": BusinessProfile(
            business_name="Bean & Brew Roastery",
            business_type="Specialty Coffee Shop",
            owner_email="buyer-sandbox@restock.ai",
            currency="USD"
        ),
        "inventory": [
            InventoryItem(
                id="inv_coffee_01",
                name="Organic Colombian Espresso Beans (1kg)",
                category="Perishables / Coffee",
                current_stock=4,
                min_threshold=10,
                optimal_stock=30,
                unit="bags",
                bulk_threshold_qty=40,
                bulk_discount_rate=0.25
            ),
            InventoryItem(
                id="inv_milk_02",
                name="Oat Milk Barista Edition (1L)",
                category="Perishables / Dairy Alternative",
                current_stock=18,
                min_threshold=20,
                optimal_stock=60,
                unit="cartons",
                bulk_threshold_qty=80,
                bulk_discount_rate=0.20
            ),
            InventoryItem(
                id="inv_cups_03",
                name="Eco-Friendly Compostable 12oz Cups",
                category="Packaging / Supplies",
                current_stock=120,
                min_threshold=200,
                optimal_stock=500,
                unit="cups",
                bulk_threshold_qty=1000,
                bulk_discount_rate=0.30
            ),
            InventoryItem(
                id="inv_syrup_04",
                name="Artisan Madagascar Vanilla Syrup (750ml)",
                category="Perishables / Flavoring",
                current_stock=14,
                min_threshold=6,
                optimal_stock=18,
                unit="bottles",
                bulk_threshold_qty=30,
                bulk_discount_rate=0.15
            )
        ]
    },
    "tech": {
        "business": BusinessProfile(
            business_name="Apex Drone & Tech Labs",
            business_type="Electronics & Hardware Repair",
            owner_email="tech-buyer@restock.ai",
            currency="USD"
        ),
        "inventory": [
            InventoryItem(
                id="inv_tech_01",
                name="LiPo Battery Packs 4S 1500mAh",
                category="Hardware / Batteries",
                current_stock=6,
                min_threshold=15,
                optimal_stock=50,
                unit="units",
                bulk_threshold_qty=60,
                bulk_discount_rate=0.22
            ),
            InventoryItem(
                id="inv_tech_02",
                name="Carbon Fiber 5-Inch Propeller Sets",
                category="Hardware / Propulsion",
                current_stock=25,
                min_threshold=30,
                optimal_stock=100,
                unit="sets",
                bulk_threshold_qty=150,
                bulk_discount_rate=0.28
            )
        ]
    },
    "retail": {
        "business": BusinessProfile(
            business_name="EcoBox Packaging Co",
            business_type="E-commerce Packaging Warehouse",
            owner_email="shipping-buyer@restock.ai",
            currency="USD"
        ),
        "inventory": [
            InventoryItem(
                id="inv_box_01",
                name="Corrugated Shipping Boxes (Medium)",
                category="Supplies / Packaging",
                current_stock=20,
                min_threshold=50,
                optimal_stock=200,
                unit="boxes",
                bulk_threshold_qty=400,
                bulk_discount_rate=0.35
            ),
            InventoryItem(
                id="inv_box_02",
                name="Water-Activated Reinforced Kraft Tape",
                category="Supplies / Adhesive",
                current_stock=15,
                min_threshold=25,
                optimal_stock=60,
                unit="rolls",
                bulk_threshold_qty=100,
                bulk_discount_rate=0.20
            )
        ]
    }
}

CURRENT_PROFILE_KEY = "coffee"
CURRENT_BUSINESS = PROFILES["coffee"]["business"]
CURRENT_ITEM_INDEX = 0

def get_active_item() -> InventoryItem:
    items = PROFILES[CURRENT_PROFILE_KEY]["inventory"]
    global CURRENT_ITEM_INDEX
    if CURRENT_ITEM_INDEX >= len(items):
        CURRENT_ITEM_INDEX = 0
    return items[CURRENT_ITEM_INDEX]

CURRENT_BUDGET_CAP = 75.0

# ----------------- Business & Multi-Tenant Endpoints -----------------

class SwitchProfileRequest(BaseModel):
    profile_key: str

class UpdateBusinessRequest(BaseModel):
    business_name: str
    business_type: str
    owner_email: str
    currency: Optional[str] = "USD"

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
    global CURRENT_PROFILE_KEY, CURRENT_BUSINESS, CURRENT_ITEM_INDEX
    if body.profile_key in PROFILES:
        CURRENT_PROFILE_KEY = body.profile_key
        CURRENT_BUSINESS = PROFILES[body.profile_key]["business"]
        CURRENT_ITEM_INDEX = 0
    return {
        "current_key": CURRENT_PROFILE_KEY,
        "business": CURRENT_BUSINESS,
        "inventory": get_active_item(),
        "all_items": PROFILES[CURRENT_PROFILE_KEY]["inventory"]
    }

@app.get("/api/business", response_model=BusinessProfile)
def get_business():
    return CURRENT_BUSINESS

@app.put("/api/business/profile", response_model=BusinessProfile)
def update_business_profile(body: UpdateBusinessRequest):
    """Allows shop owners to register or update their store settings"""
    global CURRENT_BUSINESS
    CURRENT_BUSINESS.business_name = body.business_name
    CURRENT_BUSINESS.business_type = body.business_type
    CURRENT_BUSINESS.owner_email = body.owner_email
    if body.currency:
        CURRENT_BUSINESS.currency = body.currency
    PROFILES[CURRENT_PROFILE_KEY]["business"] = CURRENT_BUSINESS
    return CURRENT_BUSINESS

# ----------------- Multi-Item Inventory Endpoints -----------------

class AddItemRequest(BaseModel):
    name: str
    category: str
    current_stock: int
    min_threshold: int
    optimal_stock: int
    unit: str
    bulk_threshold_qty: Optional[int] = 40
    bulk_discount_rate: Optional[float] = 0.25

class UpdateItemRequest(BaseModel):
    current_stock: Optional[int] = None
    min_threshold: Optional[int] = None
    optimal_stock: Optional[int] = None
    bulk_threshold_qty: Optional[int] = None
    bulk_discount_rate: Optional[float] = None

@app.get("/api/inventory/all", response_model=List[InventoryItem])
def get_all_inventory():
    """Returns the multi-item inventory catalog for the active shop"""
    return PROFILES[CURRENT_PROFILE_KEY]["inventory"]

@app.get("/api/inventory", response_model=InventoryItem)
def get_inventory():
    """Returns the currently active tracked item"""
    return get_active_item()

@app.post("/api/inventory/select/{item_id}", response_model=InventoryItem)
def select_active_item(item_id: str):
    """Selects an item from the catalog to run agent sourcing on"""
    global CURRENT_ITEM_INDEX
    items = PROFILES[CURRENT_PROFILE_KEY]["inventory"]
    for idx, item in enumerate(items):
        if item.id == item_id:
            CURRENT_ITEM_INDEX = idx
            return item
    return get_active_item()

@app.post("/api/inventory/add", response_model=InventoryItem)
def add_inventory_item(body: AddItemRequest):
    """Shop owner dynamically registers a new item to track in their inventory"""
    new_item = InventoryItem(
        id=f"inv_custom_{uuid.uuid4().hex[:6]}",
        name=body.name,
        category=body.category,
        current_stock=body.current_stock,
        min_threshold=body.min_threshold,
        optimal_stock=body.optimal_stock,
        unit=body.unit,
        bulk_threshold_qty=body.bulk_threshold_qty or 40,
        bulk_discount_rate=body.bulk_discount_rate or 0.25
    )
    PROFILES[CURRENT_PROFILE_KEY]["inventory"].append(new_item)
    return new_item

@app.put("/api/inventory/{item_id}", response_model=InventoryItem)
def update_inventory_item(item_id: str, body: UpdateItemRequest):
    """Shop owner configures custom bulk threshold, stock level, or restock target"""
    items = PROFILES[CURRENT_PROFILE_KEY]["inventory"]
    for item in items:
        if item.id == item_id:
            if body.current_stock is not None:
                item.current_stock = body.current_stock
            if body.min_threshold is not None:
                item.min_threshold = body.min_threshold
            if body.optimal_stock is not None:
                item.optimal_stock = body.optimal_stock
            if body.bulk_threshold_qty is not None:
                item.bulk_threshold_qty = body.bulk_threshold_qty
            if body.bulk_discount_rate is not None:
                item.bulk_discount_rate = body.bulk_discount_rate
            return item
    return get_active_item()

@app.post("/api/inventory/simulate-low", response_model=InventoryItem)
def simulate_low_inventory():
    """Drops the active item stock to 40% of min threshold to trigger agent deficit"""
    item = get_active_item()
    item.current_stock = max(2, int(item.min_threshold * 0.4))
    return item

@app.post("/api/inventory/reset", response_model=InventoryItem)
def reset_inventory():
    """Restores healthy baseline stock on active item"""
    item = get_active_item()
    item.current_stock = int(item.optimal_stock * 0.8)
    return item

# ----------------- Safety Guardrail & Budget Cap -----------------

class BudgetCapUpdate(BaseModel):
    budget_cap: float

@app.get("/api/budget-cap")
def get_budget_cap():
    return {"budget_cap": CURRENT_BUDGET_CAP}

@app.post("/api/budget-cap")
def set_budget_cap(body: BudgetCapUpdate):
    global CURRENT_BUDGET_CAP
    CURRENT_BUDGET_CAP = body.budget_cap
    return {"budget_cap": CURRENT_BUDGET_CAP}

# ----------------- Researcher Agent Endpoint -----------------

class SourceRequest(BaseModel):
    item_id: Optional[str] = None

@app.post("/api/agent/source", response_model=SourcingResult)
async def trigger_agent_sourcing(body: Optional[SourceRequest] = None):
    """Wakes the Researcher Agent to scan suppliers and return scored quotes"""
    if body and body.item_id:
        select_active_item(body.item_id)

    item = get_active_item()
    return await run_researcher_agent(
        item, 
        business=CURRENT_BUSINESS, 
        budget_cap=CURRENT_BUDGET_CAP
    )

# ----------------- PayPal Orders API Endpoints -----------------

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
        item = get_active_item()
        item.current_stock += body.quantity
        result["new_stock"] = item.current_stock
    return result

# ----------------- PDF Receipt Generator Endpoint -----------------

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