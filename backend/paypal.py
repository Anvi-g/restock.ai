import os
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")

BASE_URL = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)

def has_valid_credentials() -> bool:
    return (
        bool(PAYPAL_CLIENT_ID) 
        and bool(PAYPAL_CLIENT_SECRET)
        and "Placeholder" not in PAYPAL_CLIENT_ID
    )

async def get_access_token() -> Optional[str]:
    """Retrieves OAuth 2.0 bearer token from PayPal Sandbox."""
    if not has_valid_credentials():
        return None

    url = f"{BASE_URL}/v1/oauth2/token"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                url,
                data={"grant_type": "client_credentials"},
                auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
                headers={"Accept": "application/json"}
            )
            if resp.status_code == 200:
                return resp.json().get("access_token")
        except Exception as e:
            print(f"[PayPal Auth Error]: {e}")
    return None

async def create_order(
    amount: float,
    supplier_name: str,
    item_name: str,
    quantity: int
) -> Dict[str, Any]:
    """Generates an order payload using PayPal Orders API v2."""
    token = await get_access_token()

    # Fallback to realistic Sandbox Simulation if keys not yet added
    if not token:
        import uuid
        fake_id = f"ORDER-PP-{uuid.uuid4().hex[:8].upper()}"
        return {
            "order_id": fake_id,
            "status": "CREATED",
            "approve_url": f"https://www.sandbox.paypal.com/checkoutnow?token={fake_id}",
            "amount": amount,
            "mode": "simulation",
        }

    url = f"{BASE_URL}/v2/checkout/orders"
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "description": f"Restock.ai Autonomous Procurement: {quantity}x {item_name}",
                "custom_id": f"RESTOCK-{supplier_name[:8].upper()}",
                "amount": {
                    "currency_code": "USD",
                    "value": f"{amount:.2f}",
                    "breakdown": {
                        "item_total": {
                            "currency_code": "USD",
                            "value": f"{amount:.2f}"
                        }
                    }
                },
                "items": [
                    {
                        "name": item_name[:120],
                        "unit_amount": {
                            "currency_code": "USD",
                            "value": f"{(amount / max(1, quantity)):.2f}"
                        },
                        "quantity": str(quantity),
                        "category": "PHYSICAL_GOODS"
                    }
                ]
            }
        ],
        "application_context": {
            "brand_name": "Restock.ai Procurement Agent",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "return_url": "http://localhost:5173/checkout/success",
            "cancel_url": "http://localhost:5173/checkout/cancel",
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers)
        data = resp.json()
        
        approve_link = next(
            (l["href"] for l in data.get("links", []) if l["rel"] == "approve"), 
            None
        )
        return {
            "order_id": data.get("id"),
            "status": data.get("status"),
            "approve_url": approve_link,
            "amount": amount,
            "mode": "live_sandbox",
        }

async def capture_order(order_id: str) -> Dict[str, Any]:
    """Captures payment for an authorized order."""
    token = await get_access_token()

    if not token or order_id.startswith("ORDER-PP-"):
        import uuid
        return {
            "transaction_id": f"TXN-PP-{uuid.uuid4().hex[:10].upper()}",
            "order_id": order_id,
            "status": "COMPLETED",
            "payer": {
                "name": {"given_name": "Bean & Brew Roastery"},
                "email_address": "buyer-sandbox@restock.ai",
            },
            "mode": "simulation",
        }

    url = f"{BASE_URL}/v2/checkout/orders/{order_id}/capture"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers)
        data = resp.json()
        capture_id = (
            data.get("purchase_units", [{}])[0]
            .get("payments", {})
            .get("captures", [{}])[0]
            .get("id")
        )
        return {
            "transaction_id": capture_id or data.get("id"),
            "order_id": order_id,
            "status": data.get("status"),
            "payer": data.get("payer", {}),
            "mode": "live_sandbox",
        }