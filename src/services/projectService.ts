import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCurrentUser } from './authService';
import type { Project, ProjectMember, ProjectRole, OrgRole } from '../types';

export interface CreateProjectInput {
  name: string;
  description?: string;
}

// Check if user is org member with specific roles
async function requireOrgRole(orgId: string, allowed: OrgRole[]) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const memberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) throw new Error('Bạn không thuộc tổ chức này');
  const role = snap.data()?.role as OrgRole;
  if (!allowed.includes(role)) throw new Error('Bạn không có quyền thực hiện thao tác này');
  return { user, role };
}

// Check if user is project admin or org owner/admin
async function requireProjectManageRole(orgId: string, projectId: string) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check org membership first
  const orgMemberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const orgMemberSnap = await getDoc(orgMemberRef);
  if (!orgMemberSnap.exists()) throw new Error('Bạn không thuộc tổ chức này');
  
  const orgRole = orgMemberSnap.data()?.role as OrgRole;
  
  // Org owner/admin can manage any project
  if (orgRole === 'owner' || orgRole === 'admin') {
    return { user, orgRole, projectRole: null };
  }
  
  // Check project membership
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', user.uid);
  const projectMemberSnap = await getDoc(projectMemberRef);
  
  if (projectMemberSnap.exists()) {
    const projectRole = projectMemberSnap.data()?.role as ProjectRole;
    if (projectRole === 'admin') {
      return { user, orgRole, projectRole };
    }
  }
  
  throw new Error('Bạn không có quyền quản lý thành viên project này');
}

export async function createProject(orgId: string, input: CreateProjectInput) {
  const { user } = await requireOrgRole(orgId, ['owner', 'admin']);
  const projectsRef = collection(db, 'organizations', orgId, 'projects');
  const payload = {
    name: input.name.trim(),
    description: input.description ?? '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(projectsRef, payload);
  
  // Add creator as project admin
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', docRef.id, 'members', user.uid);
  await setDoc(projectMemberRef, {
    userId: user.uid,
    role: 'admin',
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    addedAt: serverTimestamp(),
  });
  
  return docRef.id;
}

export async function getProjects(orgId: string): Promise<Project[]> {
  const snapshot = await getDocs(collection(db, 'organizations', orgId, 'projects'));
  return snapshot.docs.map((snap) => ({ id: snap.id, orgId, ...(snap.data() as any) }));
}

/**
 * Get projects that the current user has access to.
 * - Org owner/admin: can see all projects
 * - Org member: can only see projects they are a member of
 */
export async function getMyProjects(orgId: string): Promise<Project[]> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check org membership and role
  const orgMemberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const orgMemberSnap = await getDoc(orgMemberRef);
  if (!orgMemberSnap.exists()) throw new Error('Bạn không thuộc tổ chức này');
  
  const orgRole = orgMemberSnap.data()?.role as OrgRole;
  
  // Get all projects
  const allProjects = await getProjects(orgId);
  
  // Org owner/admin can see all projects
  if (orgRole === 'owner' || orgRole === 'admin') {
    return allProjects;
  }
  
  // For regular members, filter to only projects they are a member of
  const accessibleProjects: Project[] = [];
  
  for (const project of allProjects) {
    const projectMemberRef = doc(db, 'organizations', orgId, 'projects', project.id, 'members', user.uid);
    const projectMemberSnap = await getDoc(projectMemberRef);
    
    if (projectMemberSnap.exists()) {
      accessibleProjects.push(project);
    }
  }
  
  return accessibleProjects;
}

export async function addProjectMember(
  orgId: string,
  projectId: string,
  userId: string,
  role: ProjectRole,
  member: ProjectMember,
) {
  await requireProjectManageRole(orgId, projectId);
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', userId);
  await setDoc(projectMemberRef, {
    userId,
    role,
    displayName: member.displayName ?? '',
    email: member.email ?? '',
    addedAt: serverTimestamp(),
  });
}

export async function updateProjectMemberRole(
  orgId: string,
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  await requireProjectManageRole(orgId, projectId);
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', userId);
  await updateDoc(projectMemberRef, { role, updatedAt: serverTimestamp() });
}

export async function removeProjectMember(orgId: string, projectId: string, userId: string) {
  await requireProjectManageRole(orgId, projectId);
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', userId);
  await deleteDoc(projectMemberRef);
}

export async function getProjectMembers(orgId: string, projectId: string): Promise<ProjectMember[]> {
  const snapshot = await getDocs(collection(db, 'organizations', orgId, 'projects', projectId, 'members'));
  return snapshot.docs.map((doc) => doc.data() as ProjectMember);
}

// Get current user's role in a project
export async function getMyProjectRole(orgId: string, projectId: string): Promise<ProjectRole | null> {
  const user = getCurrentUser();
  if (!user) return null;
  
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', user.uid);
  const snap = await getDoc(projectMemberRef);
  
  if (!snap.exists()) return null;
  return snap.data()?.role as ProjectRole;
}

/**
 * Leave a project (current user removes themselves).
 * Project admins who are the only admin cannot leave.
 */
export async function leaveProject(orgId: string, projectId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const projectMemberRef = doc(db, 'organizations', orgId, 'projects', projectId, 'members', user.uid);
  const memberSnap = await getDoc(projectMemberRef);
  
  if (!memberSnap.exists()) {
    throw new Error('Bạn không phải thành viên của project này');
  }
  
  const memberData = memberSnap.data() as any;
  
  // Check if user is the only admin
  if (memberData.role === 'admin') {
    const allMembersSnap = await getDocs(collection(db, 'organizations', orgId, 'projects', projectId, 'members'));
    const admins = allMembersSnap.docs.filter(d => d.data()?.role === 'admin');
    if (admins.length === 1) {
      throw new Error('Bạn là admin duy nhất. Hãy chỉ định admin khác trước khi rời project.');
    }
  }
  
  // Remove from project members
  await deleteDoc(projectMemberRef);
  console.log(`User ${user.uid} left project ${projectId}`);
}

/**
 * Delete a project (only org owner/admin or project admin can delete).
 * This will delete all project members, tasks, and related data.
 */
export async function deleteProject(orgId: string, projectId: string): Promise<void> {
  const { user } = await requireProjectManageRole(orgId, projectId);
  
  // Delete all project members
  const projectMembersRef = collection(db, 'organizations', orgId, 'projects', projectId, 'members');
  const projectMembersSnap = await getDocs(projectMembersRef);
  for (const memberDoc of projectMembersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }
  
  // Delete all tasks in the project
  const tasksRef = collection(db, 'organizations', orgId, 'projects', projectId, 'tasks');
  const tasksSnap = await getDocs(tasksRef);
  for (const taskDoc of tasksSnap.docs) {
    await deleteDoc(taskDoc.ref);
  }
  
  // Delete the project document
  const projectRef = doc(db, 'organizations', orgId, 'projects', projectId);
  await deleteDoc(projectRef);
  
  console.log(`Project ${projectId} deleted by user ${user.uid}`);
}

/**
 * Subscribe to real-time updates for project members.
 * Returns an unsubscribe function.
 */
export function subscribeToProjectMembers(
  orgId: string,
  projectId: string,
  callback: (members: ProjectMember[], myRole: ProjectRole | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const user = getCurrentUser();
  const membersRef = collection(db, 'organizations', orgId, 'projects', projectId, 'members');
  
  return onSnapshot(
    membersRef,
    (snapshot) => {
      const members = snapshot.docs.map((docSnap) => ({
        userId: docSnap.id,
        ...docSnap.data(),
      } as ProjectMember));
      
      // Find current user's role
      let myRole: ProjectRole | null = null;
      if (user) {
        const myMembership = members.find(m => m.userId === user.uid);
        myRole = myMembership?.role ?? null;
      }
      
      callback(members, myRole);
    },
    (error) => {
      console.error('Error subscribing to project members:', error);
      onError?.(error);
    }
  );
}
