export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_threshold: number;
  optimal_stock: number;
  unit: string;
}

export interface SupplierQuote {
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  shipping_fee: number;
  total_cost: number;
  lead_time_days: number;
  rating: number;
  is_recommended: boolean;
  ai_rationale?: string;
}

export interface SourcingResult {
  item: InventoryItem;
  quantity_needed: number;
  quotes: SupplierQuote[];
  recommended_supplier_id: string;
  requires_approval: boolean;
  budget_cap: number;
  status: 'AUTO_APPROVED' | 'AWAITING_APPROVAL' | 'OPTIMAL';
}