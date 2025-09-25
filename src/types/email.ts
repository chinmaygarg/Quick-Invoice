// Email configuration types for UCLEAN application

export interface EmailConfig {
  id: number;
  sender_email: string;
  recipient_email: string;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  use_starttls: boolean;
  auto_backup_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailConfigRequest {
  sender_email: string;
  sender_password: string; // Plain text password that will be encrypted
  recipient_email: string;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  use_starttls: boolean;
  auto_backup_enabled: boolean;
}

export interface UpdateEmailConfigRequest {
  sender_email: string;
  sender_password?: string; // Optional - if not provided, keeps existing password
  recipient_email: string;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  use_starttls: boolean;
  auto_backup_enabled: boolean;
}

export interface EmailTestRequest {
  sender_email: string;
  sender_password: string;
  smtp_server: string;
  smtp_port: number;
  use_tls: boolean;
  use_starttls: boolean;
}

export interface BackupEmailInfo {
  filename: string;
  app_name: string;
  app_version: string;
  db_version: number;
  timestamp: string;
  file_size: number;
}

// SMTP Preset tuple: [name, host, port, use_tls, use_starttls]
export type SmtpPreset = [string, string, number, boolean, boolean];

// Common SMTP providers
export const SMTP_PRESETS: SmtpPreset[] = [
  ['Gmail', 'smtp.gmail.com', 587, false, true],
  ['Gmail (TLS)', 'smtp.gmail.com', 465, true, false],
  ['Outlook/Hotmail', 'smtp-mail.outlook.com', 587, false, true],
  ['Yahoo Mail', 'smtp.mail.yahoo.com', 587, false, true],
  ['Yahoo Mail (TLS)', 'smtp.mail.yahoo.com', 465, true, false],
  ['Custom SMTP', '', 587, false, true],
];

// Email validation regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Form validation helpers
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

export const validateSmtpConfig = (config: Partial<EmailTestRequest>): string[] => {
  const errors: string[] = [];

  if (!config.sender_email) {
    errors.push('Sender email is required');
  } else if (!validateEmail(config.sender_email)) {
    errors.push('Invalid sender email format');
  }

  if (!config.sender_password) {
    errors.push('Sender password is required');
  }

  if (!config.smtp_server) {
    errors.push('SMTP server is required');
  }

  if (!config.smtp_port || config.smtp_port < 1 || config.smtp_port > 65535) {
    errors.push('Invalid SMTP port (must be 1-65535)');
  }

  return errors;
};

export const validateEmailConfig = (config: Partial<CreateEmailConfigRequest>): string[] => {
  const errors: string[] = [];

  // Validate sender email
  if (!config.sender_email) {
    errors.push('Sender email is required');
  } else if (!validateEmail(config.sender_email)) {
    errors.push('Invalid sender email format');
  }

  // Validate recipient email
  if (!config.recipient_email) {
    errors.push('Recipient email is required');
  } else if (!validateEmail(config.recipient_email)) {
    errors.push('Invalid recipient email format');
  }

  // Validate SMTP settings
  const smtpErrors = validateSmtpConfig({
    sender_email: config.sender_email,
    sender_password: config.sender_password,
    smtp_server: config.smtp_server,
    smtp_port: config.smtp_port,
  });

  return [...errors, ...smtpErrors];
};

// Default values
export const DEFAULT_EMAIL_CONFIG: Partial<CreateEmailConfigRequest> = {
  smtp_port: 587,
  use_tls: false,
  use_starttls: true,
  auto_backup_enabled: true,
};

// Maximum attachment size (25MB)
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;