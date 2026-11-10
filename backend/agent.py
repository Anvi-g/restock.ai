import os
import json
import httpx
from typing import List
from dotenv import load_dotenv
from schemas import InventoryItem, SupplierQuote, SourcingResult, BusinessProfile, BulkOpportunity
from suppliers import fetch_supplier_quotes

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

async def get_gemini_rationale(
    item: InventoryItem, 
    business: BusinessProfile,
    quotes: List[dict], 
    quantity: int
) -> dict:
    """Calls Gemini 2.5 Flash to generate executive procurement reasoning."""
    if not GEMINI_API_KEY or "DummyKey" in GEMINI_API_KEY or "your_gemini" in GEMINI_API_KEY:
        return {}

    # Dynamic prompt using registered business profile
    prompt = f"""You are an autonomous B2B procurement agent for '{business.business_name}' ({business.business_type}).
Critical supply deficit detected: {item.name}.
Current stock: {item.current_stock} {item.unit}. Minimum safety threshold: {item.min_threshold}. Deficit to order: {quantity} {item.unit}.

Supplier Quotes Available:
{json.dumps(quotes, indent=2)}

Select the best supplier balancing stockout prevention (lead time) with total cost and supplier rating.
Return ONLY valid JSON matching this exact structure:
{{
  "recommended_supplier_id": "<supplier_id>",
  "ai_rationale": "<2 sentences explaining why this option prevents downtime and optimizes spend for {business.business_name}>"
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
    except Exception as e:
        print(f"[Gemini API fallback triggered]: {e}")
    return {}

async def run_researcher_agent(
    item: InventoryItem, 
    business: BusinessProfile,
    budget_cap: float = 75.0
) -> SourcingResult:
    logs: List[str] = []
    quantity_needed = max(0, item.optimal_stock - item.current_stock)
    
    logs.append(f"[AGENT] 🏢 Active Business: {business.business_name} ({business.business_type})")
    logs.append(f"[AGENT] 🔍 Sourcing Trigger: Deficit of {quantity_needed} {item.unit} detected for '{item.name}'.")
    logs.append(f"[AGENT] 🌐 Querying 4 supplier catalogs across network via MCP protocol...")

    raw_quotes = fetch_supplier_quotes(item.name, quantity_needed)
    avg_cost = sum(q["total_cost"] for q in raw_quotes) / len(raw_quotes)

    # Calculate baseline heuristic scores
    min_cost = min(q["total_cost"] for q in raw_quotes)
    scored_quotes: List[SupplierQuote] = []
    heuristic_best: SupplierQuote = None
    highest_score = -1.0

    for q in raw_quotes:
        # 50% Price efficiency, 30% Delivery Speed, 20% Supplier Reliability
        price_score = min_cost / q["total_cost"]
        speed_score = max(0.1, (8 - q["lead_time_days"]) / 7.0)
        rating_score = q["rating"] / 5.0
        composite_score = (0.50 * price_score) + (0.30 * speed_score) + (0.20 * rating_score)

        savings = round(avg_cost - q["total_cost"], 2)
        quote_obj = SupplierQuote(**q, savings_vs_avg=savings)
        
        if composite_score > highest_score:
            highest_score = composite_score
            heuristic_best = quote_obj
        scored_quotes.append(quote_obj)

    # Attempt Gemini LLM Reasoning
    logs.append(f"[AGENT] 🧠 Invoking Gemini 2.5 Flash for autonomous trade-off analysis...")
    gemini_decision = await get_gemini_rationale(item, business, raw_quotes, quantity_needed)

    recommended_id = gemini_decision.get("recommended_supplier_id") or (heuristic_best.supplier_id if heuristic_best else "")
    rationale = gemini_decision.get("ai_rationale")

    # Match recommendation
    best_quote = next((q for q in scored_quotes if q.supplier_id == recommended_id), heuristic_best)

    if best_quote:
        best_quote.is_recommended = True
        best_quote.ai_rationale = rationale or (
            f"Top pick: Optimal balance of cost (${best_quote.total_cost:.2f}) "
            f"and speed ({best_quote.lead_time_days}d delivery, {best_quote.rating}★ rating)."
        )
        logs.append(f"[AGENT] 🎯 Recommendation: '{best_quote.supplier_name}' chosen (Total: ${best_quote.total_cost:.2f}, ETA: {best_quote.lead_time_days}d).")
    else:
        logs.append("[AGENT] ⚠️ No valid supplier found for this item.")

    # Guardrails
    total_cost = best_quote.total_cost if best_quote else 0.0
    requires_approval = total_cost > budget_cap

    if requires_approval:
        logs.append(f"[AGENT] 🛡️ Guardrail Check: Order total (${total_cost:.2f}) EXCEEDS budget cap (${budget_cap:.2f}). Pausing for Human-in-the-Loop authorization.")
        status = "AWAITING_APPROVAL"
    else:
        logs.append(f"[AGENT] ⚡ Guardrail Check: Order total (${total_cost:.2f}) is WITHIN budget cap (${budget_cap:.2f}). Pre-authorized for autonomous PayPal capture.")
        status = "AUTO_APPROVED"

    # 5. Economic Order Quantity (EOQ) / Bulk Tier Opportunity
    bulk_opp = None
    if quantity_needed >= 10 and best_quote:
        bulk_qty = max(best_quote.bulk_threshold_qty or 35, quantity_needed)
        discount_rate = best_quote.bulk_discount_rate or 0.20
        bulk_unit_price = best_quote.bulk_unit_price or round(best_quote.unit_price * (1 - discount_rate), 2)
        bulk_total = best_quote.bulk_total_cost or round((bulk_unit_price * bulk_qty) + best_quote.shipping_fee, 2)
        savings = best_quote.bulk_savings or round(((best_quote.unit_price * bulk_qty) + best_quote.shipping_fee) - bulk_total, 2)
        discount_pct = int(round(discount_rate * 100))

        bulk_opp = BulkOpportunity(
            is_available=True,
            supplier_id=best_quote.supplier_id,
            supplier_name=best_quote.supplier_name,
            recommended_qty=bulk_qty,
            unit_price=bulk_unit_price,
            total_cost=bulk_total,
            estimated_savings=savings,
            discount_rate=discount_rate,
            pitch=(
                f"{best_quote.supplier_name} Wholesale Tier: Order {bulk_qty} {item.unit} "
                f"to unlock {discount_pct}% volume discount (${bulk_unit_price:.2f}/{item.unit}), "
                f"saving ${savings:.2f} compared to regular orders."
            )
        )
        logs.append(f"[AGENT] 💡 EOQ Insight: {best_quote.supplier_name} wholesale tier identified at {bulk_qty} units ({discount_pct}% OFF, saves ${savings:.2f}).")

    return SourcingResult(
        item=item,
        quantity_needed=quantity_needed,
        quotes=scored_quotes,
        recommended_supplier_id=best_quote.supplier_id if best_quote else "",
        requires_approval=requires_approval,
        budget_cap=budget_cap,
        status=status,
        agent_logs=logs,
        market_average_cost=round(avg_cost, 2),
        bulk_opportunity=bulk_opp,
    )