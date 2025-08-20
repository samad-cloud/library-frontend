import { EchoApiTest } from '@/components/shared/EchoApiTest'
import AppLayout from '@/components/shared/AppLayout'

export default function ApiTestPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">API Testing</h1>
            <p className="text-gray-600 mt-2">
              Test the public API endpoints available in GeneraPix.
            </p>
          </div>
          
          <EchoApiTest />
        </div>
      </div>
    </AppLayout>
  )
}
