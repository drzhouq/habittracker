import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    // Get user from session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow admin users to access sensitive environment information
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      adminEmail: process.env.ADMIN_EMAIL || 'Not set',
      googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Is set' : 'Not set',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Is set' : 'Not set',
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'Is set' : 'Not set',
      // Don't return actual values of sensitive env vars
    });
  } catch (error) {
    console.error('Error accessing environment information:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve environment information' },
      { status: 500 }
    );
  }
} 