import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import type { PdpTheme } from '../../../design-system/pdpTheme';
import { usePricing } from '../../../app/providers/PricingProvider';
import type { Product } from '../../../services/types/product';
import type { CartMap } from '../../../services/types/cart';
import { fetchBookableStaff, fetchServiceSlots } from '../api/serviceBookingApi';
import type {
  ServiceAddOn,
  ServiceSlot,
  ServiceSlotSelectionHold,
  ServiceStaffMember,
} from '../types/service';
import {
  addOnPriceInCad,
  computeEffectiveServiceDurationMinutes,
  computeServiceBookingTotal,
  getActiveServiceAddOns,
} from '../utils/serviceAddOns';
import {
  customerMustPickServiceLocation,
  resolveCustomerServiceLocation,
  SERVICE_LOCATION_CUSTOMER_LABELS,
} from '../utils/serviceLocationOptions';
import {
  formatServiceAmount,
  formatServicePriceLabel,
  getServiceDisplayPricing,
} from '../utils/serviceDisplayPricing';
import { findActiveDuplicateAppointmentInCart, appointmentSlotKeyFromHold } from '../utils/serviceCartLine';

export interface ServiceBookingPanelProps {
  service: Product;
  cart: CartMap;
  onAddToCart: (hold: ServiceSlotSelectionHold) => Promise<void>;
  /** When false, hides the price row (service detail header already shows pricing). */
  showPriceSummary?: boolean;
  theme?: PdpTheme;
  onBookingStateChange?: (state: ServiceBookingUiState) => void;
}

export type ServiceBookingUiState = {
  canSubmit: boolean;
  submitting: boolean;
  notice: string | null;
  addButtonLabel: string;
};

export type ServiceBookingPanelRef = {
  submitAddToCart: () => Promise<void>;
};

function groupSlotsByDate(slots: ServiceSlot[]): Record<string, ServiceSlot[]> {
  return slots.reduce<Record<string, ServiceSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {});
}

function formatBookingDateLabel(dateKey: string): string {
  const parts = dateKey.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatAddOnPillLabel(
  addon: ServiceAddOn,
  service: Product,
  currencyLabel: string,
  conversionRate: number,
): string {
  const name = String(addon.name || 'Add-on').trim();
  const priceCad = addOnPriceInCad(addon.price, service);
  const display = priceCad * (conversionRate || 1);
  const extras: string[] = [];
  if (display > 0) {
    extras.push(`+${currencyLabel} ${formatServiceAmount(display)}`);
  }
  const minutes = Math.max(0, parseInt(String(addon.extraMinutes), 10) || 0);
  if (minutes > 0) {
    extras.push(`+${minutes} min`);
  }
  return extras.length ? `${name} · ${extras.join(' · ')}` : name;
}

function getSelectionChipStyles(theme: PdpTheme | undefined, selected: boolean): ViewStyle[] {
  return [
    styles.chip,
    {
      backgroundColor: selected
        ? theme?.pillSelectedBg ?? colors.primary
        : theme?.surface ?? colors.surface,
      borderColor: selected
        ? theme?.pillSelectedBg ?? colors.primary
        : theme?.pillBorder ?? colors.borderForm,
    },
  ];
}

function getSelectionChipLabelStyle(theme: PdpTheme | undefined, selected: boolean): TextStyle {
  return {
    color: selected
      ? theme?.pillSelectedText ?? colors.textInverse
      : theme?.pillText ?? colors.textPrimary,
    fontWeight: selected ? '600' : '500',
  };
}

export const ServiceBookingPanel = forwardRef<ServiceBookingPanelRef, ServiceBookingPanelProps>(
  function ServiceBookingPanel(
    { service, cart, onAddToCart, showPriceSummary = true, theme, onBookingStateChange },
    ref,
  ) {
  const { userInfo } = usePricing();
  const sellerId = service.seller?._id;
  const productId = service._id;
  const priceType = service.serviceDetails?.priceType || 'fixed';
  const configuredLocation = service.serviceDetails?.serviceLocation || 'at_salon';
  const availableAddOns = useMemo(() => getActiveServiceAddOns(service), [service]);
  const displayPricing = getServiceDisplayPricing(service, userInfo);

  const [customerLocationChoice, setCustomerLocationChoice] = useState('');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [staffOptions, setStaffOptions] = useState<ServiceStaffMember[]>([]);
  const [usesStaff, setUsesStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ServiceSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setCustomerLocationChoice('');
    setSelectedAddOnIds([]);
    setSelectedStaffId('');
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotice(null);
  }, [productId]);

  useEffect(() => {
    if (configuredLocation === 'at_salon') {
      setCustomerLocationChoice('at_salon');
    } else if (configuredLocation === 'mobile') {
      setCustomerLocationChoice('mobile');
    } else {
      setCustomerLocationChoice('');
    }
  }, [configuredLocation, productId]);

  const resolvedFulfillment = resolveCustomerServiceLocation(
    configuredLocation,
    customerLocationChoice,
  );

  const pricing = useMemo(
    () => computeServiceBookingTotal(service, selectedAddOnIds),
    [service, selectedAddOnIds],
  );

  const displayTotal = pricing.total * (displayPricing.conversionRate || 1);
  const locationReady =
    !customerMustPickServiceLocation(configuredLocation) || Boolean(resolvedFulfillment);

  useEffect(() => {
    if (!sellerId || !productId) {
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    void fetchBookableStaff({ sellerId, productId })
      .then((data) => {
        if (cancelled) {
          return;
        }
        const staff = data.staff ?? [];
        setStaffOptions(staff);
        setUsesStaff(Boolean(data.usesStaff) || staff.length > 0);
        if (staff.length === 1 && staff[0]._id) {
          setSelectedStaffId(String(staff[0]._id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStaffOptions([]);
          setUsesStaff(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStaff(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, productId]);

  const loadSlots = useCallback(async () => {
    if (!sellerId || !productId || loadingStaff || !locationReady) {
      return;
    }
    if (usesStaff && !selectedStaffId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const data = await fetchServiceSlots({
        sellerId,
        productId,
        staffId: usesStaff ? selectedStaffId : undefined,
        addOnIds: selectedAddOnIds,
      });
      setSlots(data.slots ?? []);
      setTimezone(data.timezone ?? 'UTC');
    } catch {
      setSlots([]);
      setNotice('Could not load available times. Try again.');
    } finally {
      setLoadingSlots(false);
    }
  }, [
    sellerId,
    productId,
    loadingStaff,
    locationReady,
    usesStaff,
    selectedStaffId,
    selectedAddOnIds,
  ]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotsByDate = useMemo(() => groupSlotsByDate(slots), [slots]);
  const availableDates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate]);

  const buildSelection = (): ServiceSlotSelectionHold | null => {
    if (!locationReady) {
      setNotice('Choose where you need the service (shop or home).');
      return null;
    }
    if (usesStaff && !selectedStaffId) {
      setNotice('Select a team member.');
      return null;
    }
    if (!selectedSlot) {
      setNotice('Select a time slot.');
      return null;
    }
    const staffMember = staffOptions.find((s) => String(s._id) === selectedStaffId);
    const durationMinutes = computeEffectiveServiceDurationMinutes(service, pricing.addOnExtraMinutes);
    return {
      startsAt: selectedSlot.startsAt,
      endsAt: selectedSlot.endsAt,
      staffId: usesStaff ? selectedStaffId : null,
      serviceFulfillment: resolvedFulfillment,
      selectedAddOns: pricing.selectedAddOns,
      priceSnapshot: {
        amount: pricing.total,
        baseAmount: pricing.base,
        addOnsAmount: pricing.addOnTotal,
        addOnExtraMinutes: pricing.addOnExtraMinutes,
        durationMinutes,
        currency: service.currency || 'CAD',
      },
      display: {
        date: selectedSlot.date,
        time: selectedSlot.time,
        timezone,
        staffName: staffMember?.displayName,
      },
    };
  };

  const blockDuplicate = (selection: ServiceSlotSelectionHold): boolean => {
    const slotKey = appointmentSlotKeyFromHold(selection, service);
    const duplicate = findActiveDuplicateAppointmentInCart(cart, slotKey);
    if (duplicate) {
      setNotice('This appointment is already in your cart.');
      return true;
    }
    return false;
  };

  const handleAdd = async () => {
    const selection = buildSelection();
    if (!selection || blockDuplicate(selection)) {
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await onAddToCart(selection);
      setSelectedSlot(null);
      setNotice('Appointment added to cart.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not add to cart.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (priceType === 'custom_quote') {
      return false;
    }
    if (!locationReady) {
      return false;
    }
    if (usesStaff && !selectedStaffId) {
      return false;
    }
    return Boolean(selectedSlot);
  }, [
    locationReady,
    priceType,
    selectedSlot,
    selectedStaffId,
    usesStaff,
  ]);

  const addButtonLabel = useMemo(() => {
    if (!locationReady && customerMustPickServiceLocation(configuredLocation)) {
      return 'Select location';
    }
    if (usesStaff && !selectedStaffId) {
      return 'Select provider';
    }
    if (!selectedDate) {
      return 'Select date';
    }
    if (!selectedSlot) {
      return 'Select time';
    }
    return 'Add to Cart';
  }, [
    configuredLocation,
    locationReady,
    selectedDate,
    selectedSlot,
    selectedStaffId,
    usesStaff,
  ]);

  useEffect(() => {
    onBookingStateChange?.({
      canSubmit,
      submitting,
      notice,
      addButtonLabel,
    });
  }, [addButtonLabel, canSubmit, notice, onBookingStateChange, submitting]);

  const handleAddRef = useRef(handleAdd);
  handleAddRef.current = handleAdd;

  useImperativeHandle(
    ref,
    () => ({
      submitAddToCart: () => handleAddRef.current(),
    }),
    [],
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const sectionLabelStyle = useMemo(
    () => ({ color: theme?.textPrimary ?? colors.textPrimary }),
    [theme],
  );

  const renderChip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={getSelectionChipStyles(theme, selected)}
    >
      <AppText variant="bodySmall" style={getSelectionChipLabelStyle(theme, selected)}>
        {label}
      </AppText>
    </Pressable>
  );

  if (priceType === 'custom_quote') {
    return (
      <View
        style={[
          styles.quoteBox,
          {
            backgroundColor: theme?.surfaceMuted ?? colors.primarySoft,
            borderColor: theme?.border ?? colors.border,
          },
        ]}
      >
        <AppText variant="bodyMedium">Custom quote required</AppText>
        <AppText variant="bodySmall" color="textMuted">
          Contact the provider to discuss pricing before booking.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.bookingRoot}>
      <AppText variant="h3" style={sectionLabelStyle}>
        Book appointment
      </AppText>
      {showPriceSummary ? (
        <AppText variant="bodyMedium" style={styles.priceLine}>
          {formatServicePriceLabel(displayPricing.currencyLabel, displayTotal, {
            prefix: displayPricing.pricePrefix,
          })}
        </AppText>
      ) : null}

      {customerMustPickServiceLocation(configuredLocation) ? (
        <View style={styles.section}>
          <AppText variant="label" style={sectionLabelStyle}>
            Service location
          </AppText>
          <View style={styles.chipRowWrap}>
            {(['at_salon', 'mobile'] as const).map((loc) =>
              renderChip(
                loc,
                SERVICE_LOCATION_CUSTOMER_LABELS[loc],
                customerLocationChoice === loc,
                () => setCustomerLocationChoice(loc),
              ),
            )}
          </View>
        </View>
      ) : null}

      {availableAddOns.length ? (
        <View style={styles.section}>
          <AppText variant="label" style={sectionLabelStyle}>
            Add-ons
          </AppText>
          <View style={styles.chipRowWrap}>
            {availableAddOns.map((addon) => {
              const id = String(addon._id);
              const selected = selectedAddOnIds.includes(id);
              const label = formatAddOnPillLabel(
                addon,
                service,
                displayPricing.currencyLabel,
                displayPricing.conversionRate || 1,
              );
              return renderChip(id, label, selected, () => toggleAddOn(id));
            })}
          </View>
        </View>
      ) : null}

      {usesStaff ? (
        <View style={styles.section}>
          <AppText variant="label" style={sectionLabelStyle}>
            Service provider
          </AppText>
          {loadingStaff ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScrollBleed}
              contentContainerStyle={styles.chipRow}
            >
              {staffOptions.map((member) => {
                const id = String(member._id);
                return renderChip(id, member.displayName || 'Staff', selectedStaffId === id, () => {
                  setSelectedStaffId(id);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                });
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label" style={sectionLabelStyle}>
          Date
        </AppText>
        {loadingSlots ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScrollBleed}
            contentContainerStyle={styles.chipRow}
          >
            {availableDates.map((date) =>
              renderChip(date, formatBookingDateLabel(date), selectedDate === date, () => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }),
            )}
          </ScrollView>
        )}
      </View>

      {selectedDate ? (
        <View style={styles.section}>
          <AppText variant="label" style={sectionLabelStyle}>
            Time
          </AppText>
          <View style={styles.chipRowWrap}>
            {(slotsByDate[selectedDate] ?? []).map((slot) =>
              renderChip(
                `${slot.startsAt}-${slot.time}`,
                slot.time,
                selectedSlot?.startsAt === slot.startsAt,
                () => setSelectedSlot(slot),
              ),
            )}
          </View>
        </View>
      ) : null}

    </View>
  );
},
);

const styles = StyleSheet.create({
  bookingRoot: {
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  priceLine: {
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  chipScrollBleed: {
    marginHorizontal: -spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  quoteBox: {
    padding: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
    gap: spacing.xs,
  },
});
