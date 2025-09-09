'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Card, CardContent } from "@/components/ui/card"
import { Expand, Loader2, MessageSquare, Mail, Search, Trash2, Tag } from 'lucide-react'
import SocialMediaGenerator from './SocialMediaGenerator'
import EmailMarketingGenerator from './EmailMarketingGenerator'
import GoogleSEMGenerator from './GoogleSEMGenerator'
import GrouponGenerator from './GrouponGenerator'
import { clearAllGeneratorData } from '@/lib/sessionStorage'

interface GeneratorProps {
  isAuthenticated?: boolean
}

interface ModelResult {
  modelName: string;
  imageUrls: string[];
  error?: string;
}

interface SocialMediaResult {
  caption: string;
  enhancedPrompt: {
    scene: string;
    shot_type: string;
    composition: string;
    colour_palette: string;
    aspect_ratio: string;
  };
  models: ModelResult[];
  timestamp: string;
}

export default function Generator({ isAuthenticated }: GeneratorProps) {
  const [selectedChannel, setSelectedChannel] = useState('social-media')

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all saved generator data? This action cannot be undone.')) {
      clearAllGeneratorData()
      // Force page refresh to reset all components
      window.location.reload()
    }
  }

  const channels = [
    {
      id: 'social-media',
      name: 'Social Media',
      icon: MessageSquare,
      description: 'Generate social media content and images'
    },
    {
      id: 'email-marketing',
      name: 'Email Marketing', 
      icon: Mail,
      description: 'Create email marketing campaigns with images'
    },
    {
      id: 'google-sem',
      name: 'Google SEM',
      icon: Search,
      description: 'Generate Google Ads optimized images'
    },
    {
      id: 'groupon',
      name: 'Groupon',
      icon: Tag,
      description: 'Create compelling Groupon deal content and visuals'
    }
  ]


  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Channel Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Content Generation</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAllData}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </div>
            <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {channels.map((channel) => (
                  <TabsTrigger key={channel.id} value={channel.id} className="flex items-center gap-2">
                    <channel.icon className="w-4 h-4" />
                    {channel.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* Channel Content */}
              <TabsContent value="social-media" className="mt-6">
                <SocialMediaGenerator isAuthenticated={isAuthenticated} />
              </TabsContent>
              
              <TabsContent value="email-marketing" className="mt-6">
                <EmailMarketingGenerator isAuthenticated={isAuthenticated} />
              </TabsContent>
              
              <TabsContent value="google-sem" className="mt-6">
                <GoogleSEMGenerator isAuthenticated={isAuthenticated} />
              </TabsContent>
              
              <TabsContent value="groupon" className="mt-6">
                <GrouponGenerator isAuthenticated={isAuthenticated} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}