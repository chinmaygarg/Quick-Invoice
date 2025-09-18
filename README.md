# 🧾 UCLEAN Invoice System

A powerful desktop invoice generation system built with Tauri, React, and Rust. Designed specifically for laundry and dry cleaning businesses with GST compliance for the Indian market.

## ✨ Features

### 📋 **Invoice Management**
- 🖨️ **Multiple Print Formats**: A5, A4, and Thermal printer support
- 💰 **GST Compliance**: Automatic SGST, CGST, and IGST calculations
- 📄 **PDF Generation**: High-quality invoice PDFs with custom branding
- 🔢 **Auto Numbering**: Sequential invoice numbering system
- 📅 **Date Tracking**: Order, pickup, and delivery date management

### 👥 **Customer Management**
- 📝 **Customer Profiles**: Complete customer information storage
- 📞 **Contact Management**: Phone, email, and address tracking
- 📊 **Customer Analytics**: Order history and spending analysis
- 🔍 **Quick Search**: Fast customer lookup and filtering

### 🏪 **Multi-Store Support**
- 🏢 **Store Profiles**: Manage multiple business locations
- 📍 **Location-based Invoicing**: Store-specific invoice generation
- 📋 **Store Analytics**: Location-wise performance tracking
- ⚙️ **Individual Settings**: Store-specific configurations

### 🧽 **Service Management**
- 🏷️ **Service Catalog**: Comprehensive service listings
- 💸 **Dynamic Pricing**: Flexible pricing with variants and add-ons
- 📏 **Multiple Units**: Weight, area, and quantity-based pricing
- 🎯 **Service Categories**: Organized service grouping

### 📊 **Reports & Analytics**
- 💹 **Sales Reports**: Revenue tracking and analysis
- 📈 **GST Reports**: Tax summary and compliance reports
- 👤 **Customer Insights**: Customer behavior analytics
- 🚚 **Express Delivery Tracking**: Premium service monitoring

### 💾 **Data Management**
- 🔒 **Local Storage**: SQLite database for data security
- 💾 **Backup & Restore**: Complete data backup solutions
- 🔄 **Data Migration**: Easy data import/export capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chinmaygarg/Quick-Invoice.git
   cd Quick-Invoice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

This will start both the React frontend and Tauri development server. The app will open automatically in a desktop window.

## 🛠️ Development

### Project Structure
```
uclean/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utilities
│   └── styles/            # CSS styles
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── database/      # Database models and migrations
│   │   ├── handlers/      # API route handlers
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   └── tauri.conf.json    # Tauri configuration
└── tests/                 # Test suites
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test            # Run unit tests
npm run test:e2e    # Run end-to-end tests
npm run test:coverage # Test coverage report

# Code Quality
npm run lint        # ESLint checking
npm run format      # Prettier formatting
npm run type-check  # TypeScript checking
```

### Database Schema

The system uses SQLite with the following main entities:
- **customers**: Customer information and contact details
- **stores**: Business location and configuration data
- **services**: Service catalog with pricing
- **invoices**: Invoice records and line items
- **payments**: Payment tracking and methods

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server

### Backend Stack
- **Rust**: High-performance async backend
- **Tauri**: Secure desktop application framework
- **SQLx**: Async SQL toolkit for database operations
- **SQLite**: Local database for data persistence

### Key Integrations
- **PDF Generation**: Custom PDF layouts for invoices
- **Print Support**: Direct printer integration
- **File System**: Local file operations for backups
- **Desktop APIs**: Native OS integration through Tauri

## 📱 Usage Guide

### Creating Your First Invoice

1. **Set up a Store**: Go to Stores → Add Store and enter your business details
2. **Add Services**: Navigate to Services → Add Service to create your service catalog
3. **Register Customers**: Use Customers → Add Customer for client management
4. **Generate Invoice**: Go to Invoices → New Invoice and follow the workflow
5. **Print/Export**: Choose your preferred format (A5/A4/Thermal) and print

### GST Configuration

The system automatically handles GST calculations based on:
- **SGST + CGST**: For intra-state transactions
- **IGST**: For inter-state transactions
- **Tax Rates**: Configurable per service
- **HSN Codes**: Service-specific tax classifications

## 🔧 Configuration

### Print Settings
Configure print layouts in the settings:
- **A5 Format**: Compact invoice for small businesses
- **A4 Format**: Standard business invoice
- **Thermal**: Receipt printer support (80mm)

### Business Settings
- Company branding and logo
- GST registration details
- Default tax rates
- Invoice numbering format

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript and Rust best practices
- Add tests for new features
- Update documentation as needed
- Ensure code passes linting and formatting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- 📧 **Email**: chinmay.garg@example.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/chinmaygarg/Quick-Invoice/issues)
- 📖 **Documentation**: [Wiki](https://github.com/chinmaygarg/Quick-Invoice/wiki)

## 🙏 Acknowledgments

- Built with ❤️ using Tauri and React
- Inspired by modern invoice management needs
- Special thanks to the open-source community

---

**Made with 🚀 by [Chinmay Garg](https://github.com/chinmaygarg)**
