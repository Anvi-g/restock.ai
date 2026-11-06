from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from schemas import InventoryItem, SourcingResult, BusinessProfile
from agent import run_researcher_agent
from paypal import create_order, capture_order

app = FastAPI(title="Restock.ai API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registered Business Profile
CURRENT_BUSINESS = BusinessProfile(
    business_name="Bean & Brew Roastery",
    business_type="Specialty Coffee Shop",
    owner_email="buyer-sandbox@restock.ai",
    currency="USD"
)

CURRENT_INVENTORY = InventoryItem(
    id="inv_coffee_01",
    name="Organic Colombian Espresso Beans (1kg)",
    category="Perishables / Coffee",
    current_stock=24,
    min_threshold=10,
    optimal_stock=30,
    unit="bags"
)

CURRENT_BUDGET_CAP = 75.0

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
    CURRENT_INVENTORY.current_stock = 4
    return CURRENT_INVENTORY

@app.post("/api/inventory/reset", response_model=InventoryItem)
def reset_inventory():
    CURRENT_INVENTORY.current_stock = 24
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

class CreateOrderRequest(BaseModel):
    amount: float
    supplier_name: str
    item_name: str
    quantity: int

class CaptureOrderRequest(BaseModel):
    order_id: str
    quantity: int

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