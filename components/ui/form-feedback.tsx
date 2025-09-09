import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { ReactNode } from 'react'

interface FormFieldFeedbackProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  message?: string
  className?: string
  children?: ReactNode
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
}

const colorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600'
}

export function FormFieldFeedback({
  type = 'error',
  message,
  className,
  children
}: FormFieldFeedbackProps) {
  if (!message && !children) return null

  const Icon = iconMap[type]

  return (
    <div 
      className={cn(
        'flex items-start gap-2 mt-1.5 text-sm',
        colorMap[type],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span className="leading-tight">{message || children}</span>
    </div>
  )
}

interface FormFieldWrapperProps {
  label?: string
  required?: boolean
  error?: string
  success?: string
  warning?: string
  info?: string
  description?: string
  className?: string
  children: ReactNode
  htmlFor?: string
}

export function FormFieldWrapper({
  label,
  required,
  error,
  success,
  warning,
  info,
  description,
  className,
  children,
  htmlFor
}: FormFieldWrapperProps) {
  const feedbackType = error ? 'error' : success ? 'success' : warning ? 'warning' : info ? 'info' : null
  const feedbackMessage = error || success || warning || info

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {children}
      
      {feedbackType && feedbackMessage && (
        <FormFieldFeedback type={feedbackType} message={feedbackMessage} />
      )}
    </div>
  )
}

interface ValidationSummaryProps {
  errors: string[]
  className?: string
}

export function ValidationSummary({ errors, className }: ValidationSummaryProps) {
  if (!errors || errors.length === 0) return null

  return (
    <div 
      className={cn(
        'bg-red-50 border border-red-200 rounded-lg p-4',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex gap-3">
        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium text-red-900">
            Please fix the following errors:
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

interface FormSuccessMessageProps {
  title?: string
  message: string
  className?: string
}

export function FormSuccessMessage({ 
  title = 'Success!', 
  message, 
  className 
}: FormSuccessMessageProps) {
  return (
    <div 
      className={cn(
        'bg-green-50 border border-green-200 rounded-lg p-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-900">{title}</h3>
          <p className="text-sm text-green-700 mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Real-time validation helper
export function useFormValidation() {
  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain uppercase, lowercase, and number'
    }
    return null
  }

  const validateRequired = (value: string, fieldName: string): string | null => {
    if (!value || value.trim() === '') {
      return `${fieldName} is required`
    }
    return null
  }

  const validateMinLength = (value: string, min: number, fieldName: string): string | null => {
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`
    }
    return null
  }

  const validateMaxLength = (value: string, max: number, fieldName: string): string | null => {
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters`
    }
    return null
  }

  const validateUrl = (url: string): string | null => {
    if (!url) return null // Optional by default
    try {
      new URL(url)
      return null
    } catch {
      return 'Please enter a valid URL'
    }
  }

  return {
    validateEmail,
    validatePassword,
    validateRequired,
    validateMinLength,
    validateMaxLength,
    validateUrl
  }
}