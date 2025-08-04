import { SavedSchedule } from './scheduleSaver';

// Data management configuration
const CONFIG = {
  DEBOUNCE_DELAY: 1000, // 1 second debounce
  BACKUP_INTERVAL: 30000, // 30 seconds
  MAX_BACKUPS: 5, // Keep 5 backups
  STORAGE_KEYS: {
    SCHEDULES: 'nfl_schedules',
    SCHEDULES_BACKUP: 'nfl_schedules_backup',
    SCHEDULES_BACKUP_HISTORY: 'nfl_schedules_backup_history',
    LAST_SAVE_TIME: 'nfl_last_save_time',
    SAVE_ERRORS: 'nfl_save_errors',
  },
  ERROR_THRESHOLD: 3, // Number of consecutive errors before switching to backup
};

// Error tracking
interface SaveError {
  timestamp: number;
  error: string;
  operation: string;
  dataSize?: number;
}

interface BackupEntry {
  timestamp: number;
  data: string;
  checksum: string;
  version: string;
}

class DataManager {
  private static instance: DataManager;
  private saveTimeout: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private lastSaveTime = 0;
  private isInitialized = false;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * Initialize the data manager
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.loadLastSaveTime();
    this.startBackupInterval();
    this.validateStorage();
    this.isInitialized = true;
    
    console.log('🛡️ Data Manager initialized with backup protection');
  }

  /**
   * Debounced save function
   */
  debouncedSave<T>(
    key: string,
    data: T,
    operation: string = 'save'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Clear existing timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      // Set new timeout
      this.saveTimeout = setTimeout(async () => {
        try {
          // Check if data has actually changed
          const currentData = this.loadData(key);
          const hasChanged = JSON.stringify(currentData) !== JSON.stringify(data);
          
          const success = await this.saveData(key, data, operation);
          
          // Only emit auto-save event if data actually changed
          if (success && hasChanged) {
            this.emit('autoSave', { operation, key, timestamp: Date.now(), hasChanged: true });
          }
          
          resolve(success);
        } catch (error) {
          console.error('Debounced save failed:', error);
          resolve(false);
        }
      }, CONFIG.DEBOUNCE_DELAY);
    });
  }

  /**
   * Save data with comprehensive error handling
   */
  async saveData<T>(
    key: string,
    data: T,
    operation: string = 'save'
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Validate data before saving
      if (!this.validateData(data)) {
        throw new Error('Data validation failed');
      }

      // Create backup before saving
      await this.createBackup(key);

      // Attempt to save
      const dataString = JSON.stringify(data);
      const checksum = this.calculateChecksum(dataString);
      
      localStorage.setItem(key, dataString);
      
      // Verify save was successful
      const savedData = localStorage.getItem(key);
      if (!savedData || this.calculateChecksum(savedData) !== checksum) {
        throw new Error('Data corruption detected after save');
      }

      // Update metadata
      this.lastSaveTime = Date.now();
      this.saveLastSaveTime();
      this.consecutiveErrors = 0;
      
      console.log(`✅ ${operation} successful (${Date.now() - startTime}ms)`);
      return true;

    } catch (error) {
      this.handleSaveError(error, operation, data);
      return false;
    }
  }

  /**
   * Load data with fallback to backup
   */
  loadData<T>(key: string): T | null {
    try {
      // Try primary storage
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (this.validateData(parsed)) {
          return parsed;
        }
      }

      // Fallback to backup
      console.warn('⚠️ Primary data corrupted, attempting backup recovery...');
      return this.loadFromBackup<T>(key);

    } catch (error) {
      console.error('Error loading data:', error);
      this.recordError('load', error as Error);
      return this.loadFromBackup<T>(key);
    }
  }

  /**
   * Create backup of current data
   */
  private async createBackup(key: string): Promise<void> {
    try {
      const data = localStorage.getItem(key);
      if (!data) return;

      const backup: BackupEntry = {
        timestamp: Date.now(),
        data,
        checksum: this.calculateChecksum(data),
        version: '1.0',
      };

      // Save immediate backup
      localStorage.setItem(`${key}_backup`, JSON.stringify(backup));

      // Add to backup history
      const history = this.loadBackupHistory(key);
      history.push(backup);

      // Keep only recent backups
      if (history.length > CONFIG.MAX_BACKUPS) {
        history.splice(0, history.length - CONFIG.MAX_BACKUPS);
      }

      localStorage.setItem(`${key}_backup_history`, JSON.stringify(history));

    } catch (error) {
      console.error('Backup creation failed:', error);
      // Don't throw - backup failure shouldn't prevent main save
    }
  }

  /**
   * Load data from backup
   */
  private loadFromBackup<T>(key: string): T | null {
    try {
      // Try immediate backup
      const backupData = localStorage.getItem(`${key}_backup`);
      if (backupData) {
        const backup: BackupEntry = JSON.parse(backupData);
        
        // Verify backup integrity
        if (this.calculateChecksum(backup.data) === backup.checksum) {
          const parsed = JSON.parse(backup.data);
          if (this.validateData(parsed)) {
            console.log('🔄 Data recovered from backup');
            return parsed;
          }
        }
      }

      // Try backup history
      const history = this.loadBackupHistory(key);
      for (let i = history.length - 1; i >= 0; i--) {
        const backup = history[i];
        if (this.calculateChecksum(backup.data) === backup.checksum) {
          const parsed = JSON.parse(backup.data);
          if (this.validateData(parsed)) {
            console.log(`🔄 Data recovered from backup history (${new Date(backup.timestamp).toLocaleString()})`);
            return parsed;
          }
        }
      }

      console.error('❌ No valid backup found');
      return null;

    } catch (error) {
      console.error('Backup recovery failed:', error);
      return null;
    }
  }

  /**
   * Load backup history
   */
  private loadBackupHistory(key: string): BackupEntry[] {
    try {
      const history = localStorage.getItem(`${key}_backup_history`);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  /**
   * Handle save errors
   */
  private handleSaveError(error: unknown, operation: string, data: unknown): void {
    this.consecutiveErrors++;
    
    const saveError: SaveError = {
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      operation,
      dataSize: data ? JSON.stringify(data).length : 0,
    };

    this.recordError(operation, error as Error);
    
    // If too many consecutive errors, try to recover
    if (this.consecutiveErrors >= CONFIG.ERROR_THRESHOLD) {
      console.error(`🚨 ${CONFIG.ERROR_THRESHOLD} consecutive save errors - attempting recovery`);
      this.attemptRecovery();
    }
  }

  /**
   * Record error for debugging
   */
  private recordError(operation: string, error: Error): void {
    try {
      const errors = this.loadErrors();
      errors.push({
        timestamp: Date.now(),
        error: error.message,
        operation,
      });

      // Keep only recent errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }

      localStorage.setItem(CONFIG.STORAGE_KEYS.SAVE_ERRORS, JSON.stringify(errors));
    } catch {
      // Don't let error recording cause more errors
    }
  }

  /**
   * Load error history
   */
  private loadErrors(): SaveError[] {
    try {
      const errors = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVE_ERRORS);
      return errors ? JSON.parse(errors) : [];
    } catch {
      return [];
    }
  }

  /**
   * Attempt data recovery
   */
  private attemptRecovery(): void {
    try {
      // Clear potentially corrupted data
      localStorage.removeItem(CONFIG.STORAGE_KEYS.SCHEDULES);
      
      // Try to restore from backup
      const recovered = this.loadFromBackup<SavedSchedule[]>(CONFIG.STORAGE_KEYS.SCHEDULES);
      
      if (recovered) {
        // Save recovered data
        localStorage.setItem(CONFIG.STORAGE_KEYS.SCHEDULES, JSON.stringify(recovered));
        console.log('🔄 Data recovery successful');
        this.consecutiveErrors = 0;
      } else {
        console.error('❌ Data recovery failed - user data may be lost');
      }
    } catch (error) {
      console.error('Recovery attempt failed:', error);
    }
  }

  /**
   * Validate data integrity
   */
  private validateData(data: unknown): boolean {
    if (!data) return false;
    
    try {
      // Basic validation for schedules
      if (Array.isArray(data)) {
        return data.every(item => 
          item && 
          typeof item === 'object' && 
          'id' in item && 
          'name' in item
        );
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Validate storage availability
   */
  private validateStorage(): void {
    try {
      const testKey = '__storage_test__';
      const testData = { test: true, timestamp: Date.now() };
      
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (!retrieved || JSON.parse(retrieved).test !== true) {
        throw new Error('Storage validation failed');
      }
      
      console.log('✅ Storage validation passed');
    } catch (error) {
      console.error('❌ Storage validation failed:', error);
      throw new Error('LocalStorage is not available or corrupted');
    }
  }

  /**
   * Start periodic backup interval
   */
  private startBackupInterval(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    this.backupInterval = setInterval(() => {
      const schedules = localStorage.getItem(CONFIG.STORAGE_KEYS.SCHEDULES);
      if (schedules) {
        this.createBackup(CONFIG.STORAGE_KEYS.SCHEDULES);
      }
    }, CONFIG.BACKUP_INTERVAL);
  }

  /**
   * Save last save time
   */
  private saveLastSaveTime(): void {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SAVE_TIME, this.lastSaveTime.toString());
    } catch (error) {
      console.error('Failed to save last save time:', error);
    }
  }

  /**
   * Load last save time
   */
  private loadLastSaveTime(): void {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SAVE_TIME);
      this.lastSaveTime = saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      console.error('Failed to load last save time:', error);
      this.lastSaveTime = 0;
    }
  }

  /**
   * Event system methods
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  /**
   * Get data integrity status
   */
  getStatus(): {
    isHealthy: boolean;
    lastSaveTime: number;
    consecutiveErrors: number;
    backupCount: number;
    errorCount: number;
  } {
    const errors = this.loadErrors();
    const backupHistory = this.loadBackupHistory(CONFIG.STORAGE_KEYS.SCHEDULES);
    
    return {
      isHealthy: this.consecutiveErrors < CONFIG.ERROR_THRESHOLD,
      lastSaveTime: this.lastSaveTime,
      consecutiveErrors: this.consecutiveErrors,
      backupCount: backupHistory.length,
      errorCount: errors.length,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
  }
}

export const dataManager = DataManager.getInstance(); 