/**
 * End-to-End Invoice Creation Tests
 * Tests the complete user workflow from opening the app
 * to generating and printing invoices.
 */

import { test, expect } from '@playwright/test';

test.describe('Invoice Creation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for app to load
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible();
  });

  test('should create invoice for existing customer with minimum clicks', async ({ page }) => {
    // Step 1: Click "New Invoice" from dashboard
    await page.click('[data-testid="new-invoice-button"]');

    // Step 2: Select existing customer from recent customers
    await page.click('[data-testid="recent-customer-Mayank"]');

    // Verify customer details auto-filled
    await expect(page.locator('[data-testid="customer-name"]')).toHaveValue('Mayank');
    await expect(page.locator('[data-testid="customer-phone"]')).toHaveValue('9050284500');

    // Step 3: Add service using quick service button
    await page.click('[data-testid="quick-service-wash-fold"]');

    // Adjust quantity
    await page.fill('[data-testid="service-quantity-0"]', '6');

    // Verify real-time calculations
    await expect(page.locator('[data-testid="line-total-0"]')).toHaveText('₹354.00');
    await expect(page.locator('[data-testid="subtotal"]')).toHaveText('₹354.00');
    await expect(page.locator('[data-testid="sgst"]')).toHaveText('₹31.86');
    await expect(page.locator('[data-testid="cgst"]')).toHaveText('₹31.86');
    await expect(page.locator('[data-testid="total"]')).toHaveText('₹417.72');

    // Step 4: Select payment method
    await page.click('[data-testid="payment-cash"]');

    // Step 5: Generate invoice
    await page.click('[data-testid="generate-invoice"]');

    // Verify invoice created successfully
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Invoice created successfully');

    // Verify invoice number format
    const invoiceNo = await page.locator('[data-testid="invoice-number"]').textContent();
    expect(invoiceNo).toMatch(/^UC634-\d{4}-\d{2}-\d+$/);

    // Verify PDF generation option is available
    await expect(page.locator('[data-testid="download-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="print-invoice"]')).toBeVisible();
  });

  test('should create complex invoice with multiple services and variants', async ({ page }) => {
    // Start new invoice
    await page.click('[data-testid="new-invoice-button"]');

    // Step 1: Add new customer
    await page.click('[data-testid="add-new-customer"]');
    await page.fill('[data-testid="new-customer-name"]', 'Priya Sharma');
    await page.fill('[data-testid="new-customer-phone"]', '9876543210');
    await page.fill('[data-testid="new-customer-address"]', '123 Test Street, Delhi');
    await page.click('[data-testid="save-customer"]');

    // Step 2: Add multiple services
    // Add Wash & Fold
    await page.click('[data-testid="add-service-button"]');
    await page.selectOption('[data-testid="service-category"]', 'Laundry');
    await page.click('[data-testid="service-wash-fold"]');
    await page.fill('[data-testid="service-quantity"]', '5');
    await page.click('[data-testid="add-to-invoice"]');

    // Add Saree with variant
    await page.click('[data-testid="add-service-button"]');
    await page.selectOption('[data-testid="service-category"]', 'Dry Cleaning - Women');
    await page.click('[data-testid="service-saree"]');
    await page.selectOption('[data-testid="saree-variant"]', 'Silk/Chiffon/Georgette');
    await page.fill('[data-testid="service-quantity"]', '2');
    await page.click('[data-testid="add-to-invoice"]');

    // Add Shirt
    await page.click('[data-testid="add-service-button"]');
    await page.selectOption('[data-testid="service-category"]', 'Dry Cleaning - Men');
    await page.click('[data-testid="service-shirt"]');
    await page.fill('[data-testid="service-quantity"]', '3');
    await page.click('[data-testid="add-to-invoice"]');

    // Step 3: Add addons
    await page.click('[data-testid="addon-stain-removal"]');
    await page.fill('[data-testid="addon-quantity-stain-removal"]', '1');

    await page.click('[data-testid="addon-express-delivery"]');

    // Step 4: Apply discount
    await page.click('[data-testid="apply-discount"]');
    await page.selectOption('[data-testid="discount-type"]', 'percentage');
    await page.fill('[data-testid="discount-value"]', '10');

    // Verify complex calculations
    const expectedSubtotal = (5 * 59) + (2 * 239) + (3 * 49) + 30; // 295 + 478 + 147 + 30 = 950
    const expectedDiscount = expectedSubtotal * 0.1; // 95
    const expectedExpress = expectedSubtotal * 0.5; // 475
    const expectedBase = expectedSubtotal - expectedDiscount + expectedExpress; // 1330
    const expectedGst = expectedBase * 0.18; // 239.4
    const expectedTotal = expectedBase + expectedGst; // 1569.4

    await expect(page.locator('[data-testid="subtotal"]')).toHaveText(`₹${expectedSubtotal.toFixed(2)}`);
    await expect(page.locator('[data-testid="discount"]')).toHaveText(`₹${expectedDiscount.toFixed(2)}`);
    await expect(page.locator('[data-testid="express-charge"]')).toHaveText(`₹${expectedExpress.toFixed(2)}`);
    await expect(page.locator('[data-testid="total-gst"]')).toHaveText(`₹${expectedGst.toFixed(2)}`);
    await expect(page.locator('[data-testid="final-total"]')).toHaveText(`₹${expectedTotal.toFixed(2)}`);

    // Step 5: Record payment
    await page.click('[data-testid="payment-upi"]');
    await page.fill('[data-testid="upi-transaction-id"]', 'UPI123456789');

    // Generate invoice
    await page.click('[data-testid="generate-invoice"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle minimum quantity validation', async ({ page }) => {
    await page.click('[data-testid="new-invoice-button"]');
    await page.click('[data-testid="recent-customer-Mayank"]');

    // Try to add Wash & Fold with quantity below minimum (5kg)
    await page.click('[data-testid="add-service-button"]');
    await page.selectOption('[data-testid="service-category"]', 'Laundry');
    await page.click('[data-testid="service-wash-fold"]');
    await page.fill('[data-testid="service-quantity"]', '3');

    // Should show validation warning
    await expect(page.locator('[data-testid="min-quantity-warning"]'))
      .toContainText('Minimum quantity is 5kg. You will be charged for 5kg.');

    await page.click('[data-testid="add-to-invoice"]');

    // Verify minimum charge applied
    await expect(page.locator('[data-testid="line-quantity-0"]')).toHaveText('3 kg');
    await expect(page.locator('[data-testid="line-total-0"]')).toHaveText('₹295.00'); // 5 * 59
    await expect(page.locator('[data-testid="min-charge-note-0"]')).toContainText('Minimum 5kg charge applied');
  });

  test('should support GST inclusive/exclusive toggle', async ({ page }) => {
    await page.click('[data-testid="new-invoice-button"]');
    await page.click('[data-testid="recent-customer-Mayank"]');

    // Add service
    await page.click('[data-testid="quick-service-wash-fold"]');
    await page.fill('[data-testid="service-quantity-0"]', '5');

    // Check exclusive mode (default)
    await expect(page.locator('[data-testid="gst-mode"]')).toHaveText('GST Exclusive');
    await expect(page.locator('[data-testid="subtotal"]')).toHaveText('₹295.00');
    await expect(page.locator('[data-testid="total"]')).toHaveText('₹348.10'); // 295 * 1.18

    // Switch to inclusive mode
    await page.click('[data-testid="gst-toggle"]');

    await expect(page.locator('[data-testid="gst-mode"]')).toHaveText('GST Inclusive');
    await expect(page.locator('[data-testid="subtotal"]')).toHaveText('₹250.00'); // 295 / 1.18
    await expect(page.locator('[data-testid="total"]')).toHaveText('₹295.00'); // Same as original
    await expect(page.locator('[data-testid="gst-note"]')).toContainText('GST is included in the above prices');
  });

  test('should provide smart suggestions and auto-completion', async ({ page }) => {
    await page.click('[data-testid="new-invoice-button"]');

    // Test customer autocomplete
    await page.fill('[data-testid="customer-search"]', 'May');
    await expect(page.locator('[data-testid="customer-suggestion-Mayank"]')).toBeVisible();
    await page.click('[data-testid="customer-suggestion-Mayank"]');

    // Test service suggestions based on customer history
    await expect(page.locator('[data-testid="suggestion-usual-order"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggestion-usual-order"]'))
      .toContainText('Repeat last order: Wash & Fold (6kg)');

    await page.click('[data-testid="suggestion-usual-order"]');

    // Verify service auto-added
    await expect(page.locator('[data-testid="service-item-0"]')).toContainText('Wash & Fold');
    await expect(page.locator('[data-testid="service-quantity-0"]')).toHaveValue('6');

    // Test bundle suggestions
    await expect(page.locator('[data-testid="bundle-suggestion"]'))
      .toContainText('Add Express Delivery for ₹147.50?');

    await page.click('[data-testid="accept-bundle-suggestion"]');
    await expect(page.locator('[data-testid="express-charge"]')).toHaveText('₹147.50');
  });

  test('should handle express delivery workflow', async ({ page }) => {
    await page.click('[data-testid="new-invoice-button"]');
    await page.click('[data-testid="recent-customer-Mayank"]');

    // Add service
    await page.click('[data-testid="quick-service-wash-fold"]');
    await page.fill('[data-testid="service-quantity-0"]', '5');

    // Enable express delivery
    await page.click('[data-testid="express-delivery-toggle"]');

    // Should show express delivery warning and charges
    await expect(page.locator('[data-testid="express-warning"]'))
      .toContainText('Express delivery charges 50% extra');

    await expect(page.locator('[data-testid="express-charge"]')).toHaveText('₹147.50'); // 50% of 295

    // Set early delivery date
    await page.fill('[data-testid="delivery-date"]', '2025-01-27'); // Tomorrow
    await page.selectOption('[data-testid="delivery-time"]', '7 PM - 9 PM');

    // Verify total with express charges
    const baseAmount = 295;
    const expressCharge = baseAmount * 0.5;
    const totalBeforeGst = baseAmount + expressCharge; // 442.5
    const gst = totalBeforeGst * 0.18; // 79.65
    const finalTotal = totalBeforeGst + gst; // 522.15

    await expect(page.locator('[data-testid="total"]')).toHaveText(`₹${finalTotal.toFixed(2)}`);
  });

  test('should generate and download PDF invoice', async ({ page }) => {
    // Create a simple invoice
    await page.click('[data-testid="new-invoice-button"]');
    await page.click('[data-testid="recent-customer-Mayank"]');
    await page.click('[data-testid="quick-service-wash-fold"]');
    await page.fill('[data-testid="service-quantity-0"]', '5');
    await page.click('[data-testid="payment-cash"]');
    await page.click('[data-testid="generate-invoice"]');

    // Wait for invoice creation
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Test PDF download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/^UC634-\d{4}-\d{2}-\d+\.pdf$/);

    // Test print functionality
    await page.click('[data-testid="print-invoice"]');

    // Should open print dialog (in real browser)
    // In test environment, we just verify the print function was called
    await expect(page.locator('[data-testid="print-status"]')).toContainText('Print job sent');
  });

  test('should navigate through invoice list and search', async ({ page }) => {
    // Go to invoice list
    await page.click('[data-testid="view-invoices"]');

    // Wait for invoices to load
    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();

    // Test search by customer name
    await page.fill('[data-testid="invoice-search"]', 'Mayank');
    await page.press('[data-testid="invoice-search"]', 'Enter');

    // Should show filtered results
    await expect(page.locator('[data-testid="invoice-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="invoice-customer-0"]')).toHaveText('Mayank');

    // Test date range filter
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-12-31');
    await page.click('[data-testid="apply-filter"]');

    // Test status filter
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    await expect(page.locator('[data-testid="invoice-status"]')).toHaveText('Pending');

    // Test invoice details view
    await page.click('[data-testid="invoice-row-0"]');
    await expect(page.locator('[data-testid="invoice-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-detail-customer"]')).toContainText('Mayank');

    // Test edit invoice (if status allows)
    if (await page.locator('[data-testid="edit-invoice"]').isVisible()) {
      await page.click('[data-testid="edit-invoice"]');
      await expect(page.locator('[data-testid="invoice-form"]')).toBeVisible();
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    await page.click('[data-testid="new-invoice-button"]');

    // Test validation errors
    await page.click('[data-testid="generate-invoice"]');

    await expect(page.locator('[data-testid="error-customer-required"]'))
      .toContainText('Customer is required');

    // Add customer but no services
    await page.click('[data-testid="recent-customer-Mayank"]');
    await page.click('[data-testid="generate-invoice"]');

    await expect(page.locator('[data-testid="error-services-required"]'))
      .toContainText('At least one service is required');

    // Test network error handling (mock offline)
    await page.route('**/api/**', route => route.abort());

    await page.click('[data-testid="quick-service-wash-fold"]');
    await page.click('[data-testid="generate-invoice"]');

    await expect(page.locator('[data-testid="error-network"]'))
      .toContainText('Unable to save invoice. Please check your connection.');

    // Test retry functionality
    await page.unroute('**/api/**');
    await page.click('[data-testid="retry-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+N for new invoice
    await page.keyboard.press('Control+n');
    await expect(page.locator('[data-testid="invoice-form"]')).toBeVisible();

    // Test Ctrl+F for customer search focus
    await page.keyboard.press('Control+f');
    await expect(page.locator('[data-testid="customer-search"]')).toBeFocused();

    // Test Enter to add service
    await page.click('[data-testid="recent-customer-Mayank"]');
    await page.click('[data-testid="add-service-button"]');
    await page.selectOption('[data-testid="service-category"]', 'Laundry');
    await page.click('[data-testid="service-wash-fold"]');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="service-item-0"]')).toBeVisible();

    // Test F12 to generate invoice
    await page.keyboard.press('F12');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});