'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  loadingText?: string
  formAction?: (formData: FormData) => void | Promise<void>
}

export function SubmitButton({ 
  children, 
  className = '',
  loadingText = 'Processing...',
  formAction
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  
  return (
    <button
      type="submit"
      disabled={pending}
      formAction={formAction}
      className={`${className} ${pending ? 'opacity-50 cursor-not-allowed' : ''} transition-opacity`}
    >
      {pending ? (
        <div className="flex items-center justify-center">
          <svg 
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  )
}