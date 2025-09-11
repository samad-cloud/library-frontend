# Quick Start Guide

## 🚀 How to Run the Image Dimensions Update Script

### Step 1: Navigate to Scripts Directory
```cmd
cd generapix-frontend\GeneraPix\scripts
```

### Step 2: Set Up Environment Variables
Create a `.env` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Run the Script
```cmd
run.bat
```

That's it! The script will:
- ✅ Install dependencies automatically
- ✅ Process all images in batches
- ✅ Update width/height columns
- ✅ Show progress and results

## 📊 What to Expect

The script will output detailed progress:
```
🚀 Starting image dimensions update script...
📊 Total images in database: 1250
🔄 Processing batch 1 (50 images)...
✅ Updated image abc123: 1024x1024
📈 Progress: 50/1250 images processed
🎉 Script completed!
📊 Final results: 1198 success, 52 failed (95.8% success rate)
```

## ⚠️ Important Notes

- **Safe to re-run** - Skips images that already have dimensions
- **Non-destructive** - Only updates empty width/height fields
- **Handles errors gracefully** - Continues even if some images fail
- **Service role required** - Uses admin permissions to update all records

## 🛠️ Troubleshooting

**Missing dependencies?**
```cmd
npm install
```

**Environment variables not found?**
- Check your `.env` file exists in the scripts directory
- Verify your Supabase URL and service role key are correct

**Script fails?**
- Check your internet connection
- Verify Supabase credentials are valid
- Look at the error messages for specific issues

## 🧹 Cleanup

After successful completion, you can delete the scripts directory:
```cmd
cd ..
rmdir /s scripts
```
