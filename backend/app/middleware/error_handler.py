import logging
import sqlite3
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config.env import env

class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        logging.error(f"[AppError] {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        logging.error(f"[ValidationError] {exc.errors()}")
        # Match Zod validation structure
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Validation error",
                "data": exc.errors()
            }
        )

    @app.exception_handler(sqlite3.IntegrityError)
    async def unique_violation_handler(request: Request, exc: sqlite3.IntegrityError):
        logging.error(f"[DatabaseError] Integrity constraint violation: {exc}")
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": "Resource already exists or constraint violation"}
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logging.error(f"[UnhandledError] {exc}", exc_info=True)
        message = "Internal server error"
        if env.NODE_ENV != "production":
            message = str(exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": message}
        )
