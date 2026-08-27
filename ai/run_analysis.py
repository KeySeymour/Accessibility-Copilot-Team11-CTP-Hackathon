"""Run a real Gemini screenshot analysis from the command line."""

from __future__ import annotations

import argparse
import json
import mimetypes

from .analyzer import analyze_with_gemini
from .schemas import analysis_to_dict


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze a screenshot with Gemini")
    parser.add_argument("image", help="Path to a PNG, JPEG, or WebP screenshot")
    parser.add_argument("--context", default="", help="Optional page or product context")
    parser.add_argument("--model", default="gemini-3.7-flash")
    args = parser.parse_args()

    mime_type = mimetypes.guess_type(args.image)[0] or "image/png"
    with open(args.image, "rb") as image_file:
        result = analyze_with_gemini(
            image_file.read(),
            context=args.context,
            model=args.model,
            mime_type=mime_type,
        )
    print(json.dumps(analysis_to_dict(result), indent=2))


if __name__ == "__main__":
    main()
