import sharp from 'sharp';

/**
 * Image processing configuration
 */
const IMAGE_CONFIG = {
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    QUALITY: 80,
    FORMAT: 'jpeg' as const,
    MAX_SIZE_BYTES: 500 * 1024, // 500KB target
};

/**
 * Validates if a string is a valid base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
    if (!str) return false;
    return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(str);
}

/**
 * Extracts base64 data from a data URL
 */
function extractBase64Data(dataUrl: string): string {
    const matches = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
    if (!matches || matches.length < 2) {
        throw new Error('Invalid base64 data URL format');
    }
    return matches[1];
}

/**
 * Processes and compresses an image from base64 data URL
 * - Resizes to max dimensions while maintaining aspect ratio
 * - Converts to JPEG format
 * - Compresses to target quality
 * - Returns new base64 data URL
 */
export async function processImage(dataUrl: string): Promise<string> {
    try {
        // Validate input
        if (!isBase64DataUrl(dataUrl)) {
            throw new Error('Invalid image data URL');
        }

        // Extract base64 data
        const base64Data = extractBase64Data(dataUrl);
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        console.log(`📸 Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}, size: ${(imageBuffer.length / 1024).toFixed(2)}KB`);

        // Process image with Sharp
        let processedBuffer = await sharp(imageBuffer)
            .resize(IMAGE_CONFIG.MAX_WIDTH, IMAGE_CONFIG.MAX_HEIGHT, {
                fit: 'inside', // Maintain aspect ratio
                withoutEnlargement: true, // Don't upscale small images
            })
            .jpeg({
                quality: IMAGE_CONFIG.QUALITY,
                progressive: true,
            })
            .toBuffer();

        // Check if we need additional compression
        let quality = IMAGE_CONFIG.QUALITY;
        while (processedBuffer.length > IMAGE_CONFIG.MAX_SIZE_BYTES && quality > 40) {
            quality -= 10;
            console.log(`🔄 Re-compressing with quality ${quality}%...`);
            processedBuffer = await sharp(imageBuffer)
                .resize(IMAGE_CONFIG.MAX_WIDTH, IMAGE_CONFIG.MAX_HEIGHT, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .jpeg({
                    quality,
                    progressive: true,
                })
                .toBuffer();
        }

        const finalSizeKB = (processedBuffer.length / 1024).toFixed(2);
        console.log(`✅ Image processed: ${finalSizeKB}KB (quality: ${quality}%)`);

        // Convert back to base64 data URL
        const base64Result = processedBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64Result}`;
    } catch (error) {
        console.error('❌ Image processing error:', error);
        throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validates image size from base64 data URL
 * Returns size in bytes
 */
export function getBase64Size(dataUrl: string): number {
    if (!isBase64DataUrl(dataUrl)) {
        return 0;
    }
    const base64Data = extractBase64Data(dataUrl);
    return Buffer.from(base64Data, 'base64').length;
}

/**
 * Validates if image is within acceptable size limits
 * Max 10MB before processing
 */
export function validateImageSize(dataUrl: string, maxSizeMB: number = 10): boolean {
    const sizeBytes = getBase64Size(dataUrl);
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB <= maxSizeMB;
}

/**
 * Validates that an image string is either a valid base64 image data URL,
 * a safe local path (e.g. starting with '/' like '/uploads/'), or empty.
 * External HTTP/HTTPS URLs are strictly forbidden to prevent IP grabbing and tracking pixels.
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
    if (!url) return true;
    const trimmed = url.trim();
    if (!trimmed) return true;
    if (/^(https?:|\/\/)/i.test(trimmed)) {
        return false;
    }
    return isBase64DataUrl(trimmed) || trimmed.startsWith('/');
}

/**
 * Validates and processes an image input:
 * - Rejects any external HTTP/HTTPS URLs (anti-IP grabber)
 * - Compresses and sanitizes valid base64 data URLs via Sharp
 * - Allows safe local relative paths (e.g., /uploads/...)
 */
export async function processAndValidateImage(
    url: string | null | undefined,
    maxSizeMB: number = 10
): Promise<string | undefined> {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (/^(https?:|\/\/)/i.test(trimmed)) {
        throw new Error('Külső kép URL megadása biztonsági okokból nem engedélyezett. Kérlek töltsd fel a képet közvetlenül a fájlválasztóval!');
    }

    if (isBase64DataUrl(trimmed)) {
        if (!validateImageSize(trimmed, maxSizeMB)) {
            throw new Error(`A kép mérete túl nagy (maximum ${maxSizeMB}MB engedélyezett)`);
        }
        return await processImage(trimmed);
    }

    if (trimmed.startsWith('/')) {
        return trimmed;
    }

    throw new Error('Érvénytelen képformátum. Csak közvetlenül feltöltött kép vagy helyi fájl engedélyezett.');
}

/**
 * Safely fetches, validates, and processes an image from RAWG API (media.rawg.io)
 * Converts it to a base64 data URL so no client ever loads external URLs directly,
 * preventing any IP grabbing or tracking.
 */
export async function processRawgImage(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname.toLowerCase();
        // Allow official RAWG media CDNs
        const allowedHosts = ['media.rawg.io', 'images.rawg.io', 'rawg.io'];
        if (!allowedHosts.some(h => host === h || host.endsWith('.' + h))) {
            return null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(trimmed, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'PollakEsport/1.0',
            },
        });
        clearTimeout(timeout);

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process through Sharp
        const processedBuffer = await sharp(buffer)
            .resize(IMAGE_CONFIG.MAX_WIDTH, IMAGE_CONFIG.MAX_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({
                quality: IMAGE_CONFIG.QUALITY,
                progressive: true,
            })
            .toBuffer();

        const base64Result = processedBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64Result}`;
    } catch (error) {
        console.warn('Failed to process RAWG image:', error);
        return null;
    }
}
