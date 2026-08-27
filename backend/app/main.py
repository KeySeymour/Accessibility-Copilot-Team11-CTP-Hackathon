"""Minimal HTTP bridge between the Next.js frontend and the AI package."""

from __future__ import annotations

import json
import mimetypes
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai.analyzer import AnalysisError, analyze_with_gemini, propose_fix
from ai.schemas import analysis_to_dict, fix_to_dict


# Explicit process variables win; this file is only a local-development fallback.
# main.py lives in backend/app, so parents[1] is backend/. The old parents[2]
# path pointed at a non-existent repository-root .env and made screenshot
# analysis report that GEMINI_API_KEY was missing even though backend/.env was
# configured correctly.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Accessibility Copilot AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class FixRequest(BaseModel):
    issue: dict[str, Any]
    source: str = ""
    model: str | None = Field(default=None, min_length=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), context: str = Form("")) -> dict[str, Any]:
    image = await file.read()
    mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "image/png"
    try:
        result = analyze_with_gemini(
            image,
            context=context,
            model=os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
            mime_type=mime_type,
        )
    except (AnalysisError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return analysis_to_dict(result)


@app.post("/fix-with-ai")
async def fix_with_ai(request: FixRequest) -> dict[str, Any]:
    try:
        proposal = propose_fix(
            request.issue,
            source=request.source,
            model=request.model or os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
        )
    except (AnalysisError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return fix_to_dict(proposal)
