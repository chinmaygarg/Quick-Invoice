# UCLEAN Invoice Generation System - Technical Approach

## Project Overview

UCLEAN is a desktop invoice generation application for laundry and dry cleaning services. The system handles complex pricing structures, GST calculations, service variants, and generates GST-compliant invoices with audit trails.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Tailwind CSS for styling
- **State Management**: React Context API + useReducer
- **PDF Generation**: jsPDF or react-pdf for invoice generation
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Tauri (Rust-based desktop app framework)
- **Database**: SQLite with rusqlite
- **API Layer**: Tauri commands (Rust functions exposed to frontend)
- **File System**: Native file operations through Tauri APIs

### Architecture
- **Pattern**: Desktop-first application with local data storage
- **Data Flow**: React UI ↔ Tauri Commands ↔ SQLite Database
- **Deployment**: Single executable with embedded database

## Database Schema Design

### Core Tables
1. **customers** - Customer master data
2. **stores** - Store/branch information with GSTIN
3. **invoices** - Invoice headers with totals and GST calculations
4. **service_categories** - Hierarchical service categorization
5. **services** - Master service list with pricing
6. **service_variants** - Dynamic pricing for complex services (Sarees, Dresses)
7. **invoice_items** - Line items with snapshot pricing
8. **addons** - Additional services (stain removal, express delivery)
9. **invoice_item_addons** - Addon applications to specific items
10. **payments** - Payment tracking with multiple methods
11. **terms_conditions** - Configurable T&C per store
12. **audit_log** - Immutable change tracking

### Key Design Principles
- **Snapshot Pricing**: Store rates at invoice time to prevent historical data corruption
- **Audit Trail**: All changes logged in audit_log table
- **Flexible Pricing**: Support for per-kg, per-piece, per-sqft pricing models
- **Dynamic Services**: Variant support for complex items (e.g., Cotton vs Silk sarees)
- **GST Compliance**: Proper SGST/CGST split with inclusive/exclusive options

## Application Architecture

### 1. Data Layer (Rust/Tauri)
```
src-tauri/
├── src/
│   ├── main.rs              # Application entry point
│   ├── database/
│   │   ├── mod.rs           # Database module
│   │   ├── connection.rs    # SQLite connection management
│   │   ├── schema.sql       # Database schema
│   │   ├── seed.sql         # Initial data
│   │   └── migrations/      # Schema evolution
│   ├── models/
│   │   ├── mod.rs
│   │   ├── invoice.rs       # Invoice data structures
│   │   ├── customer.rs      # Customer models
│   │   ├── service.rs       # Service models
│   │   └── payment.rs       # Payment models
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── invoice_handler.rs    # Invoice CRUD operations
│   │   ├── customer_handler.rs   # Customer management
│   │   ├── service_handler.rs    # Service management
│   │   └── report_handler.rs     # Analytics and reports
│   ├── services/
│   │   ├── mod.rs
│   │   ├── gst_calculator.rs     # GST calculation logic
│   │   ├── pricing_engine.rs    # Dynamic pricing calculations
│   │   └── pdf_generator.rs     # Invoice PDF generation
│   └── utils/
│       ├── mod.rs
│       ├── validation.rs    # Input validation
│       └── error.rs         # Error handling
```

### 2. Frontend Layer (React/TypeScript)
```
src/
├── components/
│   ├── common/
│   │   ├── Layout.tsx       # App layout wrapper
│   │   ├── Navigation.tsx   # Main navigation
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── forms/
│   │   ├── CustomerForm.tsx     # Customer creation/editing
│   │   ├── ServiceForm.tsx      # Service management
│   │   └── InvoiceForm.tsx      # Invoice creation wizard
│   ├── invoice/
│   │   ├── InvoiceWizard.tsx    # Multi-step invoice creation
│   │   ├── ServiceSelector.tsx  # Service selection with variants
│   │   ├── AddonSelector.tsx    # Addon selection
│   │   ├── GSTCalculator.tsx    # GST calculation display
│   │   ├── InvoicePreview.tsx   # Invoice preview before save
│   │   └── InvoiceList.tsx      # Invoice listing and search
│   ├── dashboard/
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── QuickStats.tsx       # Revenue/invoice stats
│   │   └── RecentActivity.tsx   # Recent invoices
│   └── reports/
│       ├── SalesReport.tsx      # Sales analytics
│       ├── GSTReport.tsx        # GST summary reports
│       └── CustomerReport.tsx   # Customer-wise analytics
├── hooks/
│   ├── useInvoices.tsx      # Invoice management hook
│   ├── useCustomers.tsx     # Customer management hook
│   ├── useServices.tsx      # Service management hook
│   └── useGSTCalculation.tsx # GST calculation hook
├── contexts/
│   ├── AppContext.tsx       # Global app state
│   ├── InvoiceContext.tsx   # Invoice creation state
│   └── SettingsContext.tsx  # App settings/preferences
├── types/
│   ├── invoice.ts           # Invoice type definitions
│   ├── customer.ts          # Customer types
│   ├── service.ts           # Service types
│   └── common.ts            # Shared types
├── utils/
│   ├── tauri.ts            # Tauri command wrappers
│   ├── formatting.ts       # Number/date formatting
│   ├── validation.ts       # Form validation schemas
│   └── constants.ts        # App constants
└── styles/
    └── globals.css         # Global styles with Tailwind
```

## Core Features Implementation

### 1. Invoice Creation Workflow
```
Step 1: Customer Selection
├── Search existing customers
├── Create new customer
└── Auto-fill customer details

Step 2: Store & Order Details
├── Select store branch
├── Auto-populate GSTIN
├── Set order type (Walk-in/Pickup/Delivery)
└── Schedule pickup/delivery dates

Step 3: Service Selection
├── Browse service categories
├── Select services with quantities
├── Choose variants for dynamic services
├── Apply minimum quantity rules
└── Real-time price calculation

Step 4: Add-ons Selection
├── Optional add-on services
├── Quantity-based pricing
└── Add to service items

Step 5: Charges & GST
├── Calculate subtotal
├── Apply discounts (flat/percentage)
├── Add express charges
├── GST calculation (inclusive/exclusive)
└── Final total computation

Step 6: Payment & Generation
├── Record payment details
├── Generate invoice PDF
├── Save to database
└── Print/share options
```

### 2. GST Calculation Engine

#### GST Exclusive Calculation
```
Base Amount = Subtotal - Discount + Express Charges
SGST = (Base Amount × GST Rate) ÷ 200
CGST = (Base Amount × GST Rate) ÷ 200
Total = Base Amount + SGST + CGST
```

#### GST Inclusive Calculation
```
Base Amount = Gross Amount ÷ (1 + GST Rate/100)
GST Amount = Gross Amount - Base Amount
SGST = GST Amount ÷ 2
CGST = GST Amount ÷ 2
Total = Gross Amount
```

### 3. Dynamic Pricing System

#### Service Types
- **Weight-based**: Laundry services (₹/kg with minimum quantity)
- **Piece-based**: Individual items (shirts, dresses)
- **Set-based**: Complete outfits (kurta pajama, suits)
- **Area-based**: Carpet cleaning (₹/sqft)
- **Custom**: Special items with case-by-case pricing

#### Variant Handling
- Base service with `is_dynamic = 1`
- Multiple variants in `service_variants` table
- Runtime price selection based on material/complexity
- Example: Saree → Cotton (₹159), Silk (₹239), Embroidered (₹299)

### 4. Data Persistence Strategy

#### Local SQLite Database
- Single file database for portability
- Embedded in Tauri application
- Automatic backup capabilities
- Manual export/import functionality

#### Audit Trail Implementation
- All CUD operations logged in `audit_log`
- Immutable historical records
- Change tracking for compliance
- User action attribution

### 5. PDF Invoice Generation

#### Invoice Layout
```
Header Section:
├── Store details with GSTIN
├── Invoice number and date
└── Customer information

Service Details:
├── Item-wise breakdown
├── HSN/SAC codes
├── Quantity and rates
└── Line item totals

Charges Summary:
├── Subtotal
├── Discounts applied
├── Express charges
├── SGST/CGST breakdown
└── Grand total

Footer:
├── Payment details
├── Terms & conditions
└── Contact information
```

## UI/UX Design Analysis

Based on the provided wireframe, the application follows a clean, desktop-focused design:

### Screen Layout Patterns
1. **Login Screen**: Simple form-based authentication with minimal fields
2. **Dashboard**: Card-based navigation with 6 main action buttons and recent activity table
3. **Data Management Screens**: Consistent table-based layouts for customers, stores, and services
4. **Form Screens**: Clean form layouts with proper field grouping and validation
5. **Invoice Wizard**: Multi-step progressive disclosure with clear navigation

### Key UI Components Required
- **Navigation Cards**: Dashboard action buttons with icons
- **Data Tables**: Sortable, searchable tables for listing data
- **Multi-step Forms**: Wizard-style forms for invoice creation
- **Modal Dialogs**: For add/edit operations
- **Search Components**: Consistent search bars across screens
- **Toggle Switches**: For boolean settings (GST inclusive/exclusive, active/inactive)
- **Summary Cards**: For displaying totals and calculations

### Responsive Design Considerations
- Desktop-first approach (matches Tauri's desktop nature)
- Proper form field sizing and spacing
- Clear visual hierarchy with consistent typography
- Accessible color scheme and contrast ratios

## Development Phases

### Phase 1: Foundation & Core Setup (Week 1-2)
- [ ] Initialize Tauri project with React + TypeScript
- [ ] Set up SQLite database with complete schema and triggers
- [ ] Create basic Rust data models and database handlers
- [ ] Implement core UI components (Layout, Navigation, Tables)
- [ ] Set up authentication system (optional for single-user)

### Phase 2: Data Management System (Week 3)
- [ ] Build customer management (CRUD operations)
- [ ] Implement store management with GSTIN validation
- [ ] Create service catalog with category hierarchy
- [ ] Add service variants for dynamic pricing
- [ ] Implement add-ons management system

### Phase 3: Invoice Creation Engine (Week 4-5)
- [ ] Build multi-step invoice wizard following wireframe design
- [ ] Implement service selection with real-time pricing
- [ ] Add GST calculation engine (inclusive/exclusive modes)
- [ ] Create invoice summary and payment recording
- [ ] Implement audit trail and data persistence

### Phase 4: Reporting & PDF Generation (Week 6)
- [ ] Design and implement PDF invoice layout
- [ ] Add print functionality and invoice preview
- [ ] Build dashboard with quick stats and recent activity
- [ ] Create reports (sales, GST summary, customer analytics)
- [ ] Implement invoice search and filtering

### Phase 5: Advanced Features & Polish (Week 7-8)
- [ ] Add backup and restore functionality
- [ ] Implement advanced search across all modules
- [ ] Performance optimization and error handling
- [ ] User experience enhancements and accessibility
- [ ] Final testing and deployment preparation

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Rust business logic and calculations
- **Integration Tests**: Database operations and API handlers
- **Component Tests**: React component functionality
- **E2E Tests**: Complete invoice workflows

### Code Quality
- **Rust**: Clippy linting, rustfmt formatting
- **TypeScript**: ESLint, Prettier
- **Git Hooks**: Pre-commit quality checks
- **Documentation**: Inline code documentation

## Deployment & Distribution

### Build Process
```bash
# Development build
npm run tauri dev

# Production build
npm run tauri build
```

### Distribution
- Single executable file (.exe/.dmg/.AppImage)
- Embedded SQLite database
- No external dependencies
- Offline-first operation

### Backup Strategy
- Manual database export/import
- File-based backup to user-selected locations
- JSON export for data portability
- Automated backup scheduling (optional)

## Security Considerations

### Data Protection
- Local data storage (no cloud dependencies)
- File system permissions for database access
- Input validation and sanitization
- SQL injection prevention

### Business Logic Security
- Immutable audit trails
- Invoice sequence number validation
- GST calculation verification
- Price snapshot integrity

## Performance Optimization

### Database
- Proper indexing on frequently queried columns
- Connection pooling for concurrent operations
- Query optimization for large datasets
- Periodic database maintenance

### Frontend
- Component memoization for expensive calculations
- Virtual scrolling for large lists
- Lazy loading of non-critical components
- Optimized bundle size

This approach provides a robust foundation for building the UCLEAN invoice generation system with proper architecture, scalability, and maintainability considerations.