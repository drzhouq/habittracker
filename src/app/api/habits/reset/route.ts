import { NextResponse } from 'next/server'
import { redis } from '../../../../lib/redis'

const USER_DATA_KEY = 'userData'

export async function POST() {
  try {
    // Use the custom redis client's del method
    // The exported redis client already handles connections
    await redis.del(USER_DATA_KEY)
    
    return NextResponse.json({ success: true, message: 'Database reset successful' })
  } catch (error) {
    console.error('Failed to reset database:', error)
    return NextResponse.json(
      { error: 'Failed to reset database', details: String(error) },
      { status: 500 }
    )
  }
} 