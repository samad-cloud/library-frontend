'use client'

import { useState } from 'react'
import Layout from '@/components/shared/Layout'
import Calendar from '@/components/calendar/Calendar'
import Dashboard from '@/components/dashboard/Dashboard'
import Library from '@/components/library/Library'
import Settings from '@/components/settings/Settings'
import Upload from '@/components/upload/Upload'
import Generator from '@/components/generator/Generator'
import Editor from '@/components/editor/Editor'

export default function Home() {
  const [currentPage, setCurrentPage] = useState("calendar")

  // Render the appropriate component based on currentPage
  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "calendar":
        return <Calendar />
      case "generator":
        return <Generator />
      case "editor":
        return <Editor />
      case "library":
        return <Library />
      case "upload":
        return <Upload />
      case "settings":
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderContent()}
    </Layout>
  )
}