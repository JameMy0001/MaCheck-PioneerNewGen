#!/usr/bin/env python3
"""Verify cited Thai FDA PDF pages and extract context around food terms.

Input is a JSON array of Food_Evidence records. Output is compact NDJSON with
the cited page, matched term and nearby source text. This does not make a
clinical decision; it exposes the evidence for review.
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


TERMS = {
    "alcohol": ["alcohol", "ethanol", "beer", "wine", "สุรา", "เหล้า", "แอลกอฮอล์", "เครื่องดื่มแอลกอฮอล์"],
    "calcium_fortified_drinks": ["calcium-fortified", "mineral-fortified", "fortified drinks", "เสริมแคลเซียม"],
    "food_meal": ["with food", "without food", "meal", "fasting", "empty stomach", "อาหาร", "ท้องว่าง"],
    "grapefruit": ["grapefruit", "เกรปฟรุต"],
    "high_fat_meal": ["high fat", "high-fat", "fatty meal", "อาหารไขมันสูง"],
    "high_protein_meal": ["high protein", "high-protein", "อาหารที่มีโปรตีนสูง", "อาหารโปรตีนสูง"],
    "milk_dairy": ["dairy", "milk", "cheese", "ผลิตภัณฑ์นม", "นม"],
    "potassium_rich": ["potassium-containing salt", "potassium containing salt", "salt substitute", "โพแทสเซียม", "เกลือทดแทน"],
    "tea": ["tea", "ชา"],
}


def safe_url(url: str) -> str:
    base = url.split("#", 1)[0]
    parts = urlsplit(base)
    return urlunsplit((parts.scheme, parts.netloc, quote(parts.path), quote(parts.query, safe="=&%+"), parts.fragment))


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def fetch_page(record: dict[str, object]) -> dict[str, object]:
    url = str(record.get("source_url") or "")
    page_number = int(record.get("source_page") or 0)
    food_code = str(record.get("food_code") or "")
    base = {
        "drug_code": record.get("drug_code"),
        "food_code": food_code,
        "severity": record.get("severity"),
        "recommendation": record.get("recommendation"),
        "confidence": record.get("confidence"),
        "decision": record.get("decision"),
        "source_page": page_number,
        "source_url": url,
    }
    try:
        request = Request(safe_url(url), headers={"User-Agent": "YaCheck food-evidence-audit/1.0"})
        with urlopen(request, timeout=45) as response:
            payload = response.read()
        reader = PdfReader(BytesIO(payload))
        if page_number < 1 or page_number > len(reader.pages):
            return {**base, "error": f"page {page_number} outside 1..{len(reader.pages)}"}
        text = normalize(reader.pages[page_number - 1].extract_text() or "")
        lowered = text.lower()
        matches: list[tuple[int, str]] = []
        for term in TERMS.get(food_code, []):
            index = lowered.find(term.lower())
            if index >= 0:
                matches.append((index, term))
        if not matches:
            return {**base, "matched": False, "context": text[:500]}
        index, term = min(matches)
        start = max(0, index - 260)
        end = min(len(text), index + len(term) + 520)
        return {**base, "matched": True, "term": term, "context": text[start:end]}
    except Exception as exc:
        return {**base, "error": f"{type(exc).__name__}: {exc}"}


def main() -> None:
    records = json.load(sys.stdin)
    with ThreadPoolExecutor(max_workers=8) as pool:
        for result in pool.map(fetch_page, records):
            print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
