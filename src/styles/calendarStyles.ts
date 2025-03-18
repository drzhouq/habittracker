import { CSSProperties } from 'react';

export const calendarStyles: Record<string, CSSProperties> = {
  // Calendar badge styles
  calendarBadge: {
    position: 'absolute',
    bottom: '3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20px',
    height: '20px',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    borderRadius: '50%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
    zIndex: 10,
    marginTop: '2px',
    textShadow: '0 1px 1px rgba(0,0,0,0.5)',
    border: '1px solid white',
    backgroundColor: '#4CAF50',
  },
  
  // Calendar container and header styles
  calendarHeader: {
    color: '#8a2be2'
  }
}; 

// Add global styles for the compact calendar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .compact-calendar .react-calendar__tile {
      padding: 0.3em 0.5em;
      height: 38px;
    }
    .compact-calendar .react-calendar__month-view__weekdays__weekday {
      padding: 0.2em;
      font-size: 0.7em;
    }
    .compact-calendar .react-calendar__navigation button {
      padding: 0.2em;
      font-size: 0.9em;
    }
    .compact-calendar .react-calendar__navigation {
      margin-bottom: 0.3em;
    }
    .compact-calendar .react-calendar__tile--active {
      background: #9f7aea !important;
    }
    .compact-calendar .react-calendar__month-view__days__day--weekend {
      color: #f56565;
    }
  `;
  document.head.appendChild(style);
} 