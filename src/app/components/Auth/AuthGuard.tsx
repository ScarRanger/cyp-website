'use client';

import { useEffect, useState } from 'react';
import Spinner from '../Spinner';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Warm Espresso Theme Colors
const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);

      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      (async () => {
        try {
          if ((user.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            setIsAuthorized(true);
          } else {
            const adminDocRef = doc(db, ADMIN_COLLECTION, user.email || '');
            const adminDoc = await getDoc(adminDocRef);
            const isAdmin = adminDoc.exists();
            setIsAuthorized(isAdmin);

            if (!isAdmin) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <Spinner
          size={80}
          ringWidth={6}
          label="Authenticating"
          trackClassName="border-white/20"
          ringClassName="border-t-[#FB923C]"
          labelClassName="text-[#FAFAFA]"
        />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="max-w-md w-full space-y-8 p-8 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold" style={{ color: theme.text }}>
              Admin Access Required
            </h2>
            <p className="mt-2 text-sm opacity-70" style={{ color: theme.text }}>
              Please sign in with your authorized Google account
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md transition-colors hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: '#1C1917' }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>

            <div className="text-center">
              <p className="text-xs opacity-50" style={{ color: theme.text }}>
                Only authorized administrators can access this page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {children}
    </div>
  );
}
