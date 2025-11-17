import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChange } from '../services/authService';
import { type User } from 'firebase/auth';

// Define the shape of our auth context
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isEmailVerified: boolean;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true, // Changed default loading to true
  isEmailVerified: false,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsEmailVerified(user ? user.emailVerified : false);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    isEmailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};