import type { ServiceLocationMode } from '../types/service';

export const SERVICE_LOCATION_CUSTOMER_LABELS: Record<'at_salon' | 'mobile', string> = {
  at_salon: 'Shop',
  mobile: 'Home',
};

export function customerMustPickServiceLocation(serviceLocation?: ServiceLocationMode): boolean {
  return serviceLocation === 'both';
}

export function resolveCustomerServiceLocation(
  serviceLocation: ServiceLocationMode | undefined,
  customerChoice: string,
): 'at_salon' | 'mobile' | null {
  if (serviceLocation === 'at_salon') {
    return 'at_salon';
  }
  if (serviceLocation === 'mobile') {
    return 'mobile';
  }
  if (customerChoice === 'at_salon' || customerChoice === 'mobile') {
    return customerChoice;
  }
  return null;
}

export function serviceLocationDetailLabel(loc?: ServiceLocationMode): string {
  if (loc === 'mobile') {
    return 'Home service';
  }
  if (loc === 'both') {
    return 'Shop or home (you choose when booking)';
  }
  return 'Shop service';
}
