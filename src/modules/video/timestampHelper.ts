/**
 * Utilities for formatting, parsing and compensating video timestamps.
 */

export function formatTimestamp(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function parseTimestamp(str: string): number {
  const raw = str.trim().replace(/^\[|\]$/g, '').split(':');
  const parts = raw.map((p) => parseInt(p, 10));
  if (parts.length === 0 || parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    const [h = 0, m = 0, s = 0] = parts;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m = 0, s = 0] = parts;
    return m * 60 + s;
  } else if (parts.length === 1) {
    const [s = 0] = parts;
    return s;
  }
  return 0;
}

/**
 * Calculates compensated timestamp based on human reaction time.
 * Prevents negative times or times exceeding video duration.
 */
export function calculateCompensatedTime(
  currentTime: number,
  offsetSeconds: number = 5,
  duration?: number
): number {
  let target = currentTime - offsetSeconds;
  if (target < 0) target = 0;
  if (duration !== undefined && duration > 0 && target > duration) {
    target = duration;
  }
  return Math.round(target * 10) / 10;
}
