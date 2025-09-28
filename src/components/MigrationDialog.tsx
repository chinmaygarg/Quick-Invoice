import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { AlertTriangle, Database, CheckCircle, X, RefreshCw, HardDrive } from 'lucide-react';

interface MigrationDialogData {
  current_version: number;
  required_version: number;
  is_legacy: boolean;
  pending_migrations: MigrationInfo[];
  backup_path?: string;
  trigger_source: string;
}

interface MigrationInfo {
  version: number;
  name: string;
  description: string;
}

interface MigrationProgress {
  current_step: number;
  total_steps: number;
  current_migration: string;
  status: string;
}

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  migrationData?: MigrationDialogData | null;
}

const MigrationDialog: React.FC<MigrationDialogProps> = ({
  isOpen,
  onClose,
  onComplete,
  migrationData,
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeComplete, setUpgradeComplete] = useState(false);

  useEffect(() => {
    // Listen for migration progress updates
    const unlisten = listen<MigrationProgress>('migration-progress', (event) => {
      setProgress(event.payload);
    });

    // Listen for migration completion
    const unlistenComplete = listen('migration-complete', (event: any) => {
      setUpgradeComplete(true);
      setIsUpgrading(false);
      if (event.payload.success) {
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    });

    return () => {
      unlisten.then(fn => fn());
      unlistenComplete.then(fn => fn());
    };
  }, [onComplete]);

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true);
      setError(null);

      const success = await invoke<boolean>('apply_pending_migrations', {
        userConsent: true,
      });

      if (!success) {
        throw new Error('Migration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      setIsUpgrading(false);
    }
  };

  const handleRemindLater = () => {
    onClose();
  };

  if (!isOpen || !migrationData) return null;

  const getTriggerMessage = () => {
    switch (migrationData.trigger_source) {
      case 'app_startup':
        return 'Database upgrade required to continue using UCLEAN';
      case 'database_restore':
        return 'The restored database needs to be upgraded to work with this version of UCLEAN';
      case 'database_import':
        return 'The imported database needs to be upgraded';
      case 'manual_request':
        return 'Manual database upgrade requested';
      default:
        return 'Database upgrade available';
    }
  };

  const getVersionLabel = (version: number) => {
    if (version === 0) return 'Legacy (Pre-versioning)';
    return `Version ${version}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {upgradeComplete ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Database className="w-6 h-6 text-white" />
              )}
              <h2 className="text-xl font-semibold text-white">
                {upgradeComplete ? 'Upgrade Complete' : 'Database Upgrade Required'}
              </h2>
            </div>
            {!isUpgrading && !upgradeComplete && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {upgradeComplete ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Database Successfully Upgraded!
              </h3>
              <p className="text-gray-600">
                Your database has been upgraded to version {migrationData.required_version}.
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-700 mb-4">
                {getTriggerMessage()}
              </p>

              {/* Version Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Current Version:</span>
                    <p className="font-semibold">
                      {getVersionLabel(migrationData.current_version)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Required Version:</span>
                    <p className="font-semibold text-blue-600">
                      Version {migrationData.required_version}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Migrations */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Pending Changes ({migrationData.pending_migrations.length})
                </h3>
                <div className="space-y-2">
                  {migrationData.pending_migrations.map((migration) => (
                    <div
                      key={migration.version}
                      className="border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-sm">
                            v{migration.version}: {migration.name}
                          </span>
                          <p className="text-xs text-gray-600 mt-1">
                            {migration.description}
                          </p>
                        </div>
                        {isUpgrading && progress?.current_migration === migration.name && (
                          <span className="text-xs text-blue-600 font-medium">
                            Applying...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup Information */}
              {migrationData.backup_path && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <div className="flex items-start">
                    <HardDrive className="w-4 h-4 text-green-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        Backup Created
                      </p>
                      <p className="text-xs text-green-600 mt-1 break-all">
                        {migrationData.backup_path}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> This process will update your database structure.
                      A backup has been created automatically. The upgrade may take a few moments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress */}
              {isUpgrading && progress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Upgrading...</span>
                    <span>{progress.current_step} / {progress.total_steps}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(progress.current_step / progress.total_steps) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progress.status}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {error}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!upgradeComplete && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-between">
              <button
                onClick={handleRemindLater}
                disabled={isUpgrading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Remind Later
              </button>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUpgrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Upgrade Database
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationDialog;