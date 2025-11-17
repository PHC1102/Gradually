import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  type User
} from 'firebase/auth';

// Types
type AuthCallback = (user: User | null) => void;

// Register a new user with email and password
export const registerUser = async (email: string, password: string) => {
  try {
    // Validate email domain (only Gmail and Microsoft)
    const allowedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com'];
    const emailDomain = email.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      return { success: false, user: null, error: 'Only Gmail, Outlook, Hotmail, Live, MSN, and Yahoo accounts are allowed.' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    return { 
      success: true, 
      user: userCredential.user, 
      error: null,
      message: 'Registration successful. Please check your email for verification instructions.'
    };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.code === 'auth/configuration-not-found') {
      errorMessage = 'Authentication is not properly configured. Please check Firebase project settings.';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email address is already in use.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    }
    return { success: false, user: null, error: errorMessage };
  }
};

// Login user with email and password
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      return { 
        success: false, 
        user: null, 
        error: 'Please verify your email before logging in. Check your inbox for the verification email.' 
      };
    }
    
    return { success: true, user: userCredential.user, error: null };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.code === 'auth/configuration-not-found') {
      errorMessage = 'Authentication is not properly configured. Please check Firebase project settings.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email address.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { success: false, user: null, error: errorMessage };
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    let errorMessage = error.message;
    if (error.code === 'auth/configuration-not-found') {
      errorMessage = 'Authentication is not properly configured. Please check Firebase project settings.';
    }
    return { success: false, error: errorMessage };
  }
};

// Listen for auth state changes
export const onAuthStateChange = (callback: AuthCallback) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};