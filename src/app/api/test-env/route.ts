import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    adminEmail: process.env.ADMIN_EMAIL || 'Not set',
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Is set' : 'Not set',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Is set' : 'Not set',
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'Is set' : 'Not set',
    // Don't return actual values of sensitive env vars
  });
} 