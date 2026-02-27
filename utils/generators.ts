/**
 * Generates a unique invoice number.
 * Format: INV-{6-digit-timestamp}
 *
 * @returns Generated invoice number string
 */
export const generateInvoiceNumber = (): string => {
    return `INV-${Date.now().toString().slice(-6)}`;
};

/**
 * Generates a unique stock transfer number.
 * Format: TRF-{6-digit-timestamp}
 *
 * @returns Generated transfer number string
 */
export const generateTransferNumber = (): string => {
    return `TRF-${Date.now().toString().slice(-6)}`;
};
