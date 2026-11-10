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
    bulk_threshold_qty: Optional[int] = 40  
    bulk_discount_rate: Optional[float] = 0.25  

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
    bulk_unit_price: Optional[float] = None
    bulk_total_cost: Optional[float] = None
    bulk_savings: Optional[float] = None
    bulk_discount_rate: Optional[float] = None 

class BulkOpportunity(BaseModel):
    is_available: bool = False
    recommended_qty: int = 40
    unit_price: float = 10.80
    total_cost: float = 447.00
    estimated_savings: float = 148.00
    pitch: Optional[str] = None

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
    bulk_opportunity: Optional[BulkOpportunity] = None

class BusinessProfile(BaseModel):
    business_name: str = "Bean & Brew Roastery"
    business_type: str = "Specialty Coffee Shop"
    owner_email: str = "buyer-sandbox@restock.ai"
    currency: str = "USD"