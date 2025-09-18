use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
}

impl ValidationResult {
    pub fn valid() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
        }
    }

    pub fn invalid(errors: Vec<String>) -> Self {
        Self {
            is_valid: false,
            errors,
        }
    }

    pub fn add_error(&mut self, error: String) {
        self.errors.push(error);
        self.is_valid = false;
    }
}

pub fn validate_email(email: &str) -> bool {
    let email_regex = regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
    email_regex.is_match(email)
}

pub fn validate_phone(phone: &str) -> bool {
    let phone_regex = regex::Regex::new(r"^\+?[\d\s\-\(\)]{10,15}$").unwrap();
    phone_regex.is_match(phone)
}

pub fn sanitize_string(input: &str) -> String {
    input.trim().to_string()
}

pub fn format_currency(amount: f64) -> String {
    format!("₹{:.2}", amount)
}

pub fn calculate_percentage(value: f64, total: f64) -> f64 {
    if total == 0.0 {
        0.0
    } else {
        (value / total) * 100.0
    }
}

pub fn generate_invoice_number(prefix: &str) -> String {
    let timestamp = Utc::now().timestamp();
    format!("{}-{}", prefix, timestamp)
}

pub fn parse_date_string(date_str: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    DateTime::parse_from_rfc3339(date_str)
        .map(|dt| dt.with_timezone(&Utc))
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%d %H:%M:%S")
                .map(|dt| DateTime::from_utc(dt, Utc))
        })
}

pub fn format_date_for_display(date: &DateTime<Utc>) -> String {
    date.format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn calculate_gst_amount(base_amount: f64, gst_rate: f64) -> f64 {
    base_amount * (gst_rate / 100.0)
}

pub fn calculate_total_with_gst(base_amount: f64, gst_rate: f64) -> f64 {
    let gst_amount = calculate_gst_amount(base_amount, gst_rate);
    base_amount + gst_amount
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email() {
        assert!(validate_email("test@example.com"));
        assert!(!validate_email("invalid-email"));
        assert!(!validate_email("test@"));
    }

    #[test]
    fn test_validate_phone() {
        assert!(validate_phone("+1234567890"));
        assert!(validate_phone("123-456-7890"));
        assert!(!validate_phone("123"));
        assert!(!validate_phone("abc-def-ghij"));
    }

    #[test]
    fn test_calculate_gst() {
        assert_eq!(calculate_gst_amount(100.0, 18.0), 18.0);
        assert_eq!(calculate_total_with_gst(100.0, 18.0), 118.0);
    }

    #[test]
    fn test_format_currency() {
        assert_eq!(format_currency(123.45), "₹123.45");
        assert_eq!(format_currency(100.0), "₹100.00");
    }
}