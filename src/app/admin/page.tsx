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
  const [duplicateUsers, setDuplicateUsers] = useState<{[email: string]: User[]}>({});
  const [showOAuthUsers, setShowOAuthUsers] = useState(false);

  // Helper to determine if a user is likely from OAuth
  const isLikelyOAuthUser = (user: User): boolean => {
    // Google OAuth users typically have IDs starting with "google-oauth2"
    // or have Google profile images
    return user.id.startsWith('google-oauth2') || 
           Boolean(user.image?.includes('googleusercontent.com')) ||
           // Check for other OAuth providers
           user.id.startsWith('github') ||
           user.id.startsWith('facebook') ||
           user.id.startsWith('auth0');
  };

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
        
        // Find duplicates by email
        const duplicates: {[email: string]: User[]} = {};
        const emails = new Map<string, User[]>();
        
        data.users.forEach((user: User) => {
          if (!user.email) return;
          
          const existing = emails.get(user.email) || [];
          existing.push(user);
          emails.set(user.email, existing);
        });
        
        // Keep only emails with multiple users
        emails.forEach((userList, email) => {
          if (userList.length > 1) {
            duplicates[email] = userList;
          }
        });
        
        setDuplicateUsers(duplicates);
        
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

  const handleDeleteUser = async (userId: string) => {
    // Special message for Legacy data
    const isLegacy = userId === 'legacy';
    const confirmMessage = isLegacy
      ? `Are you sure you want to delete all legacy data? This will remove all pre-login habit tracking data and cannot be undone.`
      : `Are you sure you want to delete this user and all their data? This action cannot be undone.`;
      
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          userId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the user list
        fetchUsers();
        
        // Clear selected user if they were deleted
        if (selectedUserId === userId) {
          setSelectedUserId(null);
          setSelectedUserData(null);
        }
        
        const successMessage = isLegacy
          ? 'Legacy data deleted successfully!'
          : 'User deleted successfully!';
        
        alert(successMessage);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. See console for details.');
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

  const handleBulkDeleteDuplicates = async (email: string, keepUserId: string) => {
    if (!confirm(`Are you sure you want to consolidate all accounts with email ${email} into user ${keepUserId}? All other accounts with this email will be deleted.`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const usersToDelete = duplicateUsers[email].filter(user => user.id !== keepUserId);
      
      // Delete each duplicate user one by one
      for (const user of usersToDelete) {
        await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteUser',
            userId: user.id,
          }),
        });
      }
      
      // Refresh users list
      await fetchUsers();
      
      alert(`Successfully consolidated all accounts to user ${keepUserId} and deleted ${usersToDelete.length} duplicate accounts.`);
    } catch (error) {
      console.error('Error consolidating user accounts:', error);
      alert('Failed to consolidate user accounts. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutomaticCleanup = async () => {
    if (!confirm('This will automatically clean up duplicate users by keeping the oldest account for each email address and deleting the rest. Continue?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanupDuplicates',
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh users list
        await fetchUsers();
        
        alert(`${result.message}\nDeleted users: ${result.deletedUsers.join(', ') || 'None'}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in automatic cleanup:', error);
      alert('Failed to run automatic cleanup. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Find all OAuth users in the system
  const oauthUsers = users.filter(isLikelyOAuthUser);

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
      
      {/* OAuth Users Display Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 bg-blue-50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-blue-800">OAuth Users in System</h2>
            <button
              onClick={() => setShowOAuthUsers(!showOAuthUsers)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showOAuthUsers ? 'Hide OAuth Users' : 'Show OAuth Users'}
            </button>
          </div>
          <p className="mt-1 text-sm text-blue-600">
            OAuth users are accounts created through Google or other providers. They are indicated by an OAuth badge.
          </p>
        </div>
        
        {showOAuthUsers && (
          <div className="border-t border-gray-200">
            {oauthUsers.length === 0 ? (
              <div className="px-4 py-5">
                <p className="text-sm text-gray-700">No OAuth users found in the system.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {oauthUsers.map(user => (
                  <li key={user.id} className="px-4 py-4 sm:px-6">
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
                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                        <p className="text-xs text-gray-500 truncate max-w-md">{user.image}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* Redis Debug Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 bg-purple-50">
          <h2 className="text-lg font-medium text-purple-800">Redis Database Maintenance</h2>
          <p className="mt-1 text-sm text-purple-600">
            Advanced tools for debugging and fixing Redis database issues.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5">
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={async () => {
                if (confirm('This will list all Redis keys. Continue?')) {
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/users', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        action: 'listAllRedisKeys',
                      }),
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                      console.log('Redis keys:', result);
                      alert(
                        `Found ${result.keyCount.total} Redis keys:\n` +
                        `- ${result.keyCount.userKeys} user keys\n` +
                        `- ${result.keyCount.userDataKeys} userData keys\n` +
                        `- ${result.keyCount.emailMappingKeys} email mapping keys\n` +
                        `- ${result.keyCount.otherKeys} other keys\n\n` +
                        `See browser console for details.`
                      );
                    } else {
                      alert(`Error: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('Error listing Redis keys:', error);
                    alert('Failed to list Redis keys. See console for details.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              List All Redis Keys
            </button>
            
            <button
              onClick={handleAutomaticCleanup}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Run Enhanced Cleanup (Fix User Keys)
            </button>
            
            <button
              onClick={async () => {
                if (confirm('This will fix all email-based userData keys by migrating them to ID-based keys and ensuring proper email mappings. Continue?')) {
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/users', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        action: 'fixEmailBasedKeys',
                      }),
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                      console.log('Fix results:', result);
                      alert(
                        `${result.message}\n\n` +
                        `See browser console for complete details.`
                      );
                    } else {
                      alert(`Error: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('Error fixing email-based keys:', error);
                    alert('Failed to fix email-based keys. See console for details.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Fix Email-Based Keys
            </button>
          </div>
          
          {/* Quick Fix Guide */}
          <div className="mt-6 border-t border-gray-200 pt-4 mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-2">Quick Fix Guide</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Fix Issue with Hannah Email Mapping:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Click List All Redis Keys and check the console</li>
                <li>Find Hannah user ID from the <code>userKeys</code> array (likely starting with <code>user:55bd8164...</code>)</li>
                <li>Check if <code>user:email:hannah.c.zhou@gmail.com</code> exists</li>
                <li>If missing, use the Set Key form below to create it:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Key: <code>user:email:hannah.c.zhou@gmail.com</code></li>
                    <li>Value: Hannahs user ID (from step 2)</li>
                  </ul>
                </li>
                <li>Delete any incorrect keys like <code>userData:email:hannah.c.zhou@gmail.com</code></li>
              </ol>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Tip:</strong> User data should only be stored by ID in <code>userData:&#123;userId&#125;</code> keys, 
                with email mappings in <code>user:email:&#123;email&#125;</code> keys.
              </p>
            </div>
          </div>
          
          {/* Add form for Redis key management */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-2">Set/Update Redis Key</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="redisKey" className="block text-sm font-medium text-gray-700">
                  Redis Key
                </label>
                <input
                  type="text"
                  id="redisKey"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., user:email:hannah.c.zhou@gmail.com"
                />
              </div>
              <div>
                <label htmlFor="redisValue" className="block text-sm font-medium text-gray-700">
                  Redis Value
                </label>
                <input
                  type="text"
                  id="redisValue"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., 55bd8164-f5d3-49cd-8fe4-038558515b01"
                />
              </div>
              <div>
                <button
                  onClick={async () => {
                    const keyInput = document.getElementById('redisKey') as HTMLInputElement;
                    const valueInput = document.getElementById('redisValue') as HTMLInputElement;
                    
                    const key = keyInput.value.trim();
                    const value = valueInput.value.trim();
                    
                    if (!key || !value) {
                      alert('Both key and value are required');
                      return;
                    }
                    
                    if (!confirm(`Are you sure you want to set Redis key "${key}" to value "${value}"?`)) {
                      return;
                    }
                    
                    setIsLoading(true);
                    try {
                      const response = await fetch('/api/users', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          action: 'setRedisKey',
                          key,
                          value,
                        }),
                      });
                      
                      const result = await response.json();
                      if (result.success) {
                        alert(`Successfully set Redis key "${key}" to value "${value}"`);
                        keyInput.value = '';
                        valueInput.value = '';
                      } else {
                        alert(`Error: ${result.error}`);
                      }
                    } catch (error) {
                      console.error('Error setting Redis key:', error);
                      alert('Failed to set Redis key. See console for details.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Set Key
                </button>
              </div>
            </div>
          </div>
          
          {/* Add form to delete a Redis key */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-700 mb-2">Delete Redis Key</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="deleteRedisKey" className="block text-sm font-medium text-gray-700">
                  Redis Key to Delete
                </label>
                <input
                  type="text"
                  id="deleteRedisKey"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., userData:email:drzhouq@gmail.com"
                />
              </div>
              <div>
                <button
                  onClick={async () => {
                    const keyInput = document.getElementById('deleteRedisKey') as HTMLInputElement;
                    const key = keyInput.value.trim();
                    
                    if (!key) {
                      alert('Key is required');
                      return;
                    }
                    
                    if (!confirm(`Are you sure you want to delete Redis key "${key}"?`)) {
                      return;
                    }
                    
                    setIsLoading(true);
                    try {
                      const response = await fetch('/api/users', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          action: 'deleteRedisKey',
                          userId: key,
                        }),
                      });
                      
                      const result = await response.json();
                      if (result.success) {
                        alert(`Successfully deleted Redis key "${key}"`);
                        keyInput.value = '';
                      } else {
                        alert(`Error: ${result.error}`);
                      }
                    } catch (error) {
                      console.error('Error deleting Redis key:', error);
                      alert('Failed to delete Redis key. See console for details.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Duplicate Users Management Section */}
      {Object.keys(duplicateUsers).length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 bg-yellow-50">
            <h2 className="text-lg font-medium text-yellow-800">Duplicate Users Detected</h2>
            <p className="mt-1 text-sm text-yellow-600">
              The following emails have multiple user accounts. OAuth accounts (from Google) are marked with an OAuth badge.
              It is recommended to keep the OAuth accounts to maintain login capabilities.
            </p>
            <div className="mt-3 flex space-x-4">
              <button
                onClick={handleAutomaticCleanup}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Run Automatic Cleanup (Prefers OAuth)
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {Object.entries(duplicateUsers).map(([email, userList]) => (
              <div key={email} className="px-4 py-5 border-b border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  {email} ({userList.length} accounts)
                </h3>
                <div className="space-y-4">
                  {userList.map(user => (
                    <div key={user.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div>
                        <div className="flex items-center mb-1">
                          {user.image && (
                            <div className="relative h-8 w-8 mr-3 overflow-hidden rounded-full">
                              <Image
                                src={user.image}
                                alt={user.name}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <p className="text-sm font-medium">{user.name}</p>
                          {isLikelyOAuthUser(user) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              OAuth
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                        <p className="text-xs text-gray-500">Role: {user.role}</p>
                        {user.image && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">Image: {user.image}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleBulkDeleteDuplicates(email, user.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                        >
                          Consolidate to This Account
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                        >
                          Delete This Account
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => fetchUserData(user.id)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                        >
                          Manage Rewards
                        </button>
                        {(user.role !== 'admin') && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                          >
                            Delete User
                          </button>
                        )}
                      </div>
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