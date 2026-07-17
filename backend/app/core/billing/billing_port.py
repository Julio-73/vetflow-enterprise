from abc import ABC, abstractmethod
from typing import Any, Dict


class BillingPort(ABC):
    """
    Abstract Port for Electronic Invoicing services.
    Enforces a common contract for regional adapters (like Mexico's SAT or Colombia's DIAN).
    """

    @abstractmethod
    def issue_invoice(
        self, sale_data: Dict[str, Any], branch_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submits and authorizes an electronic invoice to the tax authority.

        :param sale_data: Dictionary containing transaction details, items, amounts, and payments.
        :param branch_data: Dictionary containing clinic branch information (tax identifier, country).
        :return: Dict containing tax authority receipt (e.g. CFDI UUID, CUFE, XML/JSON representation).
        """
        pass
