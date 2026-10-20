import type { SelectOption } from '../../../utils/regionOptions';

/** Web parity: `pages/seller/my-account/seller-policies/index.jsx` */
export const SELLER_CANCELLATION_TIME_OPTIONS: SelectOption[] = [
  { label: '24 hours', value: '24' },
  { label: '48 hours', value: '48' },
];

export const SELLER_CUSTOM_RETURN_POLICY_VALUE =
  'Customized – Enter your own return policy details.';

export const SELLER_RETURN_POLICY_OPTIONS: SelectOption[] = [
  { label: 'No Returns – All sales are final.', value: 'No Returns – All sales are final.' },
  {
    label: '7-Day Returns – Return within 7 days. Buyer covers shipping.',
    value: '7-Day Returns – Return within 7 days. Buyer covers shipping.',
  },
  {
    label: '14-Day Returns – Return within 14 days. Buyer covers shipping unless defective.',
    value: '14-Day Returns – Return within 14 days. Buyer covers shipping unless defective.',
  },
  {
    label: '30-Day Returns – Return within 30 days. Unused, original packaging. Buyer covers shipping.',
    value: '30-Day Returns – Return within 30 days. Unused, original packaging. Buyer covers shipping.',
  },
  {
    label: 'Exchanges Only – No returns, but exchanges allowed for defects within 14 days.',
    value: 'Exchanges Only – No returns, but exchanges allowed for defects within 14 days.',
  },
  {
    label: 'Damaged/Incorrect Items Only – Returns accepted within 7 days for damaged or wrong items.',
    value: 'Damaged/Incorrect Items Only – Returns accepted within 7 days for damaged or wrong items.',
  },
  {
    label: 'Customized – Enter your own return policy details.',
    value: SELLER_CUSTOM_RETURN_POLICY_VALUE,
  },
];

const PRESET_RETURN_VALUES = new Set(
  SELLER_RETURN_POLICY_OPTIONS.map((option) => option.value).filter(
    (value) => value !== SELLER_CUSTOM_RETURN_POLICY_VALUE,
  ),
);

export function getReturnPolicySelectValue(details: string): string {
  const trimmed = details.trim();
  if (!trimmed) {
    return '';
  }

  if (PRESET_RETURN_VALUES.has(trimmed) || trimmed === SELLER_CUSTOM_RETURN_POLICY_VALUE) {
    return trimmed;
  }

  return SELLER_CUSTOM_RETURN_POLICY_VALUE;
}

export function isCustomReturnPolicySelection(details: string): boolean {
  return getReturnPolicySelectValue(details) === SELLER_CUSTOM_RETURN_POLICY_VALUE;
}
