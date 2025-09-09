/**
 * Utility functions for handling vector store references in OpenAI Assistant responses
 */

/**
 * Removes vector store references from text
 * Matches patterns like 【4:4†Audience Research - France .txt】
 * @param text - The text to clean
 * @returns Cleaned text without vector store references
 */
export const removeVectorStoreReferences = (text: string): string => {
  // Pattern to match vector store references like 【4:4†Audience Research - France .txt】
  const vectorStorePattern = /【\d+:\d+†[^】]*】/g
  const cleaned = text.replace(vectorStorePattern, '').trim()
  
  const removedReferences = text.match(vectorStorePattern) || []
  
  // Only log if references were actually found
  if (removedReferences.length > 0) {
    console.log('🧹 Removed vector store references:', {
      original: text.substring(0, 200) + '...',
      cleaned: cleaned.substring(0, 200) + '...',
      removedReferences: removedReferences
    })
  }
  
  return cleaned
}

/**
 * Cleans both the main content and any nested prompt structures
 * @param content - The content to clean (could be JSON or plain text)
 * @returns Cleaned content
 */
export const cleanAssistantResponse = (content: string): string => {
  // First, clean the main content
  const cleanedContent = removeVectorStoreReferences(content)
  
  // Try to parse as JSON and clean any nested prompts
  try {
    const parsed = JSON.parse(cleanedContent)
    if (parsed.prompt && typeof parsed.prompt === 'string') {
      parsed.prompt = removeVectorStoreReferences(parsed.prompt)
      return JSON.stringify(parsed)
    }
  } catch (error) {
    // If it's not JSON, just return the cleaned content
  }
  
  return cleanedContent
}
