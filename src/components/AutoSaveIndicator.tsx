import React, { useState, useEffect } from 'react';

interface AutoSaveIndicatorProps {
  isVisible: boolean;
  onHide: () => void;
}

export default function AutoSaveIndicator({ isVisible, onHide }: AutoSaveIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onHide();
      }, 2000); // Show for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ease-in-out ${
      isAnimating 
        ? 'opacity-100 translate-y-0' 
        : 'opacity-0 translate-y-2'
    }`}>
      <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <svg 
            className="w-4 h-4 animate-pulse" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
          <span className="text-sm font-medium">Auto-Saved</span>
        </div>
      </div>
    </div>
  );
} 