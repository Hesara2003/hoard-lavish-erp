const ISO_TIMEZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;

/**
 * App business dates are intended to represent local wall-clock time.
 * If a timezone suffix is present, strip it so rendering stays aligned
 * with the cashier-entered local time.
 */
export const parseBusinessDate = (value: string): Date => {
  const raw = (value ?? '').trim();
  if (!raw) return new Date(NaN);

  if (ISO_TIMEZONE_SUFFIX.test(raw)) {
    return new Date(raw.replace(ISO_TIMEZONE_SUFFIX, ''));
  }

  return new Date(raw);
};
