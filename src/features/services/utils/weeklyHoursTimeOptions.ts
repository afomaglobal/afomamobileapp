/** 30-minute slots for seller weekly hours (values stored as HH:mm, 24h). */

export function formatWeeklyTimeLabel(hhmm: string): string {
  if (!hhmm || typeof hhmm !== 'string') {
    return '';
  }
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return hhmm;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const TIME_OPTIONS_CACHE: { value: string; label: string }[] = [];

function buildTimeOptions() {
  if (TIME_OPTIONS_CACHE.length) {
    return TIME_OPTIONS_CACHE;
  }
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      TIME_OPTIONS_CACHE.push({
        value,
        label: formatWeeklyTimeLabel(value),
      });
    }
  }
  return TIME_OPTIONS_CACHE;
}

export function getWeeklyTimeOptions() {
  return buildTimeOptions();
}

/** Snap unknown API values to nearest option or default. */
export function normalizeWeeklyTimeValue(value: string | undefined, fallback = '09:00') {
  const opts = getWeeklyTimeOptions();
  if (value && opts.some((o) => o.value === value)) {
    return value;
  }
  return fallback;
}
