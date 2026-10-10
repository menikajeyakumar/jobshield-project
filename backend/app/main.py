from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import Base, engine
from .config import settings
from .routers import analyze, history, reports, dashboard, admin, auth, upi, website, certificate, whatsapp

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JobShield API",
    description="AI-based fake opportunity detection & verification platform - backend API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    # Friendly fallback so the frontend always gets a JSON error instead of
    # a raw stack trace, per the "user-friendly error messages" requirement.
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again in a moment."},
    )


app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(upi.router)
app.include_router(website.router)
app.include_router(certificate.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "JobShield API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
