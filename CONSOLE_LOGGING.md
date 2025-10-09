# Console Logging Guide

This document describes all the console logging features added to the Storybook application for debugging and monitoring.

## localStorage Operations

### Loading Records
```
[localStorage] 📖 Loading records from browser storage
[localStorage] ✅ Loaded {count} records
```

### Saving Records
```
[localStorage] 💾 Saving {count} records to browser storage
[localStorage] ✅ Successfully saved records
```

### Migration
```
[localStorage] 🔄 No existing data, checking for migration...
[localStorage] 📦 Migrating {count} initial records
[localStorage] ℹ️ Found existing data, skipping migration
```

## Fine-Tune Page (`/fine-tune`)

### Component Initialization
```
[FineTune] 🚀 Component mounted, initializing...
[FineTune] 🔍 Fetching fine-tune records
[FineTune] 📋 Found {count} fine-tune records
[FineTune] 🎯 Setting current record to: {trainingId}
```

### File Upload & Submission
```
[FineTune] 🚀 Starting fine-tuning submission
[FineTune] 📝 Model name: {modelName}
[FineTune] 📦 Uploading zip file: {filename} ({size} MB)
[FineTune] 🖼️ Uploading {count} images
[FineTune] 📡 Sending request to /api/fine-tune
[FineTune] ✅ Fine-tuning started!
[FineTune] 🆔 Training ID: {trainingId}
[FineTune] 🔑 Trigger word: {triggerWord}
[FineTune] 💾 Saving new record to localStorage
[FineTune] ⏱️ Starting status polling (every {seconds} seconds)
```

### Status Polling
```
[Poll] 🔄 Checking status for training: {trainingId}
[Poll] 📊 Status update: {status}
[Poll] ✅ Training {status}. Stopping polling.
```

### Errors
```
[FineTune] ❌ Submit error: {error}
[FineTune] ❌ Failed to fetch records: {error}
[Poll] ❌ Polling error: {error}
[localStorage] ❌ Failed to save records: {error}
[localStorage] ❌ Failed to load records: {error}
```

## Story Page (`/story`)

### Model Loading
```
[Story] 🔍 Loading fine-tuned models from localStorage
[Story] 📋 Found {count} total records
[Story] ✅ Found {count} completed models
[Story] 🎯 Setting active model: {destination}
[Story] 🔑 Trigger word: {triggerWord}
```

### Story Generation
```
[Story] 🎬 Starting generation for {count} slides
[Story] 🎨 Using model: {destination}
[Story] 🔑 Trigger word: {triggerWord}
[Story] 📄 Processing slide {n}/{total}: {title}
[Story] 🤖 Calling Gemini for slide analysis...
[Story] ✅ Generated prompt: {prompt}
[Story] 🖼️ Received cleaned character image
[Story] 🎨 Compositing character onto slide background...
[Story] ✅ Slide {n}/{total} completed!
[Story] 🎉 All slides generated successfully!
```

### Errors
```
[Story] ❌ Generation error: {error}
[Story] ❌ Failed to load models from localStorage: {error}
```

## How to Use

1. **Open Browser DevTools**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. **Navigate to Console tab**
3. **Perform actions** in the app (upload files, start fine-tuning, generate stories)
4. **Watch the logs** to understand what's happening at each step

## Filtering Logs

You can filter logs by component using the browser console filter:
- `[localStorage]` - All localStorage operations
- `[FineTune]` - Fine-tune page actions
- `[Poll]` - Status polling updates
- `[Story]` - Story generation page actions

## Tips

- **Emoji prefixes** make it easy to scan logs quickly
- **Timestamps** are automatic in browser console
- **Copy logs** by right-clicking on console messages
- **Clear console** with `Ctrl+L` or the clear button

## Example Output

```
[localStorage] 📖 Loading records from browser storage
[localStorage] ✅ Loaded 1 records
[FineTune] 🚀 Component mounted, initializing...
[FineTune] 🔍 Fetching fine-tune records
[localStorage] ℹ️ Found existing data, skipping migration
[FineTune] 📋 Found 1 fine-tune records
[FineTune] 🎯 Setting current record to: kq8adcyda9rm80csrwar3mnvvc
[FineTune] 🚀 Starting fine-tuning submission
[FineTune] 📝 Model name: storybook-flux
[FineTune] 📦 Uploading zip file: data.zip (5.42 MB)
[FineTune] 📡 Sending request to /api/fine-tune
[FineTune] ✅ Fine-tuning started!
[FineTune] 🆔 Training ID: abc123xyz
[FineTune] 🔑 Trigger word: STORYSPARK_XYZ123
[FineTune] 💾 Saving new record to localStorage
[localStorage] 💾 Saving 2 records to browser storage
[localStorage] ✅ Successfully saved records
[FineTune] ⏱️ Starting status polling (every 5 seconds)
[Poll] 🔄 Checking status for training: abc123xyz
[Poll] 📊 Status update: processing
```

