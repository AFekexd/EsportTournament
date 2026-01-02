
/**
 * Validates if a string is a valid base64 PDF data URL
 */
export function isBase64Pdf(str: string): boolean {
    if (!str) return false;
    return /^data:application\/pdf;base64,/.test(str);
}

/**
 * Validates PDF size from base64 data URL
 * Returns size in bytes
 */
export function getPdfBase64Size(dataUrl: string): number {
    if (!isBase64Pdf(dataUrl)) {
        return 0;
    }
    // Remove header
    const base64Data = dataUrl.replace(/^data:application\/pdf;base64,/, '');
    // Calculate size: (length * 3/4) - padding
    return Buffer.from(base64Data, 'base64').length;
}

/**
 * Validates if PDF is within acceptable size limits
 * @param dataUrl Base64 string
 * @param maxSizeMB Max size in MB (default 5MB)
 */
export function validatePdfSize(dataUrl: string, maxSizeMB: number = 5): boolean {
    const sizeBytes = getPdfBase64Size(dataUrl);
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB <= maxSizeMB;
}
