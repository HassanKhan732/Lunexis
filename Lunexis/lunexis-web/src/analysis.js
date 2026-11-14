export const DATA_START_UTC = Date.UTC(2027, 0, 1, 0);
export const HOUR_MS = 60 * 60 * 1000;
export const HOURS_PER_DAY = 24;
export const HOURS_IN_YEAR = 365 * HOURS_PER_DAY;
export const SUN_ANGULAR_RADIUS_DEGREES = 0.267;

export function indexForDate(dateString, endOfDay = false) {
  const [year, month, day] = dateString.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day, endOfDay ? 23 : 0);
  return Math.round((timestamp - DATA_START_UTC) / HOUR_MS);
}

export function longestRun(values, unavailableValue) {
  let longest = 0;
  let current = 0;
  for (const value of values) {
    if (value === unavailableValue) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function computeMetrics(data, startIndex, endIndex) {
  const sunVisible = [];
  const earthVisible = [];
  let sunHours = 0;
  let earthHours = 0;
  let bothHours = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const sunUp = data.sunEl[index] / 100 + SUN_ANGULAR_RADIUS_DEGREES > 0;
    const earthUp = data.earthEl[index] > 0;
    sunVisible.push(sunUp);
    earthVisible.push(earthUp);
    if (sunUp) sunHours += 1;
    if (earthUp) earthHours += 1;
    if (sunUp && earthUp) bothHours += 1;
  }

  const totalHours = endIndex - startIndex + 1;
  return {
    totalHours,
    sunHours,
    earthHours,
    bothHours,
    powerPercent: (sunHours / totalHours) * 100,
    earthLinkPercent: (earthHours / totalHours) * 100,
    bothPercent: (bothHours / totalHours) * 100,
    longestDarknessHours: longestRun(sunVisible, false),
    longestOutageHours: longestRun(earthVisible, false),
  };
}

export function hourState(data, index) {
  const sunUp = data.sunEl[index] / 100 + SUN_ANGULAR_RADIUS_DEGREES > 0;
  const earthUp = data.earthEl[index] > 0;
  if (sunUp && earthUp) return 2;
  if (sunUp || earthUp) return 1;
  return 0;
}

export function mostCommonState(data, startIndex, endIndex) {
  const counts = [0, 0, 0];
  for (let index = startIndex; index <= endIndex; index += 1) {
    counts[hourState(data, index)] += 1;
  }
  return counts.indexOf(Math.max(...counts));
}

export function formatDuration(hours) {
  const days = Math.floor(hours / HOURS_PER_DAY);
  const remainingHours = hours % HOURS_PER_DAY;
  if (days === 0) return `${remainingHours}h`;
  return `${days}d ${remainingHours}h`;
}