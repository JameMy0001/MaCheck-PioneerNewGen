#!/usr/bin/env python3
"""Extract compact Thai title evidence from Thai FDA medication PDFs.

Reads a JSON array of objects containing code, name_en and source_references from
stdin. The script never writes files; it prints one compact JSON object per row.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
import re
import sys
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from pypdf import PdfReader


THAI = re.compile(r"[\u0E00-\u0E7F]")
SPACE = re.compile(r"\s+")


def safe_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, quote(parts.path), quote(parts.query, safe="=&%+"), parts.fragment))


def extract(record: dict[str, object]) -> dict[str, object]:
    code = str(record.get("code", ""))
    name_en = str(record.get("name_en", ""))
    sources = record.get("source_references") or []
    url = str(sources[0]) if isinstance(sources, list) and sources else ""
    result: dict[str, object] = {"code": code, "name_en": name_en, "source": url}
    if not url:
        return {**result, "error": "missing source"}

    try:
        request = Request(safe_url(url), headers={"User-Agent": "YaCheck clinical-source-review/1.0"})
        with urlopen(request, timeout=40) as response:
            payload = response.read()
        reader = PdfReader(BytesIO(payload))
        lines: list[str] = []
        for page in reader.pages[:4]:
            for raw_line in (page.extract_text() or "").splitlines():
                line = SPACE.sub(" ", raw_line).strip()
                if line and THAI.search(line) and line not in lines:
                    lines.append(line)
                if len(lines) >= 12:
                    break
            if len(lines) >= 12:
                break
        result["thai_evidence"] = lines
        result["pages"] = len(reader.pages)
        return result
    except Exception as exc:  # Network/PDF errors are evidence gaps, not fatal.
        return {**result, "error": f"{type(exc).__name__}: {exc}"}


def main() -> None:
    records = json.load(sys.stdin)
    with ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(extract, records):
            print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
