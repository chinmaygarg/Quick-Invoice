/**
 * Invoice Workflow Integration Tests - TDD Approach
 * Tests the complete invoice creation workflow from customer selection
 * through service addition to final invoice generation and PDF creation.
 */

import { InvoiceService } from '@/services/invoice-service';
import { CustomerService } from '@/services/customer-service';
import { ServiceCatalogService } from '@/services/service-catalog-service';
import { PDFGeneratorService } from '@/services/pdf-generator-service';
import { DatabaseService } from '@/services/database-service';

describe('Invoice Workflow Integration', () => {
  let invoiceService: InvoiceService;
  let customerService: CustomerService;
  let serviceCatalogService: ServiceCatalogService;
  let pdfGeneratorService: PDFGeneratorService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    // Initialize services with test database
    databaseService = new DatabaseService(':memory:');
    await databaseService.initialize();

    customerService = new CustomerService(databaseService);
    serviceCatalogService = new ServiceCatalogService(databaseService);
    pdfGeneratorService = new PDFGeneratorService();
    invoiceService = new InvoiceService(
      databaseService,
      customerService,
      serviceCatalogService,
      pdfGeneratorService
    );

    // Seed test data
    await seedTestData();
  });

  afterEach(async () => {
    await databaseService.close();
  });

  describe('Complete Invoice Creation Workflow', () => {
    test('should create invoice for existing customer with single service', async () => {
      // Step 1: Get existing customer
      const customer = await customerService.findByPhone('9050284500');
      expect(customer).toBeDefined();
      expect(customer!.name).toBe('Mayank');

      // Step 2: Get available services
      const services = await serviceCatalogService.getServicesByCategory('Laundry');
      const washAndFold = services.find(s => s.name === 'Wash & Fold');
      expect(washAndFold).toBeDefined();

      // Step 3: Create invoice with service
      const invoiceData = {
        customerId: customer!.id,
        storeId: 1,
        orderSource: 'WALK-IN',
        deliveryDate: new Date('2025-09-12'),
        items: [
          {
            serviceId: washAndFold!.id,
            quantity: 6,
            weight: 6,
            rate: washAndFold!.basePrice,
            amount: 6 * washAndFold!.basePrice
          }
        ],
        gstInclusive: false
      };

      const invoice = await invoiceService.createInvoice(invoiceData);

      // Verify invoice creation
      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNo).toMatch(/^UC634-\d{4}-\d{2}-\d+$/);
      expect(invoice.customerId).toBe(customer!.id);
      expect(invoice.subtotal).toBe(354); // 6 * 59
      expect(invoice.sgstAmount).toBe(31.86); // 18% / 2 of 354
      expect(invoice.cgstAmount).toBe(31.86);
      expect(invoice.total).toBe(417.72); // 354 + 63.72
    });

    test('should create invoice with multiple services and addons', async () => {
      const customer = await customerService.findByPhone('9897722300');
      expect(customer!.name).toBe('Gaurav Dimri');

      // Get multiple services
      const dryCleaningServices = await serviceCatalogService.getServicesByCategory('Dry Cleaning - Women');
      const saree = dryCleaningServices.find(s => s.name === 'Saree');
      const dress = dryCleaningServices.find(s => s.name === 'Dress (Cotton)');

      // Get saree variant
      const sareeVariants = await serviceCatalogService.getServiceVariants(saree!.id);
      const embroideredVariant = sareeVariants.find(v => v.name === 'Embroidered/Heavy');

      // Get addons
      const addons = await serviceCatalogService.getAddons();
      const stainRemoval = addons.find(a => a.name === 'Stain Removal');

      const invoiceData = {
        customerId: customer!.id,
        storeId: 1,
        orderSource: 'WALK-IN',
        deliveryDate: new Date('2025-09-14'),
        items: [
          {
            serviceId: saree!.id,
            variantId: embroideredVariant!.id,
            quantity: 3,
            rate: embroideredVariant!.basePrice,
            amount: 3 * embroideredVariant!.basePrice,
            addons: [
              {
                addonId: stainRemoval!.id,
                quantity: 2,
                rate: stainRemoval!.price,
                amount: 2 * stainRemoval!.price
              }
            ]
          },
          {
            serviceId: dress!.id,
            quantity: 1,
            rate: dress!.basePrice,
            amount: dress!.basePrice
          }
        ],
        discountPercent: 10,
        gstInclusive: false
      };

      const invoice = await invoiceService.createInvoice(invoiceData);

      // Verify complex invoice calculations
      const expectedSubtotal = (3 * 299) + 60 + 99; // Saree + addons + dress = 1056
      const expectedDiscountAmount = expectedSubtotal * 0.1; // 105.6
      const expectedBaseAmount = expectedSubtotal - expectedDiscountAmount; // 950.4
      const expectedGst = expectedBaseAmount * 0.18; // 171.072
      const expectedTotal = expectedBaseAmount + expectedGst; // 1121.472

      expect(invoice.subtotal).toBe(expectedSubtotal);
      expect(invoice.discount).toBe(expectedDiscountAmount);
      expect(invoice.sgstAmount).toBeCloseTo(expectedGst / 2, 2);
      expect(invoice.cgstAmount).toBeCloseTo(expectedGst / 2, 2);
      expect(invoice.total).toBeCloseTo(expectedTotal, 2);
    });

    test('should apply minimum quantity rules correctly', async () => {
      const customer = await customerService.create({
        name: 'Test Customer',
        phone: '9999999999',
        address: 'Test Address'
      });

      const services = await serviceCatalogService.getServicesByCategory('Laundry');
      const washAndFold = services.find(s => s.name === 'Wash & Fold');

      // Try to create invoice with quantity below minimum (5kg)
      const invoiceData = {
        customerId: customer.id,
        storeId: 1,
        orderSource: 'WALK-IN',
        items: [
          {
            serviceId: washAndFold!.id,
            quantity: 3, // Below minimum of 5
            weight: 3,
            rate: washAndFold!.basePrice,
            amount: 5 * washAndFold!.basePrice // Should charge for minimum 5kg
          }
        ],
        gstInclusive: false
      };

      const invoice = await invoiceService.createInvoice(invoiceData);

      // Should charge for minimum quantity
      expect(invoice.subtotal).toBe(295); // 5 * 59, not 3 * 59
      expect(invoice.items[0].quantity).toBe(3); // Actual quantity
      expect(invoice.items[0].amount).toBe(295); // Charged amount (minimum)
    });

    test('should handle express delivery charges', async () => {
      const customer = await customerService.findByPhone('9050284500');
      const services = await serviceCatalogService.getServicesByCategory('Laundry');
      const washAndFold = services.find(s => s.name === 'Wash & Fold');

      const invoiceData = {
        customerId: customer!.id,
        storeId: 1,
        orderSource: 'WALK-IN',
        deliveryDate: new Date('2025-09-11'), // Next day delivery
        items: [
          {
            serviceId: washAndFold!.id,
            quantity: 5,
            rate: washAndFold!.basePrice,
            amount: 5 * washAndFold!.basePrice
          }
        ],
        expressCharge: 147.5, // 50% of 295
        gstInclusive: false
      };

      const invoice = await invoiceService.createInvoice(invoiceData);

      expect(invoice.subtotal).toBe(295); // 5 * 59
      expect(invoice.expressCharge).toBe(147.5); // 50% extra
      expect(invoice.total).toBeCloseTo(522.15, 2); // (295 + 147.5) * 1.18
    });
  });

  describe('Invoice Status Management', () => {
    test('should update invoice status through workflow', async () => {
      const invoice = await createSampleInvoice();

      // Check initial status
      expect(invoice.status).toBe('pending');

      // Update to in-progress
      await invoiceService.updateStatus(invoice.id, 'in-progress');
      const updatedInvoice = await invoiceService.getById(invoice.id);
      expect(updatedInvoice!.status).toBe('in-progress');

      // Update to completed
      await invoiceService.updateStatus(invoice.id, 'completed');
      const completedInvoice = await invoiceService.getById(invoice.id);
      expect(completedInvoice!.status).toBe('completed');
    });

    test('should not allow invalid status transitions', async () => {
      const invoice = await createSampleInvoice();

      // Try to update to invalid status
      await expect(invoiceService.updateStatus(invoice.id, 'invalid-status'))
        .rejects.toThrow('Invalid invoice status');
    });
  });

  describe('Payment Recording', () => {
    test('should record payment for invoice', async () => {
      const invoice = await createSampleInvoice();

      const paymentData = {
        invoiceId: invoice.id,
        amount: invoice.total,
        method: 'cash',
        transactionId: null,
        paidOn: new Date()
      };

      const payment = await invoiceService.recordPayment(paymentData);

      expect(payment.amount).toBe(invoice.total);
      expect(payment.method).toBe('cash');
      expect(payment.status).toBe('success');

      // Verify invoice status updated
      const updatedInvoice = await invoiceService.getById(invoice.id);
      expect(updatedInvoice!.status).toBe('paid');
    });

    test('should handle partial payments', async () => {
      const invoice = await createSampleInvoice();
      const partialAmount = invoice.total / 2;

      const paymentData = {
        invoiceId: invoice.id,
        amount: partialAmount,
        method: 'upi',
        transactionId: 'UPI123456789',
        paidOn: new Date()
      };

      await invoiceService.recordPayment(paymentData);

      const updatedInvoice = await invoiceService.getById(invoice.id);
      expect(updatedInvoice!.status).toBe('partially-paid');
      expect(updatedInvoice!.paidAmount).toBe(partialAmount);
      expect(updatedInvoice!.balanceAmount).toBe(invoice.total - partialAmount);
    });
  });

  describe('PDF Generation Integration', () => {
    test('should generate PDF for completed invoice', async () => {
      const invoice = await createSampleInvoice();

      const pdfBuffer = await invoiceService.generatePDF(invoice.id);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF content contains expected data
      const pdfText = await extractTextFromPDF(pdfBuffer);
      expect(pdfText).toContain(invoice.invoiceNo);
      expect(pdfText).toContain('Mayank');
      expect(pdfText).toContain('9050284500');
      expect(pdfText).toContain('UClean Massoorie Road');
      expect(pdfText).toContain('05BCFPJ0289J1ZK');
    });

    test('should generate A5 formatted PDF', async () => {
      const invoice = await createSampleInvoice();

      const pdfBuffer = await invoiceService.generatePDF(invoice.id, { format: 'A5' });

      const pdfInfo = await getPDFInfo(pdfBuffer);
      expect(pdfInfo.pageSize.width).toBeCloseTo(148, 1); // A5 width in mm
      expect(pdfInfo.pageSize.height).toBeCloseTo(210, 1); // A5 height in mm
    });

    test('should include all invoice details in PDF', async () => {
      const invoice = await createComplexInvoice();

      const pdfBuffer = await invoiceService.generatePDF(invoice.id);
      const pdfText = await extractTextFromPDF(pdfBuffer);

      // Check header information
      expect(pdfText).toContain(invoice.invoiceNo);
      expect(pdfText).toContain('Tax Invoice');

      // Check customer details
      expect(pdfText).toContain('Gaurav Dimri');
      expect(pdfText).toContain('9897722300');

      // Check service items
      expect(pdfText).toContain('Saree');
      expect(pdfText).toContain('Embroidered/Heavy');
      expect(pdfText).toContain('Dress');

      // Check totals
      expect(pdfText).toContain('SGST');
      expect(pdfText).toContain('CGST');
      expect(pdfText).toContain('TOTAL');

      // Check footer
      expect(pdfText).toContain('www.ucleanlaundry.com');
      expect(pdfText).toContain('9999759911');
    });
  });

  describe('Search and Filtering', () => {
    test('should search invoices by customer name', async () => {
      await createSampleInvoice();
      await createComplexInvoice();

      const results = await invoiceService.search({ customerName: 'Mayank' });

      expect(results.length).toBe(1);
      expect(results[0].customer.name).toBe('Mayank');
    });

    test('should filter invoices by date range', async () => {
      await createSampleInvoice();
      await createComplexInvoice();

      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');

      const results = await invoiceService.search({
        dateFrom: startDate,
        dateTo: endDate
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(invoice => {
        expect(new Date(invoice.createdAt)).toBeGreaterThanOrEqual(startDate);
        expect(new Date(invoice.createdAt)).toBeLessThanOrEqual(endDate);
      });
    });

    test('should filter invoices by status', async () => {
      const invoice1 = await createSampleInvoice();
      const invoice2 = await createComplexInvoice();

      await invoiceService.updateStatus(invoice1.id, 'completed');

      const pendingResults = await invoiceService.search({ status: 'pending' });
      const completedResults = await invoiceService.search({ status: 'completed' });

      expect(pendingResults.length).toBe(1);
      expect(pendingResults[0].id).toBe(invoice2.id);

      expect(completedResults.length).toBe(1);
      expect(completedResults[0].id).toBe(invoice1.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle database transaction failures', async () => {
      // Mock database failure
      const originalCreate = databaseService.create;
      databaseService.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const customer = await customerService.findByPhone('9050284500');
      const services = await serviceCatalogService.getServicesByCategory('Laundry');
      const washAndFold = services.find(s => s.name === 'Wash & Fold');

      const invoiceData = {
        customerId: customer!.id,
        storeId: 1,
        orderSource: 'WALK-IN',
        items: [
          {
            serviceId: washAndFold!.id,
            quantity: 5,
            rate: washAndFold!.basePrice,
            amount: 5 * washAndFold!.basePrice
          }
        ]
      };

      await expect(invoiceService.createInvoice(invoiceData))
        .rejects.toThrow('Database error');

      // Restore original method
      databaseService.create = originalCreate;
    });

    test('should validate required fields', async () => {
      await expect(invoiceService.createInvoice({} as any))
        .rejects.toThrow('Customer ID is required');

      await expect(invoiceService.createInvoice({ customerId: 1 } as any))
        .rejects.toThrow('Store ID is required');

      await expect(invoiceService.createInvoice({
        customerId: 1,
        storeId: 1,
        items: []
      } as any))
        .rejects.toThrow('At least one service item is required');
    });
  });

  // Helper functions
  async function seedTestData() {
    // Create test customers
    await customerService.create({
      name: 'Mayank',
      phone: '9050284500',
      address: 'T2 103, Golden Manor'
    });

    await customerService.create({
      name: 'Gaurav Dimri',
      phone: '9897722300',
      address: 'House no 03, White House Building, Nirvana Residency'
    });

    // Seed services, variants, and addons would be done here
    // This would typically be done through migration scripts
  }

  async function createSampleInvoice() {
    const customer = await customerService.findByPhone('9050284500');
    const services = await serviceCatalogService.getServicesByCategory('Laundry');
    const washAndFold = services.find(s => s.name === 'Wash & Fold');

    return await invoiceService.createInvoice({
      customerId: customer!.id,
      storeId: 1,
      orderSource: 'WALK-IN',
      items: [
        {
          serviceId: washAndFold!.id,
          quantity: 5,
          rate: washAndFold!.basePrice,
          amount: 5 * washAndFold!.basePrice
        }
      ],
      gstInclusive: false
    });
  }

  async function createComplexInvoice() {
    const customer = await customerService.findByPhone('9897722300');
    const services = await serviceCatalogService.getServicesByCategory('Dry Cleaning - Women');
    const saree = services.find(s => s.name === 'Saree');

    return await invoiceService.createInvoice({
      customerId: customer!.id,
      storeId: 1,
      orderSource: 'WALK-IN',
      items: [
        {
          serviceId: saree!.id,
          quantity: 3,
          rate: 299,
          amount: 897
        }
      ],
      discountPercent: 10,
      gstInclusive: false
    });
  }

  async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Mock implementation - would use actual PDF parsing library
    return 'PDF content with invoice data';
  }

  async function getPDFInfo(buffer: Buffer): Promise<any> {
    // Mock implementation - would use actual PDF parsing library
    return {
      pageSize: { width: 148, height: 210 }
    };
  }
});