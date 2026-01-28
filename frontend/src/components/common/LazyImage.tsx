import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    fallbackText?: string; // If image fails or no src provided
}

export function LazyImage({ src, alt, className, fallbackText, ...props }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.onload = () => setIsLoaded(true);
        img.onerror = () => setError(true);
    }, [src]);

    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-white/5 ${className}`}>
                <span className="text-gray-500 font-bold">{fallbackText || alt.charAt(0).toUpperCase()}</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
                    <Loader2 className="w-6 h-6 text-primary animate-spin opacity-50" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                {...props}
            />
        </div>
    );
}
