import { InvoiceItem } from '@/types';

// Generic item type that works for both InvoiceItem and InvoiceFormItem
type SummaryItem = {
  id?: number;
  amount: number;
  rate: number;
  addons?: Array<{ amount: number; addonName?: string; quantity?: number; rate?: number }>;
  // Optional UI-specific properties
  serviceName?: string;
  variantName?: string;
  quantity?: number;
  originalQuantity?: number;
  // Optional DB-specific properties
  qty?: number;
}

interface InvoiceSummaryProps {
  items: SummaryItem[];
  discount: number;
  discountType: 'flat' | 'percent';
  onDiscountChange: (discount: number) => void;
  onDiscountTypeChange: (discountType: 'flat' | 'percent') => void;
  expressCharge: number;
  onExpressChargeChange: (expressCharge: number) => void;
  gstInclusive: boolean;
  onGstInclusiveChange: (gstInclusive: boolean) => void;
  onAddService?: (item: any) => void;
  error?: string;
}

export function InvoiceSummary({
  items,
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  expressCharge,
  onExpressChargeChange,
  gstInclusive,
  onGstInclusiveChange,
  onAddService,
  error
}: InvoiceSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const addonTotal = item.addons ? item.addons.reduce((addonSum, addon) => addonSum + addon.amount, 0) : 0;
    const itemTotal = item.amount + addonTotal;
    return sum + itemTotal;
  }, 0);

  const discountAmount = discountType === 'percent'
    ? (subtotal * discount) / 100
    : discount;

  const baseAmount = subtotal - discountAmount + expressCharge;

  // GST calculation (18% = 9% SGST + 9% CGST)
  const gstRate = 18;
  let sgstAmount, cgstAmount, total;

  if (gstInclusive) {
    // When GST inclusive, extract GST from base amount
    const gstTotal = (baseAmount * gstRate) / (100 + gstRate);
    sgstAmount = gstTotal / 2;
    cgstAmount = gstTotal / 2;
    total = baseAmount;
  } else {
    // When GST exclusive, add GST to base amount
    sgstAmount = (baseAmount * (gstRate / 2)) / 100;
    cgstAmount = (baseAmount * (gstRate / 2)) / 100;
    total = baseAmount + sgstAmount + cgstAmount;
  }

  const totals = {
    subtotal,
    discountAmount,
    baseAmount,
    sgstAmount,
    cgstAmount,
    total
  };

  // Quick Action handlers
  const handleQuickAction = (serviceName: string, serviceId: number, quantity: number, rate: number, _unit: string = 'kg') => {
    if (!onAddService) return;

    const quickService: Omit<InvoiceItem, 'id'> = {
      service_id: serviceId,
      description: serviceName,
      qty: quantity,
      rate,
      amount: quantity * rate,
      gst_rate: 18,
      sgst: (quantity * rate * 18) / 200,
      cgst: (quantity * rate * 18) / 200
    };

    onAddService(quickService);
  };

  return (
    <div className="card sticky top-6">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900">Invoice Summary</h3>
        <p className="text-sm text-gray-600 mt-1">
          Review your invoice details
        </p>
      </div>

      <div className="card-body space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-3">
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* Items List */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Services</h4>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No services added</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id || index} className="text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.serviceName}
                        {item.variantName && (
                          <span className="text-gray-600"> ({item.variantName})</span>
                        )}
                      </p>
                      <p className="text-gray-600">
                        {(item.quantity || item.qty || 0)} × {formatCurrency(item.rate)}
                        {item.originalQuantity && (
                          <span className="text-xs text-orange-600 block">
                            (Minimum {(item.quantity || item.qty || 0)}kg applied, you entered {item.originalQuantity}kg)
                          </span>
                        )}
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-1 pl-2 border-l-2 border-gray-200">
                          {item.addons.map((addon, addonIndex) => (
                            <p key={addonIndex} className="text-xs text-gray-600">
                              + {addon.addonName} ({addon.quantity || 0} × {formatCurrency(addon.rate || 0)})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(item.amount + (item.addons || []).reduce((sum, addon) => sum + addon.amount, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium" data-testid="subtotal">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-green-600" data-testid="discount">
                  -{formatCurrency(totals.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">SGST (9%):</span>
              <span className="font-medium" data-testid="sgst">
                {formatCurrency(totals.sgstAmount)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">CGST (9%):</span>
              <span className="font-medium" data-testid="cgst">
                {formatCurrency(totals.cgstAmount)}
              </span>
            </div>

            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900" data-testid="total">
                {formatCurrency(totals.total)}
              </span>
            </div>

            {gstInclusive && (
              <p className="text-xs text-gray-500 mt-2" data-testid="gst-note">
                * GST is included in the above prices
              </p>
            )}
          </div>
        )}

        {/* Discount Controls */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Discount</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={discount}
                onChange={(e) => onDiscountChange(Number(e.target.value))}
                placeholder="0"
                min="0"
                className="form-input text-sm"
                data-testid="discount-amount"
              />
            </div>
            <div>
              <select
                value={discountType}
                onChange={(e) => onDiscountTypeChange(e.target.value as 'flat' | 'percent')}
                className="form-input text-sm"
                data-testid="discount-type"
              >
                <option value="flat">Flat Amount</option>
                <option value="percent">Percentage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Express Delivery Controls */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Express Delivery</h4>
          <div>
            <input
              type="number"
              value={expressCharge}
              onChange={(e) => onExpressChargeChange(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="form-input text-sm"
              data-testid="express-charge"
            />
          </div>
        </div>

        {/* GST Mode Toggle */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">GST Mode:</span>
            <button
              onClick={() => onGstInclusiveChange(!gstInclusive)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                gstInclusive
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="gst-mode-toggle"
            >
              {gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleQuickAction('Wash & Fold', 2, 5, 89)}
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-wash-fold"
            >
              + Wash & Fold (5kg) - ₹445
            </button>
            <button
              onClick={() => handleQuickAction('Shirt', 30, 1, 49, 'piece')}
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-shirt"
            >
              + Shirt Dry Clean - ₹49
            </button>
            <button
              onClick={() => handleQuickAction('Saree', 53, 1, 159, 'piece')}
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-saree"
            >
              + Saree Clean - ₹159
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}