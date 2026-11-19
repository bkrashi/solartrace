/*
 * SolarTrace — ILLUSTRATIVE SAMPLE DATASET
 * ------------------------------------------------------------------
 * Every company, person, record ID and shipment count in `entities`,
 * `relationships` and `records` below is FICTIONAL. They show the shape
 * of the evidence SolarTrace expects from the Sayari and Tradeverifyd
 * MCP servers. Do not cite them as facts about any real company.
 *
 * The `sources` entries with provider "tavily" are REAL public documents
 * (retrieved via Tavily search on 19 Nov 2026). They provide sector
 * context only. They say nothing about the fictional companies here.
 *
 * To go live, replace this file with one that sets the same global shape
 * from MCP responses (see README.md → "Connecting live MCP data").
 */
window.SOLARTRACE_DATA = {
  meta: {
    mode: "sample", // "sample" | "live"
    title: "Lumen Ridge Energy, a sample US solar importer",
    generated: "2026-11-19",
    providers: {
      sayari: { status: "sample", label: "Sayari · ownership & trade graph" },
      tradeverifyd: { status: "sample", label: "Tradeverifyd · trade relationships & risk annotations" },
      tavily: { status: "live", label: "Tavily · public reporting (sector context)" }
    }
  },

  // Supply-chain stages, left → right in the network view
  stages: [
    { id: "raw", label: "Silicon metal", hint: "Quartz is smelted into metallurgical-grade silicon" },
    { id: "poly", label: "Polysilicon", hint: "Silicon is purified into polysilicon" },
    { id: "wafer", label: "Ingots & wafers", hint: "Polysilicon is cast and sliced into wafers" },
    { id: "cell", label: "Cells", hint: "Wafers become light-capturing cells" },
    { id: "module", label: "Modules", hint: "Cells are assembled into panels" },
    { id: "buyer", label: "US importer", hint: "Panels enter the US market" }
  ],

  entities: [
    {
      id: "lumen", name: "Lumen Ridge Energy, Inc.", short: "Lumen Ridge", stage: "buyer",
      country: "United States", flag: "US", kind: "company", status: "verified",
      role: "Imports finished solar modules for utility-scale projects.",
      x: 1090, y: 420, sources: ["S-SAY-101"]
    },
    {
      id: "pacifica", name: "Pacifica Module Co., Ltd.", short: "Pacifica Module", stage: "module",
      country: "Vietnam", flag: "VN", kind: "company", status: "verified",
      role: "Assembles modules. Lumen Ridge's sole module supplier in the sample period.",
      x: 890, y: 420, sources: ["S-SAY-102", "S-TV-201"]
    },
    {
      id: "sunvale", name: "Sunvale Cell Technology Sdn. Bhd.", short: "Sunvale Cell", stage: "cell",
      country: "Malaysia", flag: "MY", kind: "company", status: "verified",
      role: "Manufactures PV cells and sells most of them to Pacifica.",
      x: 690, y: 420, sources: ["S-SAY-103"]
    },
    {
      id: "orion", name: "Orion Wafer Group Co.", short: "Orion Wafer", stage: "wafer",
      country: "China (Jiangsu)", flag: "CN", kind: "company", status: "verified",
      role: "Casts ingots and slices wafers. Supplies about 45% of Sunvale's wafers by volume.",
      x: 490, y: 420, sources: ["S-SAY-104", "S-TV-203"]
    },
    {
      id: "nordic", name: "Nordwafer AS", short: "Nordwafer", stage: "wafer",
      country: "Norway", flag: "NO", kind: "company", status: "verified",
      role: "Wafer maker with third-party traceability audits. Supplies about 15% of Sunvale's wafers.",
      x: 490, y: 290, sources: ["S-TV-204"]
    },
    {
      id: "unknownWafer", name: "Unidentified wafer source", short: "Unidentified source", stage: "wafer",
      country: "Unknown", flag: "??", kind: "gap", status: "missing",
      role: "About 40% of Sunvale's wafer inputs match no shipment record in either dataset.",
      x: 490, y: 548, sources: []
    },
    {
      id: "redstone", name: "Redstone Polysilicon Co.", short: "Redstone Poly", stage: "poly",
      country: "China (XUAR)", flag: "CN", kind: "company", status: "suspected", xuar: true,
      role: "Polysilicon producer located in the Xinjiang Uyghur Autonomous Region.",
      x: 290, y: 420, sources: ["S-TV-205", "S-SAY-106"]
    },
    {
      id: "qarasu", name: "Qarasu Metallurgical Silicon Ltd.", short: "Qarasu Silicon", stage: "raw",
      country: "China (XUAR)", flag: "CN", kind: "company", status: "suspected", xuar: true,
      role: "Silicon-metal smelter. Its trade annotations mention participation in a regional labour-transfer programme.",
      x: 90, y: 420, sources: ["S-TV-206"]
    },
    {
      id: "harbor", name: "Harbor Crest Holdings Ltd.", short: "Harbor Crest", stage: null,
      country: "Hong Kong SAR", flag: "HK", kind: "holding", status: "verified",
      role: "Investment holding company. A registry filing shows it is the majority owner of Pacifica.",
      x: 690, y: 165, sources: ["S-SAY-107"]
    },
    {
      id: "ubo", name: "Undisclosed beneficial owner", short: "Owner unknown", stage: null,
      country: "Unknown", flag: "??", kind: "gap", status: "missing",
      role: "Harbor Crest's shareholders are nominee companies. The natural-person owner is not disclosed.",
      x: 440, y: 165, sources: []
    }
  ],

  relationships: [
    // ---------- Trade ----------
    {
      id: "r1", type: "trade", from: "pacifica", to: "lumen", status: "verified",
      label: "412 shipments", product: "PV modules · HS 8541.43",
      detail: "412 bills of lading from Pacifica to Lumen Ridge, Jan 2025 – Sep 2026.",
      provider: "tradeverifyd", records: ["S-TV-201"]
    },
    {
      id: "r2", type: "trade", from: "sunvale", to: "pacifica", status: "verified",
      label: "188 shipments", product: "PV cells · HS 8541.42",
      detail: "188 export declarations from Sunvale to Pacifica.",
      provider: "sayari", records: ["S-SAY-103"]
    },
    {
      id: "r3", type: "trade", from: "orion", to: "sunvale", status: "verified",
      label: "38 shipments", product: "Wafers · HS 3818.00",
      detail: "38 shipments of silicon wafers, about 45% of Sunvale's wafer intake by weight.",
      provider: "sayari", records: ["S-SAY-104"]
    },
    {
      id: "r4", type: "trade", from: "nordic", to: "sunvale", status: "verified",
      label: "11 shipments", product: "Wafers · HS 3818.00",
      detail: "11 shipments, backed by a third-party chain-of-custody audit.",
      provider: "tradeverifyd", records: ["S-TV-204"]
    },
    {
      id: "r5", type: "trade", from: "unknownWafer", to: "sunvale", status: "missing",
      label: "≈40% unaccounted", product: "Wafers · HS 3818.00",
      detail: "Sunvale's cell output implies more wafer input than the known shipments supply. The rest has no matching record in either dataset.",
      provider: "derived", records: []
    },
    {
      id: "r6", type: "trade", from: "redstone", to: "orion", status: "suspected",
      label: "procurement reported", product: "Polysilicon · HS 2804.61",
      detail: "Tradeverifyd annotates a supply agreement drawn from corporate announcements. No shipment-level record has been found.",
      provider: "tradeverifyd", records: ["S-TV-205"]
    },
    {
      id: "r7", type: "trade", from: "qarasu", to: "redstone", status: "suspected",
      label: "co-located supplier", product: "Silicon metal · HS 2804.69",
      detail: "Same industrial park, and Qarasu is named as a feedstock supplier in a Redstone annual report. There is no customs record.",
      provider: "tradeverifyd", records: ["S-TV-206"]
    },

    // ---------- Ownership ----------
    {
      id: "o1", type: "ownership", from: "harbor", to: "pacifica", status: "verified",
      label: "70% owned", detail: "A Vietnam enterprise registry filing lists Harbor Crest as holder of 70% of Pacifica's charter capital.",
      provider: "sayari", records: ["S-SAY-107"]
    },
    {
      id: "o2", type: "ownership", from: "harbor", to: "orion", status: "suspected",
      label: "shared director", detail: "One director sits on the boards of both Harbor Crest and Orion. No shareholding filing links them.",
      provider: "sayari", records: ["S-SAY-108"]
    },
    {
      id: "o3", type: "ownership", from: "ubo", to: "harbor", status: "missing",
      label: "owner not disclosed", detail: "Harbor Crest's shareholders are two nominee companies (BVI). Their ultimate beneficial owner is unknown.",
      provider: "sayari", records: []
    }
  ],

  // The path the "Trace exposure" button highlights (importer → origin)
  exposurePath: ["lumen", "pacifica", "sunvale", "orion", "redstone", "qarasu"],

  findings: [
    {
      id: "F1", status: "suspected", severity: "high",
      title: "Lumen Ridge's panels may contain polysilicon from the Xinjiang region",
      summary: "Every link from Lumen Ridge back to Orion Wafer is documented. The final link, from Orion to an XUAR polysilicon producer, rests on a reported supply agreement and not on shipment records.",
      verified: [
        "Pacifica → Lumen Ridge: 412 module shipments (bills of lading)",
        "Sunvale → Pacifica: 188 cell shipments (export declarations)",
        "Orion → Sunvale: 38 wafer shipments, about 45% of Sunvale's intake"
      ],
      suspected: [
        "Orion buys polysilicon from Redstone (XUAR), per a reported procurement agreement",
        "Redstone's feedstock comes from Qarasu, a smelter linked to labour-transfer reporting"
      ],
      missing: [
        "No shipment-level record of polysilicon moving from Redstone to Orion",
        "No mass-balance data showing which Orion wafers went to Sunvale"
      ],
      whyItMatters: "Under the UFLPA, goods made wholly or partly in the XUAR are presumed to be made with forced labour. An importer must rebut that presumption with documentation.",
      focus: { path: true, node: "redstone" },
      sources: ["S-TV-201", "S-SAY-103", "S-SAY-104", "S-TV-205", "T-RST", "T-CBP"]
    },
    {
      id: "F2", status: "missing", severity: "high",
      title: "40% of Sunvale's wafer supply cannot be traced",
      summary: "Sunvale produces more cells than its known wafer shipments can supply. The source of the rest is unknown.",
      verified: [
        "Sunvale's cell exports total about 2.1 GW over the sample period",
        "Known wafer imports (Orion and Nordwafer) cover about 60% of that output"
      ],
      suspected: [],
      missing: [
        "The wafer source for about 40% of production",
        "Whether Sunvale buys wafers domestically or through trading intermediaries"
      ],
      whyItMatters: "A gap is not evidence of wrongdoing. It is a gap the importer must close before it can show its supply chain is clean.",
      focus: { node: "unknownWafer" },
      sources: ["S-SAY-103", "S-TV-204"]
    },
    {
      id: "F3", status: "verified", severity: "medium",
      title: "Pacifica is majority-owned by a Hong Kong holding company",
      summary: "A registry filing confirms that Harbor Crest owns 70% of Pacifica. Above Harbor Crest, the trail runs into nominee shareholders.",
      verified: [
        "Harbor Crest holds 70% of Pacifica (Vietnam enterprise registry)"
      ],
      suspected: [
        "Harbor Crest may also control Orion Wafer (one director serves on both boards)"
      ],
      missing: [
        "Harbor Crest's natural-person beneficial owner (the shareholders are BVI nominees)"
      ],
      whyItMatters: "Common ownership between a module maker and a wafer maker can mean supply is steered across borders. That pattern is a known way to obscure where materials came from.",
      focus: { node: "harbor" },
      sources: ["S-SAY-107", "S-SAY-108"]
    },
    {
      id: "F4", status: "verified", severity: "low",
      title: "One wafer stream has documented, audited origin",
      summary: "Nordwafer's 11 shipments to Sunvale carry a third-party chain-of-custody audit. This is the cleanest path in the network.",
      verified: [
        "Nordwafer → Sunvale: 11 shipments with an audited chain of custody",
        "Nordwafer polysilicon is sourced outside China (audit scope)"
      ],
      suspected: [],
      missing: [
        "Whether Sunvale keeps Nordwafer-based cells separate from its other cells"
      ],
      whyItMatters: "Clean inputs help only if they can be shown to end up in the panels the importer actually bought.",
      focus: { node: "nordic" },
      sources: ["S-TV-204", "T-SOL"]
    },
    {
      id: "F5", status: "suspected", severity: "high",
      title: "Polysilicon from the region is widely linked to state labour-transfer programmes",
      summary: "This is real context from public research. Polysilicon producers in Xinjiang have been documented taking part in labour-transfer programmes, and the region supplies a large share of world output.",
      verified: [
        "US authorities have added polysilicon-linked companies to the UFLPA Entity List (CBP bulletin)",
        "UFLPA enforcement began on 21 June 2022, and CBP lists polysilicon as a high-priority sector"
      ],
      suspected: [
        "Researchers report that major XUAR polysilicon producers took part in state labour-transfer programmes"
      ],
      missing: [
        "Independent on-site verification. Auditors report they cannot work freely in the region"
      ],
      whyItMatters: "This context is why a suspected link to an XUAR producer weighs heavily, even when it is unconfirmed.",
      focus: { node: "qarasu" },
      context: true,
      sources: ["T-CBP", "T-SHU", "T-SOL", "T-SCMP", "T-BI"]
    }
  ],

  // Record & source registry. S-* are FICTIONAL sample records. T-* are REAL public URLs from Tavily.
  sources: {
    "S-SAY-101": { provider: "sayari", sample: true, title: "Entity profile: Lumen Ridge Energy, Inc. (US corporate registry)", ref: "sample-entity-lumen" },
    "S-SAY-102": { provider: "sayari", sample: true, title: "Entity profile: Pacifica Module Co., Ltd. (VN enterprise registry)", ref: "sample-entity-pacifica" },
    "S-SAY-103": { provider: "sayari", sample: true, title: "Shipment set: Sunvale → Pacifica, HS 8541.42 (188 records)", ref: "sample-shipments-sunvale" },
    "S-SAY-104": { provider: "sayari", sample: true, title: "Shipment set: Orion → Sunvale, HS 3818.00 (38 records)", ref: "sample-shipments-orion" },
    "S-SAY-106": { provider: "sayari", sample: true, title: "Risk factors: Redstone Polysilicon (XUAR location)", ref: "sample-risk-redstone" },
    "S-SAY-107": { provider: "sayari", sample: true, title: "Registry filing: Harbor Crest holds 70% of Pacifica", ref: "sample-record-ownership" },
    "S-SAY-108": { provider: "sayari", sample: true, title: "Officer record: shared director, Harbor Crest / Orion", ref: "sample-record-officer" },
    "S-TV-201": { provider: "tradeverifyd", sample: true, title: "Trade relationship: Pacifica → Lumen Ridge (412 BoLs)", ref: "sample-trade-pacifica" },
    "S-TV-203": { provider: "tradeverifyd", sample: true, title: "Entity score: Orion Wafer Group", ref: "sample-score-orion" },
    "S-TV-204": { provider: "tradeverifyd", sample: true, title: "Trade relationship: Nordwafer → Sunvale, audited chain of custody", ref: "sample-trade-nordic" },
    "S-TV-205": { provider: "tradeverifyd", sample: true, title: "Annotation: reported Redstone–Orion polysilicon supply agreement", ref: "sample-annotation-redstone" },
    "S-TV-206": { provider: "tradeverifyd", sample: true, title: "Annotation: Qarasu labour-transfer programme reporting", ref: "sample-annotation-qarasu" },

    "T-CBP": { provider: "tavily", sample: false, title: "CBP CSMS #63743803: DHS places new additions to the UFLPA Entity List", publisher: "U.S. Customs and Border Protection", url: "https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3cca73b" },
    "T-RST": { provider: "tavily", sample: false, title: "Commodity Report: Polysilicon (2025)", publisher: "Responsible Sourcing Tool", url: "https://www.responsiblesourcingtool.org/wp-content/uploads/2025/11/2025-Polysilicon-Commodity-Report-Final.pdf" },
    "T-SHU": { provider: "tavily", sample: false, title: "Forced Labour Reports: solar supply chain research", publisher: "Sheffield Hallam University, Helena Kennedy Centre", url: "https://www.shu.ac.uk/helena-kennedy-centre-international-justice/research-and-projects/all-projects/forced-labour-reports" },
    "T-SOL": { provider: "tavily", sample: false, title: "Navigating the Uyghur Forced Labor Prevention Act", publisher: "Sol Systems", url: "https://www.solsystems.com/navigating-the-uflpa" },
    "T-SCMP": { provider: "tavily", sample: false, title: "US ban on China's Xinjiang solar products heaps pressure on supply chains", publisher: "SCMP via Yahoo Finance", url: "https://finance.yahoo.com/news/us-ban-chinas-xinjiang-solar-093000960.html" },
    "T-BI": { provider: "tavily", sample: false, title: "Forced labor in China's solar panel supply chain: researchers", publisher: "Business Insider", url: "https://www.businessinsider.com/forced-uyghur-labor-china-solar-panel-supply-chain-research-report-2022-11" }
  },

  // Real figures for the landing page, each tied to a Tavily source
  context: [
    { value: "≈45%", label: "of the world's polysilicon came from factories in Xinjiang, the region at the centre of forced-labour reporting", source: "T-SCMP" },
    { value: "2022", label: "the year US enforcement of the Uyghur Forced Labor Prevention Act began (21 June)", source: "T-SOL" },
    { value: "Presumed", label: "goods made wholly or partly in the region are presumed made with forced labour unless the importer proves otherwise", source: "T-RST" }
  ]
};
