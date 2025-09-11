/**
 * Utility functions for managing sessionStorage with type safety
 * Data persists until page refresh or tab closure
 */

// Define the structure of data we'll store for each generator
export interface SocialMediaGeneratorState {
  basicPrompt: string
  enhancedPrompt: string
  selectedAspectRatio: string
  selectedModels: {
    geminiImagen3: boolean
    geminiImagen4: boolean
    geminiImagen4Ultra: boolean
  }
  instagramContent: string
  generatedResults: any | null
  error: string | null
}

export interface EmailMarketingGeneratorState {
  numberOfVariations: number
  prompt: string
  selectedAspectRatio: string
  generatedContent: string
  generatedImages: Array<{
    index: number;
    variation?: number;
    prompt: string;
    imageUrl: string;
    error?: string;
  }>
  error: string | null
  workflowSteps: any[] // Empty array when saved, not restored from storage
}

export interface GoogleSEMGeneratorState {
  numberOfVariations: number
  prompt: string
  selectedAspectRatio: string
  generatedContent: string
  generatedImages: Array<{
    index: number;
    variation?: number;
    prompt: string;
    imageUrl: string;
    type?: string;
    error?: string;
  }>
  error: string | null
  workflowSteps: any[] // Empty array when saved, not restored from storage
}

export interface GrouponGeneratorState {
  prompt: string
  selectedAspectRatio: string
  numberOfVariations: number
  generatedContent: string
  generatedImages: Array<{
    index: number
    prompt: string
    imageUrl: string
    error?: string
  }>
  error: string | null
  workflowSteps: any[] // Empty array when saved, not restored from storage
}

// Storage keys for each generator
export const STORAGE_KEYS = {
  SOCIAL_MEDIA: 'generaPix_socialMedia_state',
  EMAIL_MARKETING: 'generaPix_emailMarketing_state',
  GOOGLE_SEM: 'generaPix_googleSEM_state',
  GROUPON: 'generaPix_groupon_state'
} as const

/**
 * Save data to sessionStorage with error handling
 */
export function saveToSessionStorage<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(data))
    }
  } catch (error) {
    console.warn('Failed to save to sessionStorage:', error)
  }
}

/**
 * Load data from sessionStorage with error handling and type safety
 */
export function loadFromSessionStorage<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored) as T
      }
    }
  } catch (error) {
    console.warn('Failed to load from sessionStorage:', error)
  }
  return null
}

/**
 * Remove data from sessionStorage
 */
export function removeFromSessionStorage(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(key)
    }
  } catch (error) {
    console.warn('Failed to remove from sessionStorage:', error)
  }
}

/**
 * Clear all generator data from sessionStorage
 */
export function clearAllGeneratorData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromSessionStorage(key)
  })
}

