# ActualImageGrid Performance Optimization

This document outlines the performance optimizations implemented for the ActualImageGrid component to achieve <1s perceived render time.

## 🚀 Key Optimizations Implemented

### 1. Database Layer Optimizations
- **Indexes Created**: Added strategic database indexes for faster queries
- **RPC Function**: `get_generation_groups_v1` - server-side grouping and filtering
- **Thumbnail System**: Added `thumb_url`, `blurhash`, `width`, `height`, `bytes` columns

### 2. Progressive Image Loading
- **ProgressiveImage Component**: Shows thumbnails/blurhash first, then full-res images
- **Priority Loading**: First 12 images marked as high priority
- **Blurhash Placeholders**: Instant visual feedback while images load
- **No Layout Shift**: Proper width/height attributes prevent CLS

### 3. Efficient Data Fetching
- **Server-Side Grouping**: No client-side array processing
- **Debounced Search**: 200ms delay to reduce API calls
- **Smaller Pages**: 12 groups per page instead of 20
- **Edge Runtime**: API routes use Edge Runtime for faster response

### 4. Virtualization
- **react-virtuoso**: Only renders visible items + overscan
- **Variable Heights**: Handles different group sizes efficiently
- **Infinite Scroll**: Smooth loading with pagination fallback after 36 groups

### 5. Performance Monitoring
- **Throttled Logging**: Performance stats logged every 10 images, not per image
- **No Re-render Storms**: Removed imageLoadStats state updates

## 📁 Files Modified/Created

### New Files:
- `components/ProgressiveImage.tsx` - Progressive image loading component
- `hooks/useDebouncedValue.ts` - Debounced search hook
- `app/api/image-groups/route.ts` - Optimized server endpoint
- `supabase/migrations/002_image_grid_optimization.sql` - Database optimizations
- `supabase/functions/generate-thumbnail/index.ts` - Thumbnail generation

### Modified Files:
- `components/library/ActualImageGrid.tsx` - Complete refactor with virtualization
- `app/layout.tsx` - Added CDN preconnect links

## 🛠 Setup Instructions

### 1. Run Database Migration
```sql
-- Apply the migration in Supabase SQL editor
-- File: supabase/migrations/002_image_grid_optimization.sql
```

### 2. Deploy Edge Function
```bash
# Deploy thumbnail generation function
supabase functions deploy generate-thumbnail
```

### 3. Update Image Upload Pipeline
After any image upload/generation, call the thumbnail function:
```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/generate-thumbnail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageId: 'uuid-of-image-record',
    storageUrl: 'https://storage-url-of-original-image'
  })
})
```

### 4. Update Supabase Storage CORS
Ensure your storage bucket allows proper caching headers:
```typescript
// In your storage bucket settings, add:
"Cache-Control": "public, max-age=31536000, immutable"
```

### 5. Update CDN Preconnect
Replace placeholder in `app/layout.tsx`:
```typescript
// Change this line to your actual Supabase URL
<link rel="preconnect" href="https://your-actual-project.supabase.co" />
```

## 📊 Expected Performance Improvements

### Before Optimization:
- 3-5s initial load time
- Heavy client-side processing
- Re-renders on every image load
- Large batch fetches (15x multipliers)
- No progressive loading

### After Optimization:
- **<1s perceived load time** (thumbnails show immediately)
- **~2s full resolution** (progressive enhancement)
- **60fps scrolling** (virtualization)
- **Constant-time updates** (no state re-renders per image)
- **Efficient caching** (CDN optimization)

## 🔧 Configuration Options

### Adjust Page Sizes:
```typescript
// In ActualImageGrid.tsx
const GROUPS_PER_PAGE = 12 // Smaller = faster initial load
const INFINITE_SCROLL_LIMIT = 36 // When to switch to pagination
```

### Modify Priority Loading:
```typescript
// First N groups get priority loading
const isHighPriority = groupIndex < 2 // First 2 groups
```

### Thumbnail Settings:
```typescript
// In generate-thumbnail edge function
const thumbnailWidth = 24 // Very small for fast loading
const quality = 60 // Balance between size and quality
```

## 🧪 Testing Checklist

- [ ] TTI < 1s for first 12 thumbnails on 3G connection
- [ ] Full-res swap within 2s without layout shift
- [ ] 60fps scrolling performance
- [ ] Filters work with server-side processing
- [ ] Infinite scroll → pagination transition smooth
- [ ] Search debouncing works (no API spam)
- [ ] Error states handled gracefully
- [ ] Thumbnail generation works on upload

## 🐛 Troubleshooting

### Images not loading progressively:
- Check if `thumb_url` and `blurhash` columns are populated
- Verify edge function is deployed and working
- Check storage CORS settings

### Slow initial load:
- Verify database indexes are created
- Check API route performance in dev tools
- Ensure CDN preconnect is configured

### Virtualization issues:
- Check react-virtuoso version compatibility
- Verify container height is properly set
- Test with different group sizes

## 📈 Monitoring

Track these metrics to ensure optimization success:
- Time to first thumbnail visible
- Time to full-res completion
- API response times for `/api/image-groups`
- Client-side re-render frequency
- Memory usage during scroll

The optimization should result in a snappy, responsive image grid that feels instant to users while maintaining all existing functionality.
