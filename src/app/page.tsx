'use client'

import { useState, useEffect } from 'react'
import Calendar from '../components/Calendar'
import HabitTracker from '../components/HabitTracker'
import RewardsSection from '../components/RewardsSection'
import type { HabitRecord, HabitType, UserData } from '../lib/redis'
import { format } from 'date-fns'

const SAMPLE_REWARDS = [
  {
    id: 'lego1',
    name: 'Statue of Liberty 21042 Building ',
    imgUrl:'https://images-na.ssl-images-amazon.com/images/I/51hjJH0ZQyL.jpg',
    amazonUrl: 'https://www.amazon.com/LEGO-Architecture-Skyline-Collection-Building/dp/B0793JTRKG/ref=sr_1_2?crid=2GJJP7A8Q3UBD&dib=eyJ2IjoiMSJ9.X-_8Vr9uRy-Jsz0vXONuEdmgV9d3ai0HKikGuanQd10C-kv-SO9T8l4AqtTEnxLlu28vA9ad4Zr1mTUnKNLHcHlj9B83w2AknfgQC5h26oIPr9crgB1BpcxE9kCUBk47O7WimD5tQ9ZkWu5UJaSFbofXIZE3F0IN9-d4qIYRaymFzf746LDUB4dm2gABzkCZFzPobsJs5u-ykYZYvga1lmdI9VnMmrUTgStSc13F2n6OxojibplLL-CNqFH6xv9W_knALLLRFB2UTrtdWZyfUAhVzWeLI6sUciKRRdHxU1NVjnT7685mM-cV2IUtuyeOs8sVPgWKW2jkDdl0SiGVck1pH6cWcWXx19mx3IMWh08CL7oFin5JcQbeh44l0D-Tx2N_hAHf2jYZVzX2WTxMEpsXBZUCILl1RPQAUt1CnASfELZ9ZLPsDWDzg0oV5_cX.1iYacab0_xARfDtCF4NQcxeUnJ-Hf1NovLiV8pgkB1k&dib_tag=se&keywords=lego+liberty+statue&qid=1742270336&sprefix=lego+lib%2Caps%2C270&sr=8-2',
    credits: 20,
    claimed: false,
  },
  {
    id: 'lego2',
    name: 'Harry Potter Hogwarts Castle ',
    credits: 15,
    imgUrl:'https://m.media-amazon.com/images/I/51GDFubyklL._SL500_.jpg',
    claimed: false,
    amazonUrl: 'https://www.amazon.com/LEGO-Harry-Potter-Hogwarts-Castle/dp/B0CRVWM2M9/ref=sr_1_4?crid=1DGP40V76UL90&dib=eyJ2IjoiMSJ9.7mytZDc0VjjEChtXtsY3BqQzUg0D3VEDYyW75sfoirTbhINDg37kSFP1aDs4piFR9e3wlUouyiD2RuIc8hWQmZAW9xwWrV3jWWEGz_Cd2Ovm_-4vUJMnZaRE2x6NLxjDu6OXcIuFqyWjJ_-DNirzBIM8EWMhddBHQZGBi-jbpEOYA2uNA17kIVovPlGcXY8y5u7TxwVBiFK6xbFQsOPOHHAwpKcTIYsWBC48KaJiGntR0YbeSDECo6sF_suQKu8jB36uh0Mp5EVDcv_-fo3fNfg8vWzgkQnDOJTO3A7da2HLXp2ZIkVa3m02gEbJm3SXmaQJuK5T7IElp2ICea2iuNMG2FOLeBkHUtCZiEVZBGQG-OcQSCBQLiAiHLPcZ4MmtVZ9K1JTVfkX30fhlez6Az7dhthx6w3QOkTLxJokneNvKA7yM-yFPmJAR1X0aUIg._y99nBKD3iV-SVN09B7rSb3C0N9hSJXR7N5mQUDIx-w&dib_tag=se&keywords=lego+harry+potter+hogwarts+castle&qid=1742270381&sprefix=lego+harrypotter%2Caps%2C222&sr=8-4'
  },
  {
    id: 'lego3',
    name: 'The Legend of Zelda',
    imgUrl:'https://m.media-amazon.com/images/I/71uf1g8VKoL._AC_SX679_.jpg',
    credits: 30,
    claimed: false,
    amazonUrl: 'https://www.amazon.com/YEABRICKS-Legend-Building-Blocks-Included/dp/B0DHYX4DDY/ref=sr_1_1_sspa?crid=1HIBAAWBO0TQP&dib=eyJ2IjoiMSJ9.9garP5co2V_99TzBUlzEhgmol1Hr3MRx5uWHrHTIjTVhczTH58rVWHQjRtIiaHjndCSYpFTcaSGTkrJr4GXaHuOlk6-04ZeYrm4HuBA3O62QT_oXGNutoP_TmUwHlwc121NoZIfp7In2KtP-zaPP4B9Od9Gu7ebPDsvgLHLRsz6nPN4CiSvBRMTQ1VeUkfwhFY3QJBxfTxIAaRfqgMM_UkFJOJuEmm7z4hB2vTCZ3gLZ0G5u47vzrmwe89NZnTPT91O8pCeShvpFu72XqfKRQCoFqnjG57b-h3_vUB_z7Tw.58DvpwnhiI3Ilu-KFpk7jeQow2ZUgaPA4vRxIfEwhc0&dib_tag=se&keywords=zelda+great+deku+tree+lego&qid=1742269284&sprefix=Zelda%3A+Great+Deku+Tree%2Caps%2C152&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1'
  },
]

const INITIAL_USER_DATA: UserData = {
  totalCredits: 0,
  habits: [],
  rewards: SAMPLE_REWARDS,
};

export default function Home() {
  const [userData, setUserData] = useState<UserData>(INITIAL_USER_DATA);
  //const [isResetting, setIsResetting] = useState(false);
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/habits');
        const data = await response.json();
        if (Object.keys(data).length > 0) {
          setUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    
    //if (!isResetting) {
      fetchData();
    //}
  }, []);

  // Update completedHabits when userData or selectedDate changes
  useEffect(() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const selectedDateCompletedHabits = userData.habits
      .filter(h => h.date === dateString && h.action === 'earn')
      .map(h => h.habit);
    
    setCompletedHabits(new Set(selectedDateCompletedHabits));
  }, [userData.habits, selectedDate]);

  const saveData = async (data: UserData) => {
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const handleHabitComplete = async (habit: HabitType, action: 'earn' | 'lose', date: string) => {
    // Find the credit value for this habit
    const habitConfig = [
      { id: 'sleep', credits: 2 },
      { id: 'smoothie', credits: 1 },
      { id: 'exercise', credits: 2 },
      { id: 'social_media', credits: 1 }
    ].find(h => h.id === habit);
    
    const creditValue = habitConfig?.credits || 1;
    
    // If this is an "unclaim" action, we need to first check if there's an existing claim for the selected date
    if (action === 'lose') {
      // Find the record for this habit with 'earn' action on the selected date
      const existingRecord = userData.habits.find(
        h => h.habit === habit && h.date === date && h.action === 'earn'
      );
      
      if (!existingRecord) {
        console.warn(`Tried to unclaim habit ${habit} that wasn't claimed on ${date}`);
        return; // Don't do anything if we're trying to unclaim something not claimed
      }
      
      // Remove the existing record from habits
      const newHabits = userData.habits.filter(h => 
        !(h.habit === habit && h.date === date && h.action === 'earn')
      );
      
      // Update the user data without adding a new record
      const newUserData = {
        ...userData,
        totalCredits: Math.max(0, userData.totalCredits - creditValue), // Prevent negative
        habits: newHabits,
      };
      
      setUserData(newUserData);
      await saveData(newUserData);
      return;
    }
    
    // Normal "earn" action - add a new record
    const newHabit: HabitRecord = {
      date,
      habit,
      action,
      credits: creditValue,
    };

    const newUserData = {
      ...userData,
      totalCredits: userData.totalCredits + creditValue,
      habits: [...userData.habits, newHabit],
    };

    setUserData(newUserData);
    await saveData(newUserData);
  }

  const handleClaimReward = async (rewardId: string) => {
    const reward = userData.rewards.find((r) => r.id === rewardId)
    if (!reward) {
      return
    }

    let newUserData: UserData;
    
    if (reward.claimed) {
      // Unclaim: add credits back to total
      newUserData = {
        ...userData,
        totalCredits: userData.totalCredits + reward.credits,
        rewards: userData.rewards.map((r) =>
          r.id === rewardId ? { ...r, claimed: false } : r
        ),
      }
    } else {
      // Claim: subtract credits from total (only if user has enough)
      if (userData.totalCredits < reward.credits) {
        return;
      }
      
      newUserData = {
        ...userData,
        totalCredits: userData.totalCredits - reward.credits,
        rewards: userData.rewards.map((r) =>
          r.id === rewardId ? { ...r, claimed: true } : r
        ),
      }
    }

    setUserData(newUserData)
    await saveData(newUserData)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
/*
  const updateRewards = async (newRewards: Array<{
    id: string;
    name: string;
    imgUrl?: string;
    credits: number;
    claimed: boolean;
  }>) => {
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewards: newRewards }),
      });
      
      if (response.ok) {
        // Refresh the page or update the local state
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update rewards:', error);
    }
  };
*/

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-purple-800">
             Hannah&apos;s Healthy Habits Journey! 🌟
          </h1>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-md">
          <RewardsSection
            totalCredits={userData.totalCredits}
            rewards={userData.rewards}
            onClaimReward={handleClaimReward}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-md">
            <Calendar 
              habits={userData.habits} 
              onDateSelect={handleDateSelect}
            />
          </div>
          
          <div>
            <div className="bg-white p-3 rounded-lg shadow-md">
              <HabitTracker 
                onHabitComplete={handleHabitComplete} 
                completedHabits={completedHabits}
                setCompletedHabits={setCompletedHabits}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
