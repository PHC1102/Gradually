import { create } from 'zustand';
import type {
  Organization,
  OrgMember,
  OrganizationInvitation,
  OrgRole,
} from '../services/organizationService';

// Helper to get user-specific storage key
const getStorageKey = (baseKey: string, userId?: string) => {
  return userId ? `${baseKey}_${userId}` : baseKey;
};

export type OrgState = {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
  organizations: Organization[];
  setOrganizations: (list: Organization[]) => void;
  members: OrgMember[];
  setMembers: (list: OrgMember[]) => void;
  invitations: OrganizationInvitation[];
  setInvitations: (list: OrganizationInvitation[]) => void;
  currentRole: OrgRole | null;
  setCurrentRole: (role: OrgRole | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  // Load stored org ID for current user
  loadStoredOrgId: (userId: string) => void;
};

export const useOrganizationStore = create<OrgState>((set, get) => ({
  selectedOrgId: null,
  setSelectedOrgId: (id) => {
    const userId = get().currentUserId;
    try {
      const key = getStorageKey('selectedOrgId', userId ?? undefined);
      if (id) localStorage.setItem(key, id);
      else localStorage.removeItem(key);
    } catch {}
    set({ selectedOrgId: id });
  },
  organizations: [],
  setOrganizations: (list) => set({ organizations: list }),
  members: [],
  setMembers: (list) => set({ members: list }),
  invitations: [],
  setInvitations: (list) => set({ invitations: list }),
  currentRole: null,
  setCurrentRole: (role) => set({ currentRole: role }),
  loading: false,
  setLoading: (value) => set({ loading: value }),
  currentUserId: null,
  setCurrentUserId: (userId) => {
    set({ currentUserId: userId });
    // When user changes, load their stored org
    if (userId) {
      try {
        const key = getStorageKey('selectedOrgId', userId);
        const stored = localStorage.getItem(key);
        if (stored) {
          set({ selectedOrgId: stored });
        } else {
          set({ selectedOrgId: null });
        }
      } catch {
        set({ selectedOrgId: null });
      }
    } else {
      set({ selectedOrgId: null });
    }
  },
  loadStoredOrgId: (userId) => {
    try {
      const key = getStorageKey('selectedOrgId', userId);
      const stored = localStorage.getItem(key);
      set({ selectedOrgId: stored, currentUserId: userId });
    } catch {
      set({ selectedOrgId: null, currentUserId: userId });
    }
  },
}));
