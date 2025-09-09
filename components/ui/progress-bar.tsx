import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  animated?: boolean
  indeterminate?: boolean
}

const sizeMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const variantMap = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500'
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  label,
  size = 'md',
  variant = 'default',
  animated = true,
  indeterminate = false
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0)
  const percentage = Math.min((progress / max) * 100, 100)

  useEffect(() => {
    // Animate progress changes
    if (animated && !indeterminate) {
      const timer = setTimeout(() => setProgress(value), 100)
      return () => clearTimeout(timer)
    } else {
      setProgress(value)
    }
  }, [value, animated, indeterminate])

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-muted-foreground">
            {label || 'Progress'}
          </span>
          {!indeterminate && (
            <span className="text-sm font-medium text-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeMap[size]
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : progress}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out rounded-full',
            variantMap[variant],
            indeterminate && 'animate-progress-indeterminate'
          )}
          style={indeterminate ? {} : { width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface MultiStepProgressProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
  className?: string
}

export function MultiStepProgress({
  currentStep,
  totalSteps,
  labels,
  className
}: MultiStepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1
          const isActive = step === currentStep
          const isCompleted = step < currentStep
          
          return (
            <div
              key={step}
              className="flex flex-col items-center flex-1"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                  !isCompleted && !isActive && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? '✓' : step}
              </div>
              {labels && labels[index] && (
                <span className="text-xs text-muted-foreground mt-1">
                  {labels[index]}
                </span>
              )}
            </div>
          )
        })}
      </div>
      
      <ProgressBar
        value={currentStep}
        max={totalSteps}
        size="sm"
        className="mt-4"
      />
    </div>
  )
}

// Add to globals.css for indeterminate animation
export const progressIndeterminateKeyframes = `
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
    width: 40%;
  }
  50% {
    transform: translateX(100%);
    width: 30%;
  }
  100% {
    transform: translateX(250%);
    width: 40%;
  }
}

.animate-progress-indeterminate {
  animation: progress-indeterminate 2s infinite ease-in-out;
}
`