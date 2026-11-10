from typing import List

# Mock supplier network with distinct trade-offs
SUPPLIER_CATALOG = [
    {
        "supplier_id": "sup_apex",
        "supplier_name": "Apex Wholesale Roasters",
        "base_unit_price": 14.50,
        "shipping_fee": 15.00,
        "lead_time_days": 2,
        "rating": 4.9,
    },
    {
        "supplier_id": "sup_bulk",
        "supplier_name": "Global Bulk Commodities",
        "base_unit_price": 12.00,
        "shipping_fee": 35.00,
        "lead_time_days": 7,
        "rating": 4.2,
    },
    {
        "supplier_id": "sup_express",
        "supplier_name": "NextDay Express Provisions",
        "base_unit_price": 18.00,
        "shipping_fee": 10.00,
        "lead_time_days": 1,
        "rating": 4.7,
    },
    {
        "supplier_id": "sup_local",
        "supplier_name": "Artisan Direct Collective",
        "base_unit_price": 16.00,
        "shipping_fee": 5.00,
        "lead_time_days": 3,
        "rating": 4.5,
    },
]

def fetch_supplier_quotes(item_name: str, quantity: int) -> List[dict]:
    # Simulates querying external supplier APIs/MCP servers.
    results = []
    for sup in SUPPLIER_CATALOG:
        total_cost = round((sup["base_unit_price"] * quantity) + sup["shipping_fee"], 2)
        results.append({
            "supplier_id": sup["supplier_id"],
            "supplier_name": sup["supplier_name"],
            "unit_price": sup["base_unit_price"],
            "shipping_fee": sup["shipping_fee"],
            "total_cost": total_cost,
            "lead_time_days": sup["lead_time_days"],
            "rating": sup["rating"],
        })
    return results