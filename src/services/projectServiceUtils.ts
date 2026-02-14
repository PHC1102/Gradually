import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCurrentUser } from './authService';
import type { OrgRole } from '../types';

export async function requireOrgRole(orgId: string, allowed: OrgRole[]) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const memberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) throw new Error('Bạn không thuộc tổ chức này');
  const role = snap.data()?.role as OrgRole;
  if (!allowed.includes(role)) throw new Error('Bạn không có quyền thực hiện thao tác này');
  return { user, role };
}

