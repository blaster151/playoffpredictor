import React from 'react';

const NavigationBar: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/icons/nfl-logo.png" 
              alt="NFL" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-gray-900">Playoff Predictors</h1>
          </div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">🕐</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">🏈</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">👤</span>
            </button>
            <span className="text-gray-500 font-medium">PlaySheet</span>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700 text-sm">
              Hate Ads?
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">📤</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">🌙</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <span className="text-lg">❌</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar; 