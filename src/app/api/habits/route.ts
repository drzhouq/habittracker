import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import type { UserData } from '../../../lib/redis'
import { auth } from '@/lib/auth'

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
    
    // Always use ID-based key for user data
    const dataKey = getUserDataKey(userId)
    
    // console.log('GET: Fetching from Redis:', dataKey)
    const data = await redis.get(dataKey)
    
    if (!data) {
      // Return empty data structure
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
    
    // Always use ID-based key for user data
    const dataKey = getUserDataKey(userId)

    const stringifiedData = JSON.stringify(data)
    // console.log('POST: Stringified data:', stringifiedData)
    
    await redis.set(dataKey, stringifiedData)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Redis POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
} 