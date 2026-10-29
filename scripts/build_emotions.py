#!/usr/bin/env python3
"""Build data/emotions.json for the Emotion CAD from Resona's emotion catalog.

Usage: python3 scripts/build_emotions.py path/to/resona/resources/emotions.json

Keeps, per emotion, the three sampling deltas and the names in every language,
and per intensifier its multiplier and names. It also lists the emotion clips
present under audio/emotions/<lang>/<emotion>-<intensity>.opus, so the page
offers a play button only for clips that exist.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIPS = ROOT / "audio" / "emotions"
OUT = ROOT / "data" / "emotions.json"

# Base values in EmotionManager.calculate_parameters (src/emotions/manager.py).
BASE = {"temp": 0.9, "penalty": 1.05, "top_p": 1.0}


def main(catalog_path: str) -> None:
    catalog = json.loads(Path(catalog_path).read_text(encoding="utf-8"))
    emotions = catalog["emotions"]
    langs = list(next(iter(emotions.values()))["localized_names"])

    def names(entry):
        return [entry["localized_names"].get(lang) or "" for lang in langs]

    out = {
        "base": BASE,
        "langs": langs,
        "emotions": {
            eid: [e["modifiers"].get("temp", 0.0), e["modifiers"].get("penalty", 0.0),
                  e["modifiers"].get("top_p", 0.0), names(e)]
            for eid, e in emotions.items()
        },
        "intensifiers": {
            iid: [i["multiplier"], names(i)]
            for iid, i in sorted(catalog["intensifiers"].items(), key=lambda kv: kv[1]["multiplier"])
        },
        "clips": {
            d.name: sorted(f.stem for f in d.glob("*.opus"))
            for d in sorted(CLIPS.glob("*")) if d.is_dir()
        },
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    clips = sum(len(v) for v in out["clips"].values())
    print(f"{len(out['emotions'])} emotions, {len(out['intensifiers'])} intensifiers, {clips} clips -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
