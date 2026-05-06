from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # External APIs — all optional; features degrade gracefully if missing
    openweather_api_key: Optional[str] = None
    aqi_api_key: Optional[str] = None
    traffic_api_key: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Trigger thresholds
    rainfall_threshold_mm: float = 50.0
    aqi_threshold: int = 300
    aqi_duration_mins: int = 60
    heat_threshold_celsius: float = 40.0
    heat_duration_mins: int = 90
    traffic_speed_threshold_kmh: float = 8.0
    traffic_duration_mins: int = 90

    # Baseline settings
    baseline_weeks: int = 4
    baseline_tolerance: float = 0.25

    # Coverage caps by tier (Rs.)
    cap_basic: int = 1000
    cap_plus: int = 2200
    cap_storm: int = 4000

    class Config:
        env_file = ".env"
        extra = "ignore"

    def has_weather_api(self) -> bool:
        return bool(self.openweather_api_key)

    def has_aqi_api(self) -> bool:
        return bool(self.aqi_api_key)

    def has_traffic_api(self) -> bool:
        return bool(self.traffic_api_key)

    def has_payments(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    def has_sms(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
