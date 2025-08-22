import Link from 'next/link'

export default function CheckEmailPage() {
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
            We've sent you a confirmation email. Please check your inbox and click the link to verify your account.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You'll need to verify your email before you can sign in. The verification link will expire in 24 hours.
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or wait a few minutes.
            </p>
            
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Return to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
