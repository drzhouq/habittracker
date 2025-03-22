import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import { auth } from '@/lib/auth'
import type { User } from '@/lib/auth'
import type { UserData } from '@/lib/redis'

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
      // Add the current user at minimum
      const userData = await redis.get(`user:${session.user.id}`)
      if (userData) {
        const user = JSON.parse(userData as string) as User
        realUsers.push(user)
      }
      
      // Check if Hannah already exists
      const hannahData = await redis.get('user:hannah')
      if (hannahData) {
        try {
          const hannah = JSON.parse(hannahData as string) as User
          if (!realUsers.some(u => u.id === hannah.id)) {
            realUsers.push(hannah)
          }
        } catch (e) {
          console.error('Error parsing Hannah data:', e)
        }
      }
    } catch (error) {
      console.error('Error fetching real users:', error)
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
    const { userId, action, userData, newUser, sourceUserId } = await request.json()
    
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