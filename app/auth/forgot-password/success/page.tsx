import Link from 'next/link'

export default function ForgotPasswordSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Didn't receive the email? Check your spam folder or
            </p>
            <Link
              href="/auth/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Try again
            </Link>
          </div>
          
          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}