# Building IMGpro to Executable

This document outlines the steps to build IMGpro as a standalone Windows executable.

## Prerequisites

Before building, ensure you have:

- Node.js (v18 or later)
- pnpm package manager
- All dependencies installed

## Setup

1. **Install Dependencies**

   ```cmd
   pnpm install
   ```

2. **Prepare the Icon**

   Create a `build` directory and add the application icon:

   ```cmd
   mkdir build
   ```

   Then copy the generated icon to `build/icon.png`

## Build Process

### Development Build

To test the application in development mode:

```cmd
pnpm run start
```

This will:

- Compile TypeScript files
- Bundle the renderer process
- Copy HTML and CSS files
- Launch the Electron app

### Production Build

To create a distributable executable:

```cmd
pnpm run dist
```

This will:

- Build the application
- Package it with electron-builder
- Create an installer in the `release` directory

The build process will generate:

- **NSIS Installer**: A Windows installer (.exe) that allows users to install IMGpro
- **Unpacked Application**: Located in `release/win-unpacked/`

## Build Configuration

The build is configured in `package.json` under the `build` key:

- **App ID**: `com.imgpro.app`
- **Product Name**: IMGpro
- **Output Directory**: `release/`
- **Installer Type**: NSIS (Windows)
- **Icon**: `build/icon.png`

## Installer Options

The NSIS installer is configured to:

- Allow users to choose installation directory
- NOT use one-click installation (gives users more control)

## Troubleshooting

### Build Fails

If the build fails, try:

1. Delete `node_modules` and `dist` directories
2. Reinstall dependencies: `pnpm install`
3. Rebuild: `pnpm run build`

### Icon Not Showing

Ensure:

- Icon is in PNG format
- Icon is at least 256x256 pixels
- Icon path is correctly set in `package.json`

### Missing Dependencies

For native dependencies (like `sharp`), electron-builder should automatically rebuild them for Electron. If issues persist, try:

```cmd
pnpm rebuild
```

## Distribution

After building, you'll find the installer in:

```
release/IMGpro Setup [version].exe
```

Share this installer with users to install IMGpro on their Windows machines.

## Advanced Configuration

To customize the build further, edit the `build` section in `package.json`. See the [electron-builder documentation](https://www.electron.build/) for more options.
