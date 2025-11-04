import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackHeight?: number;
  threshold?: number;
}

export function LazyImage({ 
  src, 
  alt, 
  fallbackHeight = 200, 
  threshold = 0.1,
  className,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div className="relative">
      {!isLoaded && (
        <Skeleton 
          className="absolute inset-0 w-full" 
          style={{ height: fallbackHeight }} 
        />
      )}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        className={className}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        {...props}
      />
    </div>
  );
}
