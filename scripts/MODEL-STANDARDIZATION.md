# Model Name Standardization

This document outlines the standardized model names used across the application and provides a script to fix existing inconsistent data.

## 🎯 Standard Model Names

### **Primary Models Used in Backend APIs:**

| **Model ID** | **Usage** | **API Route** |
|--------------|-----------|---------------|
| `gemini-2.5-flash-image-preview` | Image Editor + Google SEM White Background | `/api/image-editor`, `/api/google-sem-generate` |
| `imagen-4.0-generate-preview-06-06` | Most Image Generators | `/api/google-sem-generate`, `/api/email-marketing-generate`, `/api/groupon-generate` |
| `imagen-3.0-generate-002` | Social Media (Legacy) | `/api/generate-social-media` |

### **Frontend Model Mapping:**

Social Media Generator uses these display names that map to backend models:

| **Frontend Display** | **Backend Model ID** |
|---------------------|----------------------|
| Gemini Imagen 3 | `imagen-3.0-generate-002` |
| Gemini Imagen 4 | `imagen-4.0-generate-preview-06-06` |
| Gemini Imagen 4 Ultra | `imagen-4.0-generate-preview-06-06` |

## 🔧 Standardization Script

The `standardize-model-names.js` script fixes inconsistent model names in the database.

### **What It Fixes:**

**Old Names → New Names:**
```
"imagen-editor" → "gemini-2.5-flash-image-preview"
"Imagen 4" → "imagen-4.0-generate-preview-06-06"
"Imagen_4" → "imagen-4.0-generate-preview-06-06"
"Imagen_4_Original" → "imagen-4.0-generate-preview-06-06" 
"Imagen_4_GoogleAds" → "gemini-2.5-flash-image-preview"
"Imagen 4 Google Ads" → "gemini-2.5-flash-image-preview"
"geminiImagen3" → "imagen-3.0-generate-002"
"geminiImagen4" → "imagen-4.0-generate-preview-06-06"
"ai-model" → "imagen-4.0-generate-preview-06-06"
```

### **Running the Script:**

```bash
cd scripts
npm run standardize-models
```

Or directly:
```bash
node standardize-model-names.js
```

### **Expected Output:**

```
🚀 Model Name Standardization Script
===================================

📊 Current model name distribution:
❌ Imagen 4: 324 records
❌ geminiImagen3: 156 records  
❌ imagen-editor: 89 records
✅ imagen-4.0-generate-preview-06-06: 1205 records

🗺️  Model name mapping to be applied:
"Imagen 4" → "imagen-4.0-generate-preview-06-06"
"geminiImagen3" → "imagen-3.0-generate-002"
"imagen-editor" → "gemini-2.5-flash-image-preview"

📝 Updating "Imagen 4" → "imagen-4.0-generate-preview-06-06"
✅ Successfully updated 324 records

🎉 Standardization completed!
✅ Total records updated: 569
```

## ✅ Updated Components

### **Frontend Generators:**
- ✅ **GoogleSEMGenerator**: Uses conditional model names
  - Original images: `imagen-4.0-generate-preview-06-06`
  - Google Ads (white background): `gemini-2.5-flash-image-preview`
- ✅ **EmailMarketingGenerator**: Uses `imagen-4.0-generate-preview-06-06`
- ✅ **GrouponGenerator**: Uses `imagen-4.0-generate-preview-06-06`
- ✅ **SocialMediaGenerator**: Uses mapped model names with helper function
- ✅ **ImageEditor**: Uses `gemini-2.5-flash-image-preview` via saveEditedImage()

### **Utilities:**
- ✅ **imageStorage.ts**: Default model name updated to `imagen-4.0-generate-preview-06-06`
- ✅ **saveEditedImage()**: Uses `gemini-2.5-flash-image-preview` for editor images

## 🎯 Benefits

1. **Consistent Filtering** - All images can be filtered by actual backend model names
2. **Accurate Reporting** - Analytics and reports show real model usage
3. **API Alignment** - Database matches what's actually used in backend APIs
4. **Future Proof** - Easy to add new models with consistent naming

## 🛡️ Safety

- **Non-destructive**: Script only updates model_name column
- **Backup recommended**: Always backup before running batch updates
- **Idempotent**: Safe to run multiple times
- **Detailed logging**: Full audit trail of all changes

## 🔮 Future Models

When adding new models:
1. **Use exact API model ID** as stored in database
2. **Add to frontend mapping** if display name differs
3. **Update standardization script** if needed
4. **Document in this file** for reference

Example for new model:
```typescript
// Backend API usage
model: 'imagen-5.0-generate-001'

// Frontend mapping (if needed)
const modelMap = {
  'geminiImagen5': 'imagen-5.0-generate-001'
}

// Database storage
model_name: 'imagen-5.0-generate-001'
```
