# SolarTrace

An investigation dashboard that helps non-experts understand forced-labour exposure in solar supply chains. Every claim is labelled **verified record**, **suspected exposure** or **missing information**.

> **Sample data notice.** The companies, record IDs and shipment counts in `js/data.sample.js` are fictional. They show the shape of Sayari and Tradeverifyd evidence. The sector-context links (prefixed `T-`) are real public documents retrieved with Tavily on 19 Nov 2026.

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Views

| # | View | What it shows |
|---|------|---------------|
| 01 | The problem | Why polysilicon matters, real context figures with sources, the six-step chain, the three evidence labels |
| 02 | The network | SVG ownership + trade graph. Click nodes or lines for records. **Trace exposure path** highlights importer → origin |
| 03 | Findings | Each finding split into verified / suspected / missing columns, with Sayari, Tradeverifyd and Tavily source links |

## 3-minute demo

Press **3-min demo** (or `D`). A presenter bar shows a countdown, the talking point and the time cue for each step. Each step drives the UI for you.

| Cue | Step | Screen action |
|-----|------|---------------|
| 0:00 | The problem | Landing hero and stats |
| 0:30 | Our rule: three labels | Scrolls to the evidence explainer |
| 0:55 | Start at the importer | Network, selects Lumen Ridge |
| 1:25 | Trace exposure | Animated path; the trail turns amber at XUAR polysilicon |
| 1:55 | What's missing matters | Selects the unidentified wafer source |
| 2:20 | Findings | Findings view |
| 2:45 | Next: live MCP data | Scrolls to "From sample to live" |

Keys: `→` / `PageDown` next (presentation clickers work), `←` back, `Esc` exit, `D` toggle demo, `1` `2` `3` switch views.

## Connecting live MCP data

All UI reads one global, `window.SOLARTRACE_DATA`. To go live, generate a file with the same shape from MCP responses and load it instead of `js/data.sample.js`. Set `meta.mode = "live"` and the sample ribbon disappears.

| SolarTrace field | Source tool(s) |
|------------------|----------------|
| `entities[]` | Sayari `search_entities`, `get_entity_profile`; Tradeverifyd `search_entities`, `entity_details` |
| `relationships[type=ownership]` | Sayari `find_beneficial_owners`, `find_downstream_entities` |
| `relationships[type=trade]` | Sayari `search_shipments`, `get_upstream_supply_chain`; Tradeverifyd `entity_trade_relationships` |
| suspected indicators | Tradeverifyd `entity_annotations`, `annotated_relationship_paths`; Sayari `check_watchlist`, risk factors |
| `sources[S-*]` | Sayari `get_record` (record provenance), Tradeverifyd relationship / annotation IDs |
| `sources[T-*]` | Tavily `tavily_search` / `tavily_extract` |

### Evidence rules (apply when mapping)

- **verified**: backed by a retrievable record (registry filing, bill of lading, customs declaration).
- **suspected**: indicators only (annotations, press or procurement announcements, shared officers or addresses, co-location) with no direct record.
- **missing**: the question was asked and no record answered it (undisclosed owners, unexplained volume gaps). Represent these as `kind: "gap"` entities or `status: "missing"` links. Don't drop them.

Node positions (`x`, `y`) are in a 1180×672 canvas. Stage columns are at x = 90, 290, 490, 690, 890, 1090. The ownership band is above y = 245.

## Files

```
index.html          page shell and static copy
css/styles.css      editorial theme (ivory / forest / amber), responsive
js/data.sample.js   illustrative dataset + real Tavily context sources
js/app.js           router, network renderer, findings, demo presenter
```
