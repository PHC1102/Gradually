import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChange } from '../services/authService';
import { type User } from 'firebase/auth';
import { ensureUserRecord, getUserProfile, type UserProfile } from '../services/userService';

// Define the shape of our auth context
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  needsProfileSetup: boolean;
  refreshProfile: () => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isEmailVerified: false,
  profile: null,
  profileLoading: true,
  needsProfileSetup: false,
  refreshProfile: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component to wrap the app
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setNeedsProfileSetup(false);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      await ensureUserRecord(currentUser);
      const data = await getUserProfile(currentUser.uid);
      setProfile(data);
      setNeedsProfileSetup(!data || !data.displayName);
    } catch (err) {
      console.error('Failed to load user profile', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsEmailVerified(user ? user.emailVerified : false);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const value = {
    currentUser,
    loading,
    isEmailVerified,
    profile,
    profileLoading,
    needsProfileSetup,
    refreshProfile: loadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};