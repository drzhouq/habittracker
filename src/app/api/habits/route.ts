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
    
    // console.log('GET: Fetching from Redis:', dataKey)
    const data = await redis.get(dataKey)
    
    if (!data) {
      // If no data found with email key, fall back to ID-based key
      if (dataKey !== getUserDataKey(userId)) {
        const idBasedData = await redis.get(getUserDataKey(userId))
        if (idBasedData) {
          // If found with ID, copy it to the email-based key for future use
          await redis.set(dataKey, idBasedData)
          return NextResponse.json(JSON.parse(idBasedData as string))
        }
      }
      
      // Still no data, return empty data structure
      const emptyData: UserData = {
        totalCredits: 0,
        habits: [],
        rewards: []
      }
      return NextResponse.json(emptyData)
    }

    try {
      
      // Try to parse as JSON, if it fails, return the raw data
      try {
        const parsedData = JSON.parse(data as string);
        return NextResponse.json(parsedData);
      } catch (parseError) {
        // If parsing fails, it might be a simple string value (like a UUID)
        // Return it as is in a simple object, with empty arrays for habits and rewards
        console.log("parseError", parseError)
        return NextResponse.json({
          value: data,
          totalCredits: 0,
          habits: [],
          rewards: []
        });
      }
    } catch (error) {
      console.error('GET: Error handling Redis data:', error);
      return NextResponse.json(
        { error: 'Invalid data format in Redis' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Redis GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
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
    
    // console.log('POST: Parsing request body...')
    const data: UserData = await request.json()
    // console.log('POST: Received data:', data)
    
    if (!data) {
      // console.log('POST: No data received')
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
      )
    }

    // Get userId from request body or session
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || session.user.id
    
    // Use email-based data key if user is authenticated
    let dataKey = getUserDataKey(userId)
    if (session.user.email) {
      // Prefer email-based key for more consistent data access
      dataKey = getUserDataKeyByEmail(session.user.email)
    }

    const stringifiedData = JSON.stringify(data)
    // console.log('POST: Stringified data:', stringifiedData)
    
    await redis.set(dataKey, stringifiedData)
    
    // If using email key, also update the ID-based key for backward compatibility
    if (dataKey !== getUserDataKey(userId)) {
      await redis.set(getUserDataKey(userId), stringifiedData)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Redis POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
} 