import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
      aria-hidden="true"
    />
  )
}

interface SkeletonCardProps {
  className?: string
  showImage?: boolean
  lines?: number
}

export function SkeletonCard({ className, showImage = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showImage && (
        <Skeleton variant="rounded" className="h-48 w-full" />
      )}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-4 w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className="h-3"
            width={`${100 - (i + 1) * 10}%`}
          />
        ))}
      </div>
    </div>
  )
}

interface SkeletonGridProps {
  count?: number
  className?: string
  showImage?: boolean
}

export function SkeletonGrid({ count = 6, className, showImage = true }: SkeletonGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showImage={showImage} />
      ))}
    </div>
  )
}

// Add shimmer animation to globals.css if needed
export const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
`