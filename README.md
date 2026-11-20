# SolarTrace

**Who made the sunlight?** SolarTrace is an interactive investigation that traces a real solar supply chain, from Trina Solar's US import entities back through module plants in Vietnam and Thailand, a wafer maker in Tianjin, and a polysilicon producer in Xinjiang that is on the UFLPA Entity List.

Every company, link and claim carries one evidence label:

| Label | Meaning |
|---|---|
| **Verified record** | A retrievable record: shipment records, registry filings, official government designations |
| **Suspected exposure** | Indicators only: company-level trade relationships, risk annotations, inferred ownership |
| **Missing information** | We looked and found no record. Shown, never hidden |

Live site: https://bkrashi.github.io/solartrace/

## Pages

| Route | What it is |
|---|---|
| `#/present` | **Presentation**: 13 scenes, the chain builds itself on the globe |
| `#/` | Story: hero globe, scroll-driven walk up the chain, key facts, glossary |
| `#/globe` | Full-screen 3D globe with animated trade arcs, list-status pulses and a guided camera tour |
| `#/network` | 3D ownership & trade network. "Build it step by step" grows the web company by company |
| `#/companies` | Searchable, filterable company directory |
| `#/company/<id>` | Company file: role, flags, upstream/downstream links, mini-map, record IDs |
| `#/findings` | Six findings, each split into verified / suspected / missing |
| `#/timeline` | Enforcement timeline 2021–2026 from public sources |
| `#/method` | Evidence rules, pipeline, limitations, known gaps |
| `#/sources` | Every Sayari / Tradeverifyd record and Tavily document, searchable |

## Presenting (3 minutes)

Press **▶ Present** (top right) or the `P` key. It opens a full-screen story with 13 short scenes. With each click the supply chain **draws itself on the 3D globe**, one company and one shipping line at a time, while a progress bar (USA → panel factories → China HQ → wafers → Xinjiang plant → raw silicon) fills in green, orange or grey.

| Keys | |
|---|---|
| `→` / `Space` / clicker | next scene |
| `←` | back |
| `F` | full screen |
| `Esc` | exit |

The timer in the corner counts up so you can pace yourself (about 12–14 seconds per scene). **Auto** plays it hands-free. Link to any scene with `#/present?s=5`.

Suggested flow: Present mode (2 min) → open the **Network** and press **Build it step by step** (30 s) → open one **company file** (30 s).

## Plain language

- Evidence labels are **Proven** (we have the paperwork), **Suspected** (clues, no paperwork) and **Unknown** (we looked, found nothing). The Method page maps these to the technical terms.
- Every page, finding and company has one highlighted key sentence (amber callout with a sun icon) to read out loud.
- Dotted words (polysilicon, wafer, UFLPA, blacklist, Xinjiang…) show a definition on hover; the full glossary is on the Method page.
- Companies have simple names ("Panel factory in Vietnam") with the registered name underneath.

## Data: where it comes from and how to refresh it

Data was pulled from live MCP connections on 19 Nov 2026:

- **Sayari**: entity profiles, beneficial ownership, upstream supply-chain traces, shipment records, risk factors
- **Tradeverifyd**: trade relationships, affiliates, annotations (UFLPA, BIS Entity List, Section 1260H), scores, addresses
- **Tavily**: government notices (DHS, CBP, Federal Register, Commerce), Sheffield Hallam research, IEA and Bernreuter market data, news

```
research/records.json   Sayari + Tradeverifyd trace (record IDs for every claim)
research/public.json    Tavily public-source research (URLs, dates, facts, timeline)
data/editorial.json     Hand-written layer: story steps, findings, map positions, corrections
scripts/build_data.py   Merges the three, validates every reference, writes data/case.js
```

To refresh: re-run the investigation with Claude Code (Sayari, Tradeverifyd and Tavily MCP servers connected) to regenerate `research/*.json`, then:

```sh
python3 scripts/build_data.py research
git commit -am "Refresh data" && git push   # GitHub Pages redeploys in ~1 min
```

The site is static, so it does not query the data providers from the browser. That would expose API keys. "Live" means the data is pulled from the live services and timestamped. It is not streamed in real time.

## Editorial decisions

- Individual (natural-person) shareholders returned by Sayari are not published.
- Xinjiang GCL's UFLPA listing date is shown as 21 June 2022 (DHS). Tradeverifyd records 3 Aug 2026, the date the listing was renamed.
- An affiliate link between Maxeon and TCL Zhonghuan with an unconfirmed direction is omitted.
- Neither data provider returned coordinates, so map positions are approximate, at city or country level.

A "suspected" or "missing" label is not a finding that any company uses forced labour.

## Run locally

No build step needed to view: open `index.html`, or `python3 -m http.server`. The 3D libraries (globe.gl 2.46.1, 3d-force-graph 1.80.0) and the world map (world-atlas 2.0.2) load from jsDelivr when their page opens.
