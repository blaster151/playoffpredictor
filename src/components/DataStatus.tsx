import React, { useState, useEffect } from 'react';
import { dataManager } from '../utils/dataManager';

interface DataStatusProps {
  className?: string;
}

const DataStatus: React.FC<DataStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState(dataManager.getStatus());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(dataManager.getStatus());
    };

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.isHealthy) return 'text-green-600';
    if (status.consecutiveErrors > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (status.isHealthy) return '🛡️';
    if (status.consecutiveErrors > 0) return '⚠️';
    return '🚨';
  };

  const formatLastSaveTime = () => {
    if (status.lastSaveTime === 0) return 'Never';
    const now = Date.now();
    const diff = now - status.lastSaveTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (!isVisible && status.isHealthy && status.errorCount === 0) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 p-2 bg-green-100 text-green-600 rounded-full shadow-lg hover:bg-green-200 transition-all duration-200 ${className}`}
        title="Data Status"
      >
        🛡️
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <span className="mr-2">{getStatusIcon()}</span>
          Data Protection
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {status.isHealthy ? 'Healthy' : 'Issues Detected'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Last Save:</span>
          <span className="text-gray-800">{formatLastSaveTime()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Backups:</span>
          <span className="text-gray-800">{status.backupCount} available</span>
        </div>

        {status.consecutiveErrors > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Errors:</span>
            <span className="text-yellow-600 font-medium">
              {status.consecutiveErrors} consecutive
            </span>
          </div>
        )}

        {status.errorCount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Total Errors:</span>
            <span className="text-red-600 font-medium">{status.errorCount}</span>
          </div>
        )}
      </div>

      {!status.isHealthy && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ Data protection system has detected issues. Your data is being backed up automatically.
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        Auto-save with backup protection enabled
      </div>
    </div>
  );
};

export default DataStatus; 