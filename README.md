# 🧾 UCLEAN Invoice Generation System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-1.5.x-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

A professional desktop invoice generation system built with Tauri, React, and Rust. Designed specifically for laundry and dry cleaning businesses with full GST compliance for the Indian market.

## ✨ Key Features

### 🧾 **Invoice Management**
- 🖨️ **Multiple Print Formats**: A5, A4, and 80mm Thermal printer support
- 💰 **GST Compliance**: Automatic SGST, CGST, and IGST calculations with HSN codes
- 📄 **PDF Generation**: High-quality invoice PDFs with custom branding
- 🔢 **Auto Numbering**: Sequential invoice numbering with customizable format
- 📅 **Complete Date Tracking**: Order, pickup, delivery, and due date management
- 💱 **Currency in Words**: Automatic amount-to-words conversion

### 👥 **Customer Management**
- 📝 **Comprehensive Profiles**: Complete customer information with notes
- 📞 **Contact Management**: Phone, email, and address with validation
- 📊 **Customer Analytics**: Order history, spending patterns, and loyalty tracking
- 🔍 **Smart Search**: Fast customer lookup with autocomplete
- 📈 **Customer Stats**: Total orders, spending, and last order tracking

### 🏪 **Multi-Store Support**
- 🏢 **Store Profiles**: Manage multiple business locations
- 📍 **Location-based Operations**: Store-specific invoicing and reporting
- 📋 **Individual Analytics**: Location-wise performance tracking
- ⚙️ **Custom Settings**: Store-specific configurations and branding
- 🏪 **Store Status Management**: Active/inactive store controls

### 🧽 **Service Management**
- 🏷️ **Comprehensive Catalog**: Detailed service listings with categories
- 💸 **Flexible Pricing**: Weight-based, area-based, and quantity-based pricing
- 🎯 **Service Variants**: Multiple options per service (Express, Premium, etc.)
- 📦 **Add-on Services**: Additional services with separate pricing
- 📏 **Multiple Units**: kg, sqft, pieces, and custom units
- 📊 **Service Analytics**: Popular services and revenue tracking

### 📊 **Reports & Analytics**
- 💹 **Sales Reports**: Revenue tracking with date ranges and filters
- 📈 **GST Reports**: Tax summary reports for compliance
- 👤 **Customer Insights**: Top customers and behavior analysis
- 🚚 **Express Delivery Tracking**: Premium service monitoring
- 📋 **Service Performance**: Most popular and profitable services
- 💰 **Payment Analysis**: Payment method and outstanding tracking

### 💾 **Data Management & Security**
- 🔒 **Local Storage**: SQLite database for complete data security
- 💾 **Backup & Restore**: Full database backup with restore functionality
- 🔄 **Data Export**: Export to CSV, PDF, and other formats
- 🔐 **Data Validation**: Input validation and data integrity checks
- 📱 **Offline Operation**: Full functionality without internet dependency

## 🚀 Quick Start

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Operating System** | Windows 10, macOS 10.15, Ubuntu 18.04 | Windows 11, macOS 12+, Ubuntu 20.04+ |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | 200 MB | 1 GB+ |
| **Node.js** | 18.0.0 | 20.x LTS |
| **Rust** | 1.70.0 | Latest stable |

### Prerequisites

Before installation, ensure you have:

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Rust 1.70+** - [Install via rustup](https://rustup.rs/)
3. **Git** - [Download here](https://git-scm.com/)

#### Platform-specific Requirements

**Windows:**
- Visual Studio Build Tools or Visual Studio 2019/2022
- WebView2 Runtime (usually pre-installed on Windows 11)

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/uclean-invoice-system.git
   cd uclean-invoice-system
   ```

2. **Install dependencies**
   ```bash
   # Using npm (recommended)
   npm install

   # Or using pnpm
   pnpm install

   # Or using yarn
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The application will automatically open in a desktop window. The first run may take a few minutes to compile the Rust backend.

## 🛠️ Development

### Project Structure

```
uclean/
├── src/                          # React Frontend
│   ├── components/               # Reusable UI components
│   │   ├── ui/                  # Base UI components
│   │   ├── forms/               # Form components
│   │   └── modals/              # Modal dialogs
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions
│   ├── types/                   # TypeScript type definitions
│   └── styles/                  # CSS and Tailwind styles
├── src-tauri/                   # Rust Backend
│   ├── src/
│   │   ├── database/            # Database models and migrations
│   │   │   ├── mod.rs           # Database manager
│   │   │   ├── schema.sql       # Database schema
│   │   │   └── seed.sql         # Initial data
│   │   ├── handlers/            # Tauri command handlers
│   │   │   ├── customer_handler.rs
│   │   │   ├── invoice_handler.rs
│   │   │   ├── service_handler.rs
│   │   │   ├── store_handler.rs
│   │   │   ├── report_handler.rs
│   │   │   ├── pricing_handler.rs
│   │   │   └── pdf_handler.rs
│   │   ├── models/              # Data models and types
│   │   ├── services/            # Business logic
│   │   │   ├── pricing_engine.rs
│   │   │   └── pdf_generator.rs
│   │   ├── utils/               # Helper functions
│   │   └── main.rs              # Application entry point
│   ├── icons/                   # Application icons
│   ├── build.rs                 # Build script
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── dist/                        # Production build output
├── public/                      # Static assets
└── tests/                       # Test suites
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run end-to-end tests
npm run test:coverage    # Generate test coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Rust Backend
cd src-tauri
cargo check              # Check Rust code
cargo test               # Run Rust tests
cargo build              # Build Rust backend
cargo clean              # Clean build artifacts
```

### Technology Stack

#### Frontend
- **React 18**: Modern React with concurrent features and hooks
- **TypeScript**: Full type safety and better development experience
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **React Hook Form**: Performant forms with validation
- **Zod**: Schema validation and type inference
- **React Router**: Client-side routing
- **Lucide React**: Beautiful icon library
- **React Hot Toast**: Elegant notifications

#### Backend
- **Rust**: High-performance, memory-safe systems programming
- **Tauri**: Secure, fast desktop application framework
- **SQLx**: Async SQL toolkit with compile-time checked queries
- **SQLite**: Lightweight, serverless database
- **Tokio**: Async runtime for Rust
- **Serde**: Serialization/deserialization framework
- **Chrono**: Date and time handling
- **Anyhow**: Error handling

#### Build Tools
- **Vite**: Fast build tool and development server
- **Tauri CLI**: Desktop application bundling
- **ESLint**: Code linting and quality checks
- **Prettier**: Code formatting
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing

## 📊 Database Schema

The system uses SQLite with the following main entities:

### Core Tables
- **`customers`**: Customer information, contact details, and preferences
- **`stores`**: Business locations with settings and configurations
- **`services`**: Service catalog with pricing and categories
- **`service_variants`**: Service variations (Express, Premium, etc.)
- **`service_addons`**: Additional services and add-ons
- **`invoices`**: Invoice headers with customer and store information
- **`invoice_items`**: Invoice line items with services and pricing
- **`invoice_item_addons`**: Add-on services for invoice items

### Key Features
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Audit Trail**: Created and updated timestamps on all records
- **Soft Deletes**: Important records are marked inactive instead of deleted
- **Flexible Pricing**: Support for quantity, weight, and area-based pricing
- **GST Compliance**: Built-in tax calculation and tracking

## 🎯 Usage Guide

### Setting Up Your Business

1. **Configure Your Store**
   - Navigate to Settings → Store Management
   - Add your business details, GST information, and branding
   - Set up default tax rates and invoice preferences

2. **Create Service Catalog**
   - Go to Services → Manage Services
   - Add your cleaning services with appropriate pricing
   - Configure service variants and add-ons
   - Set GST rates and HSN codes for compliance

3. **Add Customer Information**
   - Use the Customer Management section
   - Import existing customer data or add manually
   - Set up customer preferences and notes

### Creating Invoices

1. **New Invoice Workflow**
   - Click "New Invoice" from the dashboard
   - Select customer (or create new)
   - Choose services and quantities
   - Review pricing and tax calculations
   - Generate and print invoice

2. **Invoice Customization**
   - Choose print format (A5, A4, or Thermal)
   - Add custom notes and terms
   - Apply discounts or express charges
   - Set pickup and delivery dates

### Reports and Analytics

- **Sales Dashboard**: Overview of daily, weekly, and monthly performance
- **Customer Reports**: Top customers, order frequency, and spending patterns
- **Service Analytics**: Most popular services and revenue by category
- **GST Reports**: Tax collection summary for compliance filing
- **Payment Tracking**: Outstanding amounts and payment method analysis

## 🔧 Configuration

### Application Settings

```json
{
  "business": {
    "name": "Your Business Name",
    "address": "Complete Business Address",
    "phone": "+91-XXXXXXXXXX",
    "email": "business@example.com",
    "gst_number": "22AAAAA0000A1Z5",
    "website": "https://yourbusiness.com"
  },
  "invoice": {
    "prefix": "INV",
    "starting_number": 1001,
    "date_format": "DD/MM/YYYY",
    "currency": "INR",
    "decimal_places": 2
  },
  "print": {
    "default_format": "A5",
    "auto_print": false,
    "copies": 1
  }
}
```

### GST Configuration

The system supports Indian GST requirements:
- **SGST + CGST**: Intra-state transactions
- **IGST**: Inter-state transactions
- **HSN Codes**: Service classification codes
- **Tax Rates**: 5%, 12%, 18%, 28% standard rates
- **Reverse Charge**: B2B transaction support

## 🚀 Building for Production

### Development Build
```bash
npm run build
```

### Platform-specific Builds
```bash
# Windows (from any platform)
npm run build -- --target x86_64-pc-windows-msvc

# macOS (from macOS)
npm run build -- --target x86_64-apple-darwin
npm run build -- --target aarch64-apple-darwin

# Linux (from Linux)
npm run build -- --target x86_64-unknown-linux-gnu
```

The built application will be available in `src-tauri/target/release/bundle/`.

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### E2E Tests
```bash
npm run test:e2e           # Run Playwright tests
```

### Rust Tests
```bash
cd src-tauri
cargo test                 # Run Rust tests
cargo test -- --nocapture  # With output
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the coding standards
   - Add tests for new features
   - Update documentation
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Code Standards

- **TypeScript**: Strict mode enabled, full type coverage
- **Rust**: Follow standard Rust conventions and clippy recommendations
- **Testing**: Minimum 80% code coverage for new features
- **Documentation**: Update docs for any API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Build Failures:**
- Ensure all prerequisites are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Rust cache: `cd src-tauri && cargo clean`

**Database Issues:**
- Delete database.sqlite to reset to default schema
- Check file permissions in the application data directory

**Print Issues:**
- Verify printer drivers are installed
- Check printer settings in system preferences
- Try different print formats (A4, A5, Thermal)

**Performance Issues:**
- Check available disk space (SQLite database grows over time)
- Consider archiving old invoices
- Monitor system resources during PDF generation

For more detailed troubleshooting, see [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md).

## 📞 Support

- 📧 **Email**: support@uclean.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/uclean-invoice-system/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/yourusername/uclean-invoice-system/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/uclean-invoice-system/discussions)

## 🙏 Acknowledgments

- Built with ❤️ using [Tauri](https://tauri.app/) and [React](https://reactjs.org/)
- Icons by [Lucide](https://lucide.dev/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Special thanks to the open-source community

---

**Made with 🚀 by the UCLEAN Team**