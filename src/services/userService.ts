import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebaseConfig';

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: Date;
}

const defaultAvatar = 'default';

export async function ensureUserRecord(user: User): Promise<void> {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const email = user.email ?? '';
  const baseData = {
    userId: user.uid,
    email,
    emailLower: email ? email.toLowerCase() : '',
    avatarUrl: user.photoURL ?? defaultAvatar,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...baseData,
      displayName: user.displayName ?? '',
      createdAt: serverTimestamp(),
      joinedOrganizations: [],
    });
  } else {
    await setDoc(
      userRef,
      {
        ...baseData,
        displayName: snap.data()?.displayName ?? user.displayName ?? '',
      },
      { merge: true },
    );
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserProfile(userId: string, updates: { displayName: string; avatarUrl?: string | null }) {
  const ref = doc(db, 'users', userId);
  await setDoc(
    ref,
    {
      displayName: updates.displayName.trim(),
      avatarUrl: updates.avatarUrl ?? defaultAvatar,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

