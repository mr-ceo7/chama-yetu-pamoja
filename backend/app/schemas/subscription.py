"""
Pydantic schemas for subscription endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel


class SubscriptionTierResponse(BaseModel):
    id: int
    tier_id: str
    name: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    duration_days: int
    categories: List[str]
    popular: bool
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"

    model_config = {"from_attributes": True}


class SubscribeRequest(BaseModel):
    tier_id: str  # 5day, 10day, 30day
    duration_days: int


class SubscriptionTierUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    categories: Optional[List[str]] = None
    popular: Optional[bool] = None
    regional_prices: Optional[dict] = None


class SubscriptionTierCreate(BaseModel):
    tier_id: str  # e.g. "5day"
    name: str
    description: Optional[str] = None
    price: float
    duration_days: int
    categories: List[str]
    popular: bool = False
    regional_prices: Optional[dict] = {}
