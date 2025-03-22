'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DirectAdmin() {
  const { data: session, status } = useSession();
  const [envInfo, setEnvInfo] = useState<Record<string, string | undefined> | null>(null);

  // Fetch environment variables
  useEffect(() => {
    fetch('/api/test-env')
      .then(res => res.json())
      .then(data => setEnvInfo(data))
      .catch(err => console.error('Error fetching env info:', err));
  }, []);

  // Show debug info
  // console.log('Direct admin access - session:', session);
  // console.log('Direct admin access - status:', status);
  // console.log('Direct admin access - admin email check:', ...);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full p-6 bg-white rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Admin Access Debug</h1>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Session Information</h2>
          <p>Session status: <span className="font-medium">{status}</span></p>
          <p>Email: <span className="font-medium">{session?.user?.email || 'Not signed in'}</span></p>
          <p>Role: <span className="font-medium">{session?.user?.role || 'No role'}</span></p>
          
          <h2 className="text-xl font-semibold mt-6">Environment Check</h2>
          {envInfo ? (
            <div className="bg-gray-100 p-3 rounded">
              <p>Admin Email: <span className="font-medium">{envInfo.adminEmail}</span></p>
              <p>Public Admin Email: <span className="font-medium">{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'Not set'}</span></p>
              <p>Google Client ID: <span className="font-medium">{envInfo.googleClientId}</span></p>
              <p>NextAuth Secret: <span className="font-medium">{envInfo.nextAuthSecret}</span></p>
            </div>
          ) : (
            <p>Loading environment info...</p>
          )}
          
          <h2 className="text-xl font-semibold mt-6">Actions</h2>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link 
              href="/admin"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Admin Page
            </Link>
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Go to Home
            </Link>
          </div>
          
          {session && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold">Full Session Data</h2>
              <pre className="bg-gray-100 p-2 text-xs overflow-auto rounded mt-2">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 