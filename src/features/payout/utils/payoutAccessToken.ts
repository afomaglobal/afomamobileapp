export function isLikelyPayoutAccessToken(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.split('.').length === 3;
}
