import datetime
import hashlib
from typing import Any, Dict

from app.core.billing.billing_port import BillingPort


class DianAdapter(BillingPort):
    """
    Adapter implementing the BillingPort for Colombia's DIAN (Dirección de Impuestos y Aduanas Nacionales).
    Simulates electronic billing validation generating a UBL 2.1 representation with a CUFE identifier.
    """

    def issue_invoice(
        self, sale_data: Dict[str, Any], branch_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Compute CUFE (mock signature)
        seed = f"{sale_data.get('id', 'MOCK')}-{datetime.datetime.utcnow().isoformat()}"
        cufe = hashlib.sha384(seed.encode()).hexdigest()

        nit_emisor = branch_data.get("tax_identifier", "900.123.456-7")
        nit_receptor = sale_data.get("tutor_tax_identifier") or "222222222"
        total = float(sale_data.get("total_amount", 0.0))

        mock_xml = (
            f"<Invoice xmlns='urn:oasis:names:specification:ubl:schema:xsd:Invoice-2' "
            f"xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2' "
            f"xmlns:cbc='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'>"
            f"<cbc:UUID schemeName='CUFE'>{cufe}</cbc:UUID>"
            f"<cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme>"
            f"<cbc:CompanyID>{nit_emisor}</cbc:CompanyID>"
            f"</cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>"
            f"<cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme>"
            f"<cbc:CompanyID>{nit_receptor}</cbc:CompanyID>"
            f"</cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>"
            f"<cac:LegalMonetaryTotal><cbc:PayableAmount currencyID='COP'>{total}</cbc:PayableAmount></cac:LegalMonetaryTotal>"
            f"</Invoice>"
        )

        return {
            "status": "APPROVED",
            "country": "CO",
            "authority": "DIAN",
            "invoice_number": f"CO-DIAN-{sale_data.get('id', 'MOCK')[:8].upper()}",
            "cufe": cufe,
            "nit_emisor": nit_emisor,
            "nit_receptor": nit_receptor,
            "total": total,
            "stamp_date": datetime.datetime.utcnow().isoformat() + "Z",
            "xml_representation": mock_xml,
        }
