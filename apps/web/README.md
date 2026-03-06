# @daw/web

The main web application for the In-Browser DAW.

## Overview

This is the entry point for the DAW application, providing:

- Capability detection at boot
- AudioContext initialization with explicit user gesture
- Service worker registration for PWA functionality
- React application shell

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test
```

## Architecture

### Boot Sequence

1. **Capability Detection** - Detect browser capabilities and determine experience tier
2. **Service Worker Registration** - Register for offline functionality
3. **AudioContext Initialization** - Create AudioContext (resume requires user gesture)
4. **React Mount** - Render the application shell

### User Gesture for Audio

Per browser autoplay policies, audio contexts start in a suspended state. The app shows an "Enable Audio" button that the user must click to resume the AudioContext.

### Security Headers

The app requires specific HTTP headers for cross-origin isolation. See `public/headers.config` for the complete configuration.

## File Structure

```
src/
  main.tsx          # App entry point
  __tests__/        # Tests
public/
  headers.config    # Security headers documentation
  sw.js             # Service worker
  favicon.svg       # App icon
index.html          # HTML entry
vite.config.ts      # Vite configuration
```

## Dependencies

- React - UI framework
- Vite - Build tool
- @daw/diagnostics - Capability detection
- All other @daw/* packages for DAW functionality

## Environment Variables

- `VITE_APP_VERSION` - App version displayed in UI
