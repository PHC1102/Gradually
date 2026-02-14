import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, onSnapshot, deleteField, type Unsubscribe } from 'firebase/firestore';
import type { Task, CompletedTask } from '../types';

// Export deleteField for use in other services
export { deleteField };

// Define return types
interface FirebaseResult<T = null> {
  success: boolean;
  id?: string | null;
  tasks?: T[];
  error: string | null;
}

// Firebase operation timeouts
const FIREBASE_TIMEOUT = 10000;      // 30 seconds for writes (increased from 10s)
const FIREBASE_READ_TIMEOUT = 10000; // 30 seconds for reads (increased from 15s)

// Helper function to add timeout to Firebase operations
// Note: If the error happens BEFORE the timeout, it will reject immediately
// This helps catch permission errors (PERMISSION_DENIED) without waiting
const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firebase operation timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Collection references
const tasksCollection = collection(db, 'tasks');
const completedTasksCollection = collection(db, 'completedTasks');

// Add a new task
export const addTaskToFirebase = async (task: Omit<Task, 'id'>): Promise<FirebaseResult<string>> => {
  try {
    console.log('Attempting to add task to Firebase:', task);
    const docRef = await withTimeout(addDoc(tasksCollection, task), FIREBASE_TIMEOUT);
    console.log('✅ Task added successfully with ID:', docRef.id);
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    // Log the actual error type
    const errorCode = error?.code || 'unknown';
    const errorMsg = error?.message || 'Unknown error';
    
    if (errorCode === 'permission-denied') {
      console.error('❌ PERMISSION DENIED - Firestore rules do not allow writes. Check security rules in Firebase Console.');
      console.error('Error details:', errorMsg);
    } else if (errorCode === 'unauthenticated') {
      console.error('❌ UNAUTHENTICATED - User is not logged in. Please log in first.');
      console.error('Error details:', errorMsg);
    } else if (errorMsg.includes('timeout')) {
      console.error('❌ TIMEOUT - Firebase operation took too long. Check your internet connection.');
      console.error('Error details:', errorMsg);
    } else {
      console.error('❌ Error adding task to Firebase:', errorMsg);
    }
    
    return { success: false, id: null, error: errorMsg };
  }
};

// Get all tasks for a user
export const getTasksFromFirebase = async (userId: string): Promise<FirebaseResult<Task>> => {
  try {
    console.log('Fetching tasks for user:', userId);
    const q = query(tasksCollection, where('userId', '==', userId));
    const querySnapshot = await withTimeout(getDocs(q), FIREBASE_READ_TIMEOUT);
    const tasks: Task[] = [];
    
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });
    
    console.log('✅ Found', tasks.length, 'tasks for user:', userId);
    return { success: true, tasks, error: null };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMsg = error?.message || 'Unknown error';
    
    if (errorCode === 'permission-denied') {
      console.error('❌ PERMISSION DENIED - Firestore rules do not allow reads. Check security rules in Firebase Console.');
      console.error('Error details:', errorMsg);
    } else if (errorCode === 'unauthenticated') {
      console.error('❌ UNAUTHENTICATED - User is not logged in. Please log in first.');
      console.error('Error details:', errorMsg);
    } else if (errorMsg.includes('timeout')) {
      console.error('❌ TIMEOUT - Firebase operation took too long. Check your internet connection.');
      console.error('Error details:', errorMsg);
    } else {
      console.error('❌ Error fetching tasks from Firebase:', errorMsg);
    }
    
    return { success: false, tasks: [], error: errorMsg };
  }
};

// Update a task
export const updateTaskInFirebase = async (taskId: string, updates: Partial<Task>): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'tasks', taskId);
    await withTimeout(updateDoc(taskDoc, updates), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};

// Delete a task
export const deleteTaskFromFirebase = async (taskId: string): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'tasks', taskId);
    await withTimeout(deleteDoc(taskDoc), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};

// Add a completed task
export const addCompletedTaskToFirebase = async (task: Omit<CompletedTask, 'id'>): Promise<FirebaseResult<string>> => {
  try {
    const docRef = await withTimeout(addDoc(completedTasksCollection, task), FIREBASE_TIMEOUT);
    console.log('✅ Completed task added successfully with ID:', docRef.id);
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMsg = error?.message || 'Unknown error';
    
    if (errorCode === 'permission-denied') {
      console.error('❌ PERMISSION DENIED - Firestore rules do not allow writes. Check security rules in Firebase Console.');
      console.error('Error details:', errorMsg);
    } else if (errorCode === 'unauthenticated') {
      console.error('❌ UNAUTHENTICATED - User is not logged in. Please log in first.');
      console.error('Error details:', errorMsg);
    } else if (errorMsg.includes('timeout')) {
      console.error('❌ TIMEOUT - Firebase operation took too long. Check your internet connection.');
      console.error('Error details:', errorMsg);
    } else {
      console.error('❌ Error adding completed task to Firebase:', errorMsg);
    }
    
    return { success: false, id: null, error: errorMsg };
  }
};

// Get all completed tasks for a user
export const getCompletedTasksFromFirebase = async (userId: string): Promise<FirebaseResult<CompletedTask>> => {
  try {
    console.log('Fetching completed tasks for user:', userId);
    const q = query(completedTasksCollection, where('userId', '==', userId));
    const querySnapshot = await withTimeout(getDocs(q), FIREBASE_READ_TIMEOUT);
    const tasks: CompletedTask[] = [];
    
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as CompletedTask);
    });
    
    console.log('✅ Found', tasks.length, 'completed tasks for user:', userId);
    return { success: true, tasks, error: null };
  } catch (error: any) {
    const errorCode = error?.code || 'unknown';
    const errorMsg = error?.message || 'Unknown error';
    
    if (errorCode === 'permission-denied') {
      console.error('❌ PERMISSION DENIED - Firestore rules do not allow reads. Check security rules in Firebase Console.');
      console.error('Error details:', errorMsg);
    } else if (errorCode === 'unauthenticated') {
      console.error('❌ UNAUTHENTICATED - User is not logged in. Please log in first.');
      console.error('Error details:', errorMsg);
    } else if (errorMsg.includes('timeout')) {
      console.error('❌ TIMEOUT - Firebase operation took too long. Check your internet connection.');
      console.error('Error details:', errorMsg);
    } else {
      console.error('❌ Error fetching completed tasks from Firebase:', errorMsg);
    }
    
    return { success: false, tasks: [], error: errorMsg };
  }
};

// Update a completed task
export const updateCompletedTaskInFirebase = async (taskId: string, updates: Partial<CompletedTask>): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'completedTasks', taskId);
    await withTimeout(updateDoc(taskDoc, updates), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};

// Delete a completed task
export const deleteCompletedTaskFromFirebase = async (taskId: string): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'completedTasks', taskId);
    await withTimeout(deleteDoc(taskDoc), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};

// ===== PROJECT TASKS (NEW) =====

/**
 * Get project tasks path
 */
const getProjectTasksCollection = (orgId: string, projectId: string) => {
  return collection(db, 'organizations', orgId, 'projects', projectId, 'tasks');
};

/**
 * Get all tasks for a project
 */
export const getProjectTasks = async (orgId: string, projectId: string): Promise<FirebaseResult<Task>> => {
  try {
    console.log('Fetching tasks for project:', projectId);
    const tasksRef = getProjectTasksCollection(orgId, projectId);
    const querySnapshot = await withTimeout(getDocs(tasksRef), FIREBASE_READ_TIMEOUT);
    const tasks: Task[] = [];
    
    querySnapshot.forEach((docSnap) => {
      tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    
    console.log('✅ Found', tasks.length, 'tasks for project:', projectId);
    return { success: true, tasks, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('❌ Error fetching project tasks:', errorMsg);
    return { success: false, tasks: [], error: errorMsg };
  }
};

/**
 * Subscribe to real-time updates for project tasks
 * Returns an unsubscribe function
 */
export const subscribeToProjectTasks = (
  orgId: string,
  projectId: string,
  callback: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  console.log('Subscribing to project tasks:', projectId);
  const tasksRef = getProjectTasksCollection(orgId, projectId);
  
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push({ 
          id: docSnap.id, 
          ...docSnap.data() 
        } as Task);
      });
      console.log('📡 Real-time update: Found', tasks.length, 'tasks');
      callback(tasks);
    },
    (error) => {
      console.error('❌ Error subscribing to project tasks:', error);
      onError?.(error);
    }
  );
};

/**
 * Add task to project
 */
export const addProjectTask = async (
  orgId: string,
  projectId: string,
  task: Omit<Task, 'id'>
): Promise<FirebaseResult<string>> => {
  try {
    console.log('Adding task to project:', projectId, task);
    const tasksRef = getProjectTasksCollection(orgId, projectId);
    const docRef = await withTimeout(addDoc(tasksRef, {
      ...task,
      orgId,
      projectId,
      createdAt: Date.now(),
    }), FIREBASE_TIMEOUT);
    console.log('✅ Task added successfully with ID:', docRef.id);
    return { success: true, id: docRef.id, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    console.error('❌ Error adding project task:', errorMsg);
    return { success: false, id: null, error: errorMsg };
  }
};

/**
 * Update project task
 */
export const updateProjectTask = async (
  orgId: string,
  projectId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'organizations', orgId, 'projects', projectId, 'tasks', taskId);
    await withTimeout(updateDoc(taskDoc, updates), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};

/**
 * Delete project task
 */
export const deleteProjectTask = async (
  orgId: string,
  projectId: string,
  taskId: string
): Promise<FirebaseResult> => {
  try {
    const taskDoc = doc(db, 'organizations', orgId, 'projects', projectId, 'tasks', taskId);
    await withTimeout(deleteDoc(taskDoc), FIREBASE_TIMEOUT);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error';
    return { success: false, error: errorMsg };
  }
};