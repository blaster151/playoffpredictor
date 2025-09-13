import React from 'react';

interface GenerationErrorModalProps {
  isOpen: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export default function GenerationErrorModal({ isOpen, error, onClose, onRetry }: GenerationErrorModalProps) {
  if (!isOpen || !error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">Schedule Generation Failed</h3>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            The schedule generator encountered an error and was unable to create a new schedule.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800 font-mono break-words">
              {error}
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Possible Solutions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Try refreshing the page and generating again</li>
            <li>• The GLPK solver may need time to initialize</li>
            <li>• Check the browser console for more details</li>
          </ul>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
