import axios from 'axios';

export class ApiError extends Error {
  readonly statusCode?: number;
  readonly data?: Record<string, unknown>;

  constructor(message: string, statusCode?: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

function pickApiErrorString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim());
    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  return undefined;
}

/** User-facing message from Afoma API JSON (web parity — includes carrier `response` text). */
export function getApiResponseErrorMessage(
  data: unknown,
  fallback = 'Something went wrong',
): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const carrierDetail = pickApiErrorString(record.response);
  if (carrierDetail) {
    return carrierDetail;
  }

  const message = pickApiErrorString(record.message);
  if (message && message !== 'Error') {
    return message;
  }

  const error = pickApiErrorString(record.error);
  if (error) {
    return error;
  }

  const msg = pickApiErrorString(record.msg);
  if (msg) {
    return msg;
  }

  return fallback;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    if (error.data) {
      return getApiResponseErrorMessage(error.data, error.message || fallback);
    }
    return error.message || fallback;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data !== undefined) {
      return getApiResponseErrorMessage(data, fallback);
    }

    const axiosMessage = error.message?.trim();
    if (axiosMessage && !axiosMessage.startsWith('Request failed with status code')) {
      return axiosMessage;
    }

    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function toApiError(error: unknown, fallback = 'Something went wrong'): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const record =
      data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined;
    return new ApiError(getErrorMessage(error, fallback), error.response?.status, record);
  }

  return new ApiError(getErrorMessage(error, fallback));
}
