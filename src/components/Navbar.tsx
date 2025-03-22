'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isLoading = status === 'loading';

  // Debug information
  // console.log('Session:', session);
  // console.log('Is admin?', isAdmin);
  // console.log('User email:', session?.user?.email);
  // console.log('User role:', session?.user?.role);

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Habit Tracker
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : session ? (
              <>
                <div className="flex items-center gap-2">
                  {session.user?.image && (
                    <div className="relative h-8 w-8 overflow-hidden rounded-full">
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  {/* Show email and role for debugging */}
                  <span className="text-xs text-gray-500">
                    ({session.user?.email} - {session.user?.role || 'no role'})
                  </span>
                </div>

                {isAdmin ? (
                  <Link 
                    href="/admin" 
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Admin
                  </Link>
                ) : (
                  <span className="text-xs text-red-500">Not Admin</span>
                )}

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 