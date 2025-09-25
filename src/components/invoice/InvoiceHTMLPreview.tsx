import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'react-hot-toast';

interface InvoiceHTMLPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNo: string;
}

const PAPER_SIZES = [
  { value: 'A5', label: 'A5', width: '148mm', height: '210mm' },
  { value: 'A4', label: 'A4', width: '210mm', height: '297mm' },
  { value: 'thermal', label: 'Thermal', width: '80mm', height: 'auto' },
];

export const InvoiceHTMLPreview: React.FC<InvoiceHTMLPreviewProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNo,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedPaperSize, setSelectedPaperSize] = useState('A5');

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadHTMLPreview();
    }
  }, [isOpen, invoiceId, selectedPaperSize]);

  const loadHTMLPreview = async () => {
    setLoading(true);
    try {
      const html = await invoke<string>('preview_invoice_html', {
        invoiceId,
        paperSize: selectedPaperSize,
      });
      setHtmlContent(html);
    } catch (error) {
      console.error('Failed to load HTML preview:', error);
      toast.error('Failed to load invoice preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    console.log('Print button clicked - using HTML generation approach');

    try {
      setLoading(true);

      // Generate HTML based on selected paper size
      const format = selectedPaperSize.toLowerCase() as 'a4' | 'a5' | 'thermal';

      // Call the backend to save HTML and open in browser
      const filePath = await invoke<string>('save_and_open_invoice_html', {
        invoiceId: invoiceId,
        format: format,
      });

      console.log('HTML generated and opened at:', filePath);

      toast.success('Invoice opened in browser for printing');

      // Close the HTML preview modal after opening
      handleClose();

    } catch (error) {
      console.error('Failed to generate/open HTML for printing:', error);
      toast.error('Failed to open invoice for printing.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setHtmlContent('');
    onClose();
  };

  if (!isOpen) return null;

  const selectedSize = PAPER_SIZES.find(size => size.value === selectedPaperSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">Invoice Preview - {invoiceNo}</h3>

            {/* Paper Size Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Paper Size:</label>
              <select
                value={selectedPaperSize}
                onChange={(e) => setSelectedPaperSize(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAPER_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Print Button */}
            <Button
              onClick={handlePrint}
              disabled={loading || !htmlContent}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              🖨️ Print
            </Button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading invoice preview...</p>
              </div>
            </div>
          ) : htmlContent ? (
            <div className="h-full bg-white rounded-lg shadow-inner overflow-hidden">
              <iframe
                id="invoice-preview-iframe"
                srcDoc={htmlContent}
                className="w-full h-full border-0"
                style={{
                  maxWidth: selectedSize?.width || '148mm',
                  margin: '0 auto',
                  display: 'block',
                }}
                title={`Invoice ${invoiceNo} Preview`}
                onLoad={() => {
                  // Add print styles to the iframe
                  const iframe = document.getElementById('invoice-preview-iframe') as HTMLIFrameElement;
                  if (iframe?.contentDocument) {
                    try {
                      const style = iframe.contentDocument.createElement('style');
                      style.textContent = `
                        @media print {
                          body { margin: 0 !important; }
                          @page {
                            margin: 0.5in;
                            size: ${selectedSize?.value === 'A4' ? 'A4' : selectedSize?.value === 'A5' ? 'A5' : '80mm auto'};
                          }
                          * {
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                            print-color-adjust: exact !important;
                          }
                        }
                        @media screen {
                          body {
                            padding: 10px;
                            font-family: Arial, sans-serif;
                          }
                        }
                      `;
                      iframe.contentDocument.head.appendChild(style);
                      console.log('Print styles added to iframe');
                    } catch (error) {
                      console.warn('Could not add print styles to iframe:', error);
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedSize && (
              <span>Page Size: {selectedSize.width} × {selectedSize.height}</span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};