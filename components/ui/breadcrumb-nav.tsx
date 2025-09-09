'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  className?: string
  items?: BreadcrumbItem[]
  showHome?: boolean
}

export function BreadcrumbNav({ 
  className,
  items: customItems,
  showHome = true 
}: BreadcrumbNavProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname if no custom items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems
    
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      breadcrumbs.push({ label, href })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  if (breadcrumbs.length === 0 && !showHome) return null
  
  return (
    <nav 
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb navigation"
    >
      {showHome && (
        <>
          <Link 
            href="/dashboard" 
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </>
      )}
      
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        
        return (
          <div key={crumb.href || index} className="flex items-center">
            {isLast ? (
              <span 
                className="font-medium text-foreground"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href || '#'}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
                <ChevronRight 
                  className="h-4 w-4 text-muted-foreground mx-1" 
                  aria-hidden="true" 
                />
              </>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Mobile-friendly breadcrumb with truncation
export function MobileBreadcrumb({ 
  className,
  items: customItems,
  showHome = true 
}: BreadcrumbNavProps) {
  const pathname = usePathname()
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems
    
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      breadcrumbs.push({ label, href })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  if (breadcrumbs.length === 0) {
    return showHome ? (
      <Link 
        href="/dashboard" 
        className="flex items-center text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4" />
      </Link>
    ) : null
  }
  
  // On mobile, show only home, first item (if more than 2), and last item
  const mobileBreadcrumbs: (BreadcrumbItem | 'ellipsis')[] = []
  
  if (breadcrumbs.length > 2) {
    mobileBreadcrumbs.push(breadcrumbs[0])
    mobileBreadcrumbs.push('ellipsis')
    mobileBreadcrumbs.push(breadcrumbs[breadcrumbs.length - 1])
  } else {
    mobileBreadcrumbs.push(...breadcrumbs)
  }
  
  return (
    <nav 
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb navigation"
    >
      {showHome && (
        <>
          <Link 
            href="/dashboard" 
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </>
      )}
      
      {mobileBreadcrumbs.map((crumb, index) => {
        if (crumb === 'ellipsis') {
          return (
            <div key="ellipsis" className="flex items-center">
              <span className="text-muted-foreground">...</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            </div>
          )
        }
        
        const isLast = index === mobileBreadcrumbs.length - 1
        
        return (
          <div key={crumb.href || index} className="flex items-center">
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href || '#'}
                  className="text-muted-foreground hover:text-foreground truncate max-w-[100px]"
                >
                  {crumb.label}
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              </>
            )}
          </div>
        )
      })}
    </nav>
  )
}