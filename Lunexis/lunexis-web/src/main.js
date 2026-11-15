// Portions of this file were written with AI assistance.
import {
  DATA_START_UTC,
  HOUR_MS,
  HOURS_IN_YEAR,
  HOURS_PER_DAY,
  computeMetrics,
  formatDuration,
  hourState,
  indexForDate,
  mostCommonState,
} from "./analysis.js";

const siteListElement = document.querySelector("#site-list");
const polarMapElement = document.querySelector("#polar-map");
const skyViewElement = document.querySelector("#sky-view");
const scoreCardsElement = document.querySelector("#score-cards");
const timeSlider = document.querySelector("#time-slider");
const timeStep = document.querySelector("#time-step");
const currentTime = document.querySelector("#current-time");
const timeline = document.querySelector("#timeline");
const timelineTooltip = document.querySelector("#timeline-tooltip");
const timelineLabels = document.querySelector("#timeline-labels");
const timelineTicks = document.querySelector("#timeline-ticks");
const loadError = document.querySelector("#load-error");
const dateError = document.querySelector("#date-error");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");
const playButton = document.querySelector("#play-button");
const methodToggle = document.querySelector("#method-toggle");
const methodContent = document.querySelector("#method-content");

const SITE_LIMIT = 3;
const COLORS = { both: "#4ade80", one: "#f5a524", none: "#515a55" };
const SITE_SHORT_NAMES = {
  shackleton: "Shackleton",
  malapert: "Malapert",
  haworth: "Haworth",
  faustini: "Faustini",
};

const state = {
  sites: [],
  data: new Map(),
  selectedIds: ["shackleton", "malapert", "haworth"],
  activeId: "shackleton",
  startIndex: 0,
  endIndex: 29 * HOURS_PER_DAY + 23,
  hourIndex: 0,
  mode: "simple",
  playing: false,
  timer: null,
};

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function selectedSites() {
  return state.sites.filter((site) => state.selectedIds.includes(site.id));
}

function activeSite() {
  return state.sites.find((site) => site.id === state.activeId);
}

function rangeHourCount() {
  return state.endIndex - state.startIndex + 1;
}

function utcLabel(hourIndex) {
  return new Date(DATA_START_UTC + hourIndex * HOUR_MS)
    .toISOString()
    .replace("T", " ")
    .replace(":00.000Z", " UTC");
}

function shortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", timeZone: "UTC",
  }).format(date).toUpperCase();
}

function dateInputValue(hourIndex) {
  return new Date(DATA_START_UTC + hourIndex * HOUR_MS).toISOString().slice(0, 10);
}

function setActiveSite(siteId) {
  if (!state.selectedIds.includes(siteId)) {
    if (state.selectedIds.length >= SITE_LIMIT) {
      dateError.textContent = "Remove one selected site before adding another.";
      return;
    }
    state.selectedIds.push(siteId);
  }
  state.activeId = siteId;
  dateError.textContent = "";
  render();
}

function renderPolarMap() {
  const center = 180;
  const outerRadius = 146;
  const rings = [-87.5, -85, -82.5, -80].map((latitude) => {
    const radius = ((90 + latitude) / 10) * outerRadius;
    return `<circle class="map-ring" cx="${center}" cy="${center}" r="${radius}" />`;
  }).join("");
  const markers = state.sites.map((site) => {
    const radius = ((90 + site.lat) / 10) * outerRadius;
    const angle = (site.lon * Math.PI) / 180;
    const x = center + radius * Math.sin(angle);
    const y = center - radius * Math.cos(angle);
    const selected = state.selectedIds.includes(site.id);
    const labelLayout = {
      shackleton: { x: 169, y: 205, anchor: "end" },
      malapert: { x: 169, y: 108, anchor: "end" },
      haworth: { x: 194, y: 148, anchor: "start" },
      faustini: { x: 223, y: 209, anchor: "start" },
    }[site.id] ?? { x: x + 10, y: y - 10, anchor: "start" };
    return `<g class="map-site" role="button" tabindex="0" data-site-id="${escapeText(site.id)}" aria-label="${selected ? "Active" : "Select"} ${escapeText(site.name)} at ${site.lat} degrees latitude, ${site.lon} degrees longitude">
      <circle class="site-hit" cx="${x}" cy="${y}" r="13" />
      ${selected ? `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${site.color}" stroke-width="1" opacity=".55" />` : ""}
      <circle class="site-core" cx="${x}" cy="${y}" r="5" fill="${site.color}" />
      <line class="map-leader" x1="${x}" y1="${y}" x2="${labelLayout.x}" y2="${labelLayout.y - 3}" />
      <text class="site-site-label" x="${labelLayout.x}" y="${labelLayout.y}" text-anchor="${labelLayout.anchor}">${escapeText(SITE_SHORT_NAMES[site.id] ?? site.name)}</text>
    </g>`;
  }).join("");

  polarMapElement.innerHTML = `<svg viewBox="0 0 360 360" role="img" aria-labelledby="map-title map-desc">
    <title id="map-title">Approximate lunar south pole site locations</title>
    <desc id="map-desc">Polar coordinate plot from 90 degrees south at center to 80 degrees south at the edge. Select a marker to compare that site.</desc>
    <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="rgba(10,15,12,.1)" stroke="#738077" stroke-width="1" />
    ${rings}<line class="map-cross" x1="${center}" y1="30" x2="${center}" y2="330" />
    <line class="map-cross" x1="30" y1="${center}" x2="330" y2="${center}" />
    <text class="dome-small" x="${center + 5}" y="34">0° / POLE</text>
    <text class="dome-small" x="${center + 5}" y="45">N</text>
    <text class="dome-small" x="${center + outerRadius - 16}" y="${center - 4}">E</text>
    <text class="dome-small" x="${center - outerRadius + 6}" y="${center - 4}">W</text>
    <text class="dome-small" x="${center + 4}" y="${center + outerRadius - 3}">S</text>
    ${markers}
  </svg>`;
}

function renderSiteList() {
  document.querySelector("#selection-count").textContent = `${state.selectedIds.length} / ${SITE_LIMIT}`;
  siteListElement.innerHTML = state.sites.map((site) => {
    const checked = state.selectedIds.includes(site.id);
    const cannotAdd = !checked && state.selectedIds.length >= SITE_LIMIT;
    const active = site.id === state.activeId;
    return `<label class="site-option${active ? " is-active" : ""}" data-site-id="${escapeText(site.id)}">
      <input type="checkbox" value="${escapeText(site.id)}" ${checked ? "checked" : ""} ${cannotAdd ? "disabled" : ""} aria-label="Compare ${escapeText(site.name)}" />
      <span class="site-option-name">${escapeText(site.name)}<span class="site-option-meta">${site.lat.toFixed(1)}° / ${site.lon.toFixed(1)}° · approx.</span></span>
      <span class="active-indicator" aria-label="Active sky view">${active ? "●" : ""}</span>
    </label>`;
  }).join("");
}

function renderScoreCards() {
  const periodStart = new Date(DATA_START_UTC + state.startIndex * HOUR_MS);
  const periodEnd = new Date(DATA_START_UTC + state.endIndex * HOUR_MS);
  document.querySelector("#score-period").textContent = `${shortDate(periodStart)} — ${shortDate(periodEnd)}`;
  scoreCardsElement.innerHTML = selectedSites().map((site, index) => {
    const metrics = computeMetrics(state.data.get(site.id), state.startIndex, state.endIndex);
    const advanced = state.mode === "advanced";
    return `<article class="score-card" style="--site-color:${site.color};animation-delay:${index * 45}ms" aria-label="${escapeText(site.name)} availability scores">
      <div class="score-card-head"><div class="score-site"><i class="score-site-dot"></i><span>${escapeText(site.name)}<small>${site.lat.toFixed(1)}° / ${site.lon.toFixed(1)}°</small></span></div>${site.id === state.activeId ? '<span class="active-site-tag">ACTIVE</span>' : ""}</div>
      ${metricBar("Power", metrics.powerPercent, "#ffc857")}
      ${metricBar("Earth link", metrics.earthLinkPercent, "#60b7ff")}
      ${advanced ? `<div class="advanced-metrics"><div class="advanced-metric">BOTH AVAILABLE<strong>${metrics.bothPercent.toFixed(1)}%</strong></div><div class="advanced-metric">LONGEST DARKNESS<strong>${formatDuration(metrics.longestDarknessHours)}</strong></div><div class="advanced-metric">LONGEST OUTAGE<strong>${formatDuration(metrics.longestOutageHours)}</strong></div></div>` : ""}
    </article>`;
  }).join("");
}

function metricBar(label, value, color) {
  const percent = Math.max(0, Math.min(100, value));
  return `<div class="metric-row"><span class="metric-label">${label}</span><div class="metric-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent.toFixed(1)}"><div class="metric-fill" style="width:${percent}%;--metric-color:${color}"></div></div><span class="metric-value">${percent.toFixed(1)}%</span></div>`;
}

function domePoint(azimuth, elevation) {
  const centerX = 180;
  const centerY = 160;
  const radius = 118;
  const clampedElevation = Math.max(-3, Math.min(90, elevation));
  const projectedRadius = radius * (1 - clampedElevation / 90);
  const radians = (azimuth * Math.PI) / 180;
  return {
    x: centerX + projectedRadius * Math.sin(radians),
    y: centerY - projectedRadius * Math.cos(radians),
  };
}

function trailPath(data, key, startIndex, endIndex, projection) {
  const commands = [];
  let previousAzimuth = null;
  let penDown = false;
  for (let index = startIndex; index <= endIndex; index += 1) {
    const azimuth = data[`${key}Az`][index] / 100;
    const elevation = data[`${key}El`][index] / 100;
    if (key === "sun" ? elevation + 0.267 <= 0 : elevation <= 0) {
      previousAzimuth = azimuth;
      penDown = false;
      continue;
    }
    if (previousAzimuth !== null && Math.abs(azimuth - previousAzimuth) > 180) penDown = false;
    const point = projection(azimuth, elevation);
    commands.push(`${penDown ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`);
    penDown = true;
    previousAzimuth = azimuth;
  }
  return commands.join("");
}

function renderDome(site, data) {
  const index = state.hourIndex;
  const sunElevation = data.sunEl[index] / 100;
  const sunAzimuth = data.sunAz[index] / 100;
  const earthElevation = data.earthEl[index] / 100;
  const earthAzimuth = data.earthAz[index] / 100;
  const sunUp = sunElevation + 0.267 > 0;
  const earthUp = earthElevation > 0;
  const sunPoint = domePoint(sunAzimuth, sunElevation);
  const earthPoint = domePoint(earthAzimuth, earthElevation);
  const start = Math.max(state.startIndex, index - 12);
  const sunTrail = trailPath(data, "sun", start, index, domePoint);
  const earthTrail = trailPath(data, "earth", start, index, domePoint);
  return `<svg viewBox="0 0 360 310" role="img" aria-labelledby="sky-svg-title sky-svg-desc">
    <title id="sky-svg-title">Sky dome at ${escapeText(site.name)}, ${utcLabel(index)}</title>
    <desc id="sky-svg-desc">Azimuth and elevation of the Sun and Earth. Sun ${sunElevation.toFixed(2)} degrees elevation, ${sunAzimuth.toFixed(2)} degrees azimuth. Earth ${earthElevation.toFixed(2)} degrees elevation, ${earthAzimuth.toFixed(2)} degrees azimuth. Elevation is exaggerated for readability.</desc>
    <circle class="dome-horizon" cx="180" cy="160" r="118" />
    <circle class="dome-ring" cx="180" cy="160" r="78.7" />
    <circle class="dome-ring" cx="180" cy="160" r="39.3" />
    <line class="dome-grid-line" x1="62" y1="160" x2="298" y2="160" />
    <line class="dome-grid-line" x1="180" y1="42" x2="180" y2="278" />
    <text class="dome-label" x="180" y="30" text-anchor="middle">N · 0°</text>
    <text class="dome-label" x="310" y="164">E · 90°</text>
    <text class="dome-label" x="180" y="298" text-anchor="middle">S · 180°</text>
    <text class="dome-label" x="50" y="164" text-anchor="end">W · 270°</text>
    <text class="dome-small" x="186" y="126">30°</text><text class="dome-small" x="186" y="86">60°</text>
    ${sunTrail ? `<path class="sky-trail" stroke="#ffc857" d="${sunTrail}" />` : ""}
    ${earthTrail ? `<path class="sky-trail" stroke="#60b7ff" d="${earthTrail}" />` : ""}
    <circle class="sky-point${sunUp ? "" : " below"}" cx="${sunPoint.x}" cy="${sunPoint.y}" r="6" fill="#ffc857"><title>Sun: ${sunElevation.toFixed(2)}° elevation, ${sunAzimuth.toFixed(2)}° azimuth</title></circle>
    <circle class="sky-point${earthUp ? "" : " below"}" cx="${earthPoint.x}" cy="${earthPoint.y}" r="6" fill="#60b7ff"><title>Earth: ${earthElevation.toFixed(2)}° elevation, ${earthAzimuth.toFixed(2)}° azimuth</title></circle>
    <text class="dome-small" x="180" y="${sunPoint.y < earthPoint.y ? sunPoint.y - 10 : sunPoint.y + 15}" text-anchor="middle" fill="#ffc857">Sun · ${sunUp ? `${sunElevation.toFixed(1)}° up` : "below horizon"}</text>
    <text class="dome-small" x="180" y="${earthPoint.y < sunPoint.y ? earthPoint.y - 10 : earthPoint.y + 15}" text-anchor="middle" fill="#60b7ff">Earth · ${earthUp ? `${earthElevation.toFixed(1)}° up` : "below horizon"}</text>
  </svg>`;
}

function panoramaPoint(azimuth, elevation) {
  const left = 42;
  const top = 40;
  const width = 276;
  const height = 190;
  const x = left + ((azimuth % 360 + 360) % 360) / 360 * width;
  const clampedElevation = Math.max(-5, Math.min(20, elevation));
  const y = top + ((20 - clampedElevation) / 25) * height;
  return { x, y };
}

function renderPanorama(site, data) {
  const index = state.hourIndex;
  const sunElevation = data.sunEl[index] / 100;
  const sunAzimuth = data.sunAz[index] / 100;
  const earthElevation = data.earthEl[index] / 100;
  const earthAzimuth = data.earthAz[index] / 100;
  const sunUp = sunElevation + 0.267 > 0;
  const earthUp = earthElevation > 0;
  const sunPoint = panoramaPoint(sunAzimuth, sunElevation);
  const earthPoint = panoramaPoint(earthAzimuth, earthElevation);
  const left = 42;
  const width = 276;
  const yForElevation = (value) => panoramaPoint(0, value).y;
  const gridLines = [20, 10, 0, -5].map((value) => `<line class="panorama-grid${value === 0 ? " panorama-horizon" : ""}" x1="${left}" y1="${yForElevation(value)}" x2="${left + width}" y2="${yForElevation(value)}" /><text class="dome-small" x="34" y="${yForElevation(value) + 3}" text-anchor="end">${value}°</text>`).join("");
  const azimuthLabels = [0, 90, 180, 270, 360].map((value) => `<text class="dome-small" x="${left + value / 360 * width}" y="250" text-anchor="middle">${value}°</text>`).join("");
  const start = Math.max(state.startIndex, index - 12);
  const sunTrail = trailPath(data, "sun", start, index, panoramaPoint);
  const earthTrail = trailPath(data, "earth", start, index, panoramaPoint);
  return `<svg viewBox="0 0 360 270" role="img" aria-labelledby="sky-svg-title sky-svg-desc">
    <title id="sky-svg-title">Sky panorama at ${escapeText(site.name)}, ${utcLabel(index)}</title>
    <desc id="sky-svg-desc">Azimuth from 0 to 360 degrees and elevation from -5 to 20 degrees. Sun ${sunElevation.toFixed(2)} degrees elevation at ${sunAzimuth.toFixed(2)} degrees azimuth. Earth ${earthElevation.toFixed(2)} degrees elevation at ${earthAzimuth.toFixed(2)} degrees azimuth.</desc>
    <rect class="panorama-frame" x="${left}" y="40" width="${width}" height="190" />
    ${[0, 90, 180, 270, 360].map((value) => `<line class="panorama-grid" x1="${left + value / 360 * width}" y1="40" x2="${left + value / 360 * width}" y2="230" />`).join("")}
    ${gridLines}${azimuthLabels}
    ${sunTrail ? `<path class="panorama-trail" stroke="#ffc857" d="${sunTrail}" />` : ""}
    ${earthTrail ? `<path class="panorama-trail" stroke="#60b7ff" d="${earthTrail}" />` : ""}
    <circle class="sky-point${sunUp ? "" : " below"}" cx="${sunPoint.x}" cy="${sunPoint.y}" r="6" fill="#ffc857"><title>Sun: ${sunElevation.toFixed(2)}° elevation, ${sunAzimuth.toFixed(2)}° azimuth</title></circle>
    <circle class="sky-point${earthUp ? "" : " below"}" cx="${earthPoint.x}" cy="${earthPoint.y}" r="6" fill="#60b7ff"><title>Earth: ${earthElevation.toFixed(2)}° elevation, ${earthAzimuth.toFixed(2)}° azimuth</title></circle>
  </svg>`;
}

function renderSky() {
  const site = activeSite();
  const data = state.data.get(site.id);
  const sunElevation = data.sunEl[state.hourIndex] / 100;
  const earthElevation = data.earthEl[state.hourIndex] / 100;
  const sunVisible = sunElevation + 0.267 > 0;
  document.querySelector("#active-site-name").textContent = site.name;
  currentTime.textContent = utcLabel(state.hourIndex);
  skyViewElement.innerHTML = state.mode === "simple" ? renderDome(site, data) : renderPanorama(site, data);
  skyViewElement.setAttribute("aria-label", `Sky view. Sun ${sunVisible ? `${sunElevation.toFixed(1)} degrees up` : "below horizon"}; Earth ${earthElevation > 0 ? `${earthElevation.toFixed(1)} degrees up` : "below horizon"}.`);
  document.querySelector(".scale-note").textContent = state.mode === "simple" ? "Dome · concentric elevation rings" : "Panorama · flat horizon";
  timeSlider.max = String(Math.max(0, rangeHourCount() - 1));
  timeSlider.value = String(state.hourIndex - state.startIndex);
  timeStep.textContent = `${state.hourIndex - state.startIndex + 1} / ${rangeHourCount()}`;
}

function timelineGroupSize() {
  return rangeHourCount() <= 31 * HOURS_PER_DAY ? 1 : HOURS_PER_DAY;
}

function groupedTimelineState(data, groupIndex, groupSize) {
  const start = state.startIndex + groupIndex * groupSize;
  const end = Math.min(state.endIndex, start + groupSize - 1);
  return mostCommonState(data, start, end);
}

function renderTimeline() {
  const sites = selectedSites();
  const groupSize = timelineGroupSize();
  const groupCount = Math.ceil(rangeHourCount() / groupSize);
  const laneHeight = 22;
  const laneGap = 8;
  const height = Math.max(24, sites.length * laneHeight + Math.max(0, sites.length - 1) * laneGap);
  const width = Math.max(1, timeline.clientWidth || timeline.parentElement.clientWidth);
  const scale = window.devicePixelRatio || 1;
  timeline.width = Math.round(width * scale);
  timeline.height = Math.round(height * scale);
  timeline.style.height = `${height}px`;
  const context = timeline.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);

  sites.forEach((site, siteIndex) => {
    const data = state.data.get(site.id);
    const y = siteIndex * (laneHeight + laneGap) + 3;
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const stateCode = groupedTimelineState(data, groupIndex, groupSize);
      const x0 = (groupIndex / groupCount) * width;
      const x1 = ((groupIndex + 1) / groupCount) * width;
      context.fillStyle = [COLORS.none, COLORS.one, COLORS.both][stateCode];
      context.fillRect(x0, y, Math.max(1, x1 - x0 - (groupSize === 1 ? 0.35 : 0.5)), 15);
    }
  });

  timelineLabels.innerHTML = sites.map((site) => `<div class="timeline-site-label" style="--site-color:${site.color}"><i></i><span>${escapeText(site.name)}</span></div>`).join("");
  document.querySelector("#timeline-detail").textContent = groupSize === 1
    ? `${rangeHourCount().toLocaleString()} hourly samples · click a segment to inspect that hour`
    : `${groupCount} days · dominant hourly state per day · click a day to inspect it`;
  timeline.setAttribute("aria-label", `Availability timeline for ${sites.map((site) => site.name).join(", ")}; ${groupSize === 1 ? "one segment per hour" : "one segment per day, most common state"}. Use the time slider above for keyboard time selection.`);
  renderTimelineTicks(groupCount, groupSize);
}

function renderTimelineTicks(groupCount, groupSize) {
  const count = Math.min(5, groupCount);
  const ticks = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = count === 1 ? 0 : index / (count - 1);
    const groupIndex = Math.round(fraction * (groupCount - 1));
    const hourIndex = Math.min(state.endIndex, state.startIndex + groupIndex * groupSize);
    ticks.push(`<span class="timeline-tick" style="left:${fraction * 100}%">${shortDate(new Date(DATA_START_UTC + hourIndex * HOUR_MS))}</span>`);
  }
  timelineTicks.innerHTML = ticks.join("");
}

function updateDateRange() {
  const start = startDateInput.value;
  const end = endDateInput.value;
  if (!start || !end) return false;
  const startIndex = indexForDate(start);
  const endIndex = indexForDate(end, true);
  if (startIndex < 0 || endIndex >= HOURS_IN_YEAR) {
    dateError.textContent = "Choose dates within the available 2027 data.";
    return false;
  }
  if (startIndex > endIndex) {
    dateError.textContent = "Start date must be on or before end date.";
    return false;
  }
  if (endIndex - startIndex + 1 > 366 * HOURS_PER_DAY) {
    dateError.textContent = "The selected period cannot exceed one year.";
    return false;
  }
  const oldOffset = state.hourIndex - state.startIndex;
  state.startIndex = startIndex;
  state.endIndex = endIndex;
  state.hourIndex = Math.min(endIndex, startIndex + Math.max(0, oldOffset));
  dateError.textContent = "";
  stopPlayback();
  render();
  return true;
}

function render() {
  renderPolarMap();
  renderSiteList();
  renderSky();
  renderScoreCards();
  renderTimeline();
}

function updateSelection(siteId, checked) {
  if (checked && !state.selectedIds.includes(siteId)) {
    if (state.selectedIds.length >= SITE_LIMIT) {
      dateError.textContent = "Compare up to three sites at a time.";
      renderSiteList();
      return;
    }
    state.selectedIds.push(siteId);
    if (!state.activeId || !state.selectedIds.includes(state.activeId)) state.activeId = siteId;
  } else if (!checked && state.selectedIds.includes(siteId)) {
    if (state.selectedIds.length === 1) {
      dateError.textContent = "Keep at least one site selected.";
      renderSiteList();
      return;
    }
    state.selectedIds = state.selectedIds.filter((id) => id !== siteId);
    if (state.activeId === siteId) state.activeId = state.selectedIds[0];
  }
  dateError.textContent = "";
  render();
}

function stopPlayback() {
  if (state.timer !== null) window.clearInterval(state.timer);
  state.timer = null;
  state.playing = false;
  playButton.innerHTML = '<span aria-hidden="true">▶</span>';
  playButton.setAttribute("aria-label", "Play time animation");
  playButton.title = "Play time animation";
}

function startPlayback() {
  if (state.hourIndex >= state.endIndex) state.hourIndex = state.startIndex;
  state.playing = true;
  playButton.innerHTML = '<span aria-hidden="true">Ⅱ</span>';
  playButton.setAttribute("aria-label", "Pause time animation");
  playButton.title = "Pause time animation";
  const speed = Number(document.querySelector("#play-speed").value);
  const intervalMs = Math.max(70, 650 / speed);
  state.timer = window.setInterval(() => {
    if (state.hourIndex >= state.endIndex) {
      stopPlayback();
      return;
    }
    state.hourIndex += 1;
    renderSky();
    timeSlider.value = String(state.hourIndex - state.startIndex);
  }, intervalMs);
}

function describeState(code) {
  return ["Neither available", "One available", "Both available"][code];
}

function timelineDetailsAt(clientX, clientY) {
  const rect = timeline.getBoundingClientRect();
  const groupSize = timelineGroupSize();
  const groupCount = Math.ceil(rangeHourCount() / groupSize);
  const groupIndex = Math.max(0, Math.min(groupCount - 1, Math.floor(((clientX - rect.left) / rect.width) * groupCount)));
  const laneHeight = 30;
  const siteIndex = Math.max(0, Math.min(state.selectedIds.length - 1, Math.floor((clientY - rect.top) / laneHeight)));
  const site = selectedSites()[siteIndex];
  const data = state.data.get(site.id);
  const startIndex = state.startIndex + groupIndex * groupSize;
  const endIndex = Math.min(state.endIndex, startIndex + groupSize - 1);
  const code = groupSize === 1 ? hourState(data, startIndex) : mostCommonState(data, startIndex, endIndex);
  const chosenHour = groupSize === 1 ? startIndex : Math.min(endIndex, startIndex + 12);
  return { site, code, startIndex, endIndex, chosenHour, groupSize };
}

function showTimelineTooltip(event) {
  const details = timelineDetailsAt(event.clientX, event.clientY);
  if (!details) return;
  const dateText = details.groupSize === 1
    ? utcLabel(details.chosenHour)
    : `${dateInputValue(details.startIndex)} UTC · dominant daily state`;
  timelineTooltip.innerHTML = `<strong>${escapeText(details.site.name)}</strong><br>${dateText}<br>${describeState(details.code)}`;
  timelineTooltip.hidden = false;
  const wrapper = timeline.parentElement.getBoundingClientRect();
  const left = Math.min(wrapper.width - 165, Math.max(4, event.clientX - wrapper.left + 9));
  const top = Math.max(0, event.clientY - wrapper.top - 55);
  timelineTooltip.style.left = `${left}px`;
  timelineTooltip.style.top = `${top}px`;
}

function seekFromTimeline(event) {
  const details = timelineDetailsAt(event.clientX, event.clientY);
  if (!details) return;
  state.hourIndex = details.chosenHour;
  stopPlayback();
  renderSky();
  timeSlider.value = String(state.hourIndex - state.startIndex);
}

async function loadData() {
  const siteResponse = await fetch("./public/data/sites.json");
  if (!siteResponse.ok) throw new Error(`Could not load sites.json (${siteResponse.status}).`);
  state.sites = await siteResponse.json();
  const dataEntries = await Promise.all(state.sites.map(async (site) => {
    const response = await fetch(`./public/data/${encodeURIComponent(site.id)}_2027.json`);
    if (!response.ok) throw new Error(`Could not load ${site.id}_2027.json (${response.status}).`);
    const data = await response.json();
    for (const key of ["sunEl", "sunAz", "earthEl", "earthAz"]) {
      if (!Array.isArray(data[key]) || data[key].length !== HOURS_IN_YEAR) {
        throw new Error(`${site.id}_2027.json has an invalid ${key} array.`);
      }
    }
    return [site.id, data];
  }));
  state.data = new Map(dataEntries);
  if (!state.sites.some((site) => site.id === state.activeId)) {
    state.selectedIds = state.sites.slice(0, SITE_LIMIT).map((site) => site.id);
    state.activeId = state.selectedIds[0];
  }

  startDateInput.value = "2027-01-01";
  endDateInput.value = "2027-01-30";
  startDateInput.addEventListener("change", updateDateRange);
  endDateInput.addEventListener("change", updateDateRange);
  siteListElement.addEventListener("change", (event) => {
    if (event.target.matches("input[type=checkbox]")) updateSelection(event.target.value, event.target.checked);
  });
  siteListElement.addEventListener("click", (event) => {
    if (event.target.matches("input")) return;
    const row = event.target.closest(".site-option");
    if (row) setActiveSite(row.dataset.siteId);
  });
  polarMapElement.addEventListener("click", (event) => {
    const marker = event.target.closest("[data-site-id]");
    if (marker) setActiveSite(marker.dataset.siteId);
  });
  polarMapElement.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-site-id]")) {
      event.preventDefault();
      setActiveSite(event.target.dataset.siteId);
    }
  });
  timeSlider.addEventListener("input", () => {
    state.hourIndex = state.startIndex + Number(timeSlider.value);
    stopPlayback();
    renderSky();
  });
  playButton.addEventListener("click", () => state.playing ? stopPlayback() : startPlayback());
  document.querySelector("#play-speed").addEventListener("change", () => {
    if (state.playing) { stopPlayback(); startPlayback(); }
  });
  document.querySelector("#simple-mode").addEventListener("click", () => setMode("simple"));
  document.querySelector("#advanced-mode").addEventListener("click", () => setMode("advanced"));
  methodToggle.addEventListener("click", () => {
    const expanded = methodToggle.getAttribute("aria-expanded") === "true";
    methodToggle.setAttribute("aria-expanded", String(!expanded));
    methodContent.hidden = expanded;
    methodToggle.innerHTML = expanded ? 'Show notes <span aria-hidden="true">＋</span>' : 'Hide notes <span aria-hidden="true">−</span>';
  });
  timeline.addEventListener("pointermove", showTimelineTooltip);
  timeline.addEventListener("pointerleave", () => { timelineTooltip.hidden = true; });
  timeline.addEventListener("click", seekFromTimeline);
  timeline.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      state.hourIndex = Math.min(state.endIndex, state.hourIndex + 1);
      renderSky();
      timeSlider.value = String(state.hourIndex - state.startIndex);
    }
  });
  window.addEventListener("resize", renderTimeline);
  render();
}

function setMode(mode) {
  state.mode = mode;
  document.querySelector("#simple-mode").classList.toggle("is-active", mode === "simple");
  document.querySelector("#advanced-mode").classList.toggle("is-active", mode === "advanced");
  document.querySelector("#simple-mode").setAttribute("aria-pressed", String(mode === "simple"));
  document.querySelector("#advanced-mode").setAttribute("aria-pressed", String(mode === "advanced"));
  renderSky();
  renderScoreCards();
}

loadData().catch((error) => {
  loadError.textContent = `Lunexis data could not be loaded. Run this site through a local web server, then reload. Details: ${error.message}`;
  loadError.hidden = false;
});