'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import {
  DEFAULT_AVATAR_PLACEHOLDER,
  generateAvatarPlaceholder,
  AVATAR_SIZE_MAP,
  type AvatarSize,
} from '@/lib/image-utils';

interface OptimizedAvatarImageProps
  extends Omit<React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>, 'src'> {
  /** Image source URL */
  src?: string | null;
  /** Alt text for accessibility */
  alt: string;
  /** Size preset or pixel value */
  size?: AvatarSize | number;
  /** User ID for generating consistent placeholder colors */
  userId?: string;
  /** Whether this is an above-the-fold critical image */
  priority?: boolean;
}

/**
 * Optimized avatar image component using Next.js Image.
 * Provides automatic lazy loading, blur placeholders, and format optimization.
 *
 * Features:
 * - Lazy loading by default (priority=false)
 * - Blur placeholder while loading
 * - Consistent placeholder colors based on userId
 * - WebP/AVIF format negotiation
 * - Automatic sizing optimization
 */
export const OptimizedAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  OptimizedAvatarImageProps
>(({ src, alt, size = 'md', userId, priority = false, className, ...props }, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calculate pixel size
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZE_MAP[size];

  // Generate placeholder based on userId or use default
  const placeholder = userId
    ? generateAvatarPlaceholder(userId)
    : DEFAULT_AVATAR_PLACEHOLDER;

  // Reset state when src changes
  React.useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // If no src or error, render empty to trigger fallback
  if (!src || hasError) {
    return (
      <AvatarPrimitive.Image
        ref={ref}
        src=""
        className={className}
        {...props}
      />
    );
  }

  return (
    <AvatarPrimitive.Image asChild ref={ref} className={className} {...props}>
      <Image
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        placeholder="blur"
        blurDataURL={placeholder}
        className={cn(
          'object-cover transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-70',
          className
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </AvatarPrimitive.Image>
  );
});

OptimizedAvatarImage.displayName = 'OptimizedAvatarImage';
