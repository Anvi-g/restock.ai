export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_threshold: number;
  optimal_stock: number;
  unit: string;
  bulk_threshold_qty?: number;
  bulk_discount_rate?: number;
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
  savings_vs_avg?: number;
  bulk_threshold_qty?: number;
  bulk_discount_rate?: number;
  bulk_unit_price?: number;
  bulk_total_cost?: number;
  bulk_savings?: number;
}

export interface SourcingResult {
  item: InventoryItem;
  quantity_needed: number;
  quotes: SupplierQuote[];
  recommended_supplier_id: string;
  requires_approval: boolean;
  budget_cap: number;
  status: 'AUTO_APPROVED' | 'AWAITING_APPROVAL' | 'OPTIMAL';
  agent_logs: string[];
  market_average_cost: number;
  bulk_opportunity?: BulkOpportunity;
}

export interface BulkOpportunity {
  is_available: boolean;
  supplier_id?: string;
  supplier_name?: string;
  recommended_qty: number;
  unit_price: number;
  total_cost: number;
  estimated_savings: number;
  discount_rate?: number;
  pitch?: string;
}