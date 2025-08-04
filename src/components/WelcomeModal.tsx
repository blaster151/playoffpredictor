import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSchedule: () => void;
  isGenerating: boolean;
}

export default function WelcomeModal({ isOpen, onClose, onGenerateSchedule, isGenerating }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          {/* NFL Logo */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              🏈
            </div>
          </div>

          {/* Welcome Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to NFL Playoff Predictor!
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Predict the entire 2025-2026 NFL season and see how your choices affect the playoff picture. 
            Start by generating a complete season schedule, then simulate games week by week.
          </p>

          {/* Features List */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">What you can do:</h3>
            <ul className="text-sm text-blue-700 space-y-2 text-left">
              <li className="flex items-center">
                <span className="mr-2">📅</span>
                Generate realistic NFL schedules
              </li>
              <li className="flex items-center">
                <span className="mr-2">🎯</span>
                Predict game outcomes week by week
              </li>
              <li className="flex items-center">
                <span className="mr-2">🏆</span>
                Watch playoff scenarios unfold
              </li>
              <li className="flex items-center">
                <span className="mr-2">📊</span>
                Track standings and tiebreakers
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onGenerateSchedule}
              disabled={isGenerating}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                isGenerating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Schedule...
                </div>
              ) : (
                '🚀 Generate Season Schedule'
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-6 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              Maybe later
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Your schedule and predictions are saved locally in your browser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 