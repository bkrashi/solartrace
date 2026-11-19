#!/usr/bin/env python3
"""Build data/case.js for SolarTrace.

Inputs (all JSON):
  research/records.json   Sayari + Tradeverifyd investigation output
  research/public.json    Tavily public-source research output
  data/editorial.json     hand-written layer: path, story, findings, geocodes, extra flags

Usage:
  python3 scripts/build_data.py <research_dir>

Every reference is validated; the script exits non-zero if anything dangles.
"""
import json, math, sys, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
research = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "research"

rec = json.loads((research / "records.json").read_text())
pub = json.loads((research / "public.json").read_text())
ed = json.loads((ROOT / "data" / "editorial.json").read_text())

ISO = {  # world-atlas numeric ids
    "China": "156", "United States": "840", "USA": "840", "Vietnam": "704", "Viet Nam": "704",
    "Malaysia": "458", "Thailand": "764", "Cambodia": "116", "Indonesia": "360", "Laos": "418",
    "India": "356", "South Korea": "410", "Korea, Republic of": "410", "Japan": "392", "Germany": "276",
    "Singapore": "702", "Hong Kong": "344", "Taiwan": "158", "Norway": "578", "Canada": "124",
    "Mexico": "484", "Turkey": "792", "Philippines": "608", "United Kingdom": "826",
    "British Virgin Islands": "092", "Cayman Islands": "136", "Netherlands": "528", "Bermuda": "060",
}

STAGES = [
    {"id": "silicon", "label": "Silicon metal", "hint": "Quartz is smelted into metallurgical-grade silicon"},
    {"id": "polysilicon", "label": "Polysilicon", "hint": "Silicon is purified into solar-grade polysilicon"},
    {"id": "wafer", "label": "Ingots & wafers", "hint": "Polysilicon is cast into ingots and sliced"},
    {"id": "cell", "label": "Cells", "hint": "Wafers become light-capturing cells"},
    {"id": "module", "label": "Modules", "hint": "Cells are assembled into panels"},
    {"id": "importer", "label": "US importer", "hint": "Panels enter the US market"},
    {"id": "holding", "label": "Holding company", "hint": "Owns or controls producers"},
    {"id": "owner", "label": "Ultimate owner", "hint": "Beneficial owner at the top of the chain"},
]

errors = []

# ---------- sources ----------
sources = {}
for sid, s in rec.get("sources", {}).items():
    sources[sid] = {"provider": s.get("provider", "sayari"), "title": s.get("title", ""), "record_id": s.get("record_id"),
                    "url": s.get("url"), "note": s.get("note")}
for sid, s in pub.get("sources", {}).items():
    sources[sid] = {"provider": "tavily", "title": s["title"], "publisher": s.get("publisher"), "date": s.get("date"),
                    "url": s["url"], "type": s.get("type")}
for sid, s in ed.get("sources", {}).items():
    sources[sid] = s

# ---------- entities ----------
entities = []
for e in rec["entities"]:
    e = dict(e)
    if e["id"] in ed.get("drop_entities", []):
        continue
    ov = ed.get("entity_overrides", {}).get(e["id"], {})
    e.update(ov)
    geo = ed.get("geo", {}).get(e["id"])
    if geo:
        e["lat"], e["lon"] = geo[0], geo[1]
        e["approx"] = bool(geo[2]) if len(geo) > 2 else True
    e["country_iso"] = ISO.get(e.get("country") or "", None)
    e["flags"] = list(e.get("flags") or []) + ed.get("extra_flags", {}).get(e["id"], [])
    e["source_ids"] = list(dict.fromkeys((e.get("source_ids") or []) + ed.get("extra_sources", {}).get(e["id"], [])))
    entities.append(e)
for e in ed.get("extra_entities", []):
    e = dict(e)
    e["country_iso"] = ISO.get(e.get("country") or "", None)
    entities.append(e)

# jitter coincident points so they don't overlap on the globe
seen = {}
for e in entities:
    if e.get("lat") is None:
        continue
    key = (round(e["lat"], 1), round(e["lon"], 1))
    n = seen.get(key, 0)
    if n:
        ang = n * 2.4
        e["lat"] = round(e["lat"] + 0.35 * math.sin(ang) * (1 + n * 0.25), 4)
        e["lon"] = round(e["lon"] + 0.35 * math.cos(ang) * (1 + n * 0.25), 4)
    seen[key] = n + 1

ids = {e["id"] for e in entities}

# ---------- relationships ----------
rels = [r for r in rec["relationships"] if r["from"] in ids and r["to"] in ids and r["id"] not in ed.get("drop_relationships", [])]
for r in rec["relationships"]:
    if (r["from"] not in ids or r["to"] not in ids) and r["id"] not in ed.get("drop_relationships", []):
        errors.append(f"relationship {r['id']} references unknown entity")
rels += ed.get("extra_relationships", [])
for r in rels:
    r.update(ed.get("relationship_overrides", {}).get(r["id"], {}))

# ---------- facts / timeline ----------
featured = ed.get("featured_facts", [])
facts = []
for f in pub.get("facts", []):
    f = dict(f)
    if f["id"] in featured:
        f["featured"] = True
        f["order"] = featured.index(f["id"])
    facts.append(f)
facts.sort(key=lambda f: f.get("order", 99))

timeline = pub.get("timeline", []) + ed.get("extra_timeline", [])

# ---------- validate ----------
def chk_sources(where, lst):
    for s in lst or []:
        if s not in sources:
            errors.append(f"{where}: unknown source {s}")

for e in entities:
    chk_sources(f"entity {e['id']}", e.get("source_ids"))
    for fl in e.get("flags", []):
        chk_sources(f"entity {e['id']} flag", fl.get("source_ids"))
    if e.get("status") not in ("verified", "suspected", "missing"):
        errors.append(f"entity {e['id']} bad status {e.get('status')}")
for r in rels:
    chk_sources(f"rel {r['id']}", r.get("source_ids"))
    if r["from"] not in ids or r["to"] not in ids:
        errors.append(f"rel {r['id']} dangling endpoint")
for f in ed["findings"]:
    chk_sources(f"finding {f['id']}", f.get("source_ids"))
    for x in f.get("focus", {}).get("entities", []):
        if x not in ids:
            errors.append(f"finding {f['id']} unknown entity {x}")
for s in ed["story"]:
    chk_sources(f"story {s['title'][:20]}", s.get("source_ids"))
    for x in s.get("focus", []):
        if x not in ids:
            errors.append(f"story '{s['title'][:30]}' unknown entity {x}")
for sc in ed.get("present", []):
    for x in sc.get("add", []) + ([sc["focus"]] if sc.get("focus") else []):
        if x not in ids:
            errors.append(f"present {sc['id']} unknown entity {x}")
    for x in sc.get("rels", []):
        if x not in {r["id"] for r in rels}:
            errors.append(f"present {sc['id']} unknown relationship {x}")
    if sc.get("stat"):
        chk_sources(f"present {sc['id']}", [sc["stat"]["source"]])
for x in ed["meta"]["path"]:
    if x not in ids:
        errors.append(f"path unknown entity {x}")
for t in timeline:
    chk_sources(f"timeline {t['date']}", t.get("source_ids"))
for f in facts:
    chk_sources(f"fact {f['id']}", f.get("source_ids"))

if errors:
    print("ERRORS:\n  " + "\n  ".join(errors))
    sys.exit(1)

meta = dict(ed["meta"])
meta.setdefault("retrieved", rec.get("case", {}).get("retrieved") or pub.get("retrieved"))
meta["built"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
meta["providers"] = {
    "sayari": {"status": "live", "label": "Corporate, ownership & shipment records", "retrieved": meta["retrieved"]},
    "tradeverifyd": {"status": "live", "label": "Trade relationships, annotations & scores", "retrieved": meta["retrieved"]},
    "tavily": {"status": "live", "label": "Government notices, research & news", "retrieved": pub.get("retrieved")},
}

out = {
    "meta": meta,
    "stages": STAGES,
    "entities": entities,
    "relationships": rels,
    "sources": sources,
    "findings": ed["findings"],
    "story": ed["story"],
    "present": ed.get("present", []),
    "glossary": ed.get("glossary", {}),
    "facts": facts,
    "timeline": timeline,
    "designations": pub.get("entity_designations", []),
    "gaps": rec.get("gaps", []) + ed.get("extra_gaps", []),
    "notes": ed.get("notes", rec.get("notes", "")),
}
dest = ROOT / "data" / "case.js"
dest.write_text("/* Generated by scripts/build_data.py: do not edit by hand */\nwindow.SOLARTRACE = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
print(f"wrote {dest.relative_to(ROOT)}: {len(entities)} entities, {len(rels)} relationships, {len(sources)} sources, "
      f"{len(ed['findings'])} findings, {len(ed['story'])} story steps, {len(timeline)} timeline events")
