import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

const navItems = [
  { key: '1', href: '/dashboard' },
  { key: '2', href: '/calendar' },
  { key: '3', href: '/generator' },
  { key: '4', href: '/bulk-generator' },
  { key: '5', href: '/editor' },
  { key: '6', href: '/library' },
  { key: '7', href: '/upload' },
  { key: '8', href: '/settings' },
]

export function useKeyboardNavigation(enabled: boolean = true) {
  const router = useRouter()
  const pathname = usePathname()

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Only activate if Ctrl/Cmd key is pressed
    if (!event.ctrlKey && !event.metaKey) return
    
    // Don't interfere with text input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable) {
      return
    }

    // Navigation shortcuts (Ctrl/Cmd + number)
    const navItem = navItems.find(item => item.key === event.key)
    if (navItem && navItem.href !== pathname) {
      event.preventDefault()
      router.push(navItem.href)
      return
    }

    // Quick search (Ctrl/Cmd + K)
    if (event.key === 'k') {
      event.preventDefault()
      // Trigger search modal (you can implement this later)
      const searchTrigger = document.querySelector('[data-search-trigger]') as HTMLElement
      searchTrigger?.click()
    }

    // Toggle sidebar (Ctrl/Cmd + B)
    if (event.key === 'b') {
      event.preventDefault()
      const menuTrigger = document.querySelector('[data-menu-trigger]') as HTMLElement
      menuTrigger?.click()
    }
  }, [router, pathname])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress, enabled])

  return {
    shortcuts: navItems.map((item, index) => ({
      key: `Ctrl+${item.key}`,
      description: `Go to ${item.href.replace('/', '').replace('-', ' ')}`
    }))
  }
}