'use client';

import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, db } from '@/app/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Owner email is hardcoded and always authorized. Do NOT allow this account to be removed via the UI.
const OWNER_EMAIL = 'rhine.pereira@gmail.com';
const ADMIN_COLLECTION = 'cyp_admins';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  // const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);

      // if no user, not authorized
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Async check against Firestore admins collection (owner bypasses this)
      (async () => {
        try {
          if ((user.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            setIsAuthorized(true);
          } else {
            const q = query(collection(db, ADMIN_COLLECTION), where('email', '==', user.email));
            const snap = await getDocs(q);
            const isAdmin = !snap.empty;
            setIsAuthorized(isAdmin);

            if (!isAdmin) {
              // Sign out unauthorized users
              await signOut(auth);
              setUser(null);
            }
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAuthorized(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  // sign-out is performed automatically for unauthorized users above

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Admin Access Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in with your authorized Google account
            </p>
          </div>
          
          <div className="mt-8 space-y-6">
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Only authorized administrators can access this page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
