import { NextResponse } from 'next/server'
import { redis } from '../../../../lib/redis'
import type { UserData } from '../../../../lib/redis'

const USER_DATA_KEY = 'userData'
const API_KEY = process.env.RESET_API_KEY || 'default-dev-key'  // Set this in your .env.local file

export async function POST(request: Request) {
  try {
    // Verify API key
    const authHeader = request.headers.get('Authorization')
    const apiKey = authHeader?.replace('Bearer ', '')
    
    if (!apiKey || apiKey !== API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // Get current data from Redis
    const currentDataString = await redis.get(USER_DATA_KEY)
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
    await redis.set(USER_DATA_KEY, JSON.stringify(updatedData))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Total credits have been reset to 0',
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