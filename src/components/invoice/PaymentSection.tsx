import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export interface PaymentInfo {
  method: string;
  amount: number;
  notes: string;
}

interface PaymentSectionProps {
  totalAmount: number;
  onPaymentUpdate: (payment: PaymentInfo) => void;
  initialPayment?: Partial<PaymentInfo>;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'credit', label: 'Credit', icon: '📝' },
  { value: 'partial', label: 'Partial Payment', icon: '💰' },
];

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  totalAmount,
  onPaymentUpdate,
  initialPayment = {}
}) => {
  const [paymentMethod, setPaymentMethod] = useState(initialPayment.method || 'cash');
  const [paymentAmount, setPaymentAmount] = useState(initialPayment.amount || totalAmount);
  const [paymentNotes, setPaymentNotes] = useState(initialPayment.notes || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update payment amount when total changes
  useEffect(() => {
    if (!initialPayment.amount) {
      setPaymentAmount(totalAmount);
    }
  }, [totalAmount, initialPayment.amount]);

  // Notify parent of payment changes
  useEffect(() => {
    onPaymentUpdate({
      method: paymentMethod,
      amount: paymentAmount,
      notes: paymentNotes,
    });
  }, [paymentMethod, paymentAmount, paymentNotes, onPaymentUpdate]);

  const balance = totalAmount - paymentAmount;
  const isFullPayment = Math.abs(balance) < 0.01;
  const isOverPayment = balance < -0.01;

  const handleQuickAmount = (percentage: number) => {
    const amount = (totalAmount * percentage) / 100;
    setPaymentAmount(Math.round(amount * 100) / 100);
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);

    // Auto-adjust for credit payment
    if (method === 'credit') {
      setPaymentAmount(0);
      setPaymentNotes('Credit sale - payment pending');
    } else if (method === 'partial') {
      setShowAdvanced(true);
      setPaymentAmount(Math.round(totalAmount * 0.5 * 100) / 100); // 50% default
    } else {
      setPaymentAmount(totalAmount);
      if (paymentNotes === 'Credit sale - payment pending') {
        setPaymentNotes('');
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Details</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => handlePaymentMethodChange(method.value)}
                className={`
                  p-3 rounded-lg border text-sm font-medium transition-colors
                  flex items-center justify-center space-x-2
                  ${paymentMethod === method.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="text-base">{method.icon}</span>
                <span>{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₹
              </span>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="pl-8"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Balance
            </label>
            <div className={`
              px-3 py-2 rounded-md text-sm font-medium
              ${isFullPayment
                ? 'bg-green-100 text-green-800 border border-green-200'
                : isOverPayment
                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }
            `}>
              {isFullPayment ? '✓ Fully Paid' :
               isOverPayment ? `Overpaid: ₹${Math.abs(balance).toFixed(2)}` :
               `Due: ₹${balance.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Quick Amount
            </label>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  type="button"
                  onClick={() => handleQuickAmount(percentage)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {percentage}% (₹{((totalAmount * percentage) / 100).toFixed(2)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Notes (Optional)
          </label>
          <Input
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Additional payment details, reference number, etc."
            className="w-full"
          />
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Invoice Total:</span>
            <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Payment Amount:</span>
            <span className="font-medium">₹{paymentAmount.toFixed(2)}</span>
          </div>
          <hr className="my-2" />
          <div className={`
            flex justify-between font-medium
            ${isFullPayment ? 'text-green-700' :
              isOverPayment ? 'text-orange-700' : 'text-yellow-700'}
          `}>
            <span>Status:</span>
            <span>
              {isFullPayment ? 'Paid in Full' :
               isOverPayment ? `Overpaid (₹${Math.abs(balance).toFixed(2)})` :
               `Pending (₹${balance.toFixed(2)})`}
            </span>
          </div>
        </div>

        {/* Special Payment Type Instructions */}
        {paymentMethod === 'credit' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Credit Sale</p>
                <p>This invoice will be marked as credit. Follow up with customer for payment.</p>
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'partial' && balance > 0.01 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-500 mt-0.5">⚠️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Partial Payment</p>
                <p>Remaining balance of ₹{balance.toFixed(2)} will be due. Consider scheduling follow-up.</p>
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'upi' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-purple-500 mt-0.5">📱</span>
              <div className="text-sm text-purple-800">
                <p className="font-medium">UPI Payment</p>
                <p>Ask customer to scan QR code or use UPI ID for payment verification.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};