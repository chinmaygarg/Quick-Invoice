# 🚀 UCLEAN Deployment Guide

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-1.5.x-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

Comprehensive guide for building, packaging, and deploying the UCLEAN Invoice Generation System across Windows, macOS, and Linux platforms.

## 📋 Table of Contents

- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Production Builds](#production-builds)
  - [Windows Deployment](#windows-deployment)
  - [macOS Deployment](#macos-deployment)
  - [Linux Deployment](#linux-deployment)
- [Cross-platform Building](#cross-platform-building)
- [Distribution](#distribution)
- [Code Signing](#code-signing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## ✅ Pre-deployment Checklist

Before starting the deployment process, ensure the following:

### Code Quality
```bash
# Run all quality checks
npm run lint              # ESLint checks
npm run type-check        # TypeScript validation
npm run format            # Code formatting
npm test                  # Unit tests
npm run test:e2e          # End-to-end tests

# Rust backend checks
cd src-tauri
cargo check               # Rust compilation check
cargo test                # Rust unit tests
cargo clippy -- -D warnings  # Rust linting
cargo fmt                 # Rust formatting
```

### Version Management
```bash
# Update version in package.json
npm version patch|minor|major

# Update version in Cargo.toml
# Update version in tauri.conf.json
```

### Security Audit
```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Rust security audit
cd src-tauri
cargo audit
```

### Documentation
- [ ] README.md updated with latest features
- [ ] CHANGELOG.md updated with release notes
- [ ] API documentation current
- [ ] User manual updated
- [ ] Browser requirements documented for HTML invoice system

## 🌐 HTML Invoice System Deployment

UCLEAN uses HTML-based invoice generation with browser integration for printing. This section covers deployment considerations specific to the HTML invoice system.

### Browser Requirements

#### Supported Browsers
| Browser | Windows | macOS | Linux | Print Quality | Auto-Print |
|---------|---------|-------|-------|---------------|------------|
| **Chrome** | ✅ | ✅ | ✅ | Excellent | ✅ |
| **Firefox** | ✅ | ✅ | ✅ | Good | ⚠️ Manual |
| **Safari** | ❌ | ✅ | ❌ | Good | ⚠️ Manual |
| **Edge** | ✅ | ❌ | ❌ | Excellent | ✅ |

#### Chrome Installation Verification
```bash
# Verify Chrome is available
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version

# Linux
google-chrome --version || google-chrome-stable --version
```

### HTML Invoice System Configuration

#### File System Access
UCLEAN generates HTML invoices in platform-specific directories:

**Windows:**
```
%APPDATA%\com.uclean.app\UCLEAN\Invoices\
C:\Users\{username}\AppData\Roaming\com.uclean.app\UCLEAN\Invoices\
```

**macOS:**
```
~/Library/Application Support/com.uclean.app/UCLEAN/Invoices/
```

**Linux:**
```
~/.local/share/com.uclean.app/UCLEAN/Invoices/
# or
$XDG_DATA_HOME/com.uclean.app/UCLEAN/Invoices/
```

#### Browser Security Settings

For automatic print dialog functionality, ensure:

1. **Pop-up blocking disabled** for UCLEAN-generated HTML files
2. **JavaScript enabled** for auto-print functionality
3. **File protocol access** permitted for local HTML files

#### Deployment Testing

```bash
# Test HTML invoice generation
npm run test:html-invoices

# Test browser integration
npm run test:browser-print

# Test file system permissions
npm run test:file-permissions
```

### Print Configuration Validation

#### Pre-deployment Print Testing
```bash
# Generate test invoice HTML
npm run generate-test-invoice

# Open in each supported browser
# Chrome
google-chrome file:///path/to/test-invoice.html

# Firefox
firefox file:///path/to/test-invoice.html

# Safari (macOS only)
open -a Safari file:///path/to/test-invoice.html
```

#### Paper Size Support Matrix
| Format | Chrome | Firefox | Safari | Edge | Thermal Printers |
|--------|--------|---------|--------|------|------------------|
| **A4** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **A5** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Thermal (80mm)** | ✅ | ⚠️ Manual | ⚠️ Manual | ✅ | ✅ |

### User Documentation Requirements

Include in deployment package:
- **Browser setup guide** for optimal printing
- **Print settings configuration** instructions
- **Troubleshooting guide** for common print issues
- **Alternative print methods** if auto-print fails

## 🔧 Environment Setup

### Environment Variables

Create `.env.production` file for production builds:

```bash
# Production environment
NODE_ENV=production
TAURI_PRIVATE_KEY=your_updater_private_key
TAURI_KEY_PASSWORD=your_key_password

# Application settings
VITE_APP_VERSION=$npm_package_version
VITE_BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

### Build Configuration

Ensure `tauri.conf.json` is properly configured for production:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "UCLEAN",
    "version": "0.1.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "category": "Business",
      "copyright": "Copyright © 2025 UCLEAN Team",
      "identifier": "com.uclean.app",
      "longDescription": "Professional invoice generation system...",
      "shortDescription": "UCLEAN Invoice Generation System",
      "targets": "all"
    }
  }
}
```

## 🏗️ Production Builds

### Universal Build Command

```bash
# Full production build
npm run build

# Or use Tauri CLI directly
npx tauri build
```

### Build Optimization

#### Frontend Optimization
```bash
# Enable production optimizations in vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

#### Backend Optimization
```bash
cd src-tauri

# Release build with optimizations
cargo build --release

# Additional optimizations in Cargo.toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

## 💻 Windows Deployment

### Prerequisites
- Windows 10/11 (Build 1903+)
- Visual Studio Build Tools 2019/2022
- WebView2 Runtime
- Code signing certificate (optional)

### Build Process

#### 1. Environment Setup
```powershell
# Set environment variables
$env:TAURI_PRIVATE_KEY = "your_key_here"
$env:NODE_ENV = "production"

# Install dependencies if needed
npm ci --production=false
```

#### 2. Windows-specific Build
```powershell
# Build for Windows x64
npx tauri build --target x86_64-pc-windows-msvc

# Build for Windows ARM64 (if needed)
rustup target add aarch64-pc-windows-msvc
npx tauri build --target aarch64-pc-windows-msvc
```

#### 3. Output Locations
```
src-tauri/target/release/bundle/
├── msi/                     # Windows Installer packages
│   └── UCLEAN_0.1.0_x64_en-US.msi
├── nsis/                    # NSIS installer (if configured)
│   └── UCLEAN_0.1.0_x64-setup.exe
└── appimage/               # Portable executables
    └── uclean.exe
```

### Windows-specific Configuration

Update `tauri.conf.json` for Windows:

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": "",
        "tsp": false,
        "wix": {
          "language": ["en-US"],
          "template": "path/to/main.wxs"
        }
      }
    }
  }
}
```

### Distribution Methods

#### Microsoft Store
```powershell
# Generate MSIX package for Store submission
npx tauri build --target x86_64-pc-windows-msvc --config src-tauri/tauri.msix.conf.json
```

#### Direct Download
- Host `.msi` files on your website
- Provide checksums for verification
- Include installation instructions

#### Chocolatey Package
```powershell
# Create Chocolatey package
choco new uclean
# Edit uclean.nuspec and tools/chocolateyinstall.ps1
choco pack
choco push uclean.1.0.0.nupkg --source https://push.chocolatey.org/
```

## 🍎 macOS Deployment

### Prerequisites
- macOS 10.15+ (Catalina)
- Xcode Command Line Tools
- Apple Developer Account (for code signing)
- Valid certificates

### Build Process

#### 1. Environment Setup
```bash
# Install dependencies
npm ci --production=false

# Set up Rust targets
rustup target add x86_64-apple-darwin    # Intel Macs
rustup target add aarch64-apple-darwin   # Apple Silicon Macs
```

#### 2. macOS-specific Build
```bash
# Universal binary (both Intel and Apple Silicon)
npx tauri build --target universal-apple-darwin

# Intel Macs only
npx tauri build --target x86_64-apple-darwin

# Apple Silicon only
npx tauri build --target aarch64-apple-darwin
```

#### 3. Output Locations
```
src-tauri/target/release/bundle/
├── macos/
│   └── UCLEAN.app           # Application bundle
└── dmg/
    └── UCLEAN_0.1.0_universal.dmg  # Disk image
```

### macOS-specific Configuration

Update `tauri.conf.json` for macOS:

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "frameworks": [],
        "minimumSystemVersion": "10.15",
        "exceptionDomain": "",
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
        "providerShortName": "YourTeamName",
        "entitlements": "app.entitlements"
      }
    }
  }
}
```

### Code Signing and Notarization

#### 1. Code Signing
```bash
# Sign the application
codesign --force --options runtime --sign "Developer ID Application: Your Name" \
  src-tauri/target/release/bundle/macos/UCLEAN.app

# Verify signature
codesign --verify --verbose src-tauri/target/release/bundle/macos/UCLEAN.app
```

#### 2. Notarization
```bash
# Create DMG
npx tauri build

# Submit for notarization
xcrun notarytool submit src-tauri/target/release/bundle/dmg/UCLEAN_0.1.0_universal.dmg \
  --apple-id your-apple-id@example.com \
  --password app-specific-password \
  --team-id YOUR_TEAM_ID \
  --wait

# Staple the notarization
xcrun stapler staple src-tauri/target/release/bundle/dmg/UCLEAN_0.1.0_universal.dmg
```

### Distribution Methods

#### Mac App Store
```bash
# Build for App Store
npx tauri build --target x86_64-apple-darwin --config src-tauri/tauri.mas.conf.json

# Upload to App Store Connect
xcrun altool --upload-app --type osx --file UCLEAN.pkg \
  --username your-apple-id@example.com \
  --password app-specific-password
```

#### Direct Download
- Host `.dmg` files on your website
- Provide SHA-256 checksums
- Include installation instructions

#### Homebrew Cask
```ruby
# Create Homebrew cask formula
cask "uclean" do
  version "0.1.0"
  sha256 "your_dmg_sha256_here"

  url "https://github.com/yourusername/uclean/releases/download/v#{version}/UCLEAN_#{version}_universal.dmg"
  name "UCLEAN"
  desc "Invoice generation system for laundry businesses"
  homepage "https://uclean.com"

  app "UCLEAN.app"
end
```

## 🐧 Linux Deployment

### Prerequisites
- Ubuntu 18.04+ / Debian 10+ / Fedora 30+ / Arch Linux
- System dependencies installed
- AppImage, Deb, or RPM packaging tools

### Build Process

#### 1. Environment Setup
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Install dependencies
npm ci --production=false
```

#### 2. Linux-specific Build
```bash
# Build for Linux x64
npx tauri build --target x86_64-unknown-linux-gnu

# Build for ARM64 (if needed)
rustup target add aarch64-unknown-linux-gnu
npx tauri build --target aarch64-unknown-linux-gnu
```

#### 3. Output Locations
```
src-tauri/target/release/bundle/
├── deb/
│   └── uclean_0.1.0_amd64.deb
├── rpm/
│   └── uclean-0.1.0-1.x86_64.rpm
└── appimage/
    └── uclean_0.1.0_amd64.AppImage
```

### Linux-specific Configuration

Update `tauri.conf.json` for Linux:

```json
{
  "tauri": {
    "bundle": {
      "deb": {
        "depends": [
          "libwebkit2gtk-4.0-37",
          "libgtk-3-0",
          "libayatana-appindicator3-1"
        ],
        "section": "business",
        "priority": "optional",
        "changelog": "debian/changelog"
      },
      "rpm": {
        "license": "MIT",
        "depends": [
          "webkit2gtk3",
          "gtk3"
        ],
        "release": "1",
        "epoch": 0
      }
    }
  }
}
```

### Distribution Methods

#### AppImage (Universal)
```bash
# AppImage is automatically created
# Make executable and distribute
chmod +x src-tauri/target/release/bundle/appimage/uclean_0.1.0_amd64.AppImage

# Test AppImage
./src-tauri/target/release/bundle/appimage/uclean_0.1.0_amd64.AppImage
```

#### Debian/Ubuntu (APT)
```bash
# Test .deb package
sudo dpkg -i src-tauri/target/release/bundle/deb/uclean_0.1.0_amd64.deb

# Create APT repository
mkdir -p repository/pool/main/u/uclean
cp src-tauri/target/release/bundle/deb/uclean_0.1.0_amd64.deb repository/pool/main/u/uclean/

# Generate Packages file
cd repository
dpkg-scanpackages pool/main /dev/null | gzip -9c > dists/stable/main/binary-amd64/Packages.gz
```

#### Fedora/CentOS (RPM)
```bash
# Test .rpm package
sudo rpm -i src-tauri/target/release/bundle/rpm/uclean-0.1.0-1.x86_64.rpm

# Create YUM repository
createrepo /path/to/rpm/directory
```

#### Flatpak
```yaml
# org.uclean.UCLEAN.yaml
app-id: org.uclean.UCLEAN
runtime: org.freedesktop.Platform
runtime-version: '22.08'
sdk: org.freedesktop.Sdk
command: uclean
finish-args:
  - --share=ipc
  - --socket=x11
  - --socket=wayland
  - --device=dri
  - --filesystem=home

modules:
  - name: uclean
    buildsystem: simple
    build-commands:
      - install -Dm755 uclean /app/bin/uclean
    sources:
      - type: file
        path: uclean
```

#### Snap Package
```yaml
# snap/snapcraft.yaml
name: uclean
version: '0.1.0'
summary: Invoice generation system for laundry businesses
description: |
  Professional desktop invoice generation system built with Tauri, React, and Rust.
  Designed specifically for laundry and dry cleaning businesses.

grade: stable
confinement: strict
base: core22

apps:
  uclean:
    command: bin/uclean
    desktop: share/applications/uclean.desktop
    plugs:
      - home
      - removable-media
      - network

parts:
  uclean:
    plugin: dump
    source: .
    stage-packages:
      - libwebkit2gtk-4.0-37
      - libgtk-3-0
```

## 🔄 Cross-platform Building

### Using GitHub Actions

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

### Local Cross-compilation

#### From macOS
```bash
# Install cross-compilation targets
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-unknown-linux-gnu

# Build for Windows (requires additional setup)
npx tauri build --target x86_64-pc-windows-msvc

# Build for Linux (requires Docker or VM)
docker run --rm -v "$(pwd)":/workspace -w /workspace \
  rust:latest bash -c "
    apt update && apt install -y libwebkit2gtk-4.0-dev build-essential
    npm ci && npm run build
  "
```

#### From Linux
```bash
# Install MinGW for Windows builds
sudo apt install mingw-w64
rustup target add x86_64-pc-windows-gnu

# Build for Windows
npx tauri build --target x86_64-pc-windows-gnu
```

#### From Windows
```bash
# Install WSL2 for Linux builds
wsl --install

# Use WSL2 for Linux builds
wsl
# Follow Linux build instructions inside WSL
```

## 📦 Distribution

### Release Management

#### 1. Version Tagging
```bash
# Create release tag
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

#### 2. GitHub Releases
```bash
# Install GitHub CLI
gh release create v0.1.0 \
  src-tauri/target/release/bundle/dmg/UCLEAN_0.1.0_universal.dmg \
  src-tauri/target/release/bundle/msi/UCLEAN_0.1.0_x64_en-US.msi \
  src-tauri/target/release/bundle/deb/uclean_0.1.0_amd64.deb \
  src-tauri/target/release/bundle/appimage/uclean_0.1.0_amd64.AppImage \
  --title "UCLEAN v0.1.0" \
  --notes "Release notes here"
```

#### 3. Checksums
```bash
# Generate checksums for all builds
cd src-tauri/target/release/bundle/
find . -name "*.dmg" -o -name "*.msi" -o -name "*.deb" -o -name "*.AppImage" | \
  xargs sha256sum > SHA256SUMS
```

### Auto-updater Setup

#### 1. Configure Updater
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.uclean.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

#### 2. Generate Update Manifest
```bash
# Generate update signature
npx tauri signer generate -w ~/.tauri/myapp.key

# Sign update file
npx tauri signer sign -k ~/.tauri/myapp.key \
  src-tauri/target/release/bundle/msi/UCLEAN_0.1.0_x64_en-US.msi
```

### CDN Distribution

#### CloudFlare Setup
```bash
# Upload to CloudFlare R2
wrangler r2 object put uclean-releases/v0.1.0/windows/UCLEAN_0.1.0_x64_en-US.msi \
  --file src-tauri/target/release/bundle/msi/UCLEAN_0.1.0_x64_en-US.msi
```

#### AWS S3 Setup
```bash
# Upload to S3
aws s3 cp src-tauri/target/release/bundle/ \
  s3://uclean-releases/v0.1.0/ --recursive
```

## 🔐 Code Signing

### Windows Code Signing

#### 1. Obtain Certificate
- Purchase from DigiCert, Sectigo, or similar CA
- Or use self-signed for internal distribution

#### 2. Sign Executable
```powershell
# Using SignTool
SignTool sign /f certificate.p12 /p password /tr http://timestamp.digicert.com \
  src-tauri/target/release/bundle/msi/UCLEAN_0.1.0_x64_en-US.msi

# Verify signature
SignTool verify /pa src-tauri/target/release/bundle/msi/UCLEAN_0.1.0_x64_en-US.msi
```

### macOS Code Signing

#### 1. Certificates Required
- Developer ID Application Certificate
- Developer ID Installer Certificate (for PKG files)

#### 2. Automated Signing
```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

### Linux Code Signing

#### GPG Signing
```bash
# Sign packages with GPG
gpg --armor --detach-sign src-tauri/target/release/bundle/deb/uclean_0.1.0_amd64.deb

# Verify signature
gpg --verify uclean_0.1.0_amd64.deb.asc uclean_0.1.0_amd64.deb
```

## 🔄 CI/CD Pipeline

### Complete GitHub Actions Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

env:
  CARGO_TERM_COLOR: always

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Install dependencies
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
          npm ci
      - name: Run tests
        run: |
          npm test
          cd src-tauri && cargo test

  build:
    needs: test
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install dependencies
        run: npm ci

      - name: Import Apple signing certificate
        if: matrix.platform == 'macos-latest'
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.APPLE_CERTIFICATE }}
          p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}

      - name: Build application
        run: npm run build
        env:
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Generate checksums
        run: |
          cd src-tauri/target/release/bundle/
          if [ "$RUNNER_OS" == "Windows" ]; then
            Get-ChildItem -File -Recurse | Get-FileHash -Algorithm SHA256 | Select-Object Hash, Path | Out-File -FilePath SHA256SUMS.txt
          else
            find . -type f \( -name "*.dmg" -o -name "*.deb" -o -name "*.AppImage" -o -name "*.msi" \) -exec sha256sum {} \; > SHA256SUMS
          fi
        shell: bash

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}-build
          path: |
            src-tauri/target/release/bundle/
            !src-tauri/target/release/bundle/**/deps/

      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/**/*.msi
            src-tauri/target/release/bundle/**/*.deb
            src-tauri/target/release/bundle/**/*.AppImage
            src-tauri/target/release/bundle/**/SHA256SUMS*
          draft: true
          prerelease: contains(github.ref, 'beta') || contains(github.ref, 'alpha')
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        RUST_VERSION = 'stable'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            parallel {
                stage('Node.js') {
                    steps {
                        sh "nvm use ${NODE_VERSION}"
                        sh 'npm ci'
                    }
                }
                stage('Rust') {
                    steps {
                        sh "rustup toolchain install ${RUST_VERSION}"
                        sh "rustup default ${RUST_VERSION}"
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Frontend Tests') {
                    steps {
                        sh 'npm test'
                        sh 'npm run type-check'
                    }
                }
                stage('Backend Tests') {
                    steps {
                        dir('src-tauri') {
                            sh 'cargo test'
                            sh 'cargo clippy -- -D warnings'
                        }
                    }
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Linux') {
                    agent { label 'linux' }
                    steps {
                        sh 'npm run build'
                        archiveArtifacts artifacts: 'src-tauri/target/release/bundle/**', fingerprint: true
                    }
                }
                stage('Windows') {
                    agent { label 'windows' }
                    steps {
                        bat 'npm run build'
                        archiveArtifacts artifacts: 'src-tauri/target/release/bundle/**', fingerprint: true
                    }
                }
                stage('macOS') {
                    agent { label 'macos' }
                    steps {
                        sh 'npm run build'
                        archiveArtifacts artifacts: 'src-tauri/target/release/bundle/**', fingerprint: true
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                tag "v*"
            }
            steps {
                script {
                    // Deploy to releases
                    sh './scripts/deploy.sh'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            slackSend channel: '#releases',
                     color: 'good',
                     message: "✅ UCLEAN build ${env.BUILD_NUMBER} succeeded!"
        }
        failure {
            slackSend channel: '#releases',
                     color: 'danger',
                     message: "❌ UCLEAN build ${env.BUILD_NUMBER} failed!"
        }
    }
}
```

## ⚡ Performance Optimization

### Build Performance

#### 1. Rust Compilation
```toml
# Cargo.toml optimizations
[profile.release]
lto = true              # Link-time optimization
codegen-units = 1       # Better optimization
panic = "abort"         # Smaller binary size
strip = true           # Remove debug symbols

[profile.dev]
debug = false          # Faster debug builds
incremental = true     # Incremental compilation
```

#### 2. Frontend Bundle Size
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

#### 3. Tree Shaking
```typescript
// Ensure proper imports for tree shaking
import { format } from 'date-fns'           // ✅ Good
import * as dateFns from 'date-fns'         // ❌ Bad

import { Button } from './components/ui/button'  // ✅ Good
import * as UI from './components/ui'            // ❌ Bad
```

### Runtime Performance

#### 1. Database Optimization
```rust
// Connection pooling configuration
let pool = SqlitePoolOptions::new()
    .max_connections(5)
    .min_connections(1)
    .max_lifetime(Some(Duration::from_secs(3600)))
    .idle_timeout(Some(Duration::from_secs(600)))
    .connect(&database_url)
    .await?;
```

#### 2. Memory Management
```rust
// Efficient string handling
use std::borrow::Cow;

fn process_data(input: &str) -> Cow<str> {
    if input.needs_processing() {
        Cow::Owned(input.to_processed())
    } else {
        Cow::Borrowed(input)
    }
}
```

### Monitoring

#### Application Performance
```typescript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`)
  }
})

observer.observe({ entryTypes: ['measure', 'navigation'] })
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Bundle size monitoring
npm install -g bundlesize
bundlesize
```

## 🐛 Troubleshooting

### Common Build Issues

#### 1. Rust Compilation Errors
```bash
# Issue: Outdated toolchain
rustup update stable

# Issue: Missing targets
rustup target add x86_64-pc-windows-msvc

# Issue: Corrupt cache
cargo clean
rm -rf ~/.cargo/registry/cache
```

#### 2. Node.js Build Errors
```bash
# Issue: Node version mismatch
nvm use 20
npm ci

# Issue: Corrupted node_modules
rm -rf node_modules package-lock.json
npm install

# Issue: Native dependencies
npm rebuild
```

#### 3. Tauri-specific Issues
```bash
# Issue: WebView2 not found (Windows)
winget install Microsoft.EdgeWebView2Runtime

# Issue: Missing system dependencies (Linux)
sudo apt install libwebkit2gtk-4.0-dev build-essential

# Issue: Xcode tools outdated (macOS)
xcode-select --install
```

### Platform-specific Issues

#### Windows
```powershell
# Visual Studio Build Tools not found
winget install Microsoft.VisualStudio.2022.BuildTools

# Long path names issue
git config --global core.longpaths true

# PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### macOS
```bash
# Apple Silicon compatibility
softwareupdate --install-rosetta

# Keychain issues
security unlock-keychain ~/Library/Keychains/login.keychain

# Gatekeeper issues
sudo spctl --master-disable
```

#### Linux
```bash
# AppImage execution issues
sudo apt install fuse
chmod +x application.AppImage

# Missing shared libraries
ldd uclean
sudo apt install libwebkit2gtk-4.0-37

# Permission denied
sudo chmod +x /usr/local/bin/uclean
```

### Performance Issues

#### Large Bundle Size
```bash
# Analyze what's included
npm run build -- --analyze

# Remove unused dependencies
npm uninstall unused-package
npx depcheck

# Enable compression
gzip -9 dist/*.js
```

#### Slow Startup
```rust
// Lazy initialization
use std::sync::LazyLock;

static EXPENSIVE_RESOURCE: LazyLock<ExpensiveResource> =
    LazyLock::new(|| ExpensiveResource::new());
```

#### Memory Leaks
```typescript
// Proper cleanup
useEffect(() => {
  const subscription = service.subscribe(callback)

  return () => {
    subscription.unsubscribe()
  }
}, [])
```

### Debugging Tools

#### Frontend Debugging
```bash
# React DevTools
npm install -g react-devtools

# Performance profiling
npm run build -- --profile
```

#### Backend Debugging
```rust
// Logging configuration
env_logger::Builder::from_env(
    env_logger::Env::default().default_filter_or("debug")
).init();

// Debug builds
RUST_LOG=debug cargo run
```

#### Network Debugging
```bash
# Monitor system calls
strace -e trace=network ./uclean

# Monitor file operations
lsof -p $(pgrep uclean)
```

### HTML Invoice System Issues

#### Browser Integration Problems
```bash
# Issue: HTML files not opening in browser
# Check default browser setting
# Windows
reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\Shell\Associations\URLAssociations\http\UserChoice"

# macOS
defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep -A2 -B2 "LSHandlerURLScheme.*http"

# Linux
xdg-settings get default-web-browser
```

#### Print Dialog Issues
```javascript
// Issue: Auto-print not working
// Add to HTML template debugging:
window.addEventListener('load', () => {
    console.log('Page loaded, attempting to print...');
    setTimeout(() => {
        if (window.print) {
            window.print();
            console.log('Print dialog should be shown');
        } else {
            console.error('Print function not available');
        }
    }, 500);
});
```

#### File Permission Problems
```bash
# Issue: HTML files not accessible
# Check file permissions
ls -la ~/Library/Application\ Support/com.uclean.app/UCLEAN/Invoices/  # macOS
ls -la ~/.local/share/com.uclean.app/UCLEAN/Invoices/                  # Linux
icacls %APPDATA%\com.uclean.app\UCLEAN\Invoices\                      # Windows

# Fix permissions if needed
chmod 644 ~/Library/Application\ Support/com.uclean.app/UCLEAN/Invoices/*.html
```

#### Browser Security Restrictions
```bash
# Issue: Local file restrictions
# Chrome workaround for local file access
google-chrome --allow-file-access-from-files --disable-web-security --user-data-dir=/tmp/chrome_dev

# Firefox: about:config settings
# security.fileuri.strict_origin_policy = false (for development only)
```

## 📊 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Version numbers updated
- [ ] Dependencies audited
- [ ] Documentation updated
- [ ] Backup created

### Build Process
- [ ] Clean build environment
- [ ] All platforms building successfully
- [ ] Checksums generated
- [ ] Code signing completed
- [ ] Notarization completed (macOS)

### Distribution
- [ ] Release notes prepared
- [ ] Artifacts uploaded
- [ ] Auto-updater configured
- [ ] Download links tested
- [ ] Installation tested on clean systems

### Post-deployment
- [ ] Monitor error reports
- [ ] Check download metrics
- [ ] Verify auto-updates working
- [ ] User feedback collected
- [ ] Performance monitoring enabled

## 📚 Additional Resources

### Documentation
- [Tauri Build Options](https://tauri.app/v1/api/config#buildconfig)
- [Rust Cross Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [GitHub Actions for Desktop Apps](https://github.com/marketplace/actions/tauri-action)

### Tools
- [Tauri Action](https://github.com/tauri-apps/tauri-action) - GitHub Actions for Tauri
- [cargo-bundle](https://github.com/burtonageo/cargo-bundle) - Alternative bundling
- [create-tauri-app](https://github.com/tauri-apps/create-tauri-app) - Project templates

### Community
- [Tauri Discord](https://discord.gg/tauri)
- [Tauri Discussions](https://github.com/tauri-apps/tauri/discussions)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)

---

## 🆘 Getting Help

If you encounter deployment issues:

1. **Check build logs** for specific error messages
2. **Verify system requirements** are met
3. **Test on clean environment** to isolate issues
4. **Search existing issues** in the repository
5. **Join community discussions** for support

**When reporting deployment issues, include:**
- Target platform and version
- Build command used
- Complete error logs
- System configuration details
- Steps to reproduce

---

**Ready to deploy! 🚀**
