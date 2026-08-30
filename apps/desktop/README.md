# Qalcuity Desktop App

Electron wrapper untuk Qalcuity All-in-One.

## Development

```bash
# Install dependencies
npm install

# Start development
npm start
```

## Build

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

## Configuration

Pastikan web app sudah running di `http://localhost:3000` sebelum start Electron app.

## Architecture

- **main.js** — Electron main process, creates BrowserWindow and app menu
- **preload.js** — Secure bridge between main process and renderer
- **assets/** — App icons for each platform

## Features

- Native window controls (minimize, maximize, close)
- Application menu with keyboard shortcuts
- External links open in default browser
- Context isolation for security
- Responsive window (min 1024x600)
- Custom title bar (macOS)
