# UCLEAN - Claude Code Development Guidelines

## Project Overview
UCLEAN is a desktop invoice generation application for laundry and dry cleaning services built with Tauri, React, TypeScript, and SQLite. The system handles complex pricing structures, GST calculations, service variants, and generates GST-compliant invoices with audit trails.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Tauri (Rust) + SQLite (rusqlite)
- **Testing**: Jest + React Testing Library + Rust unit tests
- **PDF Generation**: jsPDF or Puppeteer
- **State Management**: React Context API + useReducer

## Development Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 18+
npm install -g pnpm

# Install Tauri CLI
cargo install tauri-cli
```

### Initial Setup
```bash
# Create Tauri project
cargo tauri init

# Install dependencies
pnpm install

# Development server
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Project Structure
```
uclean/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Application entry
│   │   ├── database/         # Database layer
│   │   ├── models/           # Data models
│   │   ├── handlers/         # API handlers
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utilities
│   ├── tests/                # Rust tests
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                      # React frontend
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   ├── contexts/             # State management
│   ├── types/                # TypeScript types
│   ├── utils/                # Frontend utilities
│   └── styles/               # CSS/Tailwind
├── tests/                    # E2E tests
├── docs/                     # Documentation
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Development Guidelines

### Code Standards

#### Rust Backend
```rust
// Use consistent error handling
use anyhow::{Context, Result};

// Prefer explicit types
fn calculate_gst(amount: f64, rate: f64) -> Result<(f64, f64)> {
    let sgst = (amount * rate / 200.0).round_to_decimal_places(2);
    let cgst = sgst;
    Ok((sgst, cgst))
}

// Use descriptive function names
fn insert_invoice_with_items(invoice: &Invoice, items: &[InvoiceItem]) -> Result<i64>
```

#### TypeScript Frontend
```typescript
// Use strict typing
interface Invoice {
  id: number;
  invoiceNo: string;
  customerId: number;
  total: number;
  gstInclusive: boolean;
}

// Prefer functional components with hooks
const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit }) => {
  const [invoice, setInvoice] = useState<Partial<Invoice>>({});

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
};
```

### Testing Strategy (TDD)

#### 1. Rust Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gst_exclusive_calculation() {
        let (sgst, cgst) = calculate_gst_exclusive(100.0, 18.0).unwrap();
        assert_eq!(sgst, 9.0);
        assert_eq!(cgst, 9.0);
    }

    #[test]
    fn test_minimum_quantity_validation() {
        let service = Service { min_qty: 5.0, ..Default::default() };
        assert!(validate_service_quantity(&service, 3.0).is_err());
        assert!(validate_service_quantity(&service, 5.0).is_ok());
    }
}
```

#### 2. React Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceForm } from './InvoiceForm';

describe('InvoiceForm', () => {
  test('should calculate total automatically', () => {
    render(<InvoiceForm />);

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Rate'), { target: { value: '100' } });

    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
  });

  test('should validate minimum quantity', () => {
    render(<InvoiceForm />);

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Quantity'));

    expect(screen.getByText('Minimum quantity is 5kg')).toBeInTheDocument();
  });
});
```

#### 3. Integration Tests
```rust
#[tokio::test]
async fn test_create_invoice_workflow() {
    let db = setup_test_database().await;

    // Create customer
    let customer_id = create_customer(&db, &sample_customer()).await.unwrap();

    // Create invoice
    let invoice = Invoice {
        customer_id,
        items: vec![sample_invoice_item()],
        ..Default::default()
    };

    let invoice_id = create_invoice_with_items(&db, &invoice).await.unwrap();

    // Verify totals calculated correctly
    let saved_invoice = get_invoice_by_id(&db, invoice_id).await.unwrap();
    assert_eq!(saved_invoice.total, expected_total);
}
```

## Database Guidelines

### Schema Management
- Use migrations for schema changes
- Include rollback scripts
- Seed data for development/testing
- Proper indexing for performance

### Query Patterns
```rust
// Use parameterized queries
sqlx::query!(
    "SELECT * FROM invoices WHERE customer_id = ? AND date_created >= ?",
    customer_id,
    start_date
)
.fetch_all(&db)
.await?
```

## UI/UX Guidelines

### Component Structure
```typescript
// Keep components focused and reusable
const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  categories,
  onServiceSelect,
  selectedServices
}) => {
  return (
    <div className="service-selector">
      {categories.map(category => (
        <CategoryGroup
          key={category.id}
          category={category}
          onServiceSelect={onServiceSelect}
        />
      ))}
    </div>
  );
};
```

### Accessibility
- Use semantic HTML
- Include ARIA labels
- Keyboard navigation support
- High contrast support

## Performance Guidelines

### Frontend Optimization
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load non-critical components
- Optimize bundle size

### Backend Optimization
- Use database connection pooling
- Implement proper indexing
- Cache frequently accessed data
- Optimize SQL queries

## Build & Deployment

### Development
```bash
# Frontend development
pnpm dev

# Backend development with auto-reload
pnpm tauri dev

# Run tests
pnpm test              # Frontend tests
cargo test             # Backend tests
pnpm test:e2e          # E2E tests
```

### Production Build

#### Cross-Platform Icons
```bash
# Generate platform-specific icons (.ico, .icns) from PNG
npx @tauri-apps/cli icon ./icons/icon.png
```

#### Platform-Specific Builds
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:windows     # Windows x64
npm run build:mac         # macOS x64
npm run build:mac-arm     # macOS ARM64 (M1/M2)
npm run build:linux       # Linux x64
npm run build:all         # All platforms (requires cross-compilation setup)

# Debug builds
npm run build:dev         # Debug build for current platform
```

#### GitHub Actions (Automated Cross-Platform Builds)
The project includes a GitHub Actions workflow (`.github/workflows/build.yml`) that:
- Runs tests and linting on every push/PR
- Builds for all platforms automatically on main branch
- Creates draft releases with platform-specific installers
- Supports manual workflow dispatch for custom builds

To use:
1. Push changes to main branch or create a PR
2. GitHub Actions will automatically build for Windows, macOS, and Linux
3. Check the Actions tab for build status and download artifacts

#### Manual Cross-Compilation Setup
```bash
# Add Rust targets for cross-compilation
rustup target add x86_64-pc-windows-msvc      # Windows
rustup target add x86_64-apple-darwin         # macOS x64
rustup target add aarch64-apple-darwin        # macOS ARM64
rustup target add x86_64-unknown-linux-gnu    # Linux

# Build with specific target
cargo build --release --target x86_64-pc-windows-msvc
```

## Common Commands

### Database
```bash
# Reset database
rm src-tauri/database.sqlite
pnpm tauri dev  # Will recreate with seed data

# Run migrations
cargo run --bin migrate

# Backup database
cp src-tauri/database.sqlite backups/database_$(date +%Y%m%d).sqlite
```

### Testing
```bash
# Run specific test file
cargo test test_invoice_creation
pnpm test InvoiceForm.test.tsx

# Run tests with coverage
cargo tarpaulin --out Html
pnpm test --coverage
```

### Linting & Formatting
```bash
# Rust
cargo clippy
cargo fmt

# TypeScript
pnpm lint
pnpm format
```

## Troubleshooting

### Common Issues
1. **SQLite lock errors**: Ensure proper connection management
2. **Tauri build failures**: Check Rust toolchain and dependencies
3. **PDF generation issues**: Verify jsPDF configuration for A5 layout
4. **State management**: Use React DevTools for debugging
5. **Cross-platform build issues**:
   - **Missing icons**: Run `npx @tauri-apps/cli icon ./icons/icon.png` to generate `.ico` and `.icns` files
   - **Windows builds on macOS/Linux**: Use GitHub Actions or Windows machine
   - **Target not found**: Install Rust target with `rustup target add <target-name>`
   - **GitHub Actions failures**: Check workflow logs and ensure all required secrets are set
6. **Icon generation failures**: Ensure source icon is high quality PNG (512x512 or larger)

### Debug Mode
```bash
# Enable Rust debug logs
RUST_LOG=debug pnpm tauri dev

# Enable React DevTools
NODE_ENV=development pnpm tauri dev
```

## Contributing Guidelines

1. **Follow TDD**: Write tests before implementation
2. **Code Review**: All changes require review
3. **Documentation**: Update docs for new features
4. **Type Safety**: Maintain strict TypeScript configuration
5. **Performance**: Consider performance impact of changes

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Team Conventions

- Use conventional commits: `feat:`, `fix:`, `test:`, `docs:`
- Branch naming: `feature/invoice-creation`, `fix/gst-calculation`
- PR titles should be descriptive and include issue numbers
- Include tests in all PRs
- Update CHANGELOG.md for user-facing changes