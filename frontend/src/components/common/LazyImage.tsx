import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackText?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  containerClassName,
  fallbackText,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }
    setError(false);
    setIsLoaded(false);
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary ${containerClassName || className || ""}`}
      >
        <span className="text-muted-foreground font-bold">
          {fallbackText || alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-secondary ${containerClassName || ""}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 animate-pulse backdrop-blur-sm z-10">
          <Loader2 className="w-5 h-5 text-primary animate-spin opacity-50" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`transition-all duration-500 ease-in-out ${
          isLoaded ? "scale-100 blur-0 opacity-100" : "scale-105 blur-sm opacity-0"
        } ${className || ""}`}
        {...props}
      />
    </div>
  );
}

// Backward-compatibility alias
export const BlurImage = LazyImage;
