import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { SelectField } from '../../../components/forms/SelectField';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import { DAY_LABELS } from '../utils/serviceBookingConstants';
import {
  formatWeeklyTimeLabel,
  getWeeklyTimeOptions,
  normalizeWeeklyTimeValue,
} from '../utils/weeklyHoursTimeOptions';

export interface WeeklyHourRow {
  day: number;
  enabled?: boolean;
  start?: string;
  end?: string;
}

export interface WeeklyHoursEditorProps {
  weeklyHours: WeeklyHourRow[];
  onChange: (next: WeeklyHourRow[]) => void;
  disabled?: boolean;
}

/** Monday-first display (API still uses 0 = Sun … 6 = Sat). */
const DISPLAY_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_OPTIONS = getWeeklyTimeOptions();

export function WeeklyHoursEditor({ weeklyHours, onChange, disabled }: WeeklyHoursEditorProps) {
  const rowsByDay = useMemo(() => {
    const map = new Map<number, WeeklyHourRow>();
    for (const row of weeklyHours) {
      map.set(row.day, row);
    }
    return map;
  }, [weeklyHours]);

  const orderedRows = useMemo(
    () =>
      DISPLAY_DAY_ORDER.map((day) => rowsByDay.get(day)).filter(
        (row): row is WeeklyHourRow => Boolean(row),
      ),
    [rowsByDay],
  );

  const updateRow = (day: number, patch: Partial<WeeklyHourRow>) => {
    onChange(
      weeklyHours.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    );
  };

  const applyMondayToWeekdays = () => {
    const monday = weeklyHours.find((row) => row.day === 1);
    if (!monday) {
      return;
    }
    onChange(
      weeklyHours.map((row) =>
        row.day >= 1 && row.day <= 5
          ? {
              ...row,
              enabled: monday.enabled,
              start: monday.start,
              end: monday.end,
            }
          : row,
      ),
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <AppText variant="caption" color="textMuted" style={styles.toolbarHint}>
          Tap a day to open or close. Times use 30-minute slots.
        </AppText>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={applyMondayToWeekdays}
          style={({ pressed }) => [styles.copyBtn, pressed && !disabled ? styles.copyBtnPressed : null]}
        >
          <AppText variant="caption" color="textLink">
            Copy Mon → Fri
          </AppText>
        </Pressable>
      </View>

      {orderedRows.map((row) => {
        const isOpen = row.enabled !== false;
        const startVal = normalizeWeeklyTimeValue(row.start, '09:00');
        const endVal = normalizeWeeklyTimeValue(row.end, '17:00');
        const dayLabel = DAY_LABELS[row.day] ?? String(row.day);

        return (
          <View
            key={row.day}
            style={[styles.dayCard, !isOpen ? styles.dayCardClosed : null]}
          >
            <View style={styles.dayHeader}>
              <View style={styles.dayTitleBlock}>
                <AppText variant="bodyMedium">{dayLabel}</AppText>
                {!isOpen ? (
                  <AppText variant="bodySmall" color="textMuted" style={styles.closedLabel}>
                    Closed
                  </AppText>
                ) : (
                  <AppText variant="caption" color="textMuted" numberOfLines={1}>
                    {formatWeeklyTimeLabel(startVal)} – {formatWeeklyTimeLabel(endVal)}
                  </AppText>
                )}
              </View>
              <Switch
                value={isOpen}
                disabled={disabled}
                onValueChange={(enabled) => updateRow(row.day, { enabled })}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={isOpen ? colors.primary : colors.surfaceWhite}
              />
            </View>

            {isOpen ? (
              <View style={styles.timeRow}>
                <SelectField
                  label="Opens"
                  value={startVal}
                  options={TIME_OPTIONS}
                  onChange={(start) => updateRow(row.day, { start })}
                  disabled={disabled}
                  tone="surface"
                  containerStyle={styles.timeField}
                  modalTitle={`${dayLabel} — opens`}
                  selectionAccent="navy"
                />
                <SelectField
                  label="Closes"
                  value={endVal}
                  options={TIME_OPTIONS}
                  onChange={(end) => updateRow(row.day, { end })}
                  disabled={disabled}
                  tone="surface"
                  containerStyle={styles.timeField}
                  modalTitle={`${dayLabel} — closes`}
                  selectionAccent="navy"
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  toolbar: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  toolbarHint: {
    lineHeight: 18,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  copyBtnPressed: {
    opacity: 0.7,
  },
  dayCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dayCardClosed: {
    opacity: 0.88,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayTitleBlock: {
    flex: 1,
    gap: 2,
  },
  closedLabel: {
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
    minWidth: 0,
  },
});
