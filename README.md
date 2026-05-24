# Pastel Psychosis

## API backend

Run the FastAPI backend with UV:

```bash
uv run fastapi dev backend/app/main.py
```

By default the frontend calls `http://127.0.0.1:8000`. Override it with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Useful endpoints:

- `GET /api/health`
- `GET /api/ip`
- `POST /api/register`
- `POST /api/telemetry`
- `GET /api/users/{user_id}/telemetry/latest`
- `POST /api/users/{user_id}/photo`
- `GET /api/users/{user_id}/photo`
- `POST /api/users/{user_id}/videos`
- `GET /api/users/{user_id}/videos`
- `POST /api/users/{user_id}/scare-token`
- `GET /api/scares/{token}`
- `GET /api/scares/{token}/photo`
- `GET /api/videos/{video_id}`

SQLite data and uploaded videos are kept under `backend/data/`.
