from typing import List

# Mock supplier network with distinct commercial wholesale discount tiers
SUPPLIER_CATALOG = [
    {
        "supplier_id": "sup_apex",
        "supplier_name": "Apex Wholesale Roasters",
        "base_unit_price": 14.50,
        "shipping_fee": 15.00,
        "lead_time_days": 2,
        "rating": 4.9,
        "bulk_threshold_qty": 35,
        "bulk_discount_rate": 0.20,  # 20% discount at 35 units
    },
    {
        "supplier_id": "sup_bulk",
        "supplier_name": "Global Bulk Commodities",
        "base_unit_price": 12.00,
        "shipping_fee": 35.00,
        "lead_time_days": 7,
        "rating": 4.2,
        "bulk_threshold_qty": 50,
        "bulk_discount_rate": 0.35,  # 35% discount at 50 units (high-volume specialist)
    },
    {
        "supplier_id": "sup_express",
        "supplier_name": "NextDay Express Provisions",
        "base_unit_price": 18.00,
        "shipping_fee": 10.00,
        "lead_time_days": 1,
        "rating": 4.7,
        "bulk_threshold_qty": 30,
        "bulk_discount_rate": 0.12,  # 12% discount at 30 units
    },
    {
        "supplier_id": "sup_local",
        "supplier_name": "Artisan Direct Collective",
        "base_unit_price": 16.00,
        "shipping_fee": 5.00,
        "lead_time_days": 3,
        "rating": 4.5,
        "bulk_threshold_qty": 25,
        "bulk_discount_rate": 0.15,  # 15% discount at 25 units
    },
]

def fetch_supplier_quotes(item_name: str, quantity: int) -> List[dict]:
    # Simulates querying external supplier APIs/MCP servers.
    results = []
    for sup in SUPPLIER_CATALOG:
        total_cost = round((sup["base_unit_price"] * quantity) + sup["shipping_fee"], 2)
        
        # Calculate supplier-specific wholesale tier economics
        bulk_qty = max(sup["bulk_threshold_qty"], quantity)
        bulk_unit_price = round(sup["base_unit_price"] * (1 - sup["bulk_discount_rate"]), 2)
        bulk_total_cost = round((bulk_unit_price * bulk_qty) + sup["shipping_fee"], 2)
        regular_cost_at_bulk_qty = round((sup["base_unit_price"] * bulk_qty) + sup["shipping_fee"], 2)
        bulk_savings = round(regular_cost_at_bulk_qty - bulk_total_cost, 2)

        results.append({
            "supplier_id": sup["supplier_id"],
            "supplier_name": sup["supplier_name"],
            "unit_price": sup["base_unit_price"],
            "shipping_fee": sup["shipping_fee"],
            "total_cost": total_cost,
            "lead_time_days": sup["lead_time_days"],
            "rating": sup["rating"],
            "bulk_threshold_qty": sup["bulk_threshold_qty"],
            "bulk_discount_rate": sup["bulk_discount_rate"],
            "bulk_unit_price": bulk_unit_price,
            "bulk_total_cost": bulk_total_cost,
            "bulk_savings": bulk_savings,
        })
    return results