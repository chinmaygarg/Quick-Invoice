/**
 * GST Calculation Tests - TDD Approach
 * These tests define the expected behavior for GST calculations
 * before implementation.
 */

import { GSTCalculator, GSTType, GSTCalculationResult } from '@/utils/gst-calculator';

describe('GST Calculator', () => {
  let calculator: GSTCalculator;

  beforeEach(() => {
    calculator = new GSTCalculator();
  });

  describe('GST Exclusive Calculations', () => {
    test('should calculate 18% GST correctly for exclusive pricing', () => {
      const result = calculator.calculateExclusive(1000, 18);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 90,
        cgst: 90,
        igst: 0,
        totalGst: 180,
        totalAmount: 1180,
        gstType: GSTType.SGST_CGST
      });
    });

    test('should calculate 12% GST correctly for exclusive pricing', () => {
      const result = calculator.calculateExclusive(500, 12);

      expect(result).toEqual({
        baseAmount: 500,
        sgst: 30,
        cgst: 30,
        igst: 0,
        totalGst: 60,
        totalAmount: 560,
        gstType: GSTType.SGST_CGST
      });
    });

    test('should handle zero GST rate', () => {
      const result = calculator.calculateExclusive(1000, 0);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 0,
        cgst: 0,
        igst: 0,
        totalGst: 0,
        totalAmount: 1000,
        gstType: GSTType.SGST_CGST
      });
    });

    test('should round GST amounts to 2 decimal places', () => {
      const result = calculator.calculateExclusive(333.33, 18);

      expect(result.sgst).toBe(30.00);
      expect(result.cgst).toBe(30.00);
      expect(result.totalGst).toBe(60.00);
      expect(result.totalAmount).toBe(393.33);
    });
  });

  describe('GST Inclusive Calculations', () => {
    test('should calculate 18% GST correctly for inclusive pricing', () => {
      const result = calculator.calculateInclusive(1180, 18);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 90,
        cgst: 90,
        igst: 0,
        totalGst: 180,
        totalAmount: 1180,
        gstType: GSTType.SGST_CGST
      });
    });

    test('should calculate 12% GST correctly for inclusive pricing', () => {
      const result = calculator.calculateInclusive(560, 12);

      expect(result).toEqual({
        baseAmount: 500,
        sgst: 30,
        cgst: 30,
        igst: 0,
        totalGst: 60,
        totalAmount: 560,
        gstType: GSTType.SGST_CGST
      });
    });

    test('should handle zero GST rate for inclusive pricing', () => {
      const result = calculator.calculateInclusive(1000, 0);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 0,
        cgst: 0,
        igst: 0,
        totalGst: 0,
        totalAmount: 1000,
        gstType: GSTType.SGST_CGST
      });
    });
  });

  describe('IGST Calculations (Interstate)', () => {
    test('should calculate IGST for interstate transactions', () => {
      const result = calculator.calculateExclusive(1000, 18, true);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 0,
        cgst: 0,
        igst: 180,
        totalGst: 180,
        totalAmount: 1180,
        gstType: GSTType.IGST
      });
    });

    test('should calculate IGST for inclusive interstate transactions', () => {
      const result = calculator.calculateInclusive(1180, 18, true);

      expect(result).toEqual({
        baseAmount: 1000,
        sgst: 0,
        cgst: 0,
        igst: 180,
        totalGst: 180,
        totalAmount: 1180,
        gstType: GSTType.IGST
      });
    });
  });

  describe('Edge Cases and Validation', () => {
    test('should throw error for negative amounts', () => {
      expect(() => calculator.calculateExclusive(-100, 18))
        .toThrow('Amount must be positive');
    });

    test('should throw error for invalid GST rates', () => {
      expect(() => calculator.calculateExclusive(1000, -5))
        .toThrow('GST rate must be between 0 and 100');

      expect(() => calculator.calculateExclusive(1000, 101))
        .toThrow('GST rate must be between 0 and 100');
    });

    test('should throw error for zero amount with positive GST', () => {
      expect(() => calculator.calculateExclusive(0, 18))
        .toThrow('Amount must be positive');
    });

    test('should handle very small amounts correctly', () => {
      const result = calculator.calculateExclusive(0.01, 18);

      expect(result.baseAmount).toBe(0.01);
      expect(result.sgst).toBe(0.00);
      expect(result.cgst).toBe(0.00);
      expect(result.totalAmount).toBe(0.01);
    });

    test('should handle very large amounts correctly', () => {
      const result = calculator.calculateExclusive(999999.99, 18);

      expect(result.baseAmount).toBe(999999.99);
      expect(result.sgst).toBe(90000.00);
      expect(result.cgst).toBe(90000.00);
      expect(result.totalAmount).toBe(1179999.99);
    });
  });

  describe('Discount and Express Charge Integration', () => {
    test('should apply discount before GST calculation', () => {
      const result = calculator.calculateWithDiscountAndCharges({
        baseAmount: 1000,
        discountAmount: 100,
        expressCharges: 50,
        gstRate: 18,
        isInclusive: false
      });

      // (1000 - 100 + 50) = 950
      // GST = 950 * 18% = 171 (85.5 each for SGST/CGST)
      expect(result.baseAmount).toBe(950);
      expect(result.sgst).toBe(85.50);
      expect(result.cgst).toBe(85.50);
      expect(result.totalAmount).toBe(1121);
    });

    test('should handle percentage discount correctly', () => {
      const result = calculator.calculateWithDiscountAndCharges({
        baseAmount: 1000,
        discountPercent: 10,
        expressCharges: 0,
        gstRate: 18,
        isInclusive: false
      });

      // 1000 - (1000 * 10%) = 900
      // GST = 900 * 18% = 162 (81 each for SGST/CGST)
      expect(result.baseAmount).toBe(900);
      expect(result.sgst).toBe(81);
      expect(result.cgst).toBe(81);
      expect(result.totalAmount).toBe(1062);
    });
  });

  describe('Rounding Precision', () => {
    test('should round to nearest paisa (0.01)', () => {
      const result = calculator.calculateExclusive(33.33, 18);

      // 33.33 * 18% = 5.9994
      // SGST = CGST = 2.9997 -> rounds to 3.00
      expect(result.sgst).toBe(3.00);
      expect(result.cgst).toBe(3.00);
      expect(result.totalGst).toBe(6.00);
    });

    test('should handle banker\'s rounding correctly', () => {
      const result = calculator.calculateExclusive(41.67, 18);

      // 41.67 * 18% = 7.5006
      // SGST = CGST = 3.7503 -> rounds to 3.75
      expect(result.sgst).toBe(3.75);
      expect(result.cgst).toBe(3.75);
      expect(result.totalGst).toBe(7.50);
    });
  });
});