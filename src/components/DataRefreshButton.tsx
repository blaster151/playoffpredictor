import React from 'react';

interface DataRefreshButtonProps {
  onRefresh: () => Promise<void>;
  loading: boolean;
  lastUpdated?: Date;
}

const DataRefreshButton: React.FC<DataRefreshButtonProps> = ({ 
  onRefresh, 
  loading, 
  lastUpdated 
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onRefresh}
        disabled={loading}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {loading ? '🔄' : '📡'} {loading ? 'Refreshing...' : 'Refresh Data'}
      </button>
      {lastUpdated && (
        <span className="text-xs text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default DataRefreshButton; 