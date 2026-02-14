import { create } from 'zustand';
import type { Project, ProjectMember, ProjectRole } from '../types';

// Helper to get user-specific storage key
const getStorageKey = (baseKey: string, userId?: string) => {
  return userId ? `${baseKey}_${userId}` : baseKey;
};

type ProjectState = {
  projects: Project[];
  selectedProjectId: string | null;
  projectMembers: ProjectMember[];
  currentProjectRole: ProjectRole | null;
  loading: boolean;
  currentUserId: string | null;
  setProjects: (projects: Project[]) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setProjectMembers: (members: ProjectMember[]) => void;
  setCurrentProjectRole: (role: ProjectRole | null) => void;
  setLoading: (value: boolean) => void;
  setCurrentUserId: (userId: string | null) => void;
  // Load stored project ID for current user
  loadStoredProjectId: (userId: string) => void;
};

export type { ProjectState };

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  projectMembers: [],
  currentProjectRole: null,
  loading: false,
  currentUserId: null,
  setProjects: (projects) => set({ projects }),
  setSelectedProjectId: (projectId) => {
    const userId = get().currentUserId;
    try {
      const key = getStorageKey('selectedProjectId', userId ?? undefined);
      if (projectId) localStorage.setItem(key, projectId);
      else localStorage.removeItem(key);
    } catch {}
    set({ selectedProjectId: projectId });
  },
  setProjectMembers: (members) => set({ projectMembers: members }),
  setCurrentProjectRole: (role) => set({ currentProjectRole: role }),
  setLoading: (value) => set({ loading: value }),
  setCurrentUserId: (userId) => {
    set({ currentUserId: userId });
    // When user changes, load their stored project
    if (userId) {
      try {
        const key = getStorageKey('selectedProjectId', userId);
        const stored = localStorage.getItem(key);
        if (stored) {
          set({ selectedProjectId: stored });
        } else {
          set({ selectedProjectId: null });
        }
      } catch {
        set({ selectedProjectId: null });
      }
    } else {
      set({ selectedProjectId: null });
    }
  },
  loadStoredProjectId: (userId) => {
    try {
      const key = getStorageKey('selectedProjectId', userId);
      const stored = localStorage.getItem(key);
      set({ selectedProjectId: stored, currentUserId: userId });
    } catch {
      set({ selectedProjectId: null, currentUserId: userId });
    }
  },
}));
