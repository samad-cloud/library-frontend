# Image Dimensions Update Script

This one-time script updates the `width` and `height` columns in the `images` table by fetching image dimensions from the `storage_url` of each record.

## Setup

1. **Install dependencies:**
   ```bash
   cd scripts
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the scripts directory with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   Or use existing environment variables from your main project.

## Running the Script

### Option 1: Using the runner script (Recommended)

**Windows:**
```cmd
cd scripts
run.bat
```

**Linux/Mac:**
```bash
cd scripts
./run.sh
```

### Option 2: Using npm
```bash
cd scripts
npm install
npm run update-dimensions
```

### Option 3: Direct execution
```bash
cd scripts
npm install
node update-image-dimensions.js
```

## What the Script Does

1. **Fetches all records** from the `images` table in batches of 50
2. **Checks each record** for existing width/height values (skips if already populated)
3. **Downloads images** from the `storage_url` using the public URL
4. **Extracts dimensions** using the Sharp image processing library
5. **Updates the database** with the width and height values
6. **Provides progress logging** and final statistics

## Features

- ✅ **Batch processing** - Processes images in batches to avoid memory issues
- ✅ **Skip existing** - Skips records that already have width/height values
- ✅ **Error handling** - Continues processing even if individual images fail
- ✅ **Progress tracking** - Shows detailed progress and success rates
- ✅ **Graceful shutdown** - Handles Ctrl+C interruption safely
- ✅ **Rate limiting** - Small delays between requests to be server-friendly

## Expected Output

```
🚀 Starting image dimensions update script...
📅 Started at: 2024-01-15T10:30:00.000Z
📊 Total images in database: 1250

📥 Fetching batch 1...
🔄 Processing batch 1 (50 images)...

[1] Processing image ID: abc123...
📏 Getting dimensions for: https://supabase.co/storage/v1/object/public/image-main/...
✅ Dimensions: 1024x1024
✅ Updated image abc123: 1024x1024

📊 Batch 1 complete: 48 success, 2 failed
📈 Progress: 50/1250 images processed

...

🎉 Script completed!
📊 Final results:
   Total processed: 1250
   Successfully updated: 1198
   Failed: 52
   Success rate: 95.8%
```

## Error Handling

The script handles various error conditions:
- **Network errors** - Retries or skips images that can't be downloaded
- **Invalid images** - Skips corrupted or inaccessible images
- **Database errors** - Logs errors but continues processing
- **Missing URLs** - Skips records without storage_url

## Safety Features

- **Non-destructive** - Only updates empty width/height fields
- **Batch processing** - Prevents memory overflow on large datasets
- **Service role key** - Uses admin permissions to update all records
- **Detailed logging** - Full audit trail of all operations

## Cleanup

After running successfully, you can delete the scripts directory if desired:
```bash
rm -rf scripts/
```
