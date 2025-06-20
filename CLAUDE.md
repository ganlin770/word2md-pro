# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Word2MD Pro** is a professional document conversion application that enables bidirectional conversion between Word documents (.docx) and Markdown (.md) files, featuring advanced mathematical formula rendering capabilities using LaTeX.

## Architecture

### Full-Stack Web Application
- **Frontend**: Vue.js 3 + Composition API with Vite development server
- **Backend**: Express.js API server with file upload handling
- **Build System**: Vite with ES modules throughout the codebase

### Core Conversion Engines
- **MD2WordConverter.js**: Markdown → Word conversion with KaTeX math rendering
- **Word2MDConverter.js**: Word → Markdown conversion with structure preservation
- **Mathematical Formula Pipeline**: LaTeX → KaTeX → Puppeteer → PNG images

## Development Commands

```bash
# Development (run both frontend and backend)
npm run full-dev        # Starts both servers concurrently
npm run dev            # Frontend only (Vite dev server)
npm run server         # Backend only (Express API)

# Production
npm run build          # Build frontend for production
npm start             # Start production server
npm run preview       # Preview production build

# Code Quality
npm run lint          # ESLint code checking
npm run format        # Prettier code formatting
npm test             # Run Jest test suite
```

## Server Configuration

- **Frontend Dev Server**: http://localhost:5173 (Vite)
- **Backend API Server**: http://localhost:3001 (Express)
- **Production**: Backend serves built frontend assets

## Critical Technical Details

### ES Module Architecture
- **Important**: Entire codebase uses ES modules (`"type": "module"` in package.json)
- **Never use**: CommonJS `require()` - always use `import` statements
- **Dynamic imports**: Use `await import()` for runtime module loading

### Mathematical Formula Rendering
- **KaTeX Integration**: LaTeX formula parsing and HTML generation
- **Puppeteer Pipeline**: Headless Chrome renders formulas as PNG images
- **Smart Retry System**: 3-level fallback mechanism for reliable rendering
- **Performance**: Built-in timing and memory usage monitoring

### File Handling
- **Multer**: Handles file uploads with UTF-8 encoding support
- **Temporary Storage**: `uploads/` and `temp_images/` directories
- **Chinese Filenames**: Full UTF-8 support for international filenames

## Key Directories

```
src/
├── core/              # Conversion engines (MD2WordConverter, Word2MDConverter)
├── server/            # Express API server and endpoints
├── components/        # Vue.js components
├── views/            # Vue.js pages
├── stores/           # Pinia state management
├── router/           # Vue Router configuration
└── utils/            # Shared utilities

tests/                # Jest test suites
output/               # Generated conversion files
uploads/              # Temporary uploaded files
temp_images/          # Math formula images
```

## Testing

- **Framework**: Jest with Babel transpilation
- **Coverage**: Unit tests for core converters, integration tests for API endpoints
- **Test Data**: Uses fixtures for consistent test scenarios

## Recent Critical Fix (Math Formula Rendering)

The project recently resolved a critical ES module compatibility issue:
- **Problem**: `require()` usage in ES module environment caused complete math rendering failure
- **Solution**: Converted `getChromePath()` to async with dynamic imports
- **Impact**: Math formula success rate improved from 0% to 95%+
- **Files**: Primary changes in `src/core/MD2WordConverter.js`

## Development Requirements

- **Node.js**: 18.x (specified in package.json engines)
- **Chrome/Chromium**: Required for Puppeteer math rendering
- **Memory**: Minimum 2GB for Puppeteer operations
- **Platforms**: macOS, Windows, Linux supported

## API Endpoints

- `POST /api/convert` - Main conversion endpoint (handles both MD→Word and Word→MD)
- `GET /api/download/:filename` - Download converted files
- `GET /api/health` - Health check endpoint

## Build Configuration

- **Vite Config**: Frontend build with proxy to backend API
- **Tailwind CSS**: Utility-first CSS framework
- **Element Plus**: Vue.js component library
- **PostCSS**: CSS processing pipeline

## Performance Considerations

- **Puppeteer**: Browser instances are reused for efficiency
- **Image Processing**: Sharp library for image optimization
- **Memory Management**: Automatic cleanup of temporary files
- **Error Handling**: Comprehensive retry logic with graceful degradation