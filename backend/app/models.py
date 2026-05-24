from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class Consents(BaseModel):
    telemetry: bool = True
    audio: bool = True
    observe: bool = True


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=15)
    avatar_color: str = Field(min_length=1, max_length=32)
    avatar_name: str = Field(min_length=1, max_length=40)
    pin: str = Field(pattern=r"^\d{4}$")
    consents: Consents = Field(default_factory=Consents)


class UserProfile(BaseModel):
    id: int
    username: str
    avatar_color: str
    avatar_name: str
    consents: Consents
    created_at: datetime
    photo_url: str


class RegisterResponse(BaseModel):
    token: str
    profile: UserProfile
    created_at: datetime


class ClientIpResponse(BaseModel):
    client_ip: str
    forwarded_for: str | None = None
    user_agent: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None


class TelemetryRequest(BaseModel):
    user_id: int | None = None
    token: str | None = None
    public_ip: str | None = None
    local_ip: str | None = None
    os: str | None = None
    browser_language: str | None = None
    screen_resolution: str | None = None
    monitor_count: int | None = Field(default=None, ge=0)
    camera_count: int | None = Field(default=None, ge=0)
    mic_count: int | None = Field(default=None, ge=0)
    headphones: str | None = None
    cores: int | None = Field(default=None, ge=0)


class TelemetryResponse(TelemetryRequest):
    id: int
    user_id: int | None = None
    client_ip: str
    forwarded_for: str | None = None
    user_agent: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None
    created_at: datetime


class VideoMetadata(BaseModel):
    id: int
    user_id: int
    filename: str
    content_type: str
    size_bytes: int
    url: str
    created_at: datetime


class ScareTokenResponse(BaseModel):
    token: str
    user_id: int
    user_photo_url: str
    ghost_url: str


class ScareImageResponse(BaseModel):
    b64: str
    output_format: str = "jpeg"
