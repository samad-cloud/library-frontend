'use client'

import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface HeaderProps {
  currentPage: string
}

export default function Header({ currentPage }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 capitalize">{currentPage}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-500" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>
        <span className="text-sm text-pink-500 font-medium">Pro Plan</span>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-pink-500 text-white text-sm">JD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}