from pydantic import BaseModel
from typing import List, Optional

class InventoryItem(BaseModel):
    id: str
    name: str
    category: str
    current_stock: int
    min_threshold: int
    optimal_stock: int
    unit: str

class SupplierQuote(BaseModel):
    supplier_id: str
    supplier_name: str
    unit_price: float
    shipping_fee: float
    total_cost: float
    lead_time_days: int
    rating: float               
    is_recommended: bool = False
    ai_rationale: Optional[str] = None
    savings_vs_avg: Optional[float] = None 

class SourcingResult(BaseModel):
    item: InventoryItem
    quantity_needed: int
    quotes: List[SupplierQuote]
    recommended_supplier_id: str
    requires_approval: bool
    budget_cap: float
    status: str # "AUTO_APPROVED", "AWAITING_APPROVAL", "OPTIMAL"
    agent_logs: List[str]                    
    market_average_cost: float

class BusinessProfile(BaseModel):
    business_name: str = "Bean & Brew Roastery"
    business_type: str = "Specialty Coffee Shop"
    owner_email: str = "buyer-sandbox@restock.ai"
    currency: str = "USD"