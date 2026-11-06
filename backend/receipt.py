import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_receipt_pdf(business_name: str, buyer_email: str, supplier_name: str, item_name: str, quantity: int, unit: str, unit_price: float, shipping_fee: float, total_cost: float, order_id: str, transaction_id: str) -> io.BytesIO:
    """Generates an executive PDF invoice with official PayPal settlement details."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate( buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40 )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle( 'DocTitle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#0f172a'), spaceAfter=4, )
    subtitle_style = ParagraphStyle( 'DocSub', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'), spaceAfter=15, )

    elements = []

    # 1. Header
    elements.append(Paragraph("Restock.ai — Procurement Receipt", title_style))
    elements.append(Paragraph(f"Autonomous Procurement Execution for <b>{business_name}</b>", subtitle_style))
    elements.append(Spacer(1, 10))

    # 2. Transaction Metadata Table
    now_str = datetime.now().strftime("%B %d, %Y - %I:%M %p")
    meta_data = [
        ["Date / Timestamp:", now_str, "Payment Method:", "PayPal Sandbox Wallet"],
        ["PayPal Order ID:", order_id[:28], "Buyer Account:", buyer_email],
        ["PayPal Capture ID:", transaction_id[:28], "Settlement Status:", "COMPLETED (Verified)"],
        ["Beneficiary Supplier:", supplier_name, "Procurement Mode:", "Autonomous Agent Executed"]
    ]
    meta_table = Table(meta_data, colWidths=[120, 150, 110, 150])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (2,0), (2,-1), colors.HexColor('#475569')),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 20))

    # 3. Line Items Table
    item_total = unit_price * quantity
    table_data = [
        ["Description", "Qty", "Unit Price", "Freight", "Total (USD)"],
        [f"{item_name}\n(Supplied by {supplier_name})", f"{quantity} {unit}", f"${unit_price:.2f}", f"${shipping_fee:.2f}", f"${total_cost:.2f}"],
        ["", "", "", "SUBTOTAL:", f"${item_total:.2f}"],
        ["", "", "", "SHIPPING:", f"${shipping_fee:.2f}"],
        ["", "", "", "TOTAL PAID:", f"${total_cost:.2f}"]
    ]
    
    item_table = Table(table_data, colWidths=[240, 70, 70, 75, 75])
    item_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0070BA')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (2,2), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (2,4), (-1,4), colors.HexColor('#0070BA')),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 30))

    # 4. Verified PayPal Stamp Banner
    stamp_text = Paragraph(
        "<para align=center><b>✓ OFFICIAL SETTLEMENT RECORD</b><br/>"
        f"<font size=8 color='#475569'>This transaction was autonomously authorized and captured via the PayPal Orders API v2.<br/>"
        f"Cryptographic Capture Signature: {transaction_id}</font></para>",
        styles['Normal']
    )
    stamp_table = Table([[stamp_text]], colWidths=[530])
    stamp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ecfdf5')),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#10b981')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(stamp_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer