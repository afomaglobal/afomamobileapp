export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function createDefaultWeeklyHours() {
  return DAY_LABELS.map((_, day) => ({
    day,
    enabled: day !== 0,
    start: day === 6 ? '10:00' : '09:00',
    end: day === 6 ? '14:00' : '17:00',
  }));
}

export const DEFAULT_SERVICE_VERTICAL_SLUG = 'beauty-and-personal-care';
