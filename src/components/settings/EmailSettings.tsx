import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import {
  EmailConfig,
  CreateEmailConfigRequest,
  UpdateEmailConfigRequest,
  EmailTestRequest,
  SmtpPreset,
  SMTP_PRESETS,
  validateEmailConfig,
  validateEmail,
  DEFAULT_EMAIL_CONFIG,
} from '@/types/email';

export function EmailSettings() {
  const { showNotification } = useApp();
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [formData, setFormData] = useState<CreateEmailConfigRequest>({
    sender_email: '',
    sender_password: '',
    recipient_email: '',
    smtp_server: '',
    smtp_port: 587,
    use_tls: false,
    use_starttls: true,
    auto_backup_enabled: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('Gmail');
  const [smtpPresets] = useState<SmtpPreset[]>(SMTP_PRESETS);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadEmailConfig();
    loadSmtpPresets();
  }, []);

  const loadEmailConfig = async () => {
    try {
      setIsLoading(true);
      const config = await invoke<EmailConfig | null>('get_email_config');
      if (config) {
        setEmailConfig(config);
        setFormData({
          sender_email: config.sender_email,
          sender_password: '', // Don't populate password field
          recipient_email: config.recipient_email,
          smtp_server: config.smtp_server,
          smtp_port: config.smtp_port,
          use_tls: config.use_tls,
          use_starttls: config.use_starttls,
          auto_backup_enabled: config.auto_backup_enabled,
        });
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load email configuration: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSmtpPresets = async () => {
    try {
      const presets = await invoke<SmtpPreset[]>('get_smtp_presets');
      // We're using the static presets for now, but this could be dynamic
    } catch (error) {
      console.error('Failed to load SMTP presets:', error);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = smtpPresets.find(([name]) => name === presetName);
    if (preset) {
      const [, host, port, use_tls, use_starttls] = preset;
      setFormData(prev => ({
        ...prev,
        smtp_server: host,
        smtp_port: port,
        use_tls,
        use_starttls,
      }));
    }
  };

  const handleInputChange = (field: keyof CreateEmailConfigRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors([]); // Clear errors when user starts typing
  };

  const handleTestConnection = async () => {
    const testRequest: EmailTestRequest = {
      sender_email: formData.sender_email,
      sender_password: formData.sender_password,
      smtp_server: formData.smtp_server,
      smtp_port: formData.smtp_port,
      use_tls: formData.use_tls,
      use_starttls: formData.use_starttls,
    };

    // Validate before testing
    const errors = validateEmailConfig(formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsTesting(true);
      const result = await invoke<string>('test_email_connection', { request: testRequest });
      showNotification({
        type: 'success',
        title: 'Connection Test',
        message: result,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Connection Failed',
        message: `Connection test failed: ${error}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    // Validate form data
    const errors = validateEmailConfig(formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSaving(true);

      if (emailConfig) {
        // Update existing config
        const updateRequest: UpdateEmailConfigRequest = {
          ...formData,
          sender_password: formData.sender_password || undefined,
        };
        const result = await invoke<EmailConfig>('update_email_config', { request: updateRequest });
        setEmailConfig(result);
        showNotification({
          type: 'success',
          title: 'Settings Updated',
          message: 'Email configuration updated successfully',
        });
      } else {
        // Create new config
        const result = await invoke<EmailConfig>('save_email_config', { request: formData });
        setEmailConfig(result);
        showNotification({
          type: 'success',
          title: 'Settings Saved',
          message: 'Email configuration saved successfully',
        });
      }

      // Clear password field after save
      setFormData(prev => ({ ...prev, sender_password: '' }));
      setFormErrors([]);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save email configuration: ${error}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestBackup = async () => {
    try {
      setIsLoading(true);
      const result = await invoke<string>('send_backup_email');
      showNotification({
        type: 'success',
        title: 'Test Backup Sent',
        message: result,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Backup Failed',
        message: `Failed to send test backup: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!emailConfig) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete the email configuration? This will disable automatic backups.'
    );

    if (confirmDelete) {
      try {
        setIsLoading(true);
        await invoke<string>('delete_email_config');
        setEmailConfig(null);
        setFormData({
          sender_email: '',
          sender_password: '',
          recipient_email: '',
          smtp_server: '',
          smtp_port: 587,
          use_tls: false,
          use_starttls: true,
          auto_backup_enabled: true,
        });
        showNotification({
          type: 'success',
          title: 'Configuration Deleted',
          message: 'Email configuration deleted successfully',
        });
      } catch (error) {
        showNotification({
          type: 'error',
          title: 'Delete Failed',
          message: `Failed to delete email configuration: ${error}`,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body flex items-center justify-center py-8">
          <div className="spinner w-8 h-8" />
          <span className="ml-3 text-gray-600">Loading email settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Email Backup Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure automatic database backups via email when the app closes
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Form Errors */}
        {formErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Email Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sender Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Email *
            </label>
            <input
              type="email"
              value={formData.sender_email}
              onChange={(e) => handleInputChange('sender_email', e.target.value)}
              className="input w-full"
              placeholder="your.email@gmail.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address used to send backup emails
            </p>
          </div>

          {/* Recipient Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Email *
            </label>
            <input
              type="email"
              value={formData.recipient_email}
              onChange={(e) => handleInputChange('recipient_email', e.target.value)}
              className="input w-full"
              placeholder="backup@yourdomain.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Email address to receive backup files
            </p>
          </div>

          {/* Sender Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.sender_password}
                onChange={(e) => handleInputChange('sender_password', e.target.value)}
                className="input w-full pr-10"
                placeholder={emailConfig ? 'Leave empty to keep current password' : 'Enter password'}
                required={!emailConfig}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              For Gmail, use an App Password instead of your regular password
            </p>
          </div>

          {/* SMTP Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Provider
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="input w-full"
            >
              {smtpPresets.map(([name]) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* SMTP Server */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Server *
            </label>
            <input
              type="text"
              value={formData.smtp_server}
              onChange={(e) => handleInputChange('smtp_server', e.target.value)}
              className="input w-full"
              placeholder="smtp.gmail.com"
              required
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Port *
            </label>
            <input
              type="number"
              value={formData.smtp_port}
              onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value) || 587)}
              className="input w-full"
              min="1"
              max="65535"
              required
            />
          </div>
        </div>

        {/* Security Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Security Settings</h3>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.use_tls}
                onChange={(e) => handleInputChange('use_tls', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Use TLS (Port 465)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.use_starttls}
                onChange={(e) => handleInputChange('use_starttls', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Use STARTTLS (Port 587)</span>
            </label>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.auto_backup_enabled}
              onChange={(e) => handleInputChange('auto_backup_enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable automatic backup on app close</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn btn-secondary"
          >
            {isTesting ? (
              <>
                <div className="spinner w-4 h-4 mr-2" />
                Testing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              </>
            )}
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? (
              <>
                <div className="spinner w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {emailConfig ? 'Update Settings' : 'Save Settings'}
              </>
            )}
          </button>

          {emailConfig && (
            <button
              onClick={handleSendTestBackup}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Test Backup
            </button>
          )}

          {emailConfig && (
            <button
              onClick={handleDeleteConfig}
              className="btn btn-danger"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Configuration
            </button>
          )}
        </div>

        {/* Configuration Status */}
        {emailConfig && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Email backup is configured and {formData.auto_backup_enabled ? 'enabled' : 'disabled'}
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Last updated: {new Date(emailConfig.updated_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Gmail:</strong> Enable 2-factor authentication and create an App Password</p>
            <p><strong>Outlook/Yahoo:</strong> Use your regular email credentials</p>
            <p><strong>Custom SMTP:</strong> Contact your email provider for server details</p>
            <p>The backup will be sent automatically when you close the application.</p>
          </div>
        </div>
      </div>
    </div>
  );
}