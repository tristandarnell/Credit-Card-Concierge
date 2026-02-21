"""
Merchant normalization: reduce noise in transaction descriptions.
Python port of lib/nlp/merchant-normalize.ts for use by the classifier.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

def _fuzzy_best_match(text: str, candidates: list[str]) -> tuple[str, float] | None:
    """Return (best_match, score) or None. Uses rapidfuzz if available, else simple Jaccard."""
    try:
        from rapidfuzz import fuzz
        best = max(candidates, key=lambda c: fuzz.ratio(text, c))
        score = fuzz.ratio(text, best) / 100.0
        return (best, score) if score >= 0.85 else None
    except ImportError:
        # Fallback: Jaccard similarity on character bigrams
        def jaccard(a: str, b: str) -> float:
            sa = set(a[i:i+2] for i in range(len(a)-1))
            sb = set(b[i:i+2] for i in range(len(b)-1))
            if not sa and not sb:
                return 1.0
            inter = len(sa & sb)
            union = len(sa | sb)
            return inter / union if union else 0.0
        if not candidates:
            return None
        best = max(candidates, key=lambda c: jaccard(text, c))
        score = jaccard(text, best)
        return (best, score) if score >= 0.85 else None

# Built-in variant map (matches merchant-normalize.ts + synthetic data brands)
BUILTIN_VARIANTS: dict[str, list[str]] = {
    "mcdonalds": ["mcd", "mcds", "mcdonalds", "macdonalds"],
    "starbucks": ["starbucks", "starbucks coffee", "sbux"],
    "walmart": ["walmart", "wal mart", "wm supercenter"],
    "target": ["target", "target store"],
    "costco": ["costco", "costco wholesale"],
    "amazon": ["amazon", "amazon.com", "amzn"],
    "shell": ["shell", "shell oil"],
    "exxon": ["exxon", "exxonmobil", "exxon mobil"],
    "chevron": ["chevron", "chevron texaco"],
    "subway": ["subway", "subway sandwiches"],
    "chipotle": ["chipotle", "chipotle mexican grill"],
    "whole foods": ["whole foods", "whole foods market"],
    "trader joes": ["trader joes", "trader joe", "trader joes market"],
    "uber": ["uber", "uber trip", "uber eats"],
    "lyft": ["lyft", "lyft ride"],
    "venmo": ["venmo", "venmo payment"],
    "spotify": ["spotify", "spotify usa"],
    "netflix": ["netflix", "netflix.com"],
    "hulu": ["hulu", "hulu llc"],
    "apple": ["apple", "apple.com", "apple store", "itunes"],
    "pepsi": ["pepsi", "pepsi bottling", "pepsi co", "ctlppepsi", "ctlpepsi", "ctlp pepsi"],
    "mta": ["mta", "mta nyct", "mta paygo", "mta mnr", "mta lirr"],
    "njt": ["njt", "njt rail", "njt rail my tix", "nj transit"],
    "dominos": ["dominos", "dominos pizza", "domino"],
    "pizza hut": ["pizza hut", "pizza hut delivery"],
    "dunkin": ["dunkin", "dunkin donuts", "dunkin coffee"],
    "panera": ["panera", "panera bread"],
    "home depot": ["home depot", "the home depot"],
    "lowes": ["lowes", "lowes home improvement"],
    "best buy": ["best buy", "bestbuy"],
    "cvs": ["cvs", "cvs pharmacy", "cvs caremark"],
    "walgreens": ["walgreens", "walgreens pharmacy"],
    "safeway": ["safeway", "safeway inc"],
    "kroger": ["kroger", "kings supers", "ralphs", "fred meyer"],
    "sprouts": ["sprouts", "sprouts farmers market"],
}

STATE_ABBREVS = frozenset(
    "al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms "
    "mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv wi wy dc".split()
)

CITY_NAMES = frozenset(
    "new york los angeles san francisco san diego las vegas newark raleigh "
    "chicago houston phoenix philadelphia boston seattle denver austin miami atlanta".split()
)

TLDS = frozenset(["com", "net", "org", "co", "io"])

_variant_map: dict[str, str] = {}
_single_word_map: dict[str, str] = {}


def _rebuild_maps(variants: dict[str, list[str]] | None = None) -> None:
    global _variant_map, _single_word_map
    v = variants or BUILTIN_VARIANTS
    _variant_map = {}
    _single_word_map = {}
    for canonical, aliases in v.items():
        for alias in aliases:
            key = alias.strip().lower().replace(" ", "_")
            _variant_map[key] = canonical.replace("_", " ")
            token = alias.split()[0].lower() if alias.split() else ""
            if token and token not in _single_word_map:
                _single_word_map[token] = canonical.replace("_", " ")
    for canonical in v:
        key = canonical.replace("_", " ").replace(" ", "_")
        _variant_map[key] = canonical.replace("_", " ")


def load_merchant_variants(path: Path | str) -> None:
    """Load and merge variants from JSON file."""
    p = Path(path)
    if not p.exists():
        return
    data = json.loads(p.read_text())
    merged = dict(BUILTIN_VARIANTS)
    for k, v in data.items():
        if k.startswith("_"):
            continue
        merged[k] = v
    _rebuild_maps(merged)


_rebuild_maps()
# Load data/merchant-variants.json if present
_proj_root = Path(__file__).resolve().parent.parent
load_merchant_variants(_proj_root / "data" / "merchant-variants.json")


def _remove_statement_boilerplate(text: str) -> str:
    t = re.sub(r"^purchase\s+authorized\s+on\s+\d{1,2}\s*/?\s*\d{1,2}\s*", "", text, flags=re.I)
    t = re.sub(r"^payment\s+", "", t, flags=re.I)
    return t.strip()


def _remove_store_numbers(text: str) -> str:
    t = re.sub(r"#\s*\d+", "", text)
    t = re.sub(r"\bstore\s*\d+\b", "", t, flags=re.I)
    t = re.sub(r"\bunit\s*\d+\b", "", t, flags=re.I)
    return t


def _remove_locations(text: str) -> str:
    words = text.split()
    filtered = []
    for w in words:
        lw = w.lower()
        if len(lw) == 2 and lw in STATE_ABBREVS:
            continue
        filtered.append(w)
    return " ".join(filtered)


def _remove_city_names(text: str) -> str:
    if not text.strip():
        return ""
    result = text.strip().lower()
    words = result.split()
    no_states = [w for w in words if not (len(w) == 2 and w in STATE_ABBREVS)]
    result = " ".join(no_states)
    for city in CITY_NAMES:
        pattern = r"\s+" + re.escape(city) + r"\s*$"
        result = re.sub(pattern, "", result, flags=re.I)
        result = re.sub(r"\s+", " ", result).strip()
    return result


def _strip_tlds(text: str) -> str:
    words = text.split()
    return " ".join(w for w in words if w.lower() not in TLDS)


def _apply_merchant_variants(text: str) -> str | None:
    trimmed = re.sub(r"\s+", " ", text.strip().lower())
    words = [w for w in trimmed.split() if w]

    for length in range(min(len(words), 4), 0, -1):
        phrase = "_".join(words[:length])
        if phrase in _variant_map:
            return _variant_map[phrase]

    for word in words:
        if word in _single_word_map:
            return _single_word_map[word]

    if _variant_map:
        phrase = trimmed.replace(" ", "_")
        variant_keys = list(_variant_map.keys())
        match = _fuzzy_best_match(phrase, variant_keys)
        if match and match[1] >= 0.85:
            return _variant_map[match[0]]

    return None


def _first_n_words(text: str, n: int = 3) -> str:
    words = text.split()
    return " ".join(words[:n])


def normalize_merchant(raw_description: str) -> str:
    """
    Normalize raw transaction description to canonical merchant name.
    Strips boilerplate, IDs, locations; applies variant mapping; uses first-N-words for unknown.
    """
    if not raw_description or not str(raw_description).strip():
        return ""

    t = str(raw_description).lower().strip()
    t = re.sub(r"[^\w\s#]", " ", t)
    t = re.sub(r"\b[s]?\d{10,}\b", "", t, flags=re.I)
    t = re.sub(r"\bcard\s*\d{4}\b", "", t, flags=re.I)
    t = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "", t)
    t = re.sub(r"\s+", " ", t).strip()

    t = _remove_statement_boilerplate(t)
    t = _remove_store_numbers(t)
    t = _remove_locations(t)
    t = _remove_city_names(t)
    t = _strip_tlds(t)
    t = re.sub(r"\s+", " ", t).strip()

    canonical = _apply_merchant_variants(t)
    if canonical is not None:
        return canonical

    return _first_n_words(t, 3)
