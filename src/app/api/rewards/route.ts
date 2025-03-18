import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import type { UserData } from '../../../lib/redis'

const USER_DATA_KEY = 'userData'

export async function POST(request: Request) {
  try {
    console.log('POST: Parsing rewards request body...')
    const { rewards } = await request.json()
    console.log('POST: Received rewards data:', rewards)
    
    if (!rewards || !Array.isArray(rewards)) {
      console.log('POST: Invalid rewards data received')
      return NextResponse.json(
        { error: 'Invalid rewards data' },
        { status: 400 }
      )
    }

    // Get current data from Redis
    const currentDataString = await redis.get(USER_DATA_KEY)
    let currentData: UserData = { totalCredits: 0, habits: [], rewards: [] }
    
    if (currentDataString) {
      try {
        currentData = JSON.parse(currentDataString as string) as UserData
      } catch (parseError) {
        console.error('POST: Error parsing existing Redis data:', parseError)
        // Continue with empty data if parse error
      }
    }

    // Update the rewards while preserving other data
    const updatedData: UserData = {
      ...currentData,
      rewards: rewards,
    }

    const stringifiedData = JSON.stringify(updatedData)
    console.log('POST: Saving updated data to Redis')
    
    await redis.set(USER_DATA_KEY, stringifiedData)
    return NextResponse.json({ 
      success: true, 
      message: 'Rewards updated successfully',
      data: updatedData
    })
  } catch (error) {
    console.error('Rewards Update Error:', error)
    return NextResponse.json(
      { error: 'Failed to update rewards', details: String(error) },
      { status: 500 }
    )
  }
} 