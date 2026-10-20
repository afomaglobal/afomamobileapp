import { apiDelete, apiGet, apiPost, apiPut } from '../../../services/api/request';
import type { ServiceSlotsResponse, ServiceStaffMember } from '../types/service';

export interface ServiceAvailabilityRecord {
  _id?: string;
  seller?: string;
  timezone?: string;
  weeklyHours?: Array<{
    day: number;
    enabled?: boolean;
    start?: string;
    end?: string;
  }>;
  blockedDates?: Array<{ date: string; reason?: string }>;
  slotIntervalMinutes?: number;
  minLeadTimeHours?: number;
  maxAdvanceDays?: number;
}

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function fetchBookableStaff(params: {
  sellerId: string;
  productId: string;
}): Promise<{ staff?: ServiceStaffMember[]; usesStaff?: boolean }> {
  return apiGet(
    '/services/staff',
    {
      params: {
        sellerId: params.sellerId,
        productId: params.productId,
      },
    },
    'Failed to load team members',
  );
}

export async function fetchServiceSlots(params: {
  sellerId: string;
  productId: string;
  staffId?: string;
  from?: string;
  to?: string;
  addOnIds?: string[];
}): Promise<ServiceSlotsResponse> {
  const query: Record<string, string> = {
    sellerId: params.sellerId,
    productId: params.productId,
  };
  if (params.staffId) {
    query.staffId = params.staffId;
  }
  if (params.from) {
    query.from = params.from;
  }
  if (params.to) {
    query.to = params.to;
  }
  if (params.addOnIds?.length) {
    query.addOnIds = params.addOnIds.join(',');
  }
  return apiGet('/services/slots', { params: query }, 'Failed to load appointment times');
}

export function normalizeStaffManageResponse(data: unknown): ServiceStaffMember[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { staff?: unknown }).staff)) {
    return (data as { staff: ServiceStaffMember[] }).staff;
  }
  return [];
}

export async function fetchSellerAvailability(
  sellerId: string,
  token: string,
): Promise<ServiceAvailabilityRecord> {
  return apiGet(
    `/services/availability/${encodeURIComponent(sellerId)}`,
    authHeaders(token),
    'Failed to load shop hours',
  );
}

export async function updateSellerAvailability(
  sellerId: string,
  payload: Partial<ServiceAvailabilityRecord>,
  token: string,
): Promise<ServiceAvailabilityRecord> {
  return apiPut(
    `/services/availability/${encodeURIComponent(sellerId)}`,
    payload,
    authHeaders(token),
    'Failed to save shop hours',
  );
}

export async function fetchSellerStaffManage(
  sellerId: string,
  token: string,
): Promise<{ staff: ServiceStaffMember[] }> {
  const data = await apiGet(
    `/services/staff/seller/${encodeURIComponent(sellerId)}/manage`,
    authHeaders(token),
    'Failed to load team',
  );
  return { staff: normalizeStaffManageResponse(data) };
}

export async function createServiceStaff(
  sellerId: string,
  payload: Record<string, unknown>,
  token: string,
): Promise<ServiceStaffMember> {
  return apiPost(
    `/services/staff/seller/${encodeURIComponent(sellerId)}`,
    payload,
    authHeaders(token),
    'Failed to add team member',
  );
}

export async function updateServiceStaff(
  sellerId: string,
  staffId: string,
  payload: Record<string, unknown>,
  token: string,
): Promise<ServiceStaffMember> {
  return apiPut(
    `/services/staff/seller/${encodeURIComponent(sellerId)}/${encodeURIComponent(staffId)}`,
    payload,
    authHeaders(token),
    'Failed to update team member',
  );
}

export async function deleteServiceStaff(
  sellerId: string,
  staffId: string,
  token: string,
): Promise<unknown> {
  return apiDelete(
    `/services/staff/seller/${encodeURIComponent(sellerId)}/${encodeURIComponent(staffId)}`,
    authHeaders(token),
    'Failed to remove team member',
  );
}

export async function fetchSellerBookings(
  sellerId: string,
  token: string,
  options: { status?: string; page?: number; limit?: number } = {},
): Promise<{ bookings?: unknown[]; pagination?: { hasMore?: boolean } }> {
  const params: Record<string, string> = {};
  if (options.status) {
    params.status = options.status;
  }
  if (options.page) {
    params.page = String(options.page);
  }
  if (options.limit) {
    params.limit = String(options.limit);
  }
  return apiGet(
    `/services/bookings/seller/${encodeURIComponent(sellerId)}`,
    { ...authHeaders(token), params },
    'Failed to load appointments',
  );
}

export async function releaseServiceBookingHold(
  ref: string,
  token: string,
  reason = 'Removed from cart',
): Promise<unknown> {
  return apiPost(
    `/services/bookings/ref/${encodeURIComponent(ref)}/release`,
    { reason },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    'Failed to release appointment hold',
  );
}
