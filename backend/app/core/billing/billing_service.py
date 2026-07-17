from app.core.billing.adapters.dian_adapter import DianAdapter
from app.core.billing.adapters.sat_adapter import SatAdapter
from app.core.billing.billing_port import BillingPort
from fastapi import HTTPException, status


class BillingService:
    """
    Factory Service to resolve country-specific billing adapters.
    Returns the appropriate adapter implementing the BillingPort interface.
    """

    @staticmethod
    def get_adapter(country_code: str) -> BillingPort:
        """
        Resolves the Electronic Invoicing adapter for the given country.

        :param country_code: ISO 2-letter country code (e.g. 'MX', 'CO').
        :return: BillingPort implementation.
        """
        country = country_code.strip().upper()
        if country == "MX":
            return SatAdapter()
        elif country == "CO":
            return DianAdapter()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Electronic invoicing is not supported in country: '{country_code}'.",
            )
