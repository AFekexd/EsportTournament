import { useState } from "react";

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string;
}

export function BlurImage({ src, alt, className, containerClassName, ...props }: BlurImageProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className={`relative overflow-hidden bg-white/5 ${containerClassName || ""}`}>
            <img
                src={src}
                alt={alt}
                className={`transition-all duration-700 ease-in-out ${isLoading
                        ? "scale-110 blur-xl opacity-0"
                        : "scale-100 blur-0 opacity-100"
                    } ${className || ""}`}
                onLoad={() => setIsLoading(false)}
                {...props}
            />
            {/* Loading Skeleton/Overlap */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/10 animate-pulse backdrop-blur-sm" />
            )}
        </div>
    );
}
