#!/usr/bin/env python3
"""Extract indication evidence from Thai FDA PIL/SmPC PDF URLs.

Reads a JSON array with code, name_en and source_references from stdin and emits
one compact JSON object per record. This is an evidence-extraction helper only;
the final Thai clinical copy still requires human review.
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


SPACE = re.compile(r"[ \t\u00a0]+")
BLANKS = re.compile(r"\n{3,}")


def safe_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(
        (parts.scheme, parts.netloc, quote(parts.path), quote(parts.query, safe="=&%+"), parts.fragment)
    )


def clean_text(text: str) -> str:
    lines = [SPACE.sub(" ", line).strip() for line in text.replace("\r", "\n").splitlines()]
    return BLANKS.sub("\n\n", "\n".join(line for line in lines if line))


def between(text: str, starts: list[str], ends: list[str]) -> str:
    lowered = text.lower()
    start_at = -1
    start_len = 0
    for marker in starts:
        index = lowered.find(marker.lower())
        if index >= 0 and (start_at < 0 or index < start_at):
            start_at = index
            start_len = len(marker)
    if start_at < 0:
        return ""

    body_start = start_at + start_len
    end_at = len(text)
    for marker in ends:
        index = lowered.find(marker.lower(), body_start)
        if index >= 0:
            end_at = min(end_at, index)
    return text[body_start:end_at].strip()


def indication_section(text: str) -> tuple[str, str]:
    english = between(
        text,
        ["4.1. Therapeutic indications", "4.1 Therapeutic indications", "Therapeutic indications"],
        ["4.2. Posology", "4.2 Posology", "Posology and method of administration"],
    )
    if english:
        return "smpc_4_1", english[:4000]

    thai = between(
        text,
        ["1.2 ยานี้ใช้เพื่ออะไร", "1.2 ยานีใช้เพื่ออะไร", "ยานี้ใช้เพื่ออะไร", "ยานีใช้เพื่ออะไร"],
        ["2. ข้อควรรู้ก่อนใช้ยา", "2. ข้อควรรู", "2 ข้อควรรู้ก่อนใช้ยา"],
    )
    if thai:
        return "pil_1_2", thai[:4000]

    return "unparsed", text[:1500]


def extract(record: dict[str, object]) -> dict[str, object]:
    code = str(record.get("code", ""))
    name_en = str(record.get("name_en", ""))
    sources = record.get("source_references") or []
    url = str(sources[0]) if isinstance(sources, list) and sources else ""
    base: dict[str, object] = {"code": code, "name_en": name_en, "source": url}
    if not url:
        return {**base, "error": "missing source"}

    try:
        request = Request(safe_url(url), headers={"User-Agent": "MaCheck clinical-source-review/1.0"})
        with urlopen(request, timeout=45) as response:
            payload = response.read()
        reader = PdfReader(BytesIO(payload))
        text = clean_text("\n".join((page.extract_text() or "") for page in reader.pages))
        method, indication = indication_section(text)
        return {
            **base,
            "method": method,
            "indication": indication,
            "pages": len(reader.pages),
        }
    except Exception as exc:
        return {**base, "error": f"{type(exc).__name__}: {exc}"}


def main() -> None:
    records = json.load(sys.stdin)
    with ThreadPoolExecutor(max_workers=8) as pool:
        for result in pool.map(extract, records):
            print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
