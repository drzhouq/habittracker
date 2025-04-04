import { useState } from 'react'
import ReactCalendar from 'react-calendar'
import { format, isAfter } from 'date-fns'
import type { HabitRecord } from '../lib/redis'
import { calendarStyles } from '../styles'
import 'react-calendar/dist/Calendar.css'

// Define the type for the calendar value as used by react-calendar
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarProps {
  habits?: HabitRecord[]
  onDateSelect: (date: Date) => void
}

// Custom formatting for weekday names
const formatWeekdayName = (locale: string | undefined, date: Date) => {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const day = date.getDay();
  // getDay returns 0 for Sunday, but we need to adjust it for our array
  return days[day === 0 ? 6 : day - 1];
};

export default function Calendar({ habits = [], onDateSelect }: CalendarProps) {
  const [date, setDate] = useState<Date>(new Date())
  // Get fresh system date for each render to avoid stale dates
  
  const getTileContent = ({ date }: { date: Date }) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Get habits for this day, but only count 'earn' actions (ignore 'lose' actions)
    const dayHabits = habits.filter(
      (habit) => habit.date === dateString && habit.action === 'earn'
    );
    
    // Calculate total credits earned
    const earnedCredits = dayHabits.reduce((total, habit) => total + habit.credits, 0);

    if (earnedCredits === 0) {
      return null;
    }

    // Display a simple badge with the credit count
    return (
      <div className="flex justify-center">
        <div className="flex justify-center items-center" style={calendarStyles.calendarBadge}>
          +{earnedCredits}
        </div>
      </div>
    );
  }

  // Disable future dates, but always enable the current system date
  const tileDisabled = ({ date }: { date: Date }) => {
    // Always get a fresh date when checking to avoid stale dates
    const currentSystemDate = new Date();
    
    // Format to yyyy-MM-dd for comparison (ignoring time)
    const formattedCurrentDate = format(currentSystemDate, 'yyyy-MM-dd');
    const formattedTileDate = format(date, 'yyyy-MM-dd');
    
    // Allow the current system date
    if (formattedTileDate === formattedCurrentDate) {
      return false;
    }
    
    // Disable future dates (after today)
    return isAfter(date, currentSystemDate) && formattedTileDate !== formattedCurrentDate;
  };

  return (
    <div className="w-full">
      <div className="calendar-container">
        <ReactCalendar
          onChange={(value: Value) => {
            if (value instanceof Date) {
              setDate(value);
              onDateSelect(value);
            }
          }}
          value={date}
          tileContent={getTileContent}
          className="w-full rounded-lg border-none shadow-sm compact-calendar"
          formatShortWeekday={formatWeekdayName}
          tileDisabled={tileDisabled}
        />
      </div>
    </div>
  )
} 