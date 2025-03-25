import { NextResponse } from 'next/server'
import { redis } from '../../../../lib/redis'
import type { UserData } from '../../../../lib/redis'
import { auth } from '@/lib/auth'

// Function to get user-specific data key
function getUserDataKey(userId: string) {
  return `userData:${userId}`
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

    // Only allow admin users to reset data
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get userId from request body if provided, otherwise use session user id
    const body = await request.json().catch(() => ({}));
    const targetUserId = body.userId || session.user.id;
    
    // Get data key for the user
    const dataKey = getUserDataKey(targetUserId);

    // Get current data from Redis
    const currentDataString = await redis.get(dataKey)
    let currentData: UserData = { totalCredits: 0, habits: [], rewards: [] }
    
    if (currentDataString) {
      try {
        currentData = JSON.parse(currentDataString as string) as UserData
      } catch (parseError) {
        console.error('Error parsing existing Redis data:', parseError)
        return NextResponse.json(
          { error: 'Error parsing database data' },
          { status: 500 }
        )
      }
    }

    // Reset total credits to 0
    const updatedData: UserData = {
      ...currentData,
      totalCredits: 0
    }

    // Save back to Redis
    await redis.set(dataKey, JSON.stringify(updatedData))
    
    return NextResponse.json({ 
      success: true, 
      message: `Total credits for user ${targetUserId} have been reset to 0`,
      data: { totalCredits: updatedData.totalCredits }
    })
  } catch (error) {
    console.error('Failed to reset credits:', error)
    return NextResponse.json(
      { error: 'Failed to reset credits', details: String(error) },
      { status: 500 }
    )
  }
} 