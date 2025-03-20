import { SetStateAction, Dispatch, useState } from 'react'
import type { HabitType } from '../lib/redis'
import { format, isToday, isFuture } from 'date-fns'
import { habitStyles } from '../styles'

const HABITS = [
  {
    id: 'sleep',
    name: 'Sleep 8 Hours',
    icon: '😴',
    credits: 2,
    allowMultiple: false,
    maxClaimsPerDay: 1,
  },
  {
    id: 'smoothie',
    name: 'Drink Green Smoothie',
    icon: '🥤',
    credits: 1,
    allowMultiple: false,
    maxClaimsPerDay: 1,
  },
  {
    id: 'exercise',
    name: '30 Minutes Walk',
    icon: '🚶‍♀️',
    credits: 2,
    allowMultiple: true,
    maxClaimsPerDay: 6,
  },
  {
    id: 'social_media',
    name: 'Less Than 1hr Social Media',
    icon: '📱',
    credits: 1,
    allowMultiple: false,
    maxClaimsPerDay: 1,
  },
]

interface HabitTrackerProps {
  onHabitComplete: (habit: HabitType, action: 'earn' | 'lose', date: string) => void;
  completedHabits: Set<string>;
  setCompletedHabits: Dispatch<SetStateAction<Set<string>>>;
  selectedDate: Date;
}

export default function HabitTracker({ 
  onHabitComplete, 
  completedHabits, 
  setCompletedHabits,
  selectedDate
}: HabitTrackerProps) {
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = isToday(selectedDate);
  const [exerciseCount, setExerciseCount] = useState<Record<string, number>>({});
  
  const handleHabitToggle = (habitId: string) => {
    // Prevent toggling for future dates
    if (isFuture(selectedDate)) {
      return;
    }
    
    const habit = HABITS.find(h => h.id === habitId);
    if (!habit) return;
    
    const dateKey = `${habitId}-${formattedDate}`;
    const currentCount = exerciseCount[dateKey] || 0;
    
    if (habit.allowMultiple && habit.id === 'exercise') {
      // For exercise habit that allows multiple claims
      if (currentCount < habit.maxClaimsPerDay) {
        // Increment the count
        const newCount = currentCount + 1;
        setExerciseCount({...exerciseCount, [dateKey]: newCount});
        
        // If this is the first claim, add to completedHabits set
        if (currentCount === 0) {
          const newCompletedHabits = new Set(completedHabits);
          newCompletedHabits.add(habitId);
          setCompletedHabits(newCompletedHabits);
        }
        
        // Tell parent to handle the claim logic
        onHabitComplete(habitId as HabitType, 'earn', formattedDate);
      } else if (currentCount === habit.maxClaimsPerDay) {
        // Reset the count to 0
        setExerciseCount({...exerciseCount, [dateKey]: 0});
        
        // Remove from completedHabits set
        const newCompletedHabits = new Set(completedHabits);
        newCompletedHabits.delete(habitId);
        setCompletedHabits(newCompletedHabits);
        
        // Tell parent to handle the unclaim logic for all instances
        for (let i = 0; i < habit.maxClaimsPerDay; i++) {
          onHabitComplete(habitId as HabitType, 'lose', formattedDate);
        }
      }
    } else {
      // For regular habits that can only be claimed once
      const isCurrentlyCompleted = completedHabits.has(habitId);
      
      if (isCurrentlyCompleted) {
        // If habit is currently completed, unclaim it
        const newCompletedHabits = new Set(completedHabits);
        newCompletedHabits.delete(habitId);
        setCompletedHabits(newCompletedHabits);
        
        // Tell parent to handle the unclaim logic
        onHabitComplete(habitId as HabitType, 'lose', formattedDate);
      } else {
        // If habit is not completed, claim it
        const newCompletedHabits = new Set(completedHabits);
        newCompletedHabits.add(habitId);
        setCompletedHabits(newCompletedHabits);
        
        // Tell parent to handle the claim logic
        onHabitComplete(habitId as HabitType, 'earn', formattedDate);
      }
    }
  }

  const handleExerciseDecrement = (habitId: string) => {
    // Find the habit
    const habit = HABITS.find(h => h.id === habitId);
    if (!habit) return;
    
    const dateKey = `${habitId}-${formattedDate}`;
    const currentCount = exerciseCount[dateKey] || 0;
    
    if (currentCount > 0) {
      // Decrement the count
      const newCount = currentCount - 1;
      setExerciseCount({...exerciseCount, [dateKey]: newCount});
      
      // If this is the last claim, remove from completedHabits set
      if (newCount === 0) {
        const newCompletedHabits = new Set(completedHabits);
        newCompletedHabits.delete(habitId);
        setCompletedHabits(newCompletedHabits);
      }
      
      // Tell parent to handle the unclaim logic
      onHabitComplete(habitId as HabitType, 'lose', formattedDate);
    }
  }

  const dateDisplay = isSelectedToday 
    ? "Today's Habits" 
    : `Habits for ${format(selectedDate, 'MMMM d, yyyy')}`;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{dateDisplay}</h2>
      
      {isFuture(selectedDate) ? (
        <div className="p-4 bg-orange-50 rounded-lg text-orange-800 font-medium">
          You cannot track habits for future dates.
        </div>
      ) : (
        <div className="space-y-3">
          {HABITS.map((habit) => {
            const isCompleted = completedHabits.has(habit.id);
            const dateKey = `${habit.id}-${formattedDate}`;
            const currentCount = exerciseCount[dateKey] || 0;
            const isExerciseWithCounts = habit.id === 'exercise' && habit.allowMultiple;
            
            return (
              <div
                key={habit.id}
                className={`habit-item flex items-center justify-between p-4 rounded-lg shadow-sm border ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{habit.icon}</span>
                  <div>
                    <h3 className="font-medium text-lg" style={habitStyles.habitTitle}>{habit.name}</h3>
                    <div className="flex items-center mt-1">
                      {isCompleted ? (
                        <div className="rounded-full" style={habitStyles.completedBadge}>
                          {isExerciseWithCounts ? (
                            <>✓ Credits Earned: +{habit.credits * currentCount} ({currentCount}/{habit.maxClaimsPerDay})</>
                          ) : (
                            <>✓ Credits Earned: +{habit.credits}</>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium" style={habitStyles.creditText}>
                          {isExerciseWithCounts ? (
                            <>Worth {habit.credits} credits (up to {habit.maxClaimsPerDay} times)</>
                          ) : (
                            <>Worth {habit.credits} credits</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Buttons: Claim, Add More, Subtract or Reset */}
                <div className="flex space-x-2">
                  {isExerciseWithCounts && currentCount > 0 && currentCount < habit.maxClaimsPerDay && (
                    <button
                      onClick={() => handleExerciseDecrement(habit.id)}
                      className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm font-bold"
                      style={habitStyles.unclaimButton}
                    >
                     Substract 
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleHabitToggle(habit.id)}
                    className={isCompleted && (!isExerciseWithCounts || currentCount === habit.maxClaimsPerDay)
                      ? "bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-bold"
                      : "bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold"
                    }
                    style={isCompleted && (!isExerciseWithCounts || currentCount === habit.maxClaimsPerDay) ? habitStyles.unclaimButton : habitStyles.claimButton}
                  >
                    {isExerciseWithCounts ? (
                      currentCount === 0 ? "Claim Credits" :
                      currentCount < habit.maxClaimsPerDay ? "Add Another" : "Reset All"
                    ) : (
                      isCompleted ? "Unclaim Credits" : "Claim Credits"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
} 