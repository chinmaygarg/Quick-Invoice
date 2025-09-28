import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { save, open } from '@tauri-apps/api/dialog';
import { useApp } from '@/contexts/AppContext';
import { TagSettings } from '../settings/TagSettings';
import { EmailSettings } from '../settings/EmailSettings';
import { useMigrationCheck } from '@/hooks/useMigrationCheck';

export function Settings() {
  const { showNotification, setLoading } = useApp();
  const { checkMigrationAfterRestore } = useMigrationCheck();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [databasePath, setDatabasePath] = useState<string>('./database.sqlite');

  useEffect(() => {
    const fetchDatabasePath = async () => {
      try {
        const path = await invoke<string>('get_database_path');
        setDatabasePath(path);
      } catch (error) {
        console.error('Failed to get database path:', error);
        // Keep the default value if fetching fails
      }
    };

    fetchDatabasePath();
  }, []);

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);

      const filePath = await save({
        defaultPath: `uclean-backup-${new Date().toISOString().split('T')[0]}.sqlite`,
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }
        ]
      });

      if (filePath) {
        await invoke('backup_database', { backupPath: filePath });
        showNotification({
          type: 'success',
          title: 'Backup Complete',
          message: `Database backed up to ${filePath}`
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Backup Failed',
        message: `Failed to backup database: ${error}`
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);

      const filePath = await open({
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['sqlite', 'db']
          }
        ]
      });

      if (filePath && typeof filePath === 'string') {
        await invoke('restore_database', { backupPath: filePath });

        // Check if the restored database needs migration
        const migrationResult = await checkMigrationAfterRestore(filePath);

        if (!migrationResult) {
          // No migration needed, show success message
          showNotification({
            type: 'success',
            title: 'Restore Complete',
            message: 'Database restored successfully. Please restart the application.'
          });
        }
        // If migration is needed, the migration dialog will be shown automatically
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Restore Failed',
        message: `Failed to restore database: ${error}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleInitializeDatabase = async () => {
    try {
      setLoading(true);
      await invoke('initialize_database');
      showNotification({
        type: 'success',
        title: 'Database Initialized',
        message: 'Database has been initialized with default data'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Initialization Failed',
        message: `Failed to initialize database: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Backup</h1>
        <p className="text-gray-600 mt-1">
          Manage your database backups and application settings
        </p>
      </div>

      {/* Database Management */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Database Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Backup and restore your invoice data
          </p>
        </div>

        <div className="card-body space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Backup Database</h3>
              <p className="text-sm text-gray-600">
                Create a backup copy of your invoice database
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="btn btn-primary btn-md"
              data-testid="backup-button"
            >
              {isBackingUp ? (
                <>
                  <div className="spinner w-4 h-4 mr-2" />
                  Backing up...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Backup Now
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Restore Database</h3>
              <p className="text-sm text-gray-600">
                Restore your database from a backup file
              </p>
            </div>
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="btn btn-secondary btn-md"
              data-testid="restore-button"
            >
              {isRestoring ? (
                <>
                  <div className="spinner w-4 h-4 mr-2" />
                  Restoring...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Restore
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Initialize Database</h3>
              <p className="text-sm text-gray-600">
                Reset database with default services and categories
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                ⚠️ This will not delete existing data, only add missing defaults
              </p>
            </div>
            <button
              onClick={handleInitializeDatabase}
              className="btn btn-warning btn-md"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Initialize
            </button>
          </div>
        </div>
      </div>

      {/* Application Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Application Information</h2>
        </div>

        <div className="card-body">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Version</dt>
              <dd className="text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Database Location</dt>
              <dd className="text-sm text-gray-900 break-all">{databasePath}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Backup</dt>
              <dd className="text-sm text-gray-900">Never</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Support</dt>
              <dd className="text-sm text-gray-900">
                <a
                  href="tel:9999759911"
                  className="text-primary-600 hover:text-primary-700"
                >
                  9999759911
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Invoice</span>
              <span className="font-mono text-gray-900">Ctrl + N</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Search Customer</span>
              <span className="font-mono text-gray-900">Ctrl + F</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Generate Invoice</span>
              <span className="font-mono text-gray-900">F12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quick Backup</span>
              <span className="font-mono text-gray-900">Ctrl + B</span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Backup Settings */}
      <EmailSettings />

      {/* Tag Printing Settings */}
      <TagSettings />
    </div>
  );
}