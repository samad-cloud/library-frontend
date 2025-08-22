# Social Media Generator Setup Instructions

## 1. Install Required Dependencies

Run the following command in the `generapix-frontend/GeneraPix` directory:

```bash
npm install
```

This will install the newly added packages:
- `@google/genai` - For Gemini image generation
- `@openai/agents` - For OpenAI agent workflows

## 2. Environment Variables

Create a `.env.local` file in the `generapix-frontend/GeneraPix` directory with the following variables:

```bash
# OpenAI API Key for GPT models
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API Key for image generation  
GEMINI_API_KEY=your_gemini_api_key_here

# These should already exist for your existing Supabase setup (for user auth, etc.)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 3. API Keys Required

- **OpenAI API Key**: Get from https://platform.openai.com/api-keys
- **Gemini API Key**: Get from https://ai.google.dev/ 
- **Supabase Keys**: Available in your Supabase project settings (only needed for existing app features like user auth)

## 4. Run the Application

```bash
npm run dev
```

## 5. Test the Social Media Generator

1. Navigate to `/generator` in your app
2. Enter a prompt like "A cozy living room with family photos"
3. Select which image models you want to use
4. Click "Generate Post"
5. The system will:
   - Enhance your prompt using GPT
   - Generate images with the selected Gemini models
   - Create an Instagram caption
   - Display images directly in the UI (as data URLs - not stored permanently)
   - Show captions and hashtags

## Architecture Overview

The workflow is now completely integrated within the Next.js app:

- **Frontend**: React component with real-time UI updates
- **API Route**: `/api/generate-social-media` handles the entire workflow
- **AI Models**: 
  - GPT-4 for prompt enhancement and caption generation
  - Gemini Imagen 3/4 for image generation
- **Image Display**: Base64 data URLs (images displayed directly, not stored)
- **Instructions**: Located in `lib/instructions/` directory

## Files Added/Modified

- ✅ `app/api/generate-social-media/route.ts` - Main API endpoint
- ✅ `lib/instructions/social_media_caption.ts` - Caption generation prompts
- ✅ `lib/instructions/social_media_enhance.ts` - Prompt enhancement instructions
- ✅ `components/generator/Generator.tsx` - Updated UI with real API integration
- ✅ `package.json` - Added required dependencies

## Troubleshooting

- **API Key errors**: Double-check all environment variables are set correctly
- **Image generation fails**: Verify Gemini API key and quota
- **Images not displaying**: Check browser console for base64 data URL errors
- **Model not found**: Ensure you're using the correct Gemini model IDs
- **Large images**: Images are displayed as base64 data URLs which may be large - this is normal
