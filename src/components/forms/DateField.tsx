import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppInput } from '../ui/AppInput';
import { AppText } from '../ui/AppText';
import { colors, radius, spacing } from '../../design-system';
import { formatDateInputDisplay, formatDateInputValue, parseDateInputValue } from '../../utils/dateInput';

export interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  tone?: 'default' | 'surface';
  containerStyle?: StyleProp<ViewStyle>;
  maximumDate?: Date;
  minimumDate?: Date;
}

type DateTimePickerEvent = {
  type: string;
  nativeEvent: { timestamp?: number };
};

type DateTimePickerProps = {
  value: Date;
  mode: 'date';
  display: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact';
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_MAX_DATE = new Date();

function createDefaultMinDate(): Date {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  return minDate;
}

function createFallbackPickerDate(): Date {
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 25);
  return fallback;
}

let dateTimePickerLoadState: 'idle' | 'loaded' | 'failed' = 'idle';
let DateTimePickerComponent: ComponentType<DateTimePickerProps> | null = null;

function loadDateTimePickerModule(): ComponentType<DateTimePickerProps> | null {
  if (dateTimePickerLoadState === 'loaded') {
    return DateTimePickerComponent;
  }
  if (dateTimePickerLoadState === 'failed') {
    return null;
  }

  try {
    // Lazy require avoids crashing Account Details when the native module is missing from an old dev build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-community/datetimepicker') as {
      default: ComponentType<DateTimePickerProps>;
    };
    DateTimePickerComponent = module.default;
    dateTimePickerLoadState = 'loaded';
    return DateTimePickerComponent;
  } catch {
    dateTimePickerLoadState = 'failed';
    DateTimePickerComponent = null;
    return null;
  }
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  error,
  disabled = false,
  tone = 'default',
  containerStyle,
  maximumDate = DEFAULT_MAX_DATE,
  minimumDate = createDefaultMinDate(),
}: DateFieldProps) {
  const insets = useSafeAreaInsets();
  const isSurfaceTone = tone === 'surface';
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateInputValue(value) ?? createFallbackPickerDate());
  const [manualDraft, setManualDraft] = useState(value);
  const [pickerReady, setPickerReady] = useState(false);

  const displayValue = useMemo(() => formatDateInputDisplay(value), [value]);
  const Picker = useMemo(() => loadDateTimePickerModule(), []);

  useEffect(() => {
    if (open) {
      setPickerReady(Boolean(Picker));
    }
  }, [open, Picker]);

  const openPicker = () => {
    setDraftDate(parseDateInputValue(value) ?? createFallbackPickerDate());
    setManualDraft(value);
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
  };

  const handleConfirm = () => {
    if (Picker) {
      onChange(formatDateInputValue(draftDate));
    } else {
      const parsed = parseDateInputValue(manualDraft.trim());
      onChange(parsed ? formatDateInputValue(parsed) : manualDraft.trim());
    }
    closePicker();
  };

  const handleClear = () => {
    onChange('');
    closePicker();
  };

  const pickerDisplay = Platform.OS === 'ios' ? 'spinner' : 'calendar';

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <AppText variant="label" style={isSurfaceTone ? styles.labelSurface : undefined}>
            {label}
          </AppText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ?? 'Date of birth'}
          disabled={disabled}
          onPress={openPicker}
          style={({ pressed }) => [
            styles.trigger,
            isSurfaceTone && styles.triggerSurface,
            error ? styles.triggerError : null,
            disabled ? styles.triggerDisabled : null,
            pressed && !disabled ? styles.pressed : null,
          ]}
        >
          <AppText
            variant="body"
            color={displayValue ? 'textPrimary' : 'textSubtle'}
            numberOfLines={1}
            style={[styles.triggerText, isSurfaceTone && styles.triggerTextSurface]}
          >
            {displayValue || placeholder}
          </AppText>
          <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        </Pressable>
        {error ? (
          <AppText variant="caption" color="error">
            {error}
          </AppText>
        ) : null}
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={closePicker}>
        <Pressable style={styles.backdrop} onPress={closePicker} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.sheetHeader}>
            <Pressable accessibilityRole="button" onPress={closePicker}>
              <AppText variant="bodyMedium" color="textSecondary">
                Cancel
              </AppText>
            </Pressable>
            <AppText variant="bodyMedium" style={styles.sheetTitle}>
              {label ?? 'Pick a date'}
            </AppText>
            <Pressable accessibilityRole="button" onPress={handleConfirm}>
              <AppText variant="bodyMedium" color="textLink" style={styles.sheetAction}>
                Done
              </AppText>
            </Pressable>
          </View>

          {pickerReady && Picker ? (
            <Picker
              value={draftDate}
              mode="date"
              display={pickerDisplay}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={(_event: DateTimePickerEvent, date?: Date) => {
                if (date) {
                  setDraftDate(date);
                }
              }}
              style={styles.picker}
            />
          ) : (
            <View style={styles.manualFallback}>
              <AppText variant="bodySmall" color="textMuted" style={styles.manualHint}>
                Enter date as YYYY-MM-DD
              </AppText>
              <AppInput
                value={manualDraft}
                onChangeText={setManualDraft}
                placeholder="1990-05-15"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}

          {value ? (
            <Pressable accessibilityRole="button" onPress={handleClear} style={styles.clearButton}>
              <AppText variant="bodySmall" color="error">
                Clear date
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelSurface: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  trigger: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderForm,
    borderRadius: radius.small,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  triggerSurface: {
    backgroundColor: colors.surface,
    borderColor: colors.borderForm,
  },
  triggerText: {
    flex: 1,
  },
  triggerTextSurface: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  triggerError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  triggerDisabled: {
    backgroundColor: colors.disabledBg,
  },
  pressed: {
    opacity: 0.9,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sheetAction: {
    fontWeight: '700',
  },
  picker: {
    alignSelf: 'stretch',
  },
  manualFallback: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  manualHint: {
    textAlign: 'center',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
