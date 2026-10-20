import type { CartLineItem } from '../../../services/types/cart';
import type { OrderDetail } from '../../../services/types/order';

function getConversionRate(order: OrderDetail): number {
  const rate = Number(order.conversionRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function getShippingDeductedAmount(shippingOptions: unknown): number {
  if (!Array.isArray(shippingOptions) || shippingOptions.length === 0) {
    return 0;
  }

  const first = shippingOptions[0] as { deductedAmount?: number | string };
  const amount = Number(first?.deductedAmount);
  return Number.isFinite(amount) ? amount : 0;
}

function getSelectedVariation(line: CartLineItem) {
  const attributeName = line.selectedVariations?.[0]?.attributeName;
  const attributeValue = line.selectedVariations?.[0]?.attributeValue;

  if (!attributeName || !attributeValue) {
    return undefined;
  }

  return line.productData?.variations?.find(
    (variation) =>
      (variation as Record<string, unknown>)[attributeName] === attributeValue,
  );
}

function applyConversion(value: number, order: OrderDetail, converted = true): number {
  if (!converted) {
    return value;
  }

  return getConversionRate(order) * value;
}

/** Unit item price — traced from web pricingUtils.calculateItemPrice. */
export function calculateOrderItemUnitPrice(
  line: CartLineItem,
  order: OrderDetail,
  converted = true,
  sellerMode = false,
): number {
  const productType = line.productData?.productType;
  let basePrice: number;

  if (productType !== 'Customizable') {
    basePrice = Number(line.productData?.finalPrice ?? line.basePrice);
  } else {
    const selectedVariation = getSelectedVariation(line);
    basePrice = Number(selectedVariation?.finalPrice ?? line.basePrice);
  }

  if (!Number.isFinite(basePrice)) {
    return 0;
  }

  const shippingAddon =
    !sellerMode && Array.isArray(line.shippingOptions) && line.shippingOptions.length
      ? getShippingDeductedAmount(line.shippingOptions)
      : 0;

  const priceWithShipping = basePrice + shippingAddon;
  return applyConversion(priceWithShipping, order, converted);
}

/** Line total price — traced from web pricingUtils.calculateItemTotalPrice. */
export function calculateOrderItemLineTotal(
  line: CartLineItem,
  order: OrderDetail,
  converted = true,
  sellerMode = false,
): number {
  const productType = line.productData?.productType;
  const discountCode = Number(line.productData?.discountCode);
  const discountFactor =
    Number.isFinite(discountCode) && discountCode > 0 ? 1 - discountCode / 100 : 1;

  let basePrice: number;

  if (productType !== 'Customizable') {
    basePrice = Number(line.productData?.finalPrice ?? line.totalAmount);
  } else {
    const selectedVariation = getSelectedVariation(line);
    basePrice = Number(selectedVariation?.finalPrice ?? line.totalAmount);
  }

  if (!Number.isFinite(basePrice)) {
    return 0;
  }

  const shippingAddon =
    !sellerMode && Array.isArray(line.shippingOptions) && line.shippingOptions.length
      ? getShippingDeductedAmount(line.shippingOptions)
      : 0;

  const coupon =
    line.productData?.couponCode && line.productData?.couponDiscount
      ? Number(line.productData.couponDiscount)
      : 0;

  const amount = (basePrice + shippingAddon + (Number.isFinite(coupon) ? coupon : 0)) / discountFactor;
  return applyConversion(amount, order, converted);
}

export function calculateOrderItemsSubTotal(order: OrderDetail, converted = true): number {
  if (!order.cart?.length) {
    return 0;
  }

  return order.cart.reduce(
    (sum, line) => sum + calculateOrderItemLineTotal(line, order, converted),
    0,
  );
}

function sumUniqueSellerLineShipping(order: OrderDetail): number {
  if (!order.cart?.length) {
    return 0;
  }

  const seen = new Set<string>();

  return order.cart.reduce((total, line) => {
    const sellerId = line.productData?.seller?._id ?? line.productData?.seller?.id;
    if (!sellerId || seen.has(String(sellerId))) {
      return total;
    }

    seen.add(String(sellerId));
    const shippingRate = Number(line.shippingRate);
    if (!Number.isFinite(shippingRate) || shippingRate <= 0) {
      return total;
    }

    return total + shippingRate;
  }, 0);
}

/** CAD shipping implied by backend order totals (subTotal + serviceFees + shipping = order_price). */
function inferOrderShippingCad(order: OrderDetail): number | null {
  const orderPrice = Number(order.order_price);
  const subTotal = Number(order.subTotal);
  const serviceFees = Number(order.serviceFees);

  if (!Number.isFinite(orderPrice) || !Number.isFinite(subTotal)) {
    return null;
  }

  const fees = Number.isFinite(serviceFees) ? serviceFees : 0;
  const implied = parseFloat((orderPrice - subTotal - fees).toFixed(2));
  return implied >= 0 ? implied : null;
}

/**
 * Shipping for order summary — web `calculateOrderShippingTotal` + admin CAD fallback.
 * PayPal Nigeria orders store per-line shipping in checkout currency (USD); product
 * lines stay CAD and use conversionRate. Corrupt captures may store NGN-scale line
 * shipping with currency USD — detect via order_price and use implied CAD shipping.
 */
export function calculateOrderShippingTotal(order: OrderDetail, converted = true): number {
  const fromLines = sumUniqueSellerLineShipping(order);
  const rate = getConversionRate(order);
  const currency = getOrderCurrency(order).toUpperCase();
  const impliedCad = inferOrderShippingCad(order);

  if (currency !== 'CAD' && rate > 0) {
    const shippingCheckoutFromLines = fromLines;
    const shippingCadFromLines = shippingCheckoutFromLines / rate;

    const corruptLineShipping =
      impliedCad != null &&
      (shippingCadFromLines > impliedCad * 3 + 1 ||
        shippingCheckoutFromLines > Number(order.subTotal) * rate * 2);

    const shippingCad = corruptLineShipping && impliedCad != null ? impliedCad : shippingCadFromLines;

    if (!converted) {
      return shippingCad;
    }

    if (corruptLineShipping && impliedCad != null) {
      return parseFloat((impliedCad * rate).toFixed(2));
    }

    return shippingCheckoutFromLines;
  }

  return fromLines;
}

export function calculateOrderServiceFees(order: OrderDetail, converted = true): number {
  const fees = Number(order.serviceFees);
  if (!Number.isFinite(fees) || fees <= 0) {
    return 0;
  }

  return converted ? getConversionRate(order) * fees : fees;
}

export function calculateOrderGrandTotal(order: OrderDetail, converted = true): number {
  return (
    calculateOrderItemsSubTotal(order, converted) +
    calculateOrderServiceFees(order, converted) +
    calculateOrderShippingTotal(order)
  );
}

export function getOrderCurrency(order: OrderDetail): string {
  return order.currency?.trim() || 'CAD';
}

export function formatOrderMoney(order: OrderDetail, amount: number): string {
  return `${getOrderCurrency(order)} ${amount.toFixed(2)}`;
}
