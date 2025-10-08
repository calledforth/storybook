# Story Swap MVP

A face-swap application for personalizing storybook slides using Replicate AI.

## Features

- **Clean UI Flow**: Upload → Select → Generate → Preview
- **Replicate Integration**: Real face-swap using `cdingram/face-swap` model
- **PDF Export**: Download personalized storybook as PDF
- **Dark Glassmorphic Design**: Minimalistic black/white aesthetic

## Setup

1. **Install Dependencies**
   ```bash
   cd storybook
   npm install
   ```

2. **Configure API Token**
   ```bash
   cp env.example .env.local
   # Edit .env.local and add your Replicate API token:
   # REPLICATE_API_TOKEN=r8_your_token_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## Usage Flow

1. **Select Storybook**: Click "Story 2" in the sidebar
2. **Upload Portrait**: Drag/drop or click to upload your image
3. **Generate**: Click "Generate All Slides" to start face-swap
4. **Preview**: Review slides with generation status
5. **Export**: Download personalized PDF

## Project Structure

```
src/
├── app/
│   ├── api/face-swap/route.ts    # Replicate API integration
│   ├── page.tsx                  # Main UI component
│   └── globals.css               # Dark theme styles
├── data/storybooks.ts            # Story metadata
├── lib/
│   ├── faceSwap.ts              # Client-side API caller
│   ├── loadPdfSlides.ts         # PDF to canvas conversion
│   └── exportSlides.ts          # PDF export utility
└── store/slides.ts              # Zustand state management
```

## API Integration

The app uses Replicate's face-swap model:
- **Model**: `cdingram/face-swap:d1d6ea8c...`
- **Input**: `swap_image` (slide) + `input_image` (user portrait)
- **Output**: Face-swapped slide image

## Next Steps

- Add multiple storybook support
- Implement batch ZIP upload
- Add result caching
- Enhance error handling