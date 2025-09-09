'use client'

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Active Campaigns</h2>
          <p className="text-3xl font-bold text-pink-500">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Generated Images</h2>
          <p className="text-3xl font-bold text-blue-500">1,247</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">API Calls</h2>
          <p className="text-3xl font-bold text-green-500">8,932</p>
        </div>
      </div>
    </div>
  )
}