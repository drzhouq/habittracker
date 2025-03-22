import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import type { UserData } from '../../../lib/redis'
import { auth, getUserDataKeyByEmail } from '@/lib/auth'

// Function to get user-specific data key
function getUserDataKey(userId: string) {
  return `userData:${userId}`
}

export async function GET(request: Request) {
  try {
    // Get user from session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get userId from query parameter or session
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || session.user.id
    
    // Use email-based data key if user is authenticated
    let dataKey = getUserDataKey(userId)
    if (session.user.email) {
      // Prefer email-based key for more consistent data access
      dataKey = getUserDataKeyByEmail(session.user.email)
    }
    
    const data = await redis.get(dataKey)
    
    if (!data) {
      // If no data found with email key, fall back to ID-based key
      if (dataKey !== getUserDataKey(userId)) {
        const idBasedData = await redis.get(getUserDataKey(userId))
        if (idBasedData) {
          // If found with ID, copy it to the email-based key for future use
          await redis.set(dataKey, idBasedData)
          try {
            const parsedData = JSON.parse(idBasedData as string) as UserData
            return NextResponse.json({ rewards: parsedData.rewards || [] })
          } catch (error) {
            console.error('GET: Error parsing ID-based Redis data:', error)
          }
        }
      }
      
      return NextResponse.json({ rewards: [] })
    }

    try {
      const parsedData = JSON.parse(data as string) as UserData
      return NextResponse.json({ rewards: parsedData.rewards || [] })
    } catch (error) {
      console.error('GET: Error parsing Redis data:', error)
      return NextResponse.json(
        { error: 'Invalid data format in Redis' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Redis GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Get user from session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if this is a single reward or an array of rewards
    const body = await request.json()
    const isRewardArray = body.rewards && Array.isArray(body.rewards)
    const rewards = isRewardArray ? body.rewards : (body.id ? [body] : null)
    
    if (!rewards || !Array.isArray(rewards)) {
      return NextResponse.json(
        { error: 'Invalid rewards data' },
        { status: 400 }
      )
    }

    // Get userId from query parameter or session
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || session.user.id
    
    // Use email-based data key if user is authenticated
    let dataKey = getUserDataKey(userId)
    if (session.user.email) {
      // Prefer email-based key for more consistent data access
      dataKey = getUserDataKeyByEmail(session.user.email)
    }

    // Get current data from Redis (try email-based key first)
    let currentDataString = await redis.get(dataKey)
    
    // If no data found with email key, try the ID-based key
    if (!currentDataString && dataKey !== getUserDataKey(userId)) {
      const idBasedData = await redis.get(getUserDataKey(userId))
      if (idBasedData) {
        currentDataString = idBasedData
        // Copy it to the email-based key for future use
        await redis.set(dataKey, idBasedData)
      }
    }
    
    let currentData: UserData = { totalCredits: 0, habits: [], rewards: [] }
    
    if (currentDataString) {
      try {
        currentData = JSON.parse(currentDataString as string) as UserData
      } catch {
        // Continue with empty data if parse error
      }
    }

    // If it's a single reward, update or add it
    if (!isRewardArray && body.id) {
      const existingIndex = currentData.rewards.findIndex(r => r.id === body.id)
      if (existingIndex >= 0) {
        currentData.rewards[existingIndex] = body
      } else {
        currentData.rewards.push(body)
      }
    } else {
      // Replace all rewards
      currentData.rewards = rewards
    }

    const stringifiedData = JSON.stringify(currentData)
    
    // Save to both keys for consistency
    await redis.set(dataKey, stringifiedData)
    
    // Also save to ID-based key for backward compatibility
    if (dataKey !== getUserDataKey(userId)) {
      await redis.set(getUserDataKey(userId), stringifiedData)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Rewards updated successfully',
      rewards: currentData.rewards
    })
  } catch (error) {
    console.error('Rewards Update Error:', error)
    return NextResponse.json(
      { error: 'Failed to update rewards', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Get user from session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the reward ID to delete
    const url = new URL(request.url)
    const rewardId = url.searchParams.get('id')
    
    if (!rewardId) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      )
    }

    // Get userId from session
    const userId = session.user.id
    
    // Use email-based data key if user is authenticated
    let dataKey = getUserDataKey(userId)
    if (session.user.email) {
      // Prefer email-based key for more consistent data access
      dataKey = getUserDataKeyByEmail(session.user.email)
    }

    // Get current data from Redis
    let currentDataString = await redis.get(dataKey)
    
    // If no data found with email key, try the ID-based key
    if (!currentDataString && dataKey !== getUserDataKey(userId)) {
      const idBasedData = await redis.get(getUserDataKey(userId))
      if (idBasedData) {
        currentDataString = idBasedData
        // Copy it to the email-based key for future use
        await redis.set(dataKey, idBasedData)
      }
    }
    
    if (!currentDataString) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      )
    }

    // Parse existing data
    const currentData = JSON.parse(currentDataString as string) as UserData
    
    // Filter out the reward to delete
    currentData.rewards = currentData.rewards.filter(r => r.id !== rewardId)

    // Save updated data to both keys
    const stringifiedData = JSON.stringify(currentData)
    await redis.set(dataKey, stringifiedData)
    
    // Also save to ID-based key for backward compatibility
    if (dataKey !== getUserDataKey(userId)) {
      await redis.set(getUserDataKey(userId), stringifiedData)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reward deleted successfully',
      rewards: currentData.rewards
    })
  } catch (error) {
    console.error('Reward Delete Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete reward', details: String(error) },
      { status: 500 }
    )
  }
} 