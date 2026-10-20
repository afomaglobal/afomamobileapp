import type { PaymentMethodId } from '../components/PaymentMethodOption';
import type { PaymentMethodPickerItem } from '../components/PaymentMethodPicker';
import { formatProductPrice } from '../../products/utils/productDisplay';

export function countSelectablePaymentMethods(methods: PaymentMethodPickerItem[]): number {
  return methods.filter((method) => !method.disabled).length;
}

export function resolveSelectedPaymentMethodOption(
  methods: PaymentMethodPickerItem[],
  selectedMethod: PaymentMethodId,
): PaymentMethodPickerItem | undefined {
  const selected = methods.find((method) => method.id === selectedMethod);
  if (selected && !selected.disabled) {
    return selected;
  }
  return methods.find((method) => !method.disabled);
}

export function buildCheckoutPaymentPickerHint(
  methods: PaymentMethodPickerItem[],
): string | undefined {
  const selectable = countSelectablePaymentMethods(methods);
  if (selectable === 0) {
    return undefined;
  }
  if (selectable === 1) {
    return 'Only one payment option applies to this order. Confirm it below before you continue.';
  }
  return 'Choose how you want to pay. You will confirm the total with the option selected below.';
}

export function buildCheckoutPaymentProceedHint(
  selected?: PaymentMethodPickerItem,
): string | undefined {
  if (!selected) {
    return undefined;
  }
  return `You will proceed with ${selected.label}.`;
}

export function buildCheckoutPaymentFooterButtonLabel(options: {
  selected?: PaymentMethodPickerItem;
  currency: string;
  total: number | null | undefined;
  shippingPending?: boolean;
  continueLoading?: boolean;
  continueLoadingLabel?: string;
  payAtVenueBooking?: boolean;
}): string {
  const {
    currency,
    total,
    shippingPending = false,
    continueLoading = false,
    continueLoadingLabel,
    payAtVenueBooking = false,
  } = options;

  if (continueLoading) {
    return continueLoadingLabel ?? 'One moment…';
  }

  if (payAtVenueBooking) {
    return 'Confirm booking';
  }

  const totalReady = total != null && !shippingPending;

  if (totalReady) {
    return `Pay ${formatProductPrice(total, currency)}`;
  }

  return 'Pay now';
}
