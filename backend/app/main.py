from __future__ import annotations

import base64
import hashlib
import os
import secrets
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from db import UPLOAD_DIR, get_db, init_db
from models import (
    ClientIpResponse,
    Consents,
    RegisterRequest,
    RegisterResponse,
    ScareImageResponse,
    ScareTokenResponse,
    TelemetryRequest,
    TelemetryResponse,
    UserProfile,
    VideoMetadata,
)

app = FastAPI(title="Pastel Psychosis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

BASE_DIR = Path(__file__).resolve().parents[1]
IMAGES_DIR = BASE_DIR / "images"


@app.get("/ghost.jpg")
def get_ghost_image() -> FileResponse:
    ghost_path = IMAGES_DIR / "ghost.jpg"
    if not ghost_path.exists():
        raise HTTPException(status_code=404, detail="ghost.jpg not found on server")
    return FileResponse(ghost_path, media_type="image/jpeg", filename="ghost.jpg")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def _hash_pin(pin: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{pin}".encode("utf-8")).hexdigest()


def _request_ip(request: Request) -> tuple[str, str | None]:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip(), forwarded_for
    return request.client.host if request.client else "unknown", None


def _is_private_ip(ip: str) -> bool:
    return (
        ip == "unknown"
        or ip.startswith("127.")
        or ip.startswith("10.")
        or ip.startswith("192.168.")
        or ip.startswith("172.16.")
        or ip.startswith("172.17.")
        or ip.startswith("172.18.")
        or ip.startswith("172.19.")
        or ip.startswith("172.2")
        or ip.startswith("172.30.")
        or ip.startswith("172.31.")
        or ip == "::1"
    )


def _lookup_geo(ip: str) -> dict[str, str | float | None]:
    if _is_private_ip(ip):
        return {}
    try:
        response = httpx.get(f"https://ipapi.co/{ip}/json/", timeout=2.5)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError:
        return {}
    return {
        "city": data.get("city"),
        "region": data.get("region"),
        "country": data.get("country_name") or data.get("country"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "timezone": data.get("timezone"),
    }


def _profile_from_row(row) -> UserProfile:
    return UserProfile(
        id=row["id"],
        username=row["username"],
        avatar_color=row["avatar_color"],
        avatar_name=row["avatar_name"],
        consents=Consents(
            telemetry=bool(row["consent_telemetry"]),
            audio=bool(row["consent_audio"]),
            observe=bool(row["consent_observe"]),
        ),
        created_at=row["created_at"],
        photo_url=f"/api/users/{row['id']}/photo",
    )


def _get_user_by_id(user_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return row


def _resolve_user_id(user_id: int | None, token: str | None) -> int | None:
    if user_id is not None:
        _get_user_by_id(user_id)
        return user_id
    if not token:
        return None
    with get_db() as db:
        row = db.execute("SELECT id FROM users WHERE token = ?", (token,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(row["id"])


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/ip", response_model=ClientIpResponse)
def get_ip(request: Request) -> ClientIpResponse:
    client_ip, forwarded_for = _request_ip(request)
    geo = _lookup_geo(client_ip)
    return ClientIpResponse(
        client_ip=client_ip,
        forwarded_for=forwarded_for,
        user_agent=request.headers.get("user-agent"),
        **geo,
    )


@app.post("/api/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest) -> RegisterResponse:
    username = payload.username.strip()
    salt = secrets.token_hex(16)
    token = secrets.token_urlsafe(32)
    pin_hash = _hash_pin(payload.pin, salt)

    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Username already registered")

        cursor = db.execute(
            """
            INSERT INTO users (
                username, avatar_color, avatar_name, pin_hash, pin_salt,
                consent_telemetry, consent_audio, consent_observe, token
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                username,
                payload.avatar_color,
                payload.avatar_name,
                pin_hash,
                salt,
                int(payload.consents.telemetry),
                int(payload.consents.audio),
                int(payload.consents.observe),
                token,
            ),
        )
        row = db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()

    profile = _profile_from_row(row)
    return RegisterResponse(token=token, profile=profile, created_at=row["created_at"])


@app.get("/api/users/{user_id}", response_model=UserProfile)
def get_user(user_id: int) -> UserProfile:
    return _profile_from_row(_get_user_by_id(user_id))


@app.post("/api/telemetry", response_model=TelemetryResponse, status_code=201)
def create_telemetry(payload: TelemetryRequest, request: Request) -> TelemetryResponse:
    resolved_user_id = _resolve_user_id(payload.user_id, payload.token)
    client_ip, forwarded_for = _request_ip(request)
    geo_ip = payload.public_ip or client_ip
    geo = _lookup_geo(geo_ip)

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO telemetry_events (
                user_id, client_ip, forwarded_for, user_agent, public_ip, local_ip, os,
                browser_language, screen_resolution, monitor_count, camera_count,
                mic_count, headphones, cores, city, region, country, latitude, longitude, timezone
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                resolved_user_id,
                client_ip,
                forwarded_for,
                request.headers.get("user-agent"),
                payload.public_ip,
                payload.local_ip,
                payload.os,
                payload.browser_language,
                payload.screen_resolution,
                payload.monitor_count,
                payload.camera_count,
                payload.mic_count,
                payload.headphones,
                payload.cores,
                geo.get("city"),
                geo.get("region"),
                geo.get("country"),
                geo.get("latitude"),
                geo.get("longitude"),
                geo.get("timezone"),
            ),
        )
        row = db.execute(
            "SELECT * FROM telemetry_events WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()

    return TelemetryResponse(
        id=row["id"],
        user_id=row["user_id"],
        token=None,
        client_ip=row["client_ip"],
        forwarded_for=row["forwarded_for"],
        user_agent=row["user_agent"],
        public_ip=row["public_ip"],
        local_ip=row["local_ip"],
        os=row["os"],
        browser_language=row["browser_language"],
        screen_resolution=row["screen_resolution"],
        monitor_count=row["monitor_count"],
        camera_count=row["camera_count"],
        mic_count=row["mic_count"],
        headphones=row["headphones"],
        cores=row["cores"],
        city=row["city"],
        region=row["region"],
        country=row["country"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        timezone=row["timezone"],
        created_at=row["created_at"],
    )


@app.get("/api/users/{user_id}/telemetry/latest", response_model=TelemetryResponse)
def get_latest_telemetry(user_id: int) -> TelemetryResponse:
    _get_user_by_id(user_id)
    with get_db() as db:
        row = db.execute(
            """
            SELECT * FROM telemetry_events
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Telemetry not found")
    return TelemetryResponse(
        id=row["id"],
        user_id=row["user_id"],
        token=None,
        client_ip=row["client_ip"],
        forwarded_for=row["forwarded_for"],
        user_agent=row["user_agent"],
        public_ip=row["public_ip"],
        local_ip=row["local_ip"],
        os=row["os"],
        browser_language=row["browser_language"],
        screen_resolution=row["screen_resolution"],
        monitor_count=row["monitor_count"],
        camera_count=row["camera_count"],
        mic_count=row["mic_count"],
        headphones=row["headphones"],
        cores=row["cores"],
        city=row["city"],
        region=row["region"],
        country=row["country"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        timezone=row["timezone"],
        created_at=row["created_at"],
    )


@app.post("/api/users/{user_id}/scare-token", response_model=ScareTokenResponse, status_code=201)
def create_scare_token(user_id: int) -> ScareTokenResponse:
    _get_user_by_id(user_id)
    token = secrets.token_urlsafe(24)
    with get_db() as db:
        db.execute("INSERT INTO scare_tokens (token, user_id) VALUES (?, ?)", (token, user_id))
    return ScareTokenResponse(
        token=token,
        user_id=user_id,
        user_photo_url=f"/api/scares/{token}/photo",
        ghost_url="/ghost.jpg",
    )


@app.get("/api/scares/{token}", response_model=ScareTokenResponse)
def get_scare_token(token: str) -> ScareTokenResponse:
    with get_db() as db:
        row = db.execute("SELECT user_id FROM scare_tokens WHERE token = ?", (token,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scare token not found")
    return ScareTokenResponse(
        token=token,
        user_id=row["user_id"],
        user_photo_url=f"/api/scares/{token}/photo",
        ghost_url="/ghost.jpg",
    )


@app.get("/api/scares/{token}/photo")
def get_scare_photo(token: str) -> Response:
    with get_db() as db:
        row = db.execute("SELECT user_id FROM scare_tokens WHERE token = ?", (token,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scare token not found")
    return get_user_photo(row["user_id"])


def _get_user_photo_blob(user_id: int) -> tuple[bytes, str]:
    with get_db() as db:
        photo = db.execute(
            "SELECT content_type, body FROM user_photos WHERE user_id = ?", (user_id,)
        ).fetchone()
    if photo is None:
        raise HTTPException(status_code=404, detail="User photo not found")
    return bytes(photo["body"]), str(photo["content_type"])


@app.get("/api/users/{user_id}/scare-image")
def get_scare_image(user_id: int) -> Response:
    _get_user_by_id(user_id)
    with get_db() as db:
        row = db.execute(
            "SELECT content_type, body FROM scare_images WHERE user_id = ?", (user_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scare image not generated yet")
    return Response(content=row["body"], media_type=row["content_type"])



@app.post("/api/users/{user_id}/scare-image", response_model=ScareImageResponse)
async def generate_scare_image(user_id: int) -> ScareImageResponse:
    """
    Генерирует "фото с призраком сзади" на сервере:
    - берёт user photo из БД
    - берёт backend/images/ghost.jpg
    - вызывает OpenAI (gpt-image-1-mini) через /v1/images/edits
    - возвращает base64 изображения
    """
    _get_user_by_id(user_id)
    api_key = "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"
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set on backend")

    user_body, user_ct = _get_user_photo_blob(user_id)
    ghost_path = IMAGES_DIR / "ghost.jpg"
    if not ghost_path.exists():
        raise HTTPException(status_code=500, detail="ghost.jpg is missing on backend")
    ghost_body = ghost_path.read_bytes()

    prompt = " ".join(
        [
            "Create a realistic, unsettling photo using the FIRST image as the main photo of the person. Dont change the person's appearance, but add a ghostly figure in the background.",
            "Add a translucent ghost figure BEHIND the person, partially visible in the background.",
            "Use the SECOND image as the reference for the ghost's appearance/style (face/shape).",
            "Keep the person's identity original.",
            "The ghost should look like it's standing behind them, slightly out of focus, with subtle film grain.",
        ]
    )

    data = {
        "model": "gpt-image-1-mini",
        "prompt": prompt,
        "input_fidelity": "low",
        "quality": "medium",
        "output_format": "jpeg",
    }
    files = [
        ("image[]", ("user.jpg", user_body, user_ct)),
        ("image[]", ("ghost.jpg", ghost_body, "image/jpeg")),
    ]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/images/edits",
                headers={"Authorization": f"Bearer {api_key}"},
                data=data,
                files=files,
            )
            if response.status_code >= 400:
                detail = response.text[:2000] if response.text else f"status={response.status_code}"
                raise HTTPException(
                    status_code=502,
                    detail=f"OpenAI error ({response.status_code}): {detail}",
                )
            try:
                payload = response.json()
            except ValueError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"OpenAI returned non-JSON response: {(response.text or '')[:2000]}",
                ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        # Keep the response as a controlled error instead of a silent 500
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc

    b64 = None
    if isinstance(payload, dict):
        data_list = payload.get("data")
        if isinstance(data_list, list) and data_list:
            b64 = data_list[0].get("b64_json")
    if not b64:
        raise HTTPException(status_code=502, detail="OpenAI returned no image data")

    output_format = payload.get("output_format") or "jpeg"

    # Persist latest generated image for later fast retrieval.
    try:
        img_bytes = base64.b64decode(b64)
        content_type = "image/jpeg" if output_format == "jpeg" else f"image/{output_format}"
        with get_db() as db:
            db.execute(
                """
                INSERT INTO scare_images (user_id, content_type, body)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    content_type = excluded.content_type,
                    body = excluded.body,
                    created_at = CURRENT_TIMESTAMP
                """,
                (user_id, content_type, img_bytes),
            )
    except Exception as exc:
        # Do not fail the request if storing fails; return the image anyway.
        print(f"WARNING: failed to store scare image: {exc}")

    return ScareImageResponse(b64=b64, output_format=output_format)


@app.post("/api/users/{user_id}/photo", status_code=204)
async def upload_user_photo(user_id: int, photo: UploadFile = File(...)) -> Response:
    _get_user_by_id(user_id)
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Photo must be an image")
    body = await photo.read()
    if not body:
        raise HTTPException(status_code=400, detail="Photo is empty")
    with get_db() as db:
        db.execute(
            """
            INSERT INTO user_photos (user_id, filename, content_type, body)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                filename = excluded.filename,
                content_type = excluded.content_type,
                body = excluded.body,
                created_at = CURRENT_TIMESTAMP
            """,
            (user_id, photo.filename, photo.content_type, body),
        )
    return Response(status_code=204)


@app.get("/api/users/{user_id}/photo")
def get_user_photo(user_id: int) -> Response:
    user = _get_user_by_id(user_id)
    with get_db() as db:
        photo = db.execute(
            "SELECT content_type, body FROM user_photos WHERE user_id = ?", (user_id,)
        ).fetchone()
    if photo is not None:
        return Response(content=photo["body"], media_type=photo["content_type"])

    color = user["avatar_color"]
    name = user["avatar_name"]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<rect width="128" height="128" rx="24" fill="#080812"/>
<circle cx="64" cy="54" r="34" fill="{color}"/>
<circle cx="50" cy="49" r="5" fill="#111827"/>
<circle cx="78" cy="49" r="5" fill="#111827"/>
<path d="M49 72c9 9 21 9 30 0" fill="none" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
<text x="64" y="113" text-anchor="middle" font-family="monospace" font-size="12" fill="#e5e7eb">{name}</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")


@app.post("/api/users/{user_id}/videos", response_model=VideoMetadata, status_code=201)
async def upload_user_video(user_id: int, video: UploadFile = File(...)) -> VideoMetadata:
    _get_user_by_id(user_id)
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=415, detail="Upload must be a video")

    safe_name = Path(video.filename or "capture.webm").name
    storage_name = f"{user_id}_{secrets.token_urlsafe(10)}_{safe_name}"
    storage_path = UPLOAD_DIR / storage_name
    size = 0
    with storage_path.open("wb") as target:
        while chunk := await video.read(1024 * 1024):
            size += len(chunk)
            target.write(chunk)

    if size == 0:
        storage_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Video is empty")

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO user_videos (user_id, filename, content_type, storage_path, size_bytes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, safe_name, video.content_type, str(storage_path), size),
        )
        row = db.execute("SELECT * FROM user_videos WHERE id = ?", (cursor.lastrowid,)).fetchone()

    return VideoMetadata(
        id=row["id"],
        user_id=row["user_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        size_bytes=row["size_bytes"],
        url=f"/api/videos/{row['id']}",
        created_at=row["created_at"],
    )


@app.get("/api/users/{user_id}/videos", response_model=list[VideoMetadata])
def list_user_videos(user_id: int) -> list[VideoMetadata]:
    _get_user_by_id(user_id)
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM user_videos WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (user_id,),
        ).fetchall()
    return [
        VideoMetadata(
            id=row["id"],
            user_id=row["user_id"],
            filename=row["filename"],
            content_type=row["content_type"],
            size_bytes=row["size_bytes"],
            url=f"/api/videos/{row['id']}",
            created_at=row["created_at"],
        )
        for row in rows
    ]


@app.get("/api/videos/{video_id}")
def get_video(video_id: int) -> FileResponse:
    with get_db() as db:
        row = db.execute("SELECT * FROM user_videos WHERE id = ?", (video_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Video not found")
    storage_path = Path(row["storage_path"])
    if not storage_path.exists():
        raise HTTPException(status_code=404, detail="Video file missing")
    return FileResponse(
        storage_path,
        media_type=row["content_type"],
        filename=row["filename"],
    )


@app.delete("/api/videos/{video_id}", status_code=204)
def delete_video(video_id: int) -> Response:
    with get_db() as db:
        row = db.execute("SELECT storage_path FROM user_videos WHERE id = ?", (video_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Video not found")
        db.execute("DELETE FROM user_videos WHERE id = ?", (video_id,))
    Path(row["storage_path"]).unlink(missing_ok=True)
    return Response(status_code=204)
