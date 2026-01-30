export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
        image.src = url;
    });

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Could not get canvas context");
    }

    // Validate crop dimensions
    if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
        throw new Error("Invalid crop dimensions");
    }

    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    // Ensure crop coordinates are within bounds
    const safeX = Math.max(0, Math.round(pixelCrop.x));
    const safeY = Math.max(0, Math.round(pixelCrop.y));
    const safeWidth = Math.min(Math.round(pixelCrop.width), bBoxWidth - safeX);
    const safeHeight = Math.min(Math.round(pixelCrop.height), bBoxHeight - safeY);

    // Validate safe dimensions
    if (safeWidth <= 0 || safeHeight <= 0) {
        throw new Error("Crop area is outside of image bounds");
    }

    // croppedAreaPixels values are bounding box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(safeX, safeY, safeWidth, safeHeight);

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = safeWidth;
    canvas.height = safeHeight;

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0);

    // As Base64 string with higher quality
    return canvas.toDataURL("image/jpeg", 0.92);

    // As Blob
    // return new Promise((resolve, reject) => {
    //   canvas.toBlob((file) => {
    //     resolve(URL.createObjectURL(file))
    //   }, 'image/jpeg')
    // })
}
