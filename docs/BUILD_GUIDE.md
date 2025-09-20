# 🚀 UCLEAN Build Guide

A comprehensive guide for building UCLEAN Invoice System for different platforms and deployment scenarios.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Builds](#development-builds)
- [Production Builds](#production-builds)
- [Platform-Specific Builds](#platform-specific-builds)
- [Debug Builds](#debug-builds)
- [Cross-Platform Compilation](#cross-platform-compilation)
- [CI/CD Setup](#cicd-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| **Windows** | Windows 10 | Windows 11 |
| **macOS** | macOS 10.15 | macOS 12+ |
| **Linux** | Ubuntu 18.04 | Ubuntu 22.04 LTS |

### Required Tools

#### 1. Node.js and Package Manager
```bash
# Node.js 18+ (Required)
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# Alternative package managers (optional)
pnpm --version  # Fast, disk space efficient
yarn --version  # Classic alternative
```

#### 2. Rust Toolchain
```bash
# Install Rust via rustup (recommended)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version  # Should be 1.70.0 or higher
cargo --version  # Should be 1.70.0 or higher
```

#### 3. Platform-Specific Dependencies

**Windows:**
```powershell
# Visual Studio Build Tools (choose one)
# Option 1: Visual Studio Community 2019/2022 (with C++ workload)
# Option 2: Build Tools for Visual Studio 2019/2022
# Download from: https://visualstudio.microsoft.com/downloads/

# WebView2 (usually pre-installed on Windows 11)
# Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

**macOS:**
```bash
# Xcode Command Line Tools
xcode-select --install

# Verify installation
xcode-select -p  # Should show developer directory path
```

**Linux (Ubuntu/Debian):**
```bash
# Essential build dependencies
sudo apt update
sudo apt install -y \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    webkit2gtk-4.0 \
    libwebkit2gtk-4.0-dev

# For older Ubuntu versions, use webkit2gtk-4.1
sudo apt install webkit2gtk-4.1-dev libwebkit2gtk-4.1-dev
```

**Linux (Fedora/RHEL):**
```bash
# Essential build dependencies
sudo dnf groupinstall "Development Tools"
sudo dnf install -y \
    openssl-devel \
    gtk3-devel \
    libayatana-appindicator-gtk3-devel \
    librsvg2-devel \
    webkit2gtk4.0-devel
```

**Linux (Arch):**
```bash
# Essential build dependencies
sudo pacman -S --needed \
    base-devel \
    curl \
    wget \
    file \
    openssl \
    gtk3 \
    libayatana-appindicator \
    librsvg \
    webkit2gtk
```

## Development Builds

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/uclean-invoice-system.git
cd uclean-invoice-system

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Server Options

```bash
# Standard development mode
npm run dev

# Development with debug logging
npm run dev:debug

# Development with verbose logging
npm run dev:verbose

# Development with hot reload and detailed output
RUST_LOG=debug npm run dev
```

### Development Build Features
- ⚡ Hot reload for both frontend and backend
- 🔧 Debug symbols included
- 📝 Detailed logging
- 🔍 Source maps for debugging
- 🔄 Automatic restart on Rust changes

## Production Builds

### Building for Current Platform

```bash
# Clean previous builds (recommended)
npm run clean  # or manually: rm -rf dist src-tauri/target

# Build for production
npm run build

# Preview production build (optional)
npm run preview
```

### Build Output Locations

After a successful build, you'll find:

```
src-tauri/target/release/bundle/
├── macos/           # macOS App Bundle (.app)
├── dmg/             # macOS Disk Image (.dmg)
├── msi/             # Windows Installer (.msi)
├── deb/             # Debian Package (.deb)
├── rpm/             # RPM Package (.rpm)
└── appimage/        # Linux AppImage (.AppImage)
```

### Build Configuration

The build process can be customized via `src-tauri/tauri.conf.json`:

```json
{
  "package": {
    "productName": "UCLEAN",
    "version": "0.1.0"
  },
  "build": {
    "beforeBuildCommand": "vite build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.uclean.app",
    "category": "Business",
    "copyright": "Copyright © 2025 UCLEAN Team"
  }
}
```

## Platform-Specific Builds

### Windows Builds

#### Building on Windows
```powershell
# Build for Windows x64
npm run build

# Debug build for Windows
npm run build:dev

# Specific Windows target
npm run build -- --target x86_64-pc-windows-msvc
```

#### Cross-compiling to Windows (from macOS/Linux)
```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Install MinGW-w64 (macOS with Homebrew)
brew install mingw-w64

# Install MinGW-w64 (Ubuntu)
sudo apt install gcc-mingw-w64-x86-64

# Build for Windows
npm run build -- --target x86_64-pc-windows-msvc
```

**Note:** Cross-compilation to Windows has limitations. Some dependencies (like `ring`) may fail to compile. Consider using GitHub Actions for reliable Windows builds.

### macOS Builds

#### Building on macOS
```bash
# Universal build (Intel + Apple Silicon)
npm run build

# Intel-specific build
npm run build -- --target x86_64-apple-darwin

# Apple Silicon-specific build
npm run build -- --target aarch64-apple-darwin
```

#### macOS Code Signing (Optional)
```bash
# For distribution, you may need to sign the app
# Add to tauri.conf.json:
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### Linux Builds

#### Building on Linux
```bash
# Build for current architecture
npm run build

# Build for specific target
npm run build -- --target x86_64-unknown-linux-gnu

# Build ARM64 version (on ARM64 host)
npm run build -- --target aarch64-unknown-linux-gnu
```

#### Available Linux Formats
```bash
# Configure output formats in tauri.conf.json
{
  "bundle": {
    "targets": ["deb", "rpm", "appimage"]
  }
}

# Or specify during build
npm run build -- --bundles deb,appimage
```

## Debug Builds

### Development Debug Build
```bash
# Build with debug symbols
npm run build:dev

# Run with detailed logging
RUST_LOG=debug npm run dev

# Run with trace-level logging
RUST_LOG=trace npm run dev

# Backend-only debug build
cd src-tauri && cargo build
```

### Production Debug Build
```bash
# Production build with debug info
cd src-tauri
cargo build --release --features debug-info

# Or modify Cargo.toml temporarily:
[profile.release]
debug = true
```

### Debug Features Available
- 🔍 **Source Maps**: JavaScript source mapping for browser debugging
- 📊 **Performance Profiling**: Rust performance analysis
- 📝 **Detailed Logging**: Application flow tracking
- 🔧 **Debug Symbols**: Native debugging support
- ⚡ **Hot Reload**: Live code updates during development

## Cross-Platform Compilation

### Supported Targets

| Target Platform | Host Platform | Status | Notes |
|----------------|---------------|--------|-------|
| Windows x64 | Windows | ✅ Full | Native compilation |
| Windows x64 | macOS | ⚠️ Limited | Requires MinGW, some deps may fail |
| Windows x64 | Linux | ⚠️ Limited | Requires MinGW, some deps may fail |
| macOS Intel | macOS | ✅ Full | Native compilation |
| macOS ARM64 | macOS | ✅ Full | Native compilation |
| macOS | Windows/Linux | ❌ None | Apple toolchain required |
| Linux x64 | Linux | ✅ Full | Native compilation |
| Linux x64 | Windows | ❌ None | Complex toolchain setup |
| Linux x64 | macOS | ⚠️ Limited | Docker recommended |

### Setting up Cross-Compilation

#### Windows Target (from macOS)
```bash
# Install target and toolchain
rustup target add x86_64-pc-windows-msvc
brew install mingw-w64

# Configure environment
export CC_x86_64_pc_windows_msvc=x86_64-w64-mingw32-gcc
export CXX_x86_64_pc_windows_msvc=x86_64-w64-mingw32-g++
export AR_x86_64_pc_windows_msvc=x86_64-w64-mingw32-ar

# Attempt build (may fail with some dependencies)
npm run build -- --target x86_64-pc-windows-msvc
```

#### Docker-based Cross-Compilation
```dockerfile
# Dockerfile for Linux builds
FROM rust:1.70

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    webkit2gtk-4.0

WORKDIR /app
COPY . .
RUN npm install && npm run build
```

## CI/CD Setup

### GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-22.04, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Rust setup
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Node.js setup
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm install

      - name: Build the app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: __VERSION__
          releaseName: 'UCLEAN v__VERSION__'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: true
          prerelease: false
```

### Advanced CI/CD Features

#### Multi-platform Release Workflow
```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  build-and-upload:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}
    steps:
      # ... build steps ...

      - name: Upload Release Assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./src-tauri/target/release/bundle/*/*
          asset_name: uclean-${{ matrix.os }}
          asset_content_type: application/octet-stream
```

## Build Optimization

### Frontend Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Build with specific optimizations
npm run build -- --mode production

# Custom Vite config for optimization
# vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}
```

### Backend Optimization
```toml
# Cargo.toml optimizations
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true

# Binary size reduction
[profile.release-small]
inherits = "release"
opt-level = "z"
lto = "fat"
```

### Build Size Comparison

| Platform | Debug Build | Release Build | Optimized Build |
|----------|-------------|---------------|-----------------|
| Windows | ~150 MB | ~25 MB | ~18 MB |
| macOS | ~180 MB | ~28 MB | ~20 MB |
| Linux | ~120 MB | ~22 MB | ~16 MB |

## Troubleshooting

### Common Build Issues

#### 1. Rust Compilation Errors
```bash
# Clear Rust cache
cd src-tauri && cargo clean

# Update Rust toolchain
rustup update

# Check for missing dependencies
cargo check
```

#### 2. Node.js Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### 3. Platform-Specific Issues

**Windows:**
```powershell
# WebView2 installation
winget install Microsoft.EdgeWebView2

# Visual Studio Build Tools verification
where cl.exe  # Should show compiler path

# Windows SDK verification
dir "C:\Program Files (x86)\Windows Kits\10\Include"
```

**macOS:**
```bash
# Xcode tools verification
xcode-select --print-path

# macOS SDK verification
xcrun --show-sdk-path

# Homebrew issues
brew doctor
```

**Linux:**
```bash
# Missing dependencies check
ldd --version
pkg-config --list-all | grep gtk
pkg-config --list-all | grep webkit

# Permission issues
sudo chown -R $USER:$USER ~/.cargo
```

#### 4. Cross-Compilation Issues

**Ring/OpenSSL compilation failures:**
```bash
# Use system OpenSSL
export OPENSSL_DIR=/usr/local/opt/openssl

# Alternative: Use rustls instead of OpenSSL
# Modify Cargo.toml to use rustls features
```

**Missing C compiler:**
```bash
# Install appropriate cross-compilation toolchain
# For Windows target on macOS:
brew install mingw-w64

# For ARM target:
rustup target add aarch64-unknown-linux-gnu
sudo apt install gcc-aarch64-linux-gnu
```

### Build Performance Tips

1. **Use Rust Cache**: Enable `sccache` or `rust-cache` in CI
2. **Parallel Builds**: Set `CARGO_BUILD_JOBS` environment variable
3. **Incremental Builds**: Don't clean unless necessary
4. **Target-Specific Builds**: Only build for needed platforms
5. **Dependency Optimization**: Remove unused dependencies

### Getting Help

If you encounter build issues:

1. 📋 **Check Prerequisites**: Ensure all required tools are installed
2. 🔍 **Review Logs**: Look for specific error messages
3. 🧹 **Clean Build**: Try `npm run clean && npm install && npm run build`
4. 📚 **Check Documentation**: Review [Tauri docs](https://tauri.app/v1/guides/building/)
5. 💬 **Community Support**: Ask on [GitHub Discussions](https://github.com/yourusername/uclean/discussions)

### Useful Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run dev:debug             # Dev with debug logging
npm run build:frontend        # Frontend only
npm run build:backend         # Backend only

# Production
npm run build                 # Full production build
npm run preview              # Preview production build

# Testing builds
npm run test                 # Unit tests
npm run test:e2e            # E2E tests on built app

# Maintenance
npm run clean               # Clean all build artifacts
npm run deps:update         # Update dependencies
npm run security:audit      # Security audit

# Platform-specific
npm run build:windows       # Windows-specific build
npm run build:macos         # macOS-specific build
npm run build:linux         # Linux-specific build
```

---

**Need more help?** Check out our [Development Setup Guide](DEVELOPMENT_SETUP.md) or [Deployment Guide](DEPLOYMENT.md).