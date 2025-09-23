import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'react-hot-toast';

interface TagPrintButtonProps {
  invoiceId: number;
  tagCount?: number;
  pieceCount?: number;
  isPrinted?: boolean;
  onPrintSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'full';
  className?: string;
}

interface TagPrintResponse {
  success: boolean;
  message: string;
  tags_printed: number;
}

export const TagPrintButton: React.FC<TagPrintButtonProps> = ({
  invoiceId,
  tagCount = 0,
  pieceCount = 0,
  isPrinted = false,
  onPrintSuccess,
  size = 'md',
  variant = 'icon',
  className = '',
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintTags = async () => {
    if (isPrinting) return;

    try {
      setIsPrinting(true);

      const response = await invoke<TagPrintResponse>('print_invoice_tags', {
        request: {
          invoice_id: invoiceId,
          item_ids: null, // Print all items
        },
      });

      if (response.success) {
        toast.success(response.message);
        onPrintSuccess?.();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Failed to print tags:', error);
      toast.error('Failed to print tags. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs';
      case 'lg':
        return 'h-10 w-10 text-base';
      default:
        return 'h-8 w-8 text-sm';
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'relative inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    const sizeClasses = getSizeClasses();

    if (variant === 'icon') {
      const colorClasses = isPrinted
        ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500';
      return `${baseClasses} ${sizeClasses} ${colorClasses}`;
    }

    if (variant === 'text') {
      const colorClasses = isPrinted
        ? 'text-green-700 hover:text-green-800'
        : 'text-blue-700 hover:text-blue-800';
      return `${baseClasses} ${colorClasses} px-2 py-1`;
    }

    // Full button variant
    const colorClasses = isPrinted
      ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    return `${baseClasses} ${colorClasses} px-3 py-2`;
  };

  const renderContent = () => {
    if (variant === 'icon') {
      return (
        <>
          <span className="text-lg" role="img" aria-label="Tag">
            🏷️
          </span>
          {tagCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {tagCount}
            </span>
          )}
        </>
      );
    }

    if (variant === 'text') {
      return (
        <span className="text-sm">
          {isPrinting ? 'Printing...' : `Print Tags${tagCount > 0 ? ` (${tagCount})` : ''}`}
        </span>
      );
    }

    // Full button
    return (
      <span className="flex items-center space-x-2">
        <span role="img" aria-label="Tag">🏷️</span>
        <span>
          {isPrinting ? 'Printing...' : `Print Tags${tagCount > 0 ? ` (${tagCount})` : ''}`}
        </span>
      </span>
    );
  };

  return (
    <button
      onClick={handlePrintTags}
      disabled={isPrinting || pieceCount === 0}
      className={`${getButtonClasses()} ${className}`}
      title={
        isPrinting
          ? 'Printing tags...'
          : pieceCount === 0
          ? 'No pieces to generate tags for'
          : tagCount === 0
          ? `Generate and print ${pieceCount} tags`
          : isPrinted
          ? `Reprint ${tagCount} tags`
          : `Print ${tagCount} tags`
      }
    >
      {renderContent()}
    </button>
  );
};

export default TagPrintButton;