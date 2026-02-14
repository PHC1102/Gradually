import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  where,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getCurrentUser } from './authService';

export type OrgRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface OrgMember {
  id: string;
  email: string;
  role: OrgRole;
  joinedAt: Timestamp;
  displayName?: string;
}

export interface OrganizationInvitation {
  id: string;
  orgId: string;
  invitedEmail: string;
  invitedUserId?: string;
  invitedBy: string;
  invitedByEmail: string;
  inviterRole?: OrgRole;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
}

const organizationsCollection = collection(db, 'organizations');
const invitationsCollection = collection(db, 'organizationInvitations');

const requireAuth = () => {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getMemberDocRef = (orgId: string, userId: string) =>
  doc(db, 'organizations', orgId, 'members', userId);

const upsertUserDocument = async (userId: string, data: Record<string, unknown>) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, data, { merge: true });
};

const getCurrentUserRole = async (orgId: string, userId: string): Promise<OrgRole | null> => {
  const memberRef = getMemberDocRef(orgId, userId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) return null;
  return (snap.data()?.role ?? null) as OrgRole | null;
};

const ensureRole = async (orgId: string, allowed: OrgRole[]) => {
  const user = requireAuth();
  const role = await getCurrentUserRole(orgId, user.uid);
  if (!role || !allowed.includes(role)) {
    throw new Error('Insufficient permissions');
  }
  return { user, role };
};

const attachMembershipToUser = async (orgId: string, userId: string, email?: string | null) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      userId,
      email: email ?? null,
      emailLower: email ? email.toLowerCase() : null,
      joinedOrganizations: arrayUnion(orgId),
    },
    { merge: true },
  );
};

/**
 * Create a new organization with the current user as owner.
 */
export async function createOrganization(name: string): Promise<string> {
  if (!name.trim()) throw new Error('Organization name required');
  const user = requireAuth();

  const orgRef = await addDoc(organizationsCollection, {
    name: name.trim(),
    ownerId: user.uid,
    ownerEmail: user.email ?? '',
    createdAt: Timestamp.now(),
    memberCount: 1,
  });
  const orgId = orgRef.id;

  const memberRef = getMemberDocRef(orgId, user.uid);
  await setDoc(memberRef, {
    role: 'owner',
    joinedAt: Timestamp.now(),
    userId: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
  });

  await attachMembershipToUser(orgId, user.uid, user.email);

  return orgId;
}

/**
 * Join an existing organization by ID.
 */
export async function joinOrganization(orgId: string): Promise<void> {
  const user = requireAuth();

  const orgSnap = await getDoc(doc(db, 'organizations', orgId));
  if (!orgSnap.exists()) throw new Error('Organization not found');

  const memberRef = getMemberDocRef(orgId, user.uid);
  await setDoc(
    memberRef,
    {
      role: 'member',
      joinedAt: Timestamp.now(),
      userId: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
    },
    { merge: true },
  );

  await attachMembershipToUser(orgId, user.uid, user.email);
}

/**
 * Validate membership and return the member role.
 */
export async function switchOrganization(orgId: string): Promise<OrgRole> {
  const user = requireAuth();
  const role = await getCurrentUserRole(orgId, user.uid);
  if (!role) {
    throw new Error('You are no longer part of this organization');
  }
  return role;
}

/**
 * Fetch organizations for the current user.
 */
export async function getMyOrganizations(): Promise<Organization[]> {
  const user = requireAuth();
  
  console.log('getMyOrganizations: Starting for user', user.uid);
  
  // Query all organizations where user is a member (via subcollection)
  // This is more reliable than reading user.joinedOrganizations then fetching each org
  const results: Organization[] = [];
  
  try {
    // Get all organizations
    console.log('getMyOrganizations: Fetching all organizations...');
    const orgsSnapshot = await getDocs(collection(db, 'organizations'));
    console.log('getMyOrganizations: Found', orgsSnapshot.docs.length, 'organizations');
    
    // For each org, check if user is a member
    for (const orgDoc of orgsSnapshot.docs) {
      try {
        const memberRef = getMemberDocRef(orgDoc.id, user.uid);
        const memberSnap = await getDoc(memberRef);
        
        console.log(`getMyOrganizations: Checking org ${orgDoc.id}, member exists:`, memberSnap.exists());
        
        if (memberSnap.exists()) {
          const data = orgDoc.data() as any;
          results.push({
            id: orgDoc.id,
            name: data.name,
            ownerId: data.ownerId,
            createdAt: data.createdAt,
          });
          console.log(`getMyOrganizations: Added org ${orgDoc.id} (${data.name})`);
        }
      } catch (err) {
        // Skip orgs where we don't have read permission
        console.debug('getMyOrganizations: Skipping organization', orgDoc.id, err);
      }
    }
  } catch (err) {
    console.error('getMyOrganizations: Failed to load organizations', err);
  }
  
  console.log('getMyOrganizations: Returning', results.length, 'organizations');
  return results;
}

/**
 * Load members for an organization.
 */
export async function getOrganizationMembers(orgId: string): Promise<OrgMember[]> {
  const membersRef = collection(db, 'organizations', orgId, 'members');
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      email: data.email ?? '',
      role: data.role as OrgRole,
      joinedAt: data.joinedAt ?? Timestamp.now(),
      displayName: data.displayName,
    };
  });
}

/**
 * Subscribe to real-time updates for organization members.
 * Returns an unsubscribe function.
 */
export function subscribeToOrganizationMembers(
  orgId: string,
  callback: (members: OrgMember[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const membersRef = collection(db, 'organizations', orgId, 'members');
  
  return onSnapshot(
    membersRef,
    (snapshot) => {
      const members = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          email: data.email ?? '',
          role: data.role as OrgRole,
          joinedAt: data.joinedAt ?? Timestamp.now(),
          displayName: data.displayName,
        };
      });
      callback(members);
    },
    (error) => {
      console.error('Error subscribing to organization members:', error);
      onError?.(error);
    }
  );
}

/**
 * Find a user by email (case insensitive).
 */
export async function searchUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('emailLower', '==', normalized));
  const results = await getDocs(q);
  if (results.empty) return null;
  const snap = results.docs[0];
  return { id: snap.id, ...(snap.data() as any) };
}

/**
 * Send an organization invitation.
 */
export async function sendOrganizationInvitation(orgId: string, email: string) {
  const normalized = normalizeEmail(email);
  const { user, role } = await ensureRole(orgId, ['owner', 'admin']);

  // Prevent duplicate pending invitations
  const dupQuery = query(
    invitationsCollection,
    where('orgId', '==', orgId),
    where('invitedEmail', '==', normalized),
    where('status', '==', 'pending'),
  );
  const dupSnap = await getDocs(dupQuery);
  if (!dupSnap.empty) {
    throw new Error('Invitation already pending for this email');
  }

  const existingUser = await searchUserByEmail(normalized);
  const invitationRef = await addDoc(invitationsCollection, {
    orgId,
    invitedEmail: normalized,
    invitedUserId: existingUser?.id ?? null,
    invitedBy: user.uid,
    invitedByEmail: user.email ?? '',
    inviterRole: role,
    status: 'pending',
    createdAt: Timestamp.now(),
  });

  return invitationRef.id;
}

/**
 * Get pending invitations for the current user.
 */
export async function getMyPendingInvitations(): Promise<OrganizationInvitation[]> {
  const user = requireAuth();
  const normalizedEmail = normalizeEmail(user.email ?? '');
  
  // Query by invitedEmail (case insensitive) or invitedUserId
  const results: OrganizationInvitation[] = [];
  
  try {
    // Query by email
    const emailQuery = query(
      invitationsCollection,
      where('invitedEmail', '==', normalizedEmail),
      where('status', '==', 'pending'),
    );
    const emailSnap = await getDocs(emailQuery);
    emailSnap.docs.forEach(docSnap => {
      const data = docSnap.data() as any;
      results.push({
        id: docSnap.id,
        orgId: data.orgId,
        invitedEmail: data.invitedEmail,
        invitedUserId: data.invitedUserId,
        invitedBy: data.invitedBy,
        invitedByEmail: data.invitedByEmail,
        inviterRole: data.inviterRole,
        status: data.status,
        createdAt: data.createdAt,
      });
    });
    
    // Also query by userId in case email doesn't match
    const userIdQuery = query(
      invitationsCollection,
      where('invitedUserId', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const userIdSnap = await getDocs(userIdQuery);
    userIdSnap.docs.forEach(docSnap => {
      // Avoid duplicates
      if (!results.some(r => r.id === docSnap.id)) {
        const data = docSnap.data() as any;
        results.push({
          id: docSnap.id,
          orgId: data.orgId,
          invitedEmail: data.invitedEmail,
          invitedUserId: data.invitedUserId,
          invitedBy: data.invitedBy,
          invitedByEmail: data.invitedByEmail,
          inviterRole: data.inviterRole,
          status: data.status,
          createdAt: data.createdAt,
        });
      }
    });
  } catch (err) {
    console.error('Failed to fetch pending invitations', err);
  }
  
  return results;
}

/**
 * Accept a pending invitation.
 */
export async function acceptInvitation(invitationId: string) {
  const user = requireAuth();
  const invitationRef = doc(db, 'organizationInvitations', invitationId);
  
  console.log('Accepting invitation:', invitationId);
  
  const snap = await getDoc(invitationRef);
  if (!snap.exists()) throw new Error('Invitation not found');
  
  const invitation = snap.data() as OrganizationInvitation;
  console.log('Invitation data:', invitation);
  
  if (invitation.status !== 'pending') throw new Error('Invitation already processed');

  const normalizedEmail = normalizeEmail(user.email ?? '');
  console.log('User email:', user.email, 'Normalized:', normalizedEmail);
  console.log('Invited email:', invitation.invitedEmail);
  
  if (
    invitation.invitedUserId &&
    invitation.invitedUserId !== user.uid &&
    invitation.invitedEmail !== normalizedEmail
  ) {
    throw new Error('This invitation is not addressed to you');
  }

  console.log('Step 1: Joining organization', invitation.orgId);
  try {
    await joinOrganization(invitation.orgId);
    console.log('Step 1: SUCCESS - Joined organization');
  } catch (err) {
    console.error('Step 1: FAILED - Join organization error:', err);
    throw new Error(`Failed to join organization: ${(err as Error).message}`);
  }

  console.log('Step 2: Updating invitation status');
  try {
    await updateDoc(invitationRef, { 
      status: 'accepted', 
      acceptedAt: Timestamp.now(), 
      invitedUserId: user.uid 
    });
    console.log('Step 2: SUCCESS - Updated invitation');
  } catch (err) {
    console.error('Step 2: FAILED - Update invitation error:', err);
    throw new Error(`Failed to update invitation: ${(err as Error).message}`);
  }
  
  console.log('Invitation accepted successfully');
}

/**
 * Update a member's role (owner/admin/member).
 */
export async function updateUserRole(orgId: string, targetUserId: string, newRole: OrgRole) {
  const { user, role } = await ensureRole(orgId, ['owner', 'admin']);
  const targetRef = getMemberDocRef(orgId, targetUserId);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Member not found');
  const targetData = targetSnap.data() as any;

  if (targetData.role === 'owner' && targetUserId !== user.uid) {
    throw new Error('Cannot change owner role');
  }

  if (role === 'admin') {
    if (targetData.role !== 'member' || newRole === 'owner') {
      throw new Error('Admins can only modify members');
    }
  }

  await updateDoc(targetRef, { role: newRole });
}

/**
 * Remove a member from the organization.
 */
export async function removeUserFromOrganization(orgId: string, targetUserId: string) {
  const { role } = await ensureRole(orgId, ['owner', 'admin']);
  const targetRef = getMemberDocRef(orgId, targetUserId);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Member not found');
  const targetData = targetSnap.data() as any;

  if (targetData.role === 'owner') {
    throw new Error('Owners cannot be removed');
  }

  if (role === 'admin' && targetData.role !== 'member') {
    throw new Error('Admins can only remove members');
  }

  await deleteDoc(targetRef);
}

/**
 * Leave an organization (current user removes themselves).
 * Owners cannot leave - they must transfer ownership first.
 */
export async function leaveOrganization(orgId: string): Promise<void> {
  const user = requireAuth();
  const memberRef = getMemberDocRef(orgId, user.uid);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    throw new Error('You are not a member of this organization');
  }
  
  const memberData = memberSnap.data() as any;
  
  if (memberData.role === 'owner') {
    throw new Error('Owners cannot leave. Transfer ownership first or delete the organization.');
  }
  
  // Remove from organization members subcollection
  await deleteDoc(memberRef);
  
  // Note: We don't remove from user.joinedOrganizations array
  // because getMyOrganizations() checks actual membership, not this array
  console.log(`User ${user.uid} left organization ${orgId}`);
}

/**
 * Delete an organization (only owner can delete).
 * This will delete all projects, members, and related data.
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  const user = requireAuth();
  const memberRef = getMemberDocRef(orgId, user.uid);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    throw new Error('You are not a member of this organization');
  }
  
  const memberData = memberSnap.data() as any;
  
  if (memberData.role !== 'owner') {
    throw new Error('Only the owner can delete the organization');
  }
  
  // Delete all members first
  const membersRef = collection(db, 'organizations', orgId, 'members');
  const membersSnap = await getDocs(membersRef);
  for (const memberDoc of membersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }
  
  // Delete all projects and their subcollections
  const projectsRef = collection(db, 'organizations', orgId, 'projects');
  const projectsSnap = await getDocs(projectsRef);
  for (const projectDoc of projectsSnap.docs) {
    // Delete project members
    const projectMembersRef = collection(db, 'organizations', orgId, 'projects', projectDoc.id, 'members');
    const projectMembersSnap = await getDocs(projectMembersRef);
    for (const pmDoc of projectMembersSnap.docs) {
      await deleteDoc(pmDoc.ref);
    }
    
    // Delete project tasks
    const tasksRef = collection(db, 'organizations', orgId, 'projects', projectDoc.id, 'tasks');
    const tasksSnap = await getDocs(tasksRef);
    for (const taskDoc of tasksSnap.docs) {
      await deleteDoc(taskDoc.ref);
    }
    
    // Delete the project itself
    await deleteDoc(projectDoc.ref);
  }
  
  // Delete the organization document
  const orgRef = doc(db, 'organizations', orgId);
  await deleteDoc(orgRef);
  
  console.log(`Organization ${orgId} deleted by owner ${user.uid}`);
}