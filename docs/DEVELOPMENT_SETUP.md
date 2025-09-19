# 🛠️ Development Setup Guide

This guide provides comprehensive setup instructions for the UCLEAN Invoice Generation System development environment across Windows, macOS, and Linux platforms.

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Platform-Specific Setup](#platform-specific-setup)
  - [Windows Setup](#windows-setup)
  - [macOS Setup](#macos-setup)
  - [Linux Setup](#linux-setup)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Editor Configuration](#editor-configuration)
- [Testing Setup](#testing-setup)

## 📊 System Requirements

### Minimum Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | Windows 10 (1903+), macOS 10.15+, Ubuntu 18.04+ |
| **CPU** | 2-core processor |
| **RAM** | 4 GB |
| **Storage** | 2 GB free space |
| **Network** | Internet connection for initial setup |

### Recommended Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | Windows 11, macOS 12+, Ubuntu 20.04+ |
| **CPU** | 4-core processor or better |
| **RAM** | 8 GB or more |
| **Storage** | 10 GB free space (SSD preferred) |
| **Network** | High-speed internet |

## 🚀 Platform-Specific Setup

### Windows Setup

#### Prerequisites

1. **Install Node.js**
   ```powershell
   # Using winget (Windows 11/10 with winget)
   winget install OpenJS.NodeJS.LTS

   # Or download from https://nodejs.org/
   ```

2. **Install Rust**
   ```powershell
   # Download and run rustup-init.exe from https://rustup.rs/
   # Or using winget
   winget install Rustlang.Rustup
   ```

3. **Install Git**
   ```powershell
   winget install Git.Git
   ```

4. **Install Visual Studio Build Tools**
   ```powershell
   # Option 1: Visual Studio Installer
   winget install Microsoft.VisualStudio.2022.BuildTools

   # Option 2: Visual Studio Community (includes Build Tools)
   winget install Microsoft.VisualStudio.2022.Community
   ```

   **Required Workloads:**
   - C++ build tools
   - Windows 10/11 SDK (latest version)
   - MSVC v143 compiler toolset

5. **Install WebView2 Runtime** (usually pre-installed on Windows 11)
   ```powershell
   winget install Microsoft.EdgeWebView2Runtime
   ```

#### Verification

```powershell
# Verify installations
node --version          # Should be 18.x or higher
npm --version           # Should be 9.x or higher
rustc --version         # Should be 1.70.x or higher
cargo --version         # Should be 1.70.x or higher
git --version           # Should be 2.x or higher
```

#### Windows-Specific Configuration

```powershell
# Set up Rust for Windows
rustup target add x86_64-pc-windows-msvc

# Configure npm to use the correct Python version (if needed)
npm config set python python3

# Enable long paths (Administrator PowerShell required)
git config --global core.longpaths true
```

### macOS Setup

#### Prerequisites

1. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

2. **Install Homebrew** (recommended package manager)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Install Node.js**
   ```bash
   # Using Homebrew
   brew install node@20

   # Or using nvm (recommended for version management)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install --lts
   nvm use --lts
   ```

4. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

5. **Install Git** (may already be installed with Xcode tools)
   ```bash
   brew install git
   ```

#### Verification

```bash
# Verify installations
node --version          # Should be 18.x or higher
npm --version           # Should be 9.x or higher
rustc --version         # Should be 1.70.x or higher
cargo --version         # Should be 1.70.x or higher
git --version           # Should be 2.x or higher
xcode-select -p         # Should show Xcode tools path
```

#### macOS-Specific Configuration

```bash
# Set up Rust targets for macOS
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Install additional tools for development
brew install openssl pkg-config

# Configure environment variables
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc  # For Apple Silicon
echo 'export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig"' >> ~/.zshrc
source ~/.zshrc
```

### Linux Setup

#### Ubuntu/Debian

1. **Update package list**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   # Using NodeSource repository (recommended)
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Or using snap
   sudo snap install node --classic
   ```

3. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

4. **Install system dependencies**
   ```bash
   sudo apt install -y \
     libwebkit2gtk-4.0-dev \
     build-essential \
     curl \
     wget \
     libssl-dev \
     libgtk-3-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     libsoup2.4-dev \
     libjavascriptcoregtk-4.0-dev \
     git \
     pkg-config
   ```

#### Fedora/CentOS/RHEL

1. **Install Node.js**
   ```bash
   # Using NodeSource repository
   curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
   sudo dnf install -y nodejs npm
   ```

2. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

3. **Install system dependencies**
   ```bash
   sudo dnf install -y \
     webkit2gtk3-devel \
     openssl-devel \
     gtk3-devel \
     libappindicator-gtk3-devel \
     librsvg2-devel \
     libsoup-devel \
     javascript-devel \
     git \
     pkg-config \
     gcc \
     gcc-c++ \
     make
   ```

#### Arch Linux

1. **Install dependencies**
   ```bash
   sudo pacman -Sy \
     nodejs \
     npm \
     rust \
     webkit2gtk \
     gtk3 \
     libappindicator-gtk3 \
     librsvg \
     libsoup \
     git \
     base-devel
   ```

#### Verification

```bash
# Verify installations
node --version          # Should be 18.x or higher
npm --version           # Should be 9.x or higher
rustc --version         # Should be 1.70.x or higher
cargo --version         # Should be 1.70.x or higher
git --version           # Should be 2.x or higher
pkg-config --version    # Should be available
```

#### Linux-Specific Configuration

```bash
# Set up Rust target for Linux
rustup target add x86_64-unknown-linux-gnu

# Configure environment variables
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install additional development tools
sudo apt install -y strace ltrace  # Debugging tools (Ubuntu/Debian)
```

## 🔧 Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/uclean-invoice-system.git
cd uclean-invoice-system
```

### 2. Install Project Dependencies

```bash
# Install frontend dependencies
npm install

# Verify Tauri CLI installation
npx tauri --version

# If Tauri CLI is not installed globally
npm install -g @tauri-apps/cli
```

### 3. Set up Development Environment

```bash
# Create environment configuration (optional)
cp .env.example .env.local

# Install pre-commit hooks
npm run prepare

# Run initial type checking
npm run type-check
```

### 4. Initialize Database

The SQLite database will be automatically created on first run, but you can verify the setup:

```bash
# Check database schema
cd src-tauri
cargo run --bin check-db  # Custom command to verify DB setup
```

### 5. Verify Setup

```bash
# Run development server
npm run dev
```

The application should open in a desktop window. If successful, you'll see the UCLEAN interface.

## 🔄 Development Workflow

### Daily Development Routine

1. **Pull latest changes**
   ```bash
   git pull origin main
   npm install  # Update dependencies if package.json changed
   ```

2. **Start development environment**
   ```bash
   npm run dev  # Starts both frontend and backend with hot reload
   ```

3. **Run tests during development**
   ```bash
   # In separate terminal
   npm run test:watch  # Watch mode for unit tests
   npm run type-check  # TypeScript checking
   ```

### Code Quality Workflow

```bash
# Before committing
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run type-check    # Verify TypeScript types
npm test              # Run unit tests
npm run test:e2e      # Run e2e tests (optional)
```

### Working with Rust Backend

```bash
cd src-tauri

# Check Rust code
cargo check

# Run Rust tests
cargo test

# Format Rust code
cargo fmt

# Run Clippy (Rust linter)
cargo clippy -- -D warnings

# Build release version
cargo build --release
```

### Database Development

```bash
# Reset database during development
rm -f src-tauri/database.sqlite  # Removes local database

# Database will be recreated on next app start
npm run dev
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Build Failures

**Issue**: `Failed to compile` errors
```bash
# Solution: Clean and rebuild
rm -rf node_modules
npm install
cd src-tauri && cargo clean && cd ..
npm run dev
```

**Issue**: Rust compiler errors
```bash
# Update Rust toolchain
rustup update stable
rustup default stable

# Clear Rust cache
cd src-tauri
cargo clean
```

**Issue**: Node.js version conflicts
```bash
# Use nvm to manage Node versions
nvm install 20
nvm use 20
npm install
```

#### Platform-Specific Issues

**Windows:**
- **WebView2 not found**: Install Microsoft Edge WebView2 Runtime
- **Build tools missing**: Ensure Visual Studio Build Tools are installed
- **Long path issues**: Enable long paths in Windows settings

**macOS:**
- **Xcode issues**: Reinstall command line tools: `xcode-select --install`
- **Permission denied**: Use `sudo` for global npm installs or configure npm prefix
- **M1 compatibility**: Ensure you're using native M1 builds of Node.js and Rust

**Linux:**
- **Missing dependencies**: Install all webkit2gtk and development packages
- **Permission issues**: Avoid using `sudo` with npm; configure npm prefix instead
- **AppImage issues**: Install `fuse` package: `sudo apt install fuse`

#### Development Server Issues

**Issue**: Port already in use
```bash
# Kill processes using port 1420
sudo lsof -ti:1420 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :1420        # Windows (then kill PID)
```

**Issue**: Hot reload not working
```bash
# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Issue**: Rust backend not updating
```bash
# Force rebuild Rust backend
cd src-tauri
cargo clean
cd ..
npm run dev
```

#### Database Issues

**Issue**: Database corruption
```bash
# Reset database
rm -f src-tauri/database.sqlite
npm run dev  # Will recreate database
```

**Issue**: Permission denied accessing database
```bash
# Check file permissions
ls -la src-tauri/database.sqlite
chmod 644 src-tauri/database.sqlite  # If needed
```

### Performance Optimization

#### Development Performance

```bash
# Use faster package manager
npm install -g pnpm
pnpm install  # Instead of npm install

# Disable unnecessary features during development
export TAURI_DEBUG=true  # Enables debug mode
```

#### Memory Usage

```bash
# Monitor memory usage
# macOS
top -pid $(pgrep -f "tauri dev")

# Linux
htop -p $(pgrep -f "tauri dev")

# Windows
tasklist | findstr tauri
```

### Debugging Tools

#### Frontend Debugging

```bash
# Enable React DevTools
npm install -g react-devtools

# Run with debugging
DEBUG=tauri:* npm run dev
```

#### Backend Debugging

```rust
// In Rust code, use debugging macros
log::debug!("Debug message");
log::info!("Info message");
log::error!("Error message");

// Set environment variable for logging
export RUST_LOG=debug
npm run dev
```

#### Network Debugging

```bash
# Monitor HTTP requests (if any)
export DEBUG=*
npm run dev

# Or use browser dev tools for frontend requests
```

## 📝 Editor Configuration

### Visual Studio Code (Recommended)

**Required Extensions:**
```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "tauri-apps.tauri-vscode",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Settings Configuration (.vscode/settings.json):**
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "rust": "html"
  }
}
```

### WebStorm/IntelliJ IDEA

**Required Plugins:**
- Rust
- Tauri
- Tailwind CSS
- Prettier
- ESLint

### Vim/Neovim

**Required Plugins:**
```lua
-- For Neovim with Packer
use 'simrat39/rust-tools.nvim'
use 'jose-elias-alvarez/null-ls.nvim'
use 'nvim-treesitter/nvim-treesitter'
use 'neovim/nvim-lspconfig'
```

## 🧪 Testing Setup

### Unit Testing

```bash
# Install testing dependencies (already included)
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

### E2E Testing

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e
npm run test:e2e:headed     # With browser UI
```

### Rust Testing

```bash
cd src-tauri

# Run Rust tests
cargo test
cargo test -- --nocapture  # With output
cargo test integration      # Only integration tests
```

### Database Testing

```bash
# Create test database
cp src-tauri/database.sqlite src-tauri/test-database.sqlite

# Run tests with test database
TEST_DATABASE=test-database.sqlite npm test
```

## 🔒 Security Setup

### Development Security

```bash
# Install security audit tools
npm install -g npm-audit-resolver
npm audit

# For Rust dependencies
cargo install cargo-audit
cargo audit
```

### Environment Variables

```bash
# Create .env.local for local development
echo "TAURI_DEBUG=true" > .env.local
echo "RUST_LOG=debug" >> .env.local

# Never commit sensitive data
echo ".env.local" >> .gitignore
```

## 📚 Additional Resources

### Documentation
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Documentation](https://reactjs.org/docs/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLx Documentation](https://docs.rs/sqlx/)

### Community
- [Tauri Discord](https://discord.gg/tauri)
- [Rust Community](https://www.rust-lang.org/community)
- [React Community](https://reactjs.org/community/support.html)

### Tools
- [Rust Playground](https://play.rust-lang.org/)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Tailwind CSS Playground](https://play.tailwindcss.com/)

---

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check existing issues**: [GitHub Issues](https://github.com/yourusername/uclean-invoice-system/issues)
2. **Search documentation**: Use the search function in our docs
3. **Join discussions**: [GitHub Discussions](https://github.com/yourusername/uclean-invoice-system/discussions)
4. **Contact support**: support@uclean.com

**When reporting issues, please include:**
- Operating system and version
- Node.js and Rust versions
- Complete error messages
- Steps to reproduce the issue

---

**Happy coding! 🚀**