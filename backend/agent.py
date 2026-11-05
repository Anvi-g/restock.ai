from typing import List
from schemas import InventoryItem, SupplierQuote, SourcingResult
from suppliers import fetch_supplier_quotes

def run_researcher_agent(item: InventoryItem, budget_cap: float = 75.0) -> SourcingResult:
    quantity_needed = max(0, item.optimal_stock - item.current_stock)
    raw_quotes = fetch_supplier_quotes(item.name, quantity_needed)
    
    min_cost = min(q["total_cost"] for q in raw_quotes)
    scored_quotes: List[SupplierQuote] = []
    best_quote = None
    highest_score = -1.0
    
    for q in raw_quotes:
        # 50% Price efficiency, 30% Delivery Speed, 20% Supplier Reliability
        price_score = min_cost / q["total_cost"]
        speed_score = max(0.1, (8 - q["lead_time_days"]) / 7.0)
        rating_score = q["rating"] / 5.0
        composite_score = (0.50 * price_score) + (0.30 * speed_score) + (0.20 * rating_score)
        
        quote_obj = SupplierQuote(**q)
        if composite_score > highest_score:
            highest_score = composite_score
            best_quote = quote_obj
        scored_quotes.append(quote_obj)

    if best_quote:
        best_quote.is_recommended = True
        best_quote.ai_rationale = (
            f"Top pick: Optimal balance of cost (${best_quote.total_cost:.2f}) "
            f"and speed ({best_quote.lead_time_days}d delivery, {best_quote.rating}★ rating)."
        )

    total_cost = best_quote.total_cost if best_quote else 0.0
    requires_approval = total_cost > budget_cap
    status = "AWAITING_APPROVAL" if requires_approval else "AUTO_APPROVED"

    return SourcingResult(
        item=item,
        quantity_needed=quantity_needed,
        quotes=scored_quotes,
        recommended_supplier_id=best_quote.supplier_id if best_quote else "",
        requires_approval=requires_approval,
        budget_cap=budget_cap,
        status=status,
    )