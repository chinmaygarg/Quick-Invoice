import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import toast from 'react-hot-toast';

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

export const useMigrationCheck = () => {
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [migrationData, setMigrationData] = useState<MigrationDialogData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setIsChecking(true);
      const result = await invoke<MigrationDialogData | null>('check_migration_on_startup');

      if (result) {
        setMigrationRequired(true);
        setMigrationData(result);

        if (result.is_legacy) {
          toast.info('Legacy database detected. Upgrade required to continue.');
        }
      } else {
        console.log('Database is up to date');
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
      toast.error('Failed to check database version');
    } finally {
      setIsChecking(false);
    }
  };

  const checkMigrationAfterRestore = async (backupPath: string) => {
    try {
      const result = await invoke<MigrationDialogData | null>('check_migration_after_restore', {
        backupPath,
      });

      if (result) {
        setMigrationRequired(true);
        setMigrationData(result);
        toast.info('Restored database requires upgrade to work with current version.');
      } else {
        toast.success('Database restored successfully');
      }

      return result;
    } catch (error) {
      console.error('Failed to check migration after restore:', error);
      toast.error('Failed to check restored database version');
      throw error;
    }
  };

  const triggerManualCheck = async () => {
    try {
      const result = await invoke<MigrationDialogData | null>('trigger_manual_migration_check');

      if (result) {
        setMigrationRequired(true);
        setMigrationData(result);
        return true;
      } else {
        toast.info('Database is already up to date');
        return false;
      }
    } catch (error) {
      console.error('Manual migration check failed:', error);
      toast.error('Failed to check database version');
      throw error;
    }
  };

  const handleMigrationComplete = () => {
    setMigrationRequired(false);
    setMigrationData(null);
    toast.success('Database upgraded successfully!');
    // Optionally reload the application or refresh data
    window.location.reload();
  };

  const handleMigrationDismiss = () => {
    setMigrationRequired(false);
    // Don't clear migration data in case user wants to upgrade later
    toast.warning('Database upgrade postponed. Some features may not work correctly.');
  };

  return {
    migrationRequired,
    migrationData,
    isChecking,
    checkMigrationAfterRestore,
    triggerManualCheck,
    handleMigrationComplete,
    handleMigrationDismiss,
  };
};