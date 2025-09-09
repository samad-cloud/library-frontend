import ResponsiveAppLayout from '@/components/shared/ResponsiveAppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, 
  Monitor, 
  Keyboard as KeyboardIcon,
  Accessibility,
  Zap,
  Menu,
  Search
} from 'lucide-react'

export default function DemoNavPage() {
  const demoUser = {
    name: 'John Doe',
    email: 'john.doe@example.com'
  }

  const features = [
    {
      icon: Smartphone,
      title: 'Mobile Responsive',
      description: 'Hamburger menu with slide-out navigation on mobile devices',
      badge: 'Touch-friendly'
    },
    {
      icon: Monitor,
      title: 'Desktop Sidebar',
      description: 'Fixed sidebar navigation with hover states on desktop',
      badge: 'Always visible'
    },
    {
      icon: KeyboardIcon,
      title: 'Keyboard Shortcuts',
      description: 'Navigate quickly with Ctrl+1-8 shortcuts',
      badge: 'Power user'
    },
    {
      icon: Accessibility,
      title: 'Fully Accessible',
      description: 'ARIA labels, keyboard navigation, and screen reader support',
      badge: 'WCAG 2.1'
    },
    {
      icon: Zap,
      title: 'Fast Navigation',
      description: 'Instant page transitions with Next.js routing',
      badge: 'Optimized'
    },
    {
      icon: Menu,
      title: 'Organized Layout',
      description: 'Clean hierarchy with main navigation and integrations',
      badge: 'Intuitive'
    }
  ]

  const shortcuts = [
    { keys: 'Ctrl + 1', action: 'Dashboard' },
    { keys: 'Ctrl + 2', action: 'Calendar' },
    { keys: 'Ctrl + 3', action: 'Generator' },
    { keys: 'Ctrl + 4', action: 'Bulk Generator' },
    { keys: 'Ctrl + 5', action: 'Editor' },
    { keys: 'Ctrl + 6', action: 'Library' },
    { keys: 'Ctrl + 7', action: 'Upload' },
    { keys: 'Ctrl + 8', action: 'Settings' },
    { keys: 'Ctrl + B', action: 'Toggle sidebar (mobile)' },
    { keys: 'Ctrl + K', action: 'Quick search (coming soon)' },
  ]

  return (
    <ResponsiveAppLayout user={demoUser}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <p className="text-muted-foreground text-lg">
            Experience our modern, accessible navigation system that adapts to any screen size
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <feature.icon className="w-8 h-8 text-pink-500 mb-2" />
                  <Badge variant="secondary" className="ml-2">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Keyboard Shortcuts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyboardIcon className="w-5 h-5 text-pink-500" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              Navigate faster with these keyboard shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded">
                    {shortcut.keys}
                  </kbd>
                  <span className="text-sm text-gray-600 ml-3">
                    {shortcut.action}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Try It Out!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">On Desktop:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Use the sidebar on the left to navigate between pages</li>
                <li>Hover over navigation items to see keyboard shortcuts</li>
                <li>Try using Ctrl + (1-8) to quickly jump between sections</li>
                <li>Notice the active page highlighting in pink</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">On Mobile:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Resize your browser window to see the mobile layout</li>
                <li>Tap the hamburger menu icon to open the navigation drawer</li>
                <li>The drawer automatically closes when you select a page</li>
                <li>User menu and notifications are accessible from the header</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Accessibility Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Full keyboard navigation support (Tab, Enter, Escape)</li>
                <li>ARIA labels for screen reader compatibility</li>
                <li>Focus indicators for keyboard users</li>
                <li>Semantic HTML structure</li>
                <li>High contrast colors and clear visual hierarchy</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveAppLayout>
  )
}