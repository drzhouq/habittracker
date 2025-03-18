import { NextResponse } from 'next/server'
import { redis } from '../../../lib/redis'
import type { UserData } from '../../../lib/redis'

const USER_DATA_KEY = 'userData'

export async function GET() {
  try {
    console.log('GET: Fetching data for key:', USER_DATA_KEY)
    const data = await redis.get(USER_DATA_KEY)
    console.log('GET: Raw data from Redis:', data)
    
    if (!data) {
      console.log('GET: No data found, returning default')
      return NextResponse.json({ totalCredits: 0, habits: [], rewards: [] })
    }

    try {
      const parsedData = JSON.parse(data as string) as UserData
      console.log('GET: Parsed data:', parsedData)
      return NextResponse.json(parsedData)
    } catch (parseError) {
      console.error('GET: Error parsing Redis data:', parseError)
      return NextResponse.json(
        { error: 'Invalid data format in Redis' },
        { status: 500 }
      )
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
    console.log('POST: Parsing request body...')
    const data: UserData = await request.json()
    console.log('POST: Received data:', data)
    
    if (!data) {
      console.log('POST: No data received')
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
      )
    }

    const stringifiedData = JSON.stringify(data)
    console.log('POST: Stringified data:', stringifiedData)
    
    await redis.set(USER_DATA_KEY, stringifiedData)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Redis POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    )
  }
} 