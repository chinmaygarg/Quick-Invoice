import React from 'react';

interface InvoiceItem {
  id?: number;
  serviceName: string;
  variantName?: string;
  quantity: number;
  rate: number;
  amount: number;
  addons: InvoiceItemAddon[];
}

interface InvoiceItemAddon {
  addonName: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  baseAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  total: number;
}

interface InvoiceSummaryProps {
  items: InvoiceItem[];
  totals: InvoiceTotals;
  gstInclusive: boolean;
  customerName: string;
}

export function InvoiceSummary({ items, totals, gstInclusive, customerName }: InvoiceSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
        {/* Customer Info */}
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Customer</h4>
          <p className="text-sm text-gray-900">{customerName}</p>
        </div>

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
                        {item.quantity} × {formatCurrency(item.rate)}
                      </p>
                      {item.addons.length > 0 && (
                        <div className="mt-1 pl-2 border-l-2 border-gray-200">
                          {item.addons.map((addon, addonIndex) => (
                            <p key={addonIndex} className="text-xs text-gray-600">
                              + {addon.addonName} ({addon.quantity} × {formatCurrency(addon.rate)})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(item.amount + item.addons.reduce((sum, addon) => sum + addon.amount, 0))}
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

        {/* GST Mode Indicator */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">GST Mode:</span>
            <span className="text-sm font-medium" data-testid="gst-mode">
              {gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-wash-fold"
            >
              + Wash & Fold (5kg)
            </button>
            <button
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-shirt"
            >
              + Shirt Dry Clean
            </button>
            <button
              className="w-full btn btn-secondary btn-sm"
              data-testid="quick-service-saree"
            >
              + Saree Clean
            </button>
          </div>
        </div>

        {/* Express Delivery Option */}
        <div className="pt-4 border-t border-gray-200">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              data-testid="express-delivery-toggle"
            />
            <span className="text-sm text-gray-700">Express Delivery (+50%)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Express delivery charges 50% extra
          </p>
        </div>
      </div>
    </div>
  );
}