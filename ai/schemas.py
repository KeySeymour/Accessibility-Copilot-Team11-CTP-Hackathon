"""Data contracts for accessibility analysis results.

The AI may suggest findings, but every result is validated here before it is
returned to the rest of the application.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Mapping


SEVERITIES = {
    "critical",
    "serious",
    "moderate",
    "minor",
}

ISSUE_TYPES = {
    "contrast",
    "readability",
    "target-size",
    "label",
    "focus",
    "layout",
    "other",
}


@dataclass(frozen=True)
class BoundingBox:
    """A normalized rectangle where each coordinate is between 0 and 1."""

    x: float
    y: float
    width: float
    height: float

    def __post_init__(self) -> None:
        values = (self.x, self.y, self.width, self.height)

        if any(not 0 <= value <= 1 for value in values):
            raise ValueError(
                "Bounding-box values must be between 0 and 1"
            )

        if self.width <= 0 or self.height <= 0:
            raise ValueError(
                "Bounding-box width and height must be greater than 0"
            )

        if self.x + self.width > 1:
            raise ValueError(
                "Bounding box extends beyond the horizontal image boundary"
            )

        if self.y + self.height > 1:
            raise ValueError(
                "Bounding box extends beyond the vertical image boundary"
            )


@dataclass(frozen=True)
class AccessibilityIssue:
    """One validated user-facing accessibility finding."""

    id: str
    type: str
    severity: str
    confidence: float
    title: str
    description: str
    impact: str
    recommendation: str
    wcag: list[str] = field(default_factory=list)
    bounding_box: BoundingBox | None = None
    evidence: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.id.strip():
            raise ValueError("Issue id is required")

        if self.type not in ISSUE_TYPES:
            raise ValueError(
                f"Unsupported issue type: {self.type}"
            )

        if self.severity not in SEVERITIES:
            raise ValueError(
                f"Unsupported severity: {self.severity}"
            )

        if not 0 <= self.confidence <= 1:
            raise ValueError(
                "Confidence must be between 0 and 1"
            )

        required_text_fields = (
            ("title", self.title),
            ("description", self.description),
            ("impact", self.impact),
            ("recommendation", self.recommendation),
        )

        for name, value in required_text_fields:
            if not value.strip():
                raise ValueError(
                    f"Issue {name} is required"
                )

        if not isinstance(self.wcag, list):
            raise ValueError(
                "wcag must be an array"
            )

        if not isinstance(self.evidence, dict):
            raise ValueError(
                "evidence must be an object"
            )


@dataclass(frozen=True)
class AnalysisResult:
    """Validated accessibility analysis shared by the application."""

    score: int
    issues: list[AccessibilityIssue]
    summary: str
    model: str | None = None

    def __post_init__(self) -> None:
        if not 0 <= self.score <= 100:
            raise ValueError(
                "Score must be between 0 and 100"
            )

        if not self.summary.strip():
            raise ValueError(
                "Analysis summary is required"
            )


@dataclass(frozen=True)
class FixProposal:
    """A reviewable fix returned by AI, never an automatically applied edit."""

    issue_id: str
    summary: str
    changes: list[str]
    patch: str
    verification: list[str]

    def __post_init__(self) -> None:
        if not self.issue_id.strip() or not self.summary.strip():
            raise ValueError("Fix issue_id and summary are required")
        if not self.patch.strip():
            raise ValueError("Fix patch is required")
        if not self.changes or not self.verification:
            raise ValueError("Fix changes and verification are required")


def _number(value: Any, field_name: str) -> float:
    """Validate and convert a numeric model field."""

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(
            f"{field_name} must be a number"
        )

    return float(value)


def _bounding_box(value: Any) -> BoundingBox | None:
    """Build a validated bounding box from model output."""

    if value is None:
        return None

    if not isinstance(value, Mapping):
        raise ValueError(
            "bounding_box must be an object or null"
        )

    return BoundingBox(
        x=_number(
            value.get("x"),
            "bounding_box.x",
        ),
        y=_number(
            value.get("y"),
            "bounding_box.y",
        ),
        width=_number(
            value.get("width"),
            "bounding_box.width",
        ),
        height=_number(
            value.get("height"),
            "bounding_box.height",
        ),
    )


def issue_from_dict(
    value: Mapping[str, Any],
) -> AccessibilityIssue:
    """Build and validate an accessibility issue from model JSON."""

    if not isinstance(value, Mapping):
        raise ValueError(
            "Each issue must be a JSON object"
        )

    wcag_value = value.get("wcag", [])

    if not isinstance(wcag_value, list):
        raise ValueError(
            "wcag must be an array"
        )

    evidence_value = value.get("evidence", {})

    if not isinstance(evidence_value, Mapping):
        raise ValueError(
            "evidence must be an object"
        )

    return AccessibilityIssue(
        id=str(
            value.get("id", "")
        ).strip(),

        type=str(
            value.get("type", "other")
        ).strip(),

        severity=str(
            value.get("severity", "moderate")
        ).strip(),

        confidence=_number(
            value.get("confidence"),
            "confidence",
        ),

        title=str(
            value.get("title", "")
        ).strip(),

        description=str(
            value.get("description", "")
        ).strip(),

        impact=str(
            value.get("impact", "")
        ).strip(),

        recommendation=str(
            value.get("recommendation", "")
        ).strip(),

        wcag=[
            str(item).strip()
            for item in wcag_value
            if str(item).strip()
        ],

        bounding_box=_bounding_box(
            value.get("bounding_box")
        ),

        evidence={
            str(key).strip(): (
                val.strip()
                if isinstance(val, str)
                else val
            )
            for key, val in evidence_value.items()
        },
    )


def analysis_from_dict(
    value: Mapping[str, Any],
) -> AnalysisResult:
    """Validate and normalize a complete model analysis payload."""

    if not isinstance(value, Mapping):
        raise ValueError(
            "Analysis payload must be a JSON object"
        )

    if "score" not in value:
        raise ValueError(
            "Analysis score is required"
        )

    raw_issues = value.get("issues", [])

    if not isinstance(raw_issues, list):
        raise ValueError(
            "issues must be an array"
        )

    try:
        score = int(value["score"])
    except (TypeError, ValueError) as error:
        raise ValueError(
            "score must be an integer"
        ) from error

    model_value = value.get("model")

    return AnalysisResult(
        score=score,

        issues=[
            issue_from_dict(issue)
            for issue in raw_issues
        ],

        summary=str(
            value.get("summary", "")
        ).strip(),

        model=(
            str(model_value).strip()
            if model_value
            else None
        ),
    )


def analysis_to_dict(
    result: AnalysisResult,
) -> dict[str, Any]:
    """Serialize a validated analysis result for JSON responses."""

    return asdict(result)


def fix_from_dict(
    value: Mapping[str, Any],
) -> FixProposal:
    """Build and validate a fix proposal from model JSON."""

    if not isinstance(value, Mapping):
        raise ValueError("Fix payload must be a JSON object")

    return FixProposal(
        issue_id=str(value.get("issue_id", "")).strip(),
        summary=str(value.get("summary", "")).strip(),
        changes=[
            str(item).strip()
            for item in value.get("changes", [])
            if str(item).strip()
        ],
        patch=str(value.get("patch", "")).strip(),
        verification=[
            str(item).strip()
            for item in value.get("verification", [])
            if str(item).strip()
        ],
    )


def fix_to_dict(
    proposal: FixProposal,
) -> dict[str, Any]:
    """Serialize a validated fix proposal for an API response."""

    return asdict(proposal)