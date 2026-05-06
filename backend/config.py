from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Default to mysql service for Docker consistency, or localhost for local dev if overridden in .env
    database_url: str = "mysql+pymysql://rydex_user:rydex_pass@mysql:3306/rydex"
    openweather_api_key: str = "demo_key"
    aqi_api_key: str = "demo_key"
    jwt_secret: str = "rydex_jwt_secret_change_in_prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days
    razorpay_key_id: str = "rzp_test_demo"
    razorpay_key_secret: str = "demo_secret"
    demo_mode: bool = True

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()
