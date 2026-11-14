# Lunexis Web

Static comparison tool for hourly 2027 Sun and Earth visibility at four approximate lunar south-pole sites. The existing Flask application is separate and is not used by this site.

## Run the site

From the repository root, start Python's static file server:

```powershell
python -m http.server 4173 --directory lunexis-web
```

Open <http://localhost:4173>. No Node.js build step or runtime backend is required.

## Regenerate the data

The data builder uses Skyfield and NumPy in an isolated virtual environment. From the repository root:

```powershell
python -m venv lunexis-web/.venv
lunexis-web/.venv/Scripts/python.exe -m pip install -r lunexis-web/precompute/requirements.txt
lunexis-web/.venv/Scripts/python.exe lunexis-web/precompute/build_data.py
```

The script downloads the DE421 ephemeris and lunar frame/orientation kernels into `precompute/kernels/`, then writes compact data to `public/data/`.

## Check calculations

With the static server running, open <http://localhost:4173/tests/analysis.test.html> to run the dependency-free browser checks for visibility thresholds, percentages, longest runs, timeline aggregation, and UTC data boundaries.

## Method and limits

The precomputed observer positions use Skyfield's DE421-specific realization of the Moon mean-Earth/polar-axis frame, at 2 m above a spherical Moon with 1,737.4 km radius. Sun and Earth positions are apparent hourly positions in UTC. Power counts hours for which Sun center elevation plus the 0.267-degree solar angular radius exceeds a zero-degree horizon. Earth link counts hours for which Earth center elevation exceeds zero degrees. Both use a flat horizon; terrain is not included. Sites are approximate, and hourly sampling can miss shorter visibility events.

The data files are sourced from NASA/JPL NAIF public SPICE kernels. This is a research visualization, not a navigation product or NASA endorsement.