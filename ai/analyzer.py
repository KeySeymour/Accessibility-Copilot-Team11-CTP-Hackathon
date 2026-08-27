"""Orchestration for model-assisted accessibility analysis.

A provider is injected instead of hard-coding an SDK, which keeps this module
simple to test and lets the backend choose its vision-model integration.
"""

from __future__ import annotations

import base64
import json
import os
import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from typing import Any

from .prompts import (
    FIX_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_fix_prompt,
    build_user_prompt,
)
from .schemas import AnalysisResult, FixProposal, analysis_from_dict, fix_from_dict


ModelProvider = Callable[[str, str, bytes], str | Mapping[str, Any]]

_JSON_BLOCK = re.compile(
    r"```(?:json)?\s*(.*?)\s*```",
    re.DOTALL | re.IGNORECASE,
)

DEFAULT_GEMINI_MODEL = "gemini-3.7-flash"
FALLBACK_GEMINI_MODELS = (
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

REQUEST_TIMEOUT_SECONDS = int(os.getenv("GEMINI_REQUEST_TIMEOUT_SECONDS", "30"))
# Fail over to the next model promptly. The frontend has a deterministic
# accessibility path, so prolonged retries make the product worse than a
# clean, actionable error.
MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "1"))


class AnalysisError(ValueError):
    """Raised when a provider request or response cannot produce valid analysis."""


def gemini_provider(
    system_prompt: str,
    user_prompt: str,
    image: bytes,
    *,
    api_key: str | None = None,
    model: str = DEFAULT_GEMINI_MODEL,
    mime_type: str = "image/png",
) -> Mapping[str, Any]:
    """Call Gemini's REST API and return the model's JSON analysis object."""

    key = (api_key or os.environ.get("GEMINI_API_KEY") or "").strip().removeprefix("√")

    if not key:
        raise AnalysisError("GEMINI_API_KEY is not configured")

    if not image:
        raise ValueError("image must contain bytes")

    encoded_image = base64.b64encode(image).decode("ascii")

    request_body = {
        "system_instruction": {
            "parts": [
                {
                    "text": system_prompt,
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": user_prompt,
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": encoded_image,
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    payload: Mapping[str, Any] | None = None
    attempted_models: list[str] = []

    # A 429/503 can be isolated to one model or serving pool. Try current,
    # lower-cost multimodal fallbacks before returning an error to the user.
    models = tuple(dict.fromkeys((model, *FALLBACK_GEMINI_MODELS)))
    for candidate_model in models:
        attempted_models.append(candidate_model)
        url = f"{GEMINI_API_URL}/{candidate_model}:generateContent"
        request = urllib.request.Request(
            url,
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": key,
            },
            method="POST",
        )

        for attempt in range(MAX_RETRIES):
            try:
                with urllib.request.urlopen(
                    request,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                ) as response:
                    payload = json.load(response)
                break

            except urllib.error.HTTPError as error:
                if error.code in {429, 503}:
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)
                        continue
                    # Exhausted retries for this model; move to the next model.
                    break

                if error.code == 404:
                    # Model availability differs by API project and region.
                    break

                if error.code in {401, 403}:
                    raise AnalysisError(
                        "Gemini authentication or API access was rejected."
                    ) from error

                if error.code == 400:
                    detail = error.read().decode("utf-8", errors="replace")
                    try:
                        detail = json.loads(detail).get("error", {}).get("message", detail)
                    except json.JSONDecodeError:
                        pass
                    raise AnalysisError(
                        f"Gemini rejected the request: {detail}"
                    ) from error

                raise AnalysisError(
                    f"Gemini request failed with HTTP {error.code}."
                ) from error

            except urllib.error.URLError as error:
                raise AnalysisError(
                    "Gemini request could not reach the service."
                ) from error

            except TimeoutError:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(2 ** attempt)
                    continue
                break

        if payload is not None:
            break

    if payload is None:
        raise AnalysisError(
            "Gemini's primary and backup models are temporarily unavailable "
            f"({', '.join(attempted_models)}). Please try again shortly."
        )

    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as error:
        raise AnalysisError(
            "Gemini returned no usable analysis."
        ) from error

    return _decode_response(text)


def _decode_response(
    response: str | Mapping[str, Any],
) -> Mapping[str, Any]:
    """Decode a provider response into a JSON object."""

    if isinstance(response, Mapping):
        return response

    if not isinstance(response, str):
        raise AnalysisError(
            "Model response must be JSON text or an object."
        )

    candidate = response.strip()

    block = _JSON_BLOCK.search(candidate)
    if block:
        candidate = block.group(1).strip()

    try:
        decoded = json.loads(candidate)
    except json.JSONDecodeError as error:
        raise AnalysisError(
            "Model response was not valid JSON."
        ) from error

    if not isinstance(decoded, Mapping):
        raise AnalysisError(
            "Model response must be a JSON object."
        )

    return decoded


def analyze_screenshot(
    image: bytes,
    provider: ModelProvider,
    *,
    context: str = "",
) -> AnalysisResult:
    """Analyze image bytes and return a validated, normalized result.

    The provider receives the system prompt, user prompt, and raw image bytes.
    Validation occurs after decoding so malformed model output does not reach
    the rest of the application.
    """

    if not image:
        raise ValueError("image must contain bytes")

    response = provider(
        SYSTEM_PROMPT,
        build_user_prompt(context),
        image,
    )

    try:
        return analysis_from_dict(
            _decode_response(response)
        )
    except (TypeError, ValueError, KeyError) as error:
        raise AnalysisError(
            f"Invalid analysis payload: {error}"
        ) from error


def analyze_with_gemini(
    image: bytes,
    *,
    context: str = "",
    api_key: str | None = None,
    model: str = DEFAULT_GEMINI_MODEL,
    mime_type: str = "image/png",
) -> AnalysisResult:
    """Analyze a screenshot with Gemini.

    Uses the GEMINI_API_KEY environment variable unless api_key is supplied.
    """

    def provider(
        system: str,
        user: str,
        image_bytes: bytes,
    ) -> Mapping[str, Any]:
        return gemini_provider(
            system,
            user,
            image_bytes,
            api_key=api_key,
            model=model,
            mime_type=mime_type,
        )

    result = analyze_screenshot(
        image,
        provider,
        context=context,
    )

    return AnalysisResult(
        score=result.score,
        issues=result.issues,
        summary=result.summary,
        model=model,
    )


def load_analysis(path: str) -> AnalysisResult:
    """Load and validate a saved analysis fixture or cached response."""

    with open(path, encoding="utf-8") as file:
        return analysis_from_dict(json.load(file))


def propose_fix(
    issue: Mapping[str, Any],
    *,
    source: str = "",
    api_key: str | None = None,
    model: str = DEFAULT_GEMINI_MODEL,
) -> FixProposal:
    """Ask Gemini for a reviewable fix proposal for one analysis issue."""

    key = api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        raise AnalysisError("GEMINI_API_KEY is not configured")

    body = {
        "system_instruction": {"parts": [{"text": FIX_SYSTEM_PROMPT}]},
        "contents": [{
            "role": "user",
            "parts": [{"text": build_fix_prompt(dict(issue), source)}],
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }
    request = urllib.request.Request(
        f"{GEMINI_API_URL}/{model}:generateContent",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.load(response)
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        return fix_from_dict(_decode_response(text))
    except urllib.error.HTTPError as error:
        if error.code == 400:
            detail = error.read().decode("utf-8", errors="replace")
            try:
                detail = json.loads(detail).get("error", {}).get("message", detail)
            except json.JSONDecodeError:
                pass
            raise AnalysisError(
                f"Gemini rejected the fix request: {detail}"
            ) from error
        raise AnalysisError(
            f"Gemini fix request failed with HTTP {error.code}."
        ) from error
    except (urllib.error.URLError, KeyError, IndexError, TypeError, ValueError) as error:
        raise AnalysisError("Gemini returned an invalid fix proposal.") from error
