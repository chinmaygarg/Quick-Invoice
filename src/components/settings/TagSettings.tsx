import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TagSettings {
  id: number;
  store_id?: number;
  roll_width: string;
  auto_print: boolean;
  printer_name?: string;
  template_style: string;
  include_barcode: boolean;
  created_at: string;
  updated_at: string;
}

interface UpdateTagSettingsRequest {
  roll_width: string;
  auto_print: boolean;
  printer_name: string | null;
  template_style: string;
  include_barcode: boolean;
}

const ROLL_WIDTH_OPTIONS = [
  { value: '32mm', label: '32mm (Compact)' },
  { value: '40mm', label: '40mm (Standard)' },
  { value: '50mm', label: '50mm (Large)' },
];

const TEMPLATE_STYLE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
];

export const TagSettings: React.FC = () => {
  const [settings, setSettings] = useState<TagSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [rollWidth, setRollWidth] = useState('40mm');
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [templateStyle, setTemplateStyle] = useState('standard');
  const [includeBarcode, setIncludeBarcode] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await invoke<TagSettings>('get_tag_settings', {
        store_id: null, // Global settings for now
      });

      setSettings(result);
      setRollWidth(result.roll_width);
      setAutoPrint(Boolean(result.auto_print));
      setPrinterName(result.printer_name || '');
      setTemplateStyle(result.template_style);
      setIncludeBarcode(Boolean(result.include_barcode));
    } catch (error) {
      console.error('Failed to load tag settings:', error);
      toast.error('Failed to load tag settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const request: UpdateTagSettingsRequest = {
        roll_width: rollWidth,
        auto_print: autoPrint,
        printer_name: printerName || "",
        template_style: templateStyle,
        include_barcode: includeBarcode,
      };

      const result = await invoke<TagSettings>('save_tag_settings', {
        store_id: null, // Global settings for now
        request,
      });
      setSettings(result);
      toast.success('Tag settings saved successfully');
    } catch (error) {
      console.error('Failed to save tag settings:', error);
      toast.error('Failed to save tag settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setRollWidth(settings.roll_width);
      setAutoPrint(Boolean(settings.auto_print));
      setPrinterName(settings.printer_name || '');
      setTemplateStyle(settings.template_style);
      setIncludeBarcode(Boolean(settings.include_barcode));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span role="img" aria-label="Tag">🏷️</span>
            <span>Tag Printing Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Roll Width */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Roll Width
            </label>
            <select
              value={rollWidth}
              onChange={(e) => setRollWidth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLL_WIDTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Select the width of your tag roll paper. Affects tag layout and content density.
            </p>
          </div>

          {/* Auto Print */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-print tags when invoice is saved
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              When enabled, tags will be automatically sent to the printer after creating an invoice.
            </p>
          </div>

          {/* Printer Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Printer
            </label>
            <Input
              type="text"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="Enter printer name (optional)"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Leave blank to use system default printer.
            </p>
          </div>

          {/* Template Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Template Style
            </label>
            <select
              value={templateStyle}
              onChange={(e) => setTemplateStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TEMPLATE_STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Standard includes all details, Compact shows minimal information.
            </p>
          </div>

          {/* Include Barcode */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={includeBarcode}
                onChange={(e) => setIncludeBarcode(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Include barcode on tags
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              Adds a scannable barcode for quick item identification.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">
              Preview for {rollWidth} roll:
            </div>
            <div
              className={`border border-gray-300 bg-white p-2 font-mono text-xs ${
                rollWidth === '32mm'
                  ? 'w-24 h-20'
                  : rollWidth === '40mm'
                  ? 'w-32 h-24'
                  : 'w-40 h-28'
              }`}
            >
              <div className="text-center font-bold">UC634-0001</div>
              <div className="text-center">John Doe</div>
              <div className="text-center text-xs">Laundry - W&I</div>
              <div className="text-center font-bold">1/5</div>
              <div className="text-center text-xs">24/09 7-9PM</div>
              {includeBarcode && (
                <div className="text-center text-xs mt-1">||||||||</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TagSettings;