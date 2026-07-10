# G7 Presidency History

A source-backed history of the annual G6, G7, and G8 leaders’ meetings from 1975 through 2026, with an annotated account of the 1973 finance-minister network that preceded them, built to support policy preparation for the 2027 U.S. G7 presidency.

**Live site:** https://therealjameswilson.github.io/g7-presidency-history/

## What is included

- all 52 calendar-year leaders’ records from Rambouillet (1975) through Évian (2026)
- an annotated origins narrative using George P. Shultz’s memoir to trace the 1973 Library Group and finance-minister G5, while keeping that track distinct from the 1975–76 leaders’ sequence
- the G6 origin, G7 sequence, G8 period, 2014 Brussels replacement for Sochi, and 2020 virtual/no-in-person-summit anomaly
- search and filters for host, format, institutional era, and policy thread
- side-by-side comparison of up to three summits
- a policy-thread matrix showing agenda recurrence across institutional eras
- a seven-meeting U.S. host chronology and evidence-based 2027 handoff brief
- linked official documents or clearly labeled scholarly archival copies
- downloadable JSON and filtered CSV

## Scope boundary

“All meetings” means every annual presidency-year/leaders-level record in this release. G7 presidencies also convene ministerial, Sherpa, officials-level, and engagement-group meetings. Those are linked as supporting collections but are not yet normalized as separate records in version 1.0.

## Source policy

1. Official presidency and government records
2. Official archives and presidential libraries
3. The University of Toronto G7 Research Group documentary archive when original historical URLs are missing or unstable
4. Participant memoirs and reputable institutional histories for context and cross-checking, with retrospective evidence labeled and page-cited

Project summaries, tags, and comparison notes are orientation aids. The linked declaration, communiqué, chair’s summary, or official record controls.

See [the source research note](docs/source-research.md) for the master chronology, recent official records, the complete 2026 document set, and edge-case treatment.

## Local use

The site has no build step or runtime dependencies. Serve the repository root over HTTP:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Validation

```bash
npm test
```

The validator checks:

- exactly one record for every year from 1975 through 2026
- unique stable IDs and valid institutional eras
- required metadata, policy tags, document links, and source tiers
- the seven historical U.S. presidencies
- special handling for 2014 and 2020
- JavaScript syntax and local asset references

## Repository structure

```text
.
├── index.html                 # complete summit explorer
├── origins.html               # annotated 1972–76 institutional origins
├── briefing.html              # 2027 U.S. presidency brief
├── sources.html               # methodology and source register
├── assets/
│   ├── styles.css
│   ├── site.js
│   ├── explorer.js
│   └── briefing.js
├── data/
│   └── summits.json           # normalized annual summit data
├── docs/
│   └── source-research.md      # source strategy and research register
├── schemas/
│   └── summits.schema.json
└── tests/
    └── validate-data.mjs
```

## Corrections

Open an issue identifying the summit, field, proposed correction, and supporting official source. Do not silently replace an archival copy with an unsourced summary.

## License

Code and project-created text are released under the [MIT License](LICENSE). Linked source documents retain their original rights and attributions.
