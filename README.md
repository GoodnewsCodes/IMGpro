# IMGpro

A powerful desktop application for image manipulation and processing, built with Electron.

## Overview

IMGpro is a feature-rich image processing tool that allows users to perform various operations on images including background removal, format conversion, resizing, optimization, and more.

## Features

### ✅ Implemented Features

- **Background Removal** - Remove backgrounds from images using AI
- **Image Conversion** - Convert between multiple formats (JPEG, PNG, WebP, TIFF, GIF, AVIF, SVG)
- **Image Resizing** - Resize images with various fit options
- **Image Manipulation**
  - Advanced Cropping (Free, 1:1, Round, Repositionable)
  - Rotate images
  - Flip effects
- **Color Tools**
  - Color picker
  - Replace specific colors in images
- **Favicon Generator** - Generate favicons and app icons in multiple sizes
- **Image Optimization** - Compress and optimize images
- **Theme Support** - Light and dark theme options

## Technology Stack

- **Framework**: Electron
- **Language**: TypeScript
- **Image Processing**: Sharp, @imgly/background-removal
- **Build Tool**: electron-builder
- **Package Manager**: pnpm

## Installation

### Prerequisites

- Node.js (v18 or later)
- pnpm package manager

### Setup

1. Clone the repository
2. Install dependencies:
   ```cmd
   pnpm install
   ```

## Development

### Running in Development Mode

```cmd
pnpm run start
```

### Build for Production

```cmd
pnpm run build
```

### Build Executable

```cmd
pnpm run dist
```

See [BUILD.md](BUILD.md) for detailed build instructions.

## Project Structure

```
IMGpro/
├── src/
│   ├── main/          # Main Electron process
│   ├── preload/       # Preload scripts
│   └── renderer/      # Renderer process (UI)
│       ├── features/  # Feature modules
│       ├── index.html
│       ├── renderer.ts
│       └── style.css
├── dist/              # Compiled output
├── build/             # Build assets (icons, etc.)
├── release/           # Final executables
└── package.json
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
