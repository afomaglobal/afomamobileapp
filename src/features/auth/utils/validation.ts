export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Empty is allowed (App Store 5.1.1); validate format when the user enters a number. */
export function validateOptionalPhone(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.replace(/\D/g, '').length < 7) {
    return 'Enter a valid phone number.';
  }
  return undefined;
}
