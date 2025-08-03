import React, { useState, useEffect, useRef } from 'react';

interface WeekNavigationProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
  onUpdate: () => void;
}

// NFL 2025 season week dates (approximate)
const WEEK_DATES = [
  { week: 1, start: 'Sep 4', end: 'Sep 8' },
  { week: 2, start: 'Sep 11', end: 'Sep 15' },
  { week: 3, start: 'Sep 18', end: 'Sep 22' },
  { week: 4, start: 'Sep 25', end: 'Sep 29' },
  { week: 5, start: 'Oct 2', end: 'Oct 6' },
  { week: 6, start: 'Oct 9', end: 'Oct 13' },
  { week: 7, start: 'Oct 16', end: 'Oct 20' },
  { week: 8, start: 'Oct 23', end: 'Oct 27' },
  { week: 9, start: 'Oct 30', end: 'Nov 3' },
  { week: 10, start: 'Nov 6', end: 'Nov 10' },
  { week: 11, start: 'Nov 13', end: 'Nov 17' },
  { week: 12, start: 'Nov 20', end: 'Nov 24' },
  { week: 13, start: 'Nov 27', end: 'Dec 1' },
  { week: 14, start: 'Dec 4', end: 'Dec 8' },
  { week: 15, start: 'Dec 11', end: 'Dec 15' },
  { week: 16, start: 'Dec 18', end: 'Dec 22' },
  { week: 17, start: 'Dec 25', end: 'Dec 29' },
  { week: 18, start: 'Jan 1', end: 'Jan 5' },
  { week: 19, start: 'Wild Card', end: 'Round' },
  { week: 20, start: 'Divisional', end: 'Round' },
  { week: 21, start: 'Conference', end: 'Championships' },
  { week: 22, start: 'Super Bowl', end: 'LVIII' },
];

const WeekNavigation: React.FC<WeekNavigationProps> = ({ 
  currentWeek, 
  onWeekChange, 
  onUpdate 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentWeekData = WEEK_DATES.find(w => w.week === currentWeek) || WEEK_DATES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="week-navigation">
      <button 
        className={`btn ${currentWeek === 1 ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-secondary'}`}
        onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
        disabled={currentWeek === 1}
      >
        ◄ Previous
      </button>
      
      <div className="flex items-center relative" ref={dropdownRef}>
        <button 
          className="btn btn-primary px-6 py-2 flex items-center space-x-2"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span>Week {currentWeek}: {currentWeekData.start} - {currentWeekData.end}</span>
          <span className="text-sm">▼</span>
        </button>
        
        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-64">
            <div className="py-2">
              {WEEK_DATES.map((weekData) => (
                <button
                  key={weekData.week}
                  onClick={() => {
                    onWeekChange(weekData.week);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                    currentWeek === weekData.week 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Week {weekData.week}</span>
                    <span className="text-sm text-gray-500">{weekData.start} - {weekData.end}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <button 
        className={`btn ${currentWeek === WEEK_DATES.length ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-secondary'}`}
        onClick={() => onWeekChange(Math.min(WEEK_DATES.length, currentWeek + 1))}
        disabled={currentWeek === WEEK_DATES.length}
      >
        Next ►
      </button>
      
      <button 
        className="btn btn-primary"
        onClick={onUpdate}
      >
        🔄 Update
      </button>
      
      <button className="btn btn-secondary">
        ⋯ More
      </button>
    </div>
  );
};

export default WeekNavigation; 