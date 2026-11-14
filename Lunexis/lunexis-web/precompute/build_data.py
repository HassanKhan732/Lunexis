# Portions of this file were written with AI assistance.

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from skyfield.api import Loader, PlanetaryConstants


# Resolve all generated files relative to this script, not the caller's directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
KERNELS_DIR = Path(__file__).resolve().parent / "kernels"
DATA_DIR = PROJECT_ROOT / "public" / "data"

# Use the archived DE421 location and the NAIF satellite frame-kernel directory.
NAIF_ROOT = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
KERNEL_URLS = {
    "de421.bsp": f"{NAIF_ROOT}/spk/planets/a_old_versions/de421.bsp",
    "moon_080317.tf": f"{NAIF_ROOT}/fk/satellites/moon_080317.tf",
    "moon_pa_de421_1900-2050.bpc": (
        f"{NAIF_ROOT}/pck/moon_pa_de421_1900-2050.bpc"
    ),
}

# These approximate south-polar coordinates are the input sites for this build.
SITES = [
    {
        "id": "shackleton",
        "name": "Shackleton",
        "lat": -89.9,
        "lon": 0.0,
        "color": "#FC3D21",
        "note": "approximate coordinates",
    },
    {
        "id": "malapert",
        "name": "Malapert Massif",
        "lat": -85.9,
        "lon": 0.0,
        "color": "#8F7BFF",
        "note": "approximate coordinates",
    },
    {
        "id": "haworth",
        "name": "Haworth",
        "lat": -87.5,
        "lon": -5.0,
        "color": "#2DD4BF",
        "note": "approximate coordinates",
    },
    {
        "id": "faustini",
        "name": "Faustini",
        "lat": -87.3,
        "lon": 77.0,
        "color": "#FFC857",
        "note": "approximate coordinates",
    },
]

START_UTC = "2027-01-01T00:00:00Z"
STEP_MINUTES = 60
HOURS_PER_DAY = 24
DAYS_IN_2027 = 365
HOURS_IN_2027 = DAYS_IN_2027 * HOURS_PER_DAY


def download_kernels(loader: Loader) -> dict[str, Path]:
    """Download each requested NAIF kernel through Skyfield's loader."""
    kernel_paths = {}
    for filename, url in KERNEL_URLS.items():
        cached_path = KERNELS_DIR / filename
        if not cached_path.exists():
            loader.download(url, filename=filename)
        kernel_paths[filename] = cached_path
    return kernel_paths


def build_times(loader: Loader):
    """Build all UTC hourly times with NumPy arrays and one Skyfield call."""
    timescale = loader.timescale(builtin=True)
    day_numbers = np.repeat(np.arange(1, DAYS_IN_2027 + 1), HOURS_PER_DAY)
    hour_numbers = np.tile(np.arange(HOURS_PER_DAY), DAYS_IN_2027)
    return timescale.utc(2027, 1, day_numbers, hour_numbers)


def hundredths(values: np.ndarray) -> list[int]:
    """Round degrees to signed hundredths for compact integer JSON arrays."""
    return np.rint(values * 100).astype(np.int16).tolist()


def main() -> None:
    # Keep downloaded raw kernels separate from the public site data.
    KERNELS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    loader = Loader(str(KERNELS_DIR))

    # Load the ephemeris and lunar orientation data, then build the requested frame.
    kernel_paths = download_kernels(loader)
    ephemeris = loader(kernel_paths["de421.bsp"].name)
    earth = ephemeris["earth"]
    moon = ephemeris["moon"]
    sun = ephemeris["sun"]

    constants = PlanetaryConstants()
    constants.read_text(loader(kernel_paths["moon_080317.tf"].name))
    constants.read_binary(
        loader(kernel_paths["moon_pa_de421_1900-2050.bpc"].name)
    )
    # Section 6 defines the lunar surface as a sphere of radius 1,737.4 km.
    constants.variables["BODY301_RADII"] = [1737.4, 1737.4, 1737.4]
    # Skyfield 1.55 does not resolve the generic MOON_ME alias recursively.
    # This kernel defines it as an identity alias for the DE421-specific frame.
    frame = constants.build_frame_named("MOON_ME_DE421")

    # Share one vectorized UTC time array for all site and target observations.
    times = build_times(loader)
    sanity_rows = []

    for site_data in SITES:
        # Build a 2 m observer in the Moon-fixed mean-Earth/polar-axis frame.
        site = constants.build_latlon_degrees(
            frame,
            site_data["lat"],
            site_data["lon"],
            elevation_m=2,
        )
        observer = moon + site

        # Skyfield computes every hourly apparent altitude/azimuth as arrays.
        sun_altitude, sun_azimuth, _ = (
            observer.at(times).observe(sun).apparent().altaz()
        )
        earth_altitude, earth_azimuth, _ = (
            observer.at(times).observe(earth).apparent().altaz()
        )
        sun_elevation_degrees = sun_altitude.degrees
        earth_elevation_degrees = earth_altitude.degrees

        # Write one compact JSON file containing integer hundredths of degrees.
        output = {
            "startUtc": START_UTC,
            "stepMinutes": STEP_MINUTES,
            "sunEl": hundredths(sun_elevation_degrees),
            "sunAz": hundredths(sun_azimuth.degrees),
            "earthEl": hundredths(earth_elevation_degrees),
            "earthAz": hundredths(earth_azimuth.degrees),
        }
        output_path = DATA_DIR / f"{site_data['id']}_2027.json"
        output_path.write_text(
            json.dumps(output, separators=(",", ":")),
            encoding="utf-8",
        )

        # The requested sanity check uses center elevation strictly above 0 deg.
        sanity_rows.append(
            (
                site_data["name"],
                np.count_nonzero(sun_elevation_degrees > 0) * 100 / HOURS_IN_2027,
                np.count_nonzero(earth_elevation_degrees > 0) * 100 / HOURS_IN_2027,
            )
        )

    # The site metadata file is also compact JSON for static hosting.
    sites_path = DATA_DIR / "sites.json"
    sites_path.write_text(json.dumps(SITES, separators=(",", ":")), encoding="utf-8")

    # Print the center-above-horizon percentages for a quick numerical check.
    print(f"{'Site':<20} {'Sun > 0 deg':>12} {'Earth > 0 deg':>15}")
    for name, sun_percent, earth_percent in sanity_rows:
        print(f"{name:<20} {sun_percent:>11.2f}% {earth_percent:>14.2f}%")


if __name__ == "__main__":
    main()