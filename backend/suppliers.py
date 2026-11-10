from typing import List

# Mock supplier network with distinct commercial bulk discount structures
SUPPLIER_CATALOG = [
    {
        "supplier_id": "sup_apex",
        "supplier_name": "Apex Wholesale Roasters",
        "base_unit_price": 14.50,
        "shipping_fee": 15.00,
        "lead_time_days": 2,
        "rating": 4.9,
        "bulk_unit_price": 10.80, # Video baseline: 40 units -> $447.00, saves $148.00
        "bulk_discount_rate": 0.255,
    },
    {
        "supplier_id": "sup_bulk",
        "supplier_name": "Global Bulk Commodities",
        "base_unit_price": 12.00,
        "shipping_fee": 35.00,
        "lead_time_days": 7,
        "rating": 4.2,
        "bulk_unit_price": 7.80,  # High-volume tier: 35% discount -> saves $168.00
        "bulk_discount_rate": 0.35,
    },
    {
        "supplier_id": "sup_express",
        "supplier_name": "NextDay Express Provisions",
        "base_unit_price": 18.00,
        "shipping_fee": 10.00,
        "lead_time_days": 1,
        "rating": 4.7,
        "bulk_unit_price": 16.20, # Rapid logistics tier: 10% discount -> saves $72.00
        "bulk_discount_rate": 0.10,
    },
    {
        "supplier_id": "sup_local",
        "supplier_name": "Artisan Direct Collective",
        "base_unit_price": 16.00,
        "shipping_fee": 5.00,
        "lead_time_days": 3,
        "rating": 4.5,
        "bulk_unit_price": 13.60, # Boutique farm co-op tier: 15% discount -> saves $96.00
        "bulk_discount_rate": 0.15,
    },
]

def fetch_supplier_quotes(item_name: str, quantity: int) -> List[dict]:
    # Simulates querying external supplier APIs/MCP servers.
    results = []
    bulk_qty = max(40, quantity)
    for sup in SUPPLIER_CATALOG:
        total_cost = round((sup["base_unit_price"] * quantity) + sup["shipping_fee"], 2)
        
        # Calculate supplier-specific wholesale tier economics at 40 units
        b_unit_price = sup.get("bulk_unit_price", round(sup["base_unit_price"] * (1 - sup.get("bulk_discount_rate", 0.20)), 2))
        b_total_cost = round((b_unit_price * bulk_qty) + sup["shipping_fee"], 2)
        regular_at_bulk = round((sup["base_unit_price"] * bulk_qty) + sup["shipping_fee"], 2)
        b_savings = round(regular_at_bulk - b_total_cost, 2)

        results.append({
            "supplier_id": sup["supplier_id"],
            "supplier_name": sup["supplier_name"],
            "unit_price": sup["base_unit_price"],
            "shipping_fee": sup["shipping_fee"],
            "total_cost": total_cost,
            "lead_time_days": sup["lead_time_days"],
            "rating": sup["rating"],
            "bulk_unit_price": b_unit_price,
            "bulk_total_cost": b_total_cost,
            "bulk_savings": b_savings,
            "bulk_discount_rate": sup.get("bulk_discount_rate", 0.20),
        })
    return results