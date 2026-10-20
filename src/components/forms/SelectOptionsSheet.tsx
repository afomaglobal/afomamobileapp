import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '../ecommerce/SearchBar';
import { AppText } from '../ui/AppText';
import { colors, radius, spacing } from '../../design-system';
import type { SelectOption } from '../../utils/regionOptions';

const SHEET_HEIGHT_RATIO = 0.7;

export interface SelectOptionsSheetProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  emptyLabel?: string;
  selectionAccent?: 'primary' | 'navy';
  isOptionDisabled?: (option: SelectOption) => boolean;
  /** Show filter field (defaults on when there are more than 20 options). */
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function SelectOptionsSheet({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  emptyLabel = 'No options available',
  selectionAccent = 'primary',
  isOptionDisabled,
  searchable,
  searchPlaceholder = 'Search',
}: SelectOptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * SHEET_HEIGHT_RATIO);
  const useNavySelection = selectionAccent === 'navy';
  const [searchQuery, setSearchQuery] = useState('');

  const showSearch = searchable ?? options.length > 20;

  const filteredOptions = useMemo(() => {
    if (!showSearch) {
      return options;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery, showSearch]);

  const sheetPaddingBottom = useMemo(
    () => Math.max(insets.bottom, spacing.lg),
    [insets.bottom],
  );

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardWrap}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.sm : 0}
      >
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: sheetPaddingBottom,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <AppText variant="bodyMedium" style={styles.sheetTitle}>
              {title}
            </AppText>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <AppText variant="bodyMedium" color="textLink">
                Close
              </AppText>
            </Pressable>
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <SearchBar
                mode="input"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
              />
            </View>
          ) : null}

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            style={styles.optionsListContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsList}
            renderItem={({ item }) => {
              const selected = item.value === value;
              const optionDisabled = isOptionDisabled?.(item) ?? false;

              return (
                <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: optionDisabled }}
                disabled={optionDisabled}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && (useNavySelection ? styles.optionRowSelectedNavy : styles.optionRowSelected),
                  optionDisabled && styles.optionRowDisabled,
                  pressed && !optionDisabled && styles.pressed,
                ]}
                >
                  <AppText
                    variant="body"
                    color={
                      optionDisabled
                        ? 'textSubtle'
                        : selected
                          ? useNavySelection
                            ? 'textPrimary'
                            : 'textLink'
                          : 'textPrimary'
                    }
                    style={[
                      selected && !optionDisabled ? styles.optionLabelSelected : undefined,
                      optionDisabled ? styles.optionLabelDisabled : undefined,
                    ]}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <AppText variant="bodySmall" color="textMuted">
                  {showSearch && searchQuery.trim() ? 'No matching options.' : emptyLabel}
                </AppText>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    flexShrink: 1,
  },
  optionsListContainer: {
    flex: 1,
    minHeight: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  optionsList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  optionRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.small,
    borderBottomColor: 'transparent',
  },
  optionRowSelectedNavy: {
    backgroundColor: colors.disabledBg,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.small,
    borderBottomColor: 'transparent',
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionRowDisabled: {
    opacity: 0.55,
  },
  optionLabelDisabled: {
    textDecorationLine: 'line-through',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
