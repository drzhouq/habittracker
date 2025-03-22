'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Reward {
  id: string;
  name: string;
  credits: number;
  claimed: boolean;
  imgUrl?: string;
  amazonUrl?: string;
}

interface UserData {
  totalCredits: number;
  habits: Record<string, unknown>[];
  rewards: Reward[];
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
}

interface CategoryTotal {
  category: string;
  totalCredits: number;
  count: number;
}

interface MonthlyTotal {
  month: string;
  exercise: number;
  sleep: number;
  smoothie: number;
  screentime: number;
  [key: string]: number | string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
  });
  const [sourceUserId, setSourceUserId] = useState<string>('');
  const [newReward, setNewReward] = useState<Partial<Reward>>({
    name: '',
    credits: 0,
    imgUrl: '',
    amazonUrl: '',
  });

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/');
    } else {
      fetchRewards();
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/rewards');
      const data = await response.json();
      setRewards(data.rewards || []);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      // console.log('Fetched users data:', data);
      
      if (data.users && Array.isArray(data.users)) {
        // Add legacy user if not already present
        const hasLegacyUser = data.users.some((user: User) => user.id === 'legacy');
        if (!hasLegacyUser) {
          data.users.push({
            id: 'legacy',
            name: 'Legacy Data (Pre-Login)',
            email: 'legacy@example.com',
            role: 'user' as const,
          });
        }
        
        // Check if Hannah is already included
        const hasHannah = data.users.some((user: User) => 
          user.id === 'hannah' || user.email === 'hannah.c.zhou@gmail.com'
        );
        
        if (!hasHannah) {
          // Try to get Hannah's data directly
          try {
            const hannahResponse = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: 'hannah',
                action: 'getUserData',
              }),
            });
            
            if (hannahResponse.ok) {
              data.users.push({
                id: 'hannah',
                name: 'Hannah Zhou',
                email: 'hannah.c.zhou@gmail.com',
                role: 'user' as const,
              });
            }
          } catch (error) {
            console.error('Error fetching Hannah data:', error);
          }
        }
        
        setUsers(data.users);
      } else {
        const defaultUsers: User[] = [{
          id: 'legacy',
          name: 'Legacy Data (Pre-Login)',
          email: 'legacy@example.com',
          role: 'user',
        }];
        
        // Try to add Hannah to the default list
        try {
          const hannahResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: 'hannah',
              action: 'getUserData',
            }),
          });
          
          if (hannahResponse.ok) {
            defaultUsers.push({
              id: 'hannah',
              name: 'Hannah Zhou',
              email: 'hannah.c.zhou@gmail.com',
              role: 'user' as const,
            });
          }
        } catch (error) {
          console.error('Error fetching Hannah data:', error);
        }
        
        setUsers(defaultUsers);
      }
      
      // console.log('Users after processing:', users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Fallback to at least showing legacy user
      setUsers([{
        id: 'legacy',
        name: 'Legacy Data (Pre-Login)',
        email: 'legacy@example.com',
        role: 'user' as const,
      }]);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      // console.log('Fetching user data for ID:', userId);
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'getUserData',
        }),
      });
      
      const data = await response.json();
      // console.log('Fetched user data:', data);
      
      if (data.userData) {
        setSelectedUserData(data.userData);
        setSelectedUserId(userId);
      } else {
        console.error('No user data found in response:', data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newReward,
          claimed: false,
          id: `reward-${Date.now()}`,
        }),
      });
      
      if (response.ok) {
        setNewReward({
          name: '',
          credits: 0,
          imgUrl: '',
          amazonUrl: '',
        });
        fetchRewards();
      }
    } catch (error) {
      console.error('Failed to add reward:', error);
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      await fetch(`/api/rewards?id=${id}`, {
        method: 'DELETE',
      });
      fetchRewards();
    } catch (error) {
      console.error('Failed to delete reward:', error);
    }
  };

  const handleAddUserReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedUserData) return;

    try {
      // Get the selected reward from the form
      const form = e.target as HTMLFormElement;
      const rewardId = form.rewardId.value;
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) return;
      
      // Add reward to user's rewards list
      const updatedUserData = {
        ...selectedUserData,
        rewards: [...selectedUserData.rewards, { ...reward, claimed: false }]
      };
      
      // Update user data
      const response = await fetch(`/api/habits?userId=${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUserData),
      });
      
      if (response.ok) {
        setSelectedUserData(updatedUserData);
      }
    } catch (error) {
      console.error('Failed to add reward to user:', error);
    }
  };

  const handleDeleteUserReward = async (rewardId: string) => {
    if (!selectedUserId || !selectedUserData) return;

    try {
      // Filter out the reward to delete
      const updatedUserData = {
        ...selectedUserData,
        rewards: selectedUserData.rewards.filter(r => r.id !== rewardId)
      };
      
      // Update user data
      const response = await fetch(`/api/habits?userId=${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUserData),
      });
      
      if (response.ok) {
        setSelectedUserData(updatedUserData);
      }
    } catch (error) {
      console.error('Failed to delete user reward:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createUser',
          newUser,
          sourceUserId: sourceUserId || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reset the form
        setNewUser({ name: '', email: '' });
        setSourceUserId('');
        
        // Refresh the user list
        fetchUsers();
        
        alert(`User ${newUser.email} created successfully!`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals for each habit category
  const calculateCategoryTotals = (habits: Record<string, unknown>[]): CategoryTotal[] => {
    const categoryMap = new Map<string, CategoryTotal>();
    
    habits.forEach(habit => {
      if (habit.habit && habit.credits) {
        const category = habit.habit as string;
        const existingCategory = categoryMap.get(category);
        
        if (existingCategory) {
          existingCategory.totalCredits += Number(habit.credits);
          existingCategory.count += 1;
        } else {
          categoryMap.set(category, {
            category,
            totalCredits: Number(habit.credits),
            count: 1
          });
        }
      }
    });
    
    return Array.from(categoryMap.values()).sort((a, b) => b.totalCredits - a.totalCredits);
  };

  // Calculate monthly totals for categories
  const calculateMonthlyTotals = (habits: Record<string, unknown>[]): MonthlyTotal[] => {
    const monthlyMap = new Map<string, MonthlyTotal>();
    
    // Process habits to calculate monthly totals
    habits.forEach(habit => {
      if (habit.date && habit.habit && habit.credits) {
        // Format as YYYY-MM for grouping
        const date = new Date(habit.date as string);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const displayMonth = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const category = (habit.habit as string).toLowerCase();
        const credits = Number(habit.credits);
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: displayMonth,
            exercise: 0,
            sleep: 0,
            smoothie: 0,
            screentime: 0,
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        
        // Add credits to the appropriate category or to 'other'
        if (category === 'exercise' || category === 'sleep' || 
            category === 'smoothie' || category === 'screentime') {
          monthData[category] = (monthData[category] as number) + credits;
        }
      }
    });
    
    // Convert to array and sort by date (oldest to newest)
    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      {/* Create User Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Create New User</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label htmlFor="name" className="block font-medium text-indigo-600">
                User Name
              </label>
              <input
                type="text"
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block font-medium text-indigo-600">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="sourceUser" className="block font-medium text-indigo-600">
                Copy Data From User (Optional)
              </label>
              <select
                id="sourceUser"
                value={sourceUserId}
                onChange={(e) => setSourceUserId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Don&apos;t copy data --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                If selected, the new user will have the same rewards and credits as this user.
              </p>
            </div>
            
            <div>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* User Management Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">User Management</h2>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <li className="px-4 py-4 sm:px-6">No users found</li>
              ) : (
                users.map((user) => (
                  <li key={user.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {user.image && (
                          <div className="relative h-10 w-10 mr-4 overflow-hidden rounded-full">
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full  font-medium bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => fetchUserData(user.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                      >
                        Manage Rewards
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Selected User Rewards Section */}
        {selectedUserData && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">
                User Data: {users.find(u => u.id === selectedUserId)?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Credits: {selectedUserData.totalCredits}
              </p>
            </div>
            
            {/* Habit Tracker History */}
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Habit Tracker History</h3>
              
              {selectedUserData.habits.length === 0 ? (
                <p className="text-sm text-gray-500">No habit history found for this user</p>
              ) : (
                <>
                  {/* Category Totals */}
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Category Totals</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {calculateCategoryTotals(selectedUserData.habits).map((category) => (
                        <div 
                          key={category.category} 
                          className="bg-white p-3 rounded-md border border-gray-200 shadow-sm"
                        >
                          <p className="font-medium text-indigo-600">{category.category}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-500 text-sm">{category.count} entries</span>
                            <span className="font-semibold">{category.totalCredits} credits</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Trends Chart */}
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Trends</h4>
                    
                    {calculateMonthlyTotals(selectedUserData.habits).length === 0 ? (
                      <p className="text-sm text-gray-500">Not enough data to show monthly trends</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Exercise</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Sleep</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Smoothie</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">Screentime</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {calculateMonthlyTotals(selectedUserData.habits).map((monthData, index) => (
                              <tr key={`month-${index}-${monthData.month}`}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{monthData.month}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 bg-green-50">
                                  {monthData.exercise ? (
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (monthData.exercise / 10) * 100)}%` }}></div>
                                      </div>
                                      {monthData.exercise}
                                    </div>
                                  ) : '0'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 bg-blue-50">
                                  {monthData.sleep ? (
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (monthData.sleep / 10) * 100)}%` }}></div>
                                      </div>
                                      {monthData.sleep}
                                    </div>
                                  ) : '0'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 bg-purple-50">
                                  {monthData.smoothie ? (
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (monthData.smoothie / 5) * 100)}%` }}></div>
                                      </div>
                                      {monthData.smoothie}
                                    </div>
                                  ) : '0'}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 bg-red-50">
                                  {monthData.screentime ? (
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                        <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (monthData.screentime / 5) * 100)}%` }}></div>
                                      </div>
                                      {monthData.screentime}
                                    </div>
                                  ) : '0'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habit</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedUserData.habits
                          .sort((a, b) => {
                            const dateA = new Date(a.date as string);
                            const dateB = new Date(b.date as string);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((habit, index) => (
                          <tr key={`${habit.date}-${habit.habit}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{habit.date as string}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">{habit.habit as string}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">{habit.action as string}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">{habit.credits as number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{(habit.notes as string) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">User Rewards</h3>
              
              <form onSubmit={handleAddUserReward} className="mb-4">
                <div className="flex space-x-2">
                  <select 
                    name="rewardId"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="">Select a reward to add</option>
                    {rewards.map(reward => (
                      <option key={reward.id} value={reward.id}>
                        {reward.name} ({reward.credits} credits)
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add
                  </button>
                </div>
              </form>
              
              <div className="space-y-4">
                {selectedUserData.rewards.length === 0 ? (
                  <p className="text-sm text-gray-500">No rewards found for this user</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {selectedUserData.rewards.map((reward) => (
                      <li key={reward.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                          {reward.imgUrl && (
                            <div className="relative h-16 w-16 mr-4 overflow-hidden rounded">
                              <Image
                                src={reward.imgUrl}
                                alt={reward.name}
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{reward.name}</p>
                            <p className="text-sm text-gray-500">{reward.credits} credits</p>
                            {reward.claimed && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Claimed
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteUserReward(reward.id)}
                          className="text-red-600 hover:text-red-900 focus:outline-none"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add New Global Reward Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Add New Reward</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleAddReward} className="space-y-4">
            <div>
              <label htmlFor="name" className="block font-medium text-indigo-600">
                Reward Name
              </label>
              <input
                type="text"
                id="name"
                value={newReward.name}
                onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="credits" className="block font-medium text-indigo-600">
                Credits Required
              </label>
              <input
                type="number"
                id="credits"
                value={newReward.credits}
                onChange={(e) => setNewReward({ ...newReward, credits: parseInt(e.target.value) })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                min="1"
              />
            </div>
            
            <div>
              <label htmlFor="imgUrl" className="block font-medium text-indigo-600">
                Image URL
              </label>
              <input
                type="url"
                id="imgUrl"
                value={newReward.imgUrl}
                onChange={(e) => setNewReward({ ...newReward, imgUrl: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="amazonUrl" className="block font-medium text-indigo-600">
                Amazon URL
              </label>
              <input
                type="url"
                id="amazonUrl"
                value={newReward.amazonUrl}
                onChange={(e) => setNewReward({ ...newReward, amazonUrl: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Reward
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Manage Global Rewards Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Manage Global Rewards</h2>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {rewards.length === 0 ? (
              <li className="px-4 py-4 sm:px-6">No rewards found</li>
            ) : (
              rewards.map((reward) => (
                <li key={reward.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center">
                    {reward.imgUrl && (
                      <div className="relative h-16 w-16 mr-4 overflow-hidden rounded">
                        <Image
                          src={reward.imgUrl}
                          alt={reward.name}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{reward.name}</p>
                      <p className="text-sm text-gray-500">{reward.credits} credits</p>
                      {reward.claimed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Claimed
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteReward(reward.id)}
                    className="text-red-600 hover:text-red-900 focus:outline-none"
                  >
                    Delete
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 