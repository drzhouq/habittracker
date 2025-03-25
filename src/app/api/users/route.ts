import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import { auth, normalizeEmail } from '@/lib/auth'
import type { User } from '@/lib/auth'
import type { UserData } from '@/lib/redis'
import { createClient } from 'redis'

// Helper function to scan all keys matching a pattern using a direct Redis client
async function scanKeys(pattern: string): Promise<string[]> {
  // Check if we're running on Vercel in development
  // const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Get Redis URL from env
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }
  
  // Create a temporary client with the full API
  const client = createClient({ url: redisUrl });
  
  try {
    await client.connect();
    
    // Use scan to get all matching keys
    const keys: string[] = [];
    let cursor = 0;
    do {
      const scanResult = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = scanResult.cursor;
      keys.push(...scanResult.keys);
    } while (cursor !== 0);
    
    return keys;
  } finally {
    // Ensure client is disconnected
    await client.disconnect();
  }
}

export async function GET() {
  try {
    // Get user from session
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all user keys
    const realUsers: User[] = []
    
    try {
      // Find all user keys in Redis
      const userKeys = await scanKeys('user:*');
      console.log(`Found ${userKeys.length} user keys:`, userKeys);
      
      // Get data for each key and parse into User objects
      for (const key of userKeys) {
        // Skip email mapping keys (they start with user:email:)
        if (key.startsWith('user:email:')) continue;
        
        const userData = await redis.get(key);
        if (userData) {
          try {
            // console.log(`Raw userData for key ${key}:`, userData);
            const user = JSON.parse(userData as string) as User;
            // Only add users we haven't seen before (by ID)
            if (!realUsers.some(u => u.id === user.id)) {
              realUsers.push(user);
            }
          } catch (e) {
            console.error(`Error parsing user data for key ${key}:`, e);
          }
        }
      }
      
      // If we found no users, at least add the current admin
      if (realUsers.length === 0) {
        const userData = await redis.get(`user:${session.user.id}`);
        if (userData) {
          try {
            console.log(`Raw admin userData for ${session.user.id}:`, userData);
            const user = JSON.parse(userData as string) as User;
            realUsers.push(user);
          } catch (e) {
            console.error('Error parsing admin user data:', e);
          }
        }
      }
      
      // Log what we found
      console.log(`Found ${realUsers.length} real users in Redis`);
    } catch (error) {
      console.error('Error fetching real users:', error);
    }

    // Add a virtual legacy user to represent pre-login data
    const users = [
      ...realUsers,
      {
        id: 'legacy',
        name: 'Legacy Data (Pre-Login)',
        email: 'legacy@example.com',
        role: 'user',
      }
    ]

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// Function to get user-specific data key
function getUserDataKey(userId: string) {
  return `userData:${userId}`
}

// Legacy data key (pre-login)
const LEGACY_DATA_KEY = 'userData';

// Get rewards for a specific user
export async function POST(request: Request) {
  try {
    // Get user from session
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the requested user's data
    const requestData = await request.json()
    const { userId, action, userData, newUser, sourceUserId, key, value } = requestData
    
    // Different actions to perform
    if (action === 'getUserData') {
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }
      
      // Special case for legacy data
      if (userId === 'legacy') {
        const legacyData = await redis.get(LEGACY_DATA_KEY);
        
        if (!legacyData) {
          return NextResponse.json({ 
            userId,
            userData: { totalCredits: 0, habits: [], rewards: [] } 
          });
        }
        
        try {
          console.log('Raw legacy data:', legacyData);
          const parsedData = JSON.parse(legacyData as string);
          return NextResponse.json({
            userId,
            userData: parsedData
          });
        } catch (error) {
          console.error('Error parsing legacy data:', error);
          return NextResponse.json(
            { error: 'Invalid legacy data format' },
            { status: 500 }
          );
        }
      }
      
      // Special case for Hannah - check all accounts with her email
      if (userId === 'hannah') {
        console.log('Handling special case for Hannah');
        // First try the direct 'hannah' key
        const hannahData = await redis.get(getUserDataKey('hannah'));
        console.log('Retrieved hannah data from redis:', hannahData);
        
        // If found, return this data
        if (hannahData) {
          try {
            console.log('Raw hannah data:', hannahData);
            const parsedData = JSON.parse(hannahData as string);
            return NextResponse.json({
              userId,
              userData: parsedData
            });
          } catch (error) {
            console.error('Error parsing hannah data:', error);
          }
        }
        
        // If not found, try to find any OAuth accounts with her email
        try {
          const userKeys = await scanKeys('user:*');
          console.log('Looking for Hannah in user keys:', userKeys);
          for (const key of userKeys) {
            const userData = await redis.get(key);
            console.log(`Checking key ${key} for Hannah's email:`, userData);
            if (userData) {
              try {
                const user = JSON.parse(userData as string) as User;
                console.log(`User from ${key}:`, user);
                if (user.email === 'hannah.c.zhou@gmail.com') {
                  // Found an OAuth user with Hannah's email
                  console.log(`Found OAuth account for Hannah: ${user.id}`);
                  
                  // Try to get this user's data
                  const oauthUserDataKey = getUserDataKey(user.id);
                  const oauthUserData = await redis.get(oauthUserDataKey);
                  
                  if (oauthUserData) {
                    try {
                      console.log(`Raw userData for ${user.id} (Hannah's OAuth):`, oauthUserData);
                      const parsedData = JSON.parse(oauthUserData as string);
                      return NextResponse.json({
                        userId: user.id, // Return the actual OAuth user ID
                        userData: parsedData
                      });
                    } catch (error) {
                      console.error(`Error parsing OAuth user data for ${user.id}:`, error);
                    }
                  }
                }
              } catch (e) {
                console.error(`Error checking user data for key ${key}:`, e);
              }
            }
          }
        } catch (error) {
          console.error('Error searching for OAuth accounts:', error);
        }
      }
      
      // Normal user data handling
      const dataKey = getUserDataKey(userId)
      const data = await redis.get(dataKey)
      
      if (!data) {
        return NextResponse.json({ 
          userId,
          userData: { totalCredits: 0, habits: [], rewards: [] } 
        })
      }

      try {
        console.log(`Raw userData for ${userId}:`, data);
        const parsedData = JSON.parse(data as string)
        return NextResponse.json({
          userId,
          userData: parsedData
        })
      } catch (error) {
        console.error('Error parsing user data:', error)
        return NextResponse.json(
          { error: 'Invalid data format' },
          { status: 500 }
        )
      }
    } 
    else if (action === 'createUser') {
      if (!newUser || !newUser.email || !newUser.name) {
        return NextResponse.json(
          { error: 'User email and name are required' },
          { status: 400 }
        )
      }
      
      // Generate a new user ID
      let newUserId = `user-${Date.now()}`
      
      // Special case for Hannah
      if (newUser.email === 'hannah.c.zhou@gmail.com') {
        newUserId = 'hannah'
      }
      
      // Create the new user object
      const user: User = {
        id: newUserId,
        name: newUser.name,
        email: newUser.email,
        role: 'user',
        image: newUser.image || '',
      }
      
      // Save the user to Redis
      // console.log('Creating user:', user)
      await redis.set(`user:${newUserId}`, JSON.stringify(user))
      
      // If source user ID is provided, copy their data
      if (sourceUserId) {
        let sourceData;
        
        // Handle legacy data case
        if (sourceUserId === 'legacy') {
          sourceData = await redis.get(LEGACY_DATA_KEY);
          // console.log('Got legacy data:', sourceData ? 'yes' : 'no')
        } else {
          // Normal user data
          const sourceDataKey = getUserDataKey(sourceUserId);
          sourceData = await redis.get(sourceDataKey);
        }
        
        if (sourceData) {
          try {
            // We don't need to parse here since we're just copying the raw data
            const targetDataKey = getUserDataKey(newUserId)
            await redis.set(targetDataKey, sourceData)
            // console.log('Copied data to user:', newUserId)
          } catch (error) {
            console.error('Error copying user data:', error)
          }
        }
      } else {
        // Initialize empty user data
        const emptyUserData: UserData = {
          totalCredits: 0,
          habits: [],
          rewards: []
        }
        const targetDataKey = getUserDataKey(newUserId)
        await redis.set(targetDataKey, JSON.stringify(emptyUserData))
      }
      
      return NextResponse.json({
        success: true,
        user
      })
    }
    else if (action === 'updateUserData') {
      if (!userId || !userData) {
        return NextResponse.json(
          { error: 'User ID and data are required' },
          { status: 400 }
        )
      }
      
      const dataKey = getUserDataKey(userId)
      await redis.set(dataKey, JSON.stringify(userData))
      
      return NextResponse.json({
        success: true,
        userId,
        userData
      })
    }
    else if (action === 'createHannahDirectly') {
      // Get legacy data
      const legacyData = await redis.get(LEGACY_DATA_KEY);
      
      if (!legacyData) {
        return NextResponse.json({ 
          error: 'No legacy data found' 
        }, { status: 404 });
      }
      
      // Create the Hannah user
      const hannah: User = {
        id: 'hannah',
        name: 'Hannah Zhou',
        email: 'hannah.c.zhou@gmail.com',
        role: 'user',
        image: '',
      }
      
      // Save Hannah to Redis
      await redis.set('user:hannah', JSON.stringify(hannah))
      
      // Copy legacy data to Hannah
      await redis.set('userData:hannah', legacyData)
      
      // Parse and return full user data
      const parsedData = JSON.parse(legacyData as string) as UserData;
      
      return NextResponse.json({
        success: true,
        message: 'Created Hannah account with legacy data',
        user: hannah,
        userData: parsedData
      })
    }
    else if (action === 'deleteHannah') {
      // Delete Hannah's user data
      await redis.del('user:hannah');
      await redis.del('userData:hannah');
      
      return NextResponse.json({
        success: true,
        message: 'Hannah account deleted'
      })
    }
    else if (action === 'deleteUser') {
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }
      
      // Don't allow deletion of the admin user
      if (userId === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot delete your own admin account' },
          { status: 400 }
        )
      }
      
      // Special handling for legacy user
      if (userId === 'legacy') {
        await redis.del(LEGACY_DATA_KEY);
        
        return NextResponse.json({
          success: true,
          message: 'Legacy data deleted'
        });
      }
      
      // Delete user data and user profile
      await redis.del(`userData:${userId}`);
      await redis.del(`user:${userId}`);
      
      return NextResponse.json({
        success: true,
        message: `User ${userId} deleted`
      })
    }
    else if (action === 'cleanupDuplicates') {
      // Identify and clean up duplicate users
      try {
        // Find all user keys
        const userKeys = await scanKeys('user:*');
        const emailMappingKeys = userKeys.filter(key => key.startsWith('user:email:'));
        const regularUserKeys = userKeys.filter(key => !key.startsWith('user:email:'));
        const users: User[] = [];
        
        console.log(`Found ${regularUserKeys.length} user keys and ${emailMappingKeys.length} email mapping keys`);
        
        // Get all users
        for (const key of regularUserKeys) {
          const userData = await redis.get(key);
          if (userData) {
            try {
              console.log(`Raw userData for key ${key}:`, userData);
              const user = JSON.parse(userData as string) as User;
              users.push(user);
            } catch (e) {
              console.error(`Error parsing user data for key ${key}:`, e);
            }
          }
        }
        
        // Find duplicates by email
        const emailMap = new Map<string, User[]>();
        const deletedUsers: string[] = [];
        
        users.forEach((user) => {
          if (!user.email) return;
          
          const existing = emailMap.get(user.email) || [];
          existing.push(user);
          emailMap.set(user.email, existing);
        });
        
        // Helper to determine if a user is likely from OAuth
        const isLikelyOAuthUser = (user: User): boolean => {
          return user.id.startsWith('google-oauth2') || 
                 Boolean(user.image?.includes('googleusercontent.com')) ||
                 user.id.startsWith('github') ||
                 user.id.startsWith('facebook') ||
                 user.id.startsWith('auth0');
        };
        
        // Process duplicates - for each set of duplicates, prioritize OAuth accounts
        for (const [email, duplicates] of emailMap.entries()) {
          if (duplicates.length <= 1) continue;
          
          // First check if any are OAuth accounts - prefer those
          const oauthUsers = duplicates.filter(isLikelyOAuthUser);
          
          // If we have OAuth users, keep the first OAuth user and delete the rest
          // Otherwise, keep the oldest account by ID (assuming IDs have timestamps)
          if (oauthUsers.length > 0) {
            const toKeep = oauthUsers[0]; // Keep the first OAuth user
            console.log(`Keeping OAuth user ${toKeep.id} for email ${email}`);
            
            // Ensure email mapping points to the kept user
            const normalizedEmail = normalizeEmail(email);
            const userEmailKey = `user:email:${normalizedEmail}`;
            await redis.set(userEmailKey, toKeep.id);
            
            // Delete all users except the one to keep
            for (const user of duplicates) {
              if (user.id !== toKeep.id) {
                // Skip admin users
                if (user.role === 'admin') continue;
                
                // Handle legacy data
                if (user.id === 'legacy') {
                  await redis.del(LEGACY_DATA_KEY);
                } else {
                  // Delete duplicate user data
                  await redis.del(`userData:${user.id}`);
                  await redis.del(`user:${user.id}`);
                }
                
                deletedUsers.push(user.id);
              }
            }
          } else {
            // Sort by ID to find the oldest (assuming IDs have timestamps)
            duplicates.sort((a, b) => a.id.localeCompare(b.id));
            
            // Keep the first one (oldest) and delete the rest
            const toKeep = duplicates[0];
            console.log(`Keeping oldest user ${toKeep.id} for email ${email}`);
            
            // Ensure email mapping points to the kept user
            const normalizedEmail = normalizeEmail(email);
            const userEmailKey = `user:email:${normalizedEmail}`;
            await redis.set(userEmailKey, toKeep.id);
            
            for (let i = 1; i < duplicates.length; i++) {
              const toDelete = duplicates[i];
              
              // Skip admin users
              if (toDelete.role === 'admin') continue;
              
              // Handle legacy data
              if (toDelete.id === 'legacy') {
                await redis.del(LEGACY_DATA_KEY);
              } else {
                // Delete duplicate user data
                await redis.del(`userData:${toDelete.id}`);
                await redis.del(`user:${toDelete.id}`);
              }
              
              deletedUsers.push(toDelete.id);
            }
          }
        }
        
        // Clean up any orphaned email mappings
        const validUserIds = users
          .filter(user => !deletedUsers.includes(user.id))
          .map(user => user.id);
        
        for (const key of emailMappingKeys) {
          const mappedUserId = await redis.get(key);
          if (mappedUserId && !validUserIds.includes(mappedUserId)) {
            console.log(`Deleting orphaned email mapping: ${key} -> ${mappedUserId}`);
            await redis.del(key);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Cleanup complete. Kept one user per email (preferring OAuth accounts) and deleted ${deletedUsers.length} duplicate accounts.`,
          deletedUsers
        });
      } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        return NextResponse.json(
          { error: 'Failed to clean up duplicates', details: String(error) },
          { status: 500 }
        );
      }
    }
    else if (action === 'deleteRedisKey') {
      // Admin-only action to delete a specific Redis key
      if (!userId) {
        return NextResponse.json(
          { error: 'Key is required' },
          { status: 400 }
        )
      }
      
      try {
        // Delete the specified key
        console.log(`Attempting to delete Redis key: ${userId}`);
        await redis.del(userId);
        
        return NextResponse.json({
          success: true,
          message: `Redis key '${userId}' deleted successfully`
        });
      } catch (error) {
        console.error('Error deleting Redis key:', error);
        return NextResponse.json(
          { error: 'Failed to delete Redis key', details: String(error) },
          { status: 500 }
        );
      }
    }
    else if (action === 'listAllRedisKeys') {
      try {
        // Find all keys in Redis for debugging
        const userKeys = await scanKeys('user:*');
        const userDataKeys = await scanKeys('userData:*');
        const emailMappingKeys = userKeys.filter(key => key.startsWith('user:email:'));
        const regularUserKeys = userKeys.filter(key => !key.startsWith('user:email:'));
        const allOtherKeys = await scanKeys('*');
        
        // Filter out keys we've already found
        const otherKeys = allOtherKeys.filter(key => 
          !key.startsWith('user:') && 
          !key.startsWith('userData:')
        );
        
        // Get values for the email mappings to show what they point to
        const emailMappingValues: Record<string, string> = {};
        for (const key of emailMappingKeys) {
          const value = await redis.get(key);
          if (value) {
            emailMappingValues[key] = value;
          }
        }
        
        return NextResponse.json({
          success: true,
          keyCount: {
            userKeys: regularUserKeys.length,
            userDataKeys: userDataKeys.length,
            emailMappingKeys: emailMappingKeys.length,
            otherKeys: otherKeys.length,
            total: allOtherKeys.length
          },
          keys: {
            userKeys: regularUserKeys,
            userDataKeys,
            emailMappingKeys,
            emailMappingValues,
            otherKeys
          }
        });
      } catch (error) {
        console.error('Error listing all Redis keys:', error);
        return NextResponse.json(
          { error: 'Failed to list Redis keys', details: String(error) },
          { status: 500 }
        );
      }
    }
    else if (action === 'setRedisKey') {
      // Admin-only action to set a specific Redis key
      if (!key || value === undefined) {
        return NextResponse.json(
          { error: 'Key and value are required' },
          { status: 400 }
        );
      }
      
      try {
        console.log(`Setting Redis key: ${key} to value: ${value}`);
        await redis.set(key, value);
        
        return NextResponse.json({
          success: true,
          message: `Redis key '${key}' set successfully`,
          key,
          value
        });
      } catch (error) {
        console.error('Error setting Redis key:', error);
        return NextResponse.json(
          { error: 'Failed to set Redis key', details: String(error) },
          { status: 500 }
        );
      }
    }
    else if (action === 'fixEmailBasedKeys') {
      // Comprehensive fix for email-based keys
      try {
        // Step 1: Scan for all keys
        const userKeys = await scanKeys('user:*');
        const userDataKeys = await scanKeys('userData:*');
        const emailMappingKeys = userKeys.filter(key => key.startsWith('user:email:'));
        const regularUserKeys = userKeys.filter(key => !key.startsWith('user:email:'));
        
        console.log(`Found ${regularUserKeys.length} user keys, ${userDataKeys.length} userData keys, and ${emailMappingKeys.length} email mapping keys`);
        
        // Track fixed keys for reporting
        const fixedEmailMappings: string[] = [];
        const migratedDataKeys: string[] = [];
        const deletedKeys: string[] = [];
        
        // Step 2: Get all users and validate
        const users: User[] = [];
        const emailBasedDataKeys: string[] = [];
        
        // Find basic user objects
        for (const key of regularUserKeys) {
          const userData = await redis.get(key);
          if (userData) {
            try {
              console.log(`Raw userData for key ${key}:`, userData);
              const user = JSON.parse(userData as string) as User;
              users.push(user);
            } catch (e) {
              console.error(`Error parsing user data for key ${key}:`, e);
            }
          }
        }
        
        // Find email-based userData keys that need migration
        for (const key of userDataKeys) {
          if (key.startsWith('userData:email:')) {
            emailBasedDataKeys.push(key);
          }
        }
        
        console.log(`Found ${users.length} valid users and ${emailBasedDataKeys.length} email-based data keys to fix`);
        
        // Step 3: Ensure email mappings exist for all users
        for (const user of users) {
          if (!user.email) continue;
          
          const normalizedEmail = normalizeEmail(user.email);
          const userEmailKey = `user:email:${normalizedEmail}`;
          
          // Check if mapping exists
          let hasMapping = false;
          for (const key of emailMappingKeys) {
            if (key === userEmailKey) {
              hasMapping = true;
              break;
            }
          }
          
          // Create mapping if needed
          if (!hasMapping) {
            console.log(`Creating missing email mapping: ${userEmailKey} -> ${user.id}`);
            await redis.set(userEmailKey, user.id);
            fixedEmailMappings.push(userEmailKey);
          }
        }
        
        // Step 4: Migrate data from email-based userData keys to ID-based keys
        for (const emailKey of emailBasedDataKeys) {
          // Extract email from key (userData:email:xxx@yyy.com)
          const email = emailKey.substring(13); // Remove 'userData:email:'
          
          // Get the user ID for this email
          const normalizedEmail = normalizeEmail(email);
          const userEmailKey = `user:email:${normalizedEmail}`;
          const userId = await redis.get(userEmailKey);
          
          if (userId) {
            // Get the data from email-based key
            const emailData = await redis.get(emailKey);
            
            if (emailData) {
              // Create/update ID-based key
              const idKey = `userData:${userId}`;
              await redis.set(idKey, emailData);
              console.log(`Migrated data from ${emailKey} to ${idKey}`);
              migratedDataKeys.push(emailKey);
              
              // Delete the email-based key
              await redis.del(emailKey);
              console.log(`Deleted email-based key: ${emailKey}`);
              deletedKeys.push(emailKey);
            }
          } else {
            console.log(`Cannot find user ID for email key: ${emailKey}`);
          }
        }
        
        // Step 5: Clean up any leftover email-based keys
        const remainingEmailKeys = await scanKeys('userData:email:*');
        for (const key of remainingEmailKeys) {
          console.log(`Deleting orphaned email-based key: ${key}`);
          await redis.del(key);
          deletedKeys.push(key);
        }
        
        return NextResponse.json({
          success: true,
          message: `Fixed ${fixedEmailMappings.length} email mappings, migrated ${migratedDataKeys.length} data keys, and deleted ${deletedKeys.length} obsolete keys.`,
          details: {
            fixedEmailMappings,
            migratedDataKeys,
            deletedKeys
          }
        });
      } catch (error) {
        console.error('Error fixing email-based keys:', error);
        return NextResponse.json(
          { error: 'Failed to fix email-based keys', details: String(error) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing user request:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    )
  }
} 