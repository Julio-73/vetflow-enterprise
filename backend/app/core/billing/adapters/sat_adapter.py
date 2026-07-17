import datetime
import uuid
from typing import Any, Dict

from app.core.billing.billing_port import BillingPort


class SatAdapter(BillingPort):
    """
    Adapter implementing the BillingPort for Mexico's SAT (Servicio de Administración Tributaria).
    Simulates electronic billing validation generating a CFDI 4.0 representation.
    """

    def issue_invoice(
        self, sale_data: Dict[str, Any], branch_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Generate mock fiscal UUID (UUID v4) and signing certificate
        fiscal_uuid = str(uuid.uuid4()).upper()
        timbre_fiscal = f"SAT-{uuid.uuid4().hex[:8].upper()}"

        rfc_emisor = branch_data.get("tax_identifier", "CVS950101-SM1")
        rfc_receptor = sale_data.get("tutor_tax_identifier") or "XAXX010101000"
        total = float(sale_data.get("total_amount", 0.0))

        mock_xml = (
            f"<cfdi:Comprobante xmlns:cfdi='http://www.sat.gob.mx/cfd/4' Version='4.0' "
            f"RfcEmisor='{rfc_emisor}' RfcReceptor='{rfc_receptor}' Total='{total}'>"
            f"<cfdi:Complemento><tfd:TimbreFiscalDigital UUID='{fiscal_uuid}' "
            f"NoCertificadoSAT='00001000000504465028' FechaTimbrado='{datetime.datetime.utcnow().isoformat()}Z' "
            f"SelloSAT='{timbre_fiscal}'/></cfdi:Complemento></cfdi:Comprobante>"
        )

        return {
            "status": "APPROVED",
            "country": "MX",
            "authority": "SAT",
            "invoice_number": f"MX-CFDI-{sale_data.get('id', 'MOCK')[:8].upper()}",
            "fiscal_uuid": fiscal_uuid,
            "timbre": timbre_fiscal,
            "rfc_emisor": rfc_emisor,
            "rfc_receptor": rfc_receptor,
            "total": total,
            "stamp_date": datetime.datetime.utcnow().isoformat() + "Z",
            "xml_representation": mock_xml,
        }
