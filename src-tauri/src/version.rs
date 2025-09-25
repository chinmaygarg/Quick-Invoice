/// Application version information and database compatibility
use anyhow::Result;

/// Current application version
pub const APP_VERSION: &str = "0.2.0";

/// Required database schema version for this app version
pub const REQUIRED_DB_VERSION: i32 = 3;

/// Minimum supported database version that can be migrated
pub const MIN_SUPPORTED_DB_VERSION: i32 = 0;

/// Application version information
#[derive(Debug, Clone)]
pub struct VersionInfo {
    pub app_version: String,
    pub required_db_version: i32,
    pub min_supported_db_version: i32,
}

impl Default for VersionInfo {
    fn default() -> Self {
        Self {
            app_version: APP_VERSION.to_string(),
            required_db_version: REQUIRED_DB_VERSION,
            min_supported_db_version: MIN_SUPPORTED_DB_VERSION,
        }
    }
}

impl VersionInfo {
    /// Create new version info
    pub fn new() -> Self {
        Self::default()
    }

    /// Check if a database version is supported for migration
    pub fn is_db_version_supported(&self, db_version: i32) -> bool {
        db_version >= self.min_supported_db_version && db_version <= self.required_db_version
    }

    /// Check if database needs migration
    pub fn needs_migration(&self, current_db_version: i32) -> bool {
        current_db_version < self.required_db_version
    }

    /// Get migration path from current version to required version
    pub fn get_migration_path(&self, current_db_version: i32) -> Result<Vec<i32>> {
        if !self.is_db_version_supported(current_db_version) {
            return Err(anyhow::anyhow!(
                "Database version {} is not supported. Minimum supported version: {}",
                current_db_version,
                self.min_supported_db_version
            ));
        }

        if current_db_version >= self.required_db_version {
            return Ok(vec![]);
        }

        // Return the sequence of versions to migrate through
        let mut path = vec![];
        for version in (current_db_version + 1)..=self.required_db_version {
            path.push(version);
        }

        Ok(path)
    }

    /// Get version compatibility message
    pub fn get_compatibility_message(&self, current_db_version: i32) -> String {
        if current_db_version == self.required_db_version {
            "Database is up to date".to_string()
        } else if self.needs_migration(current_db_version) {
            format!(
                "Database needs to be upgraded from version {} to version {}",
                current_db_version, self.required_db_version
            )
        } else if current_db_version > self.required_db_version {
            format!(
                "Database version {} is newer than required version {}. App may need to be updated.",
                current_db_version, self.required_db_version
            )
        } else {
            format!(
                "Database version {} is not supported",
                current_db_version
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_info_creation() {
        let version_info = VersionInfo::new();
        assert_eq!(version_info.app_version, APP_VERSION);
        assert_eq!(version_info.required_db_version, REQUIRED_DB_VERSION);
        assert_eq!(version_info.min_supported_db_version, MIN_SUPPORTED_DB_VERSION);
    }

    #[test]
    fn test_db_version_support() {
        let version_info = VersionInfo::new();

        // Supported versions
        assert!(version_info.is_db_version_supported(0));
        assert!(version_info.is_db_version_supported(1));

        // Unsupported versions (too old)
        assert!(!version_info.is_db_version_supported(-1));
    }

    #[test]
    fn test_needs_migration() {
        let version_info = VersionInfo::new();

        assert!(version_info.needs_migration(0)); // New database
        assert!(!version_info.needs_migration(1)); // Up to date
        assert!(!version_info.needs_migration(2)); // Future version
    }

    #[test]
    fn test_migration_path() {
        let version_info = VersionInfo::new();

        // Migration from version 0 to 1
        let path = version_info.get_migration_path(0).unwrap();
        assert_eq!(path, vec![1]);

        // No migration needed
        let path = version_info.get_migration_path(1).unwrap();
        assert_eq!(path, Vec::<i32>::new());

        // Unsupported version
        assert!(version_info.get_migration_path(-1).is_err());
    }

    #[test]
    fn test_compatibility_messages() {
        let version_info = VersionInfo::new();

        let msg = version_info.get_compatibility_message(0);
        assert!(msg.contains("upgraded"));

        let msg = version_info.get_compatibility_message(1);
        assert!(msg.contains("up to date"));

        let msg = version_info.get_compatibility_message(2);
        assert!(msg.contains("newer"));
    }
}