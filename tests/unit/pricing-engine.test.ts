/**
 * Pricing Engine Tests - TDD Approach
 * Tests for dynamic pricing calculations based on service types,
 * quantities, weights, and minimum requirements.
 */

import { PricingEngine, ServiceType, PricingResult } from '@/utils/pricing-engine';

describe('Pricing Engine', () => {
  let pricingEngine: PricingEngine;

  beforeEach(() => {
    pricingEngine = new PricingEngine();
  });

  describe('Weight-based Pricing (Laundry Services)', () => {
    test('should calculate price for wash & fold service with minimum 5kg', () => {
      const service = {
        id: 1,
        name: 'Wash & Fold',
        type: ServiceType.WEIGHT_BASED,
        basePrice: 59,
        unit: 'kg',
        minQuantity: 5,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 6);

      expect(result).toEqual({
        service,
        quantity: 6,
        rate: 59,
        lineTotal: 354, // 6 * 59
        meetsMinimum: true,
        minimumCharge: 0
      });
    });

    test('should apply minimum charge when quantity is below minimum', () => {
      const service = {
        id: 1,
        name: 'Wash & Fold',
        type: ServiceType.WEIGHT_BASED,
        basePrice: 59,
        unit: 'kg',
        minQuantity: 5,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 3);

      expect(result).toEqual({
        service,
        quantity: 3,
        rate: 59,
        lineTotal: 295, // 5 * 59 (minimum applies)
        meetsMinimum: false,
        minimumCharge: 118 // (5-3) * 59
      });
    });

    test('should handle premium laundry pricing', () => {
      const service = {
        id: 2,
        name: 'Premium Laundry',
        type: ServiceType.WEIGHT_BASED,
        basePrice: 159,
        unit: 'kg',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 2.5);

      expect(result).toEqual({
        service,
        quantity: 2.5,
        rate: 159,
        lineTotal: 397.5, // 2.5 * 159
        meetsMinimum: true,
        minimumCharge: 0
      });
    });
  });

  describe('Piece-based Pricing (Individual Items)', () => {
    test('should calculate price for shirt dry cleaning', () => {
      const service = {
        id: 3,
        name: 'Shirt',
        type: ServiceType.PIECE_BASED,
        basePrice: 49,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 3);

      expect(result).toEqual({
        service,
        quantity: 3,
        rate: 49,
        lineTotal: 147, // 3 * 49
        meetsMinimum: true,
        minimumCharge: 0
      });
    });

    test('should calculate price for t-shirt', () => {
      const service = {
        id: 4,
        name: 'T-Shirt',
        type: ServiceType.PIECE_BASED,
        basePrice: 25,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 5);

      expect(result).toEqual({
        service,
        quantity: 5,
        rate: 25,
        lineTotal: 125, // 5 * 25
        meetsMinimum: true,
        minimumCharge: 0
      });
    });
  });

  describe('Set-based Pricing (Complete Outfits)', () => {
    test('should calculate price for suit 2-piece', () => {
      const service = {
        id: 5,
        name: 'Suit 2 Pc',
        type: ServiceType.SET_BASED,
        basePrice: 189,
        unit: 'set',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 2);

      expect(result).toEqual({
        service,
        quantity: 2,
        rate: 189,
        lineTotal: 378, // 2 * 189
        meetsMinimum: true,
        minimumCharge: 0
      });
    });

    test('should calculate price for kurta pajama set', () => {
      const service = {
        id: 6,
        name: 'Kurta Pajama (Light)',
        type: ServiceType.SET_BASED,
        basePrice: 119,
        unit: 'set',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 1);

      expect(result).toEqual({
        service,
        quantity: 1,
        rate: 119,
        lineTotal: 119, // 1 * 119
        meetsMinimum: true,
        minimumCharge: 0
      });
    });
  });

  describe('Area-based Pricing (Carpet Cleaning)', () => {
    test('should calculate price for carpet cleaning per sqft', () => {
      const service = {
        id: 7,
        name: 'Carpet Cleaning',
        type: ServiceType.AREA_BASED,
        basePrice: 20,
        unit: 'sqft',
        minQuantity: 0,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 25.5);

      expect(result).toEqual({
        service,
        quantity: 25.5,
        rate: 20,
        lineTotal: 510, // 25.5 * 20
        meetsMinimum: true,
        minimumCharge: 0
      });
    });
  });

  describe('Dynamic Pricing with Variants', () => {
    test('should calculate price for saree with cotton variant', () => {
      const baseService = {
        id: 8,
        name: 'Saree',
        type: ServiceType.PIECE_BASED,
        basePrice: 159,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18,
        isDynamic: true
      };

      const variant = {
        id: 1,
        serviceId: 8,
        name: 'Cotton/Synthetic',
        basePrice: 159,
        gstRate: 18
      };

      const result = pricingEngine.calculatePriceWithVariant(baseService, variant, 2);

      expect(result).toEqual({
        service: baseService,
        variant,
        quantity: 2,
        rate: 159,
        lineTotal: 318, // 2 * 159
        meetsMinimum: true,
        minimumCharge: 0
      });
    });

    test('should calculate price for saree with silk variant', () => {
      const baseService = {
        id: 8,
        name: 'Saree',
        type: ServiceType.PIECE_BASED,
        basePrice: 159,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18,
        isDynamic: true
      };

      const variant = {
        id: 2,
        serviceId: 8,
        name: 'Silk/Chiffon/Georgette',
        basePrice: 239,
        gstRate: 18
      };

      const result = pricingEngine.calculatePriceWithVariant(baseService, variant, 1);

      expect(result).toEqual({
        service: baseService,
        variant,
        quantity: 1,
        rate: 239,
        lineTotal: 239, // 1 * 239
        meetsMinimum: true,
        minimumCharge: 0
      });
    });

    test('should calculate price for embroidered saree variant', () => {
      const baseService = {
        id: 8,
        name: 'Saree',
        type: ServiceType.PIECE_BASED,
        basePrice: 159,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18,
        isDynamic: true
      };

      const variant = {
        id: 3,
        serviceId: 8,
        name: 'Embroidered/Heavy',
        basePrice: 299,
        gstRate: 18
      };

      const result = pricingEngine.calculatePriceWithVariant(baseService, variant, 3);

      expect(result).toEqual({
        service: baseService,
        variant,
        quantity: 3,
        rate: 299,
        lineTotal: 897, // 3 * 299
        meetsMinimum: true,
        minimumCharge: 0
      });
    });
  });

  describe('Add-on Pricing', () => {
    test('should calculate addon prices correctly', () => {
      const addons = [
        { id: 1, name: 'Stain Removal', price: 30, unit: 'stain', gstRate: 18 },
        { id: 2, name: 'Express Delivery', price: 50, unit: 'order', gstRate: 18 },
        { id: 3, name: 'Softener', price: 5, unit: 'kg', gstRate: 18 }
      ];

      const addonQuantities = [
        { addonId: 1, quantity: 2 }, // 2 stains
        { addonId: 2, quantity: 1 }, // 1 express delivery
        { addonId: 3, quantity: 5 }  // 5 kg softener
      ];

      const result = pricingEngine.calculateAddonPricing(addons, addonQuantities);

      expect(result).toEqual([
        { addon: addons[0], quantity: 2, total: 60 },  // 2 * 30
        { addon: addons[1], quantity: 1, total: 50 },  // 1 * 50
        { addon: addons[2], quantity: 5, total: 25 }   // 5 * 5
      ]);

      expect(result.reduce((sum, item) => sum + item.total, 0)).toBe(135);
    });

    test('should handle weight-based addons correctly', () => {
      const addons = [
        { id: 1, name: 'Moth Proofing', price: 20, unit: 'kg', gstRate: 18 },
        { id: 2, name: 'Antiseptic', price: 10, unit: 'kg', gstRate: 18 }
      ];

      const addonQuantities = [
        { addonId: 1, quantity: 3.5 }, // 3.5 kg
        { addonId: 2, quantity: 6 }    // 6 kg
      ];

      const result = pricingEngine.calculateAddonPricing(addons, addonQuantities);

      expect(result).toEqual([
        { addon: addons[0], quantity: 3.5, total: 70 },  // 3.5 * 20
        { addon: addons[1], quantity: 6, total: 60 }     // 6 * 10
      ]);
    });
  });

  describe('Express Delivery Pricing', () => {
    test('should calculate 50% extra for express delivery', () => {
      const service = {
        id: 1,
        name: 'Wash & Fold',
        type: ServiceType.WEIGHT_BASED,
        basePrice: 59,
        unit: 'kg',
        minQuantity: 5,
        gstRate: 18
      };

      const normalResult = pricingEngine.calculatePrice(service, 6);
      const expressResult = pricingEngine.calculatePriceWithExpress(service, 6);

      expect(expressResult.lineTotal).toBe(normalResult.lineTotal * 1.5);
      expect(expressResult.expressCharge).toBe(normalResult.lineTotal * 0.5);
      expect(expressResult.baseAmount).toBe(normalResult.lineTotal);
    });
  });

  describe('Validation and Edge Cases', () => {
    test('should throw error for negative quantities', () => {
      const service = {
        id: 1,
        name: 'Shirt',
        type: ServiceType.PIECE_BASED,
        basePrice: 49,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18
      };

      expect(() => pricingEngine.calculatePrice(service, -1))
        .toThrow('Quantity must be positive');
    });

    test('should throw error for zero quantity', () => {
      const service = {
        id: 1,
        name: 'Shirt',
        type: ServiceType.PIECE_BASED,
        basePrice: 49,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18
      };

      expect(() => pricingEngine.calculatePrice(service, 0))
        .toThrow('Quantity must be positive');
    });

    test('should handle fractional quantities for weight-based services', () => {
      const service = {
        id: 1,
        name: 'Wash & Fold',
        type: ServiceType.WEIGHT_BASED,
        basePrice: 59,
        unit: 'kg',
        minQuantity: 5,
        gstRate: 18
      };

      const result = pricingEngine.calculatePrice(service, 5.75);

      expect(result.quantity).toBe(5.75);
      expect(result.lineTotal).toBe(339.25); // 5.75 * 59
    });

    test('should not allow fractional quantities for piece-based services', () => {
      const service = {
        id: 1,
        name: 'Shirt',
        type: ServiceType.PIECE_BASED,
        basePrice: 49,
        unit: 'piece',
        minQuantity: 0,
        gstRate: 18
      };

      expect(() => pricingEngine.calculatePrice(service, 2.5))
        .toThrow('Piece-based services must have whole number quantities');
    });
  });

  describe('Bulk Discount Rules', () => {
    test('should apply 10% discount for orders above ₹2000', () => {
      const services = [
        { baseAmount: 1500, gstRate: 18 },
        { baseAmount: 800, gstRate: 18 }
      ];

      const totalAmount = services.reduce((sum, s) => sum + s.baseAmount, 0); // 2300
      const discount = pricingEngine.calculateBulkDiscount(totalAmount);

      expect(discount).toEqual({
        discountPercent: 10,
        discountAmount: 230, // 10% of 2300
        finalAmount: 2070
      });
    });

    test('should apply 5% discount for orders between ₹1000-₹2000', () => {
      const services = [
        { baseAmount: 800, gstRate: 18 },
        { baseAmount: 400, gstRate: 18 }
      ];

      const totalAmount = services.reduce((sum, s) => sum + s.baseAmount, 0); // 1200
      const discount = pricingEngine.calculateBulkDiscount(totalAmount);

      expect(discount).toEqual({
        discountPercent: 5,
        discountAmount: 60, // 5% of 1200
        finalAmount: 1140
      });
    });

    test('should not apply discount for orders below ₹1000', () => {
      const services = [
        { baseAmount: 500, gstRate: 18 },
        { baseAmount: 300, gstRate: 18 }
      ];

      const totalAmount = services.reduce((sum, s) => sum + s.baseAmount, 0); // 800
      const discount = pricingEngine.calculateBulkDiscount(totalAmount);

      expect(discount).toEqual({
        discountPercent: 0,
        discountAmount: 0,
        finalAmount: 800
      });
    });
  });
});