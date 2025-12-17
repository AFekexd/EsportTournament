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
