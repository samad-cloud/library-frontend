import Link from 'next/link'

export default function AuthErrorPage({
  searchParams
}: {
  searchParams: { message?: string }
}) {
  const message = searchParams.message || 'An authentication error occurred'
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="flex flex-col space-y-2">
            <Link
              href="/auth/login"
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Back to Login
            </Link>
            
            <Link
              href="/auth/signup"
              className="flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Create New Account
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <Link href="/contact" className="font-medium text-indigo-600 hover:text-indigo-500">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}