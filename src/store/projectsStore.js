/**
 * projectsStore.js — Zustand store for IVR project management with environment support.
 *
 * Each project stores: id, name, timestamps, environment status (UAT/Prod),
 * and the React Flow node/edge arrays. All data persisted to localStorage.
 */
import { create } from 'zustand';
import { nanoid } from 'nanoid';

function load() {
  try { return JSON.parse(localStorage.getItem('ivr-projects') || '[]'); }
  catch { return []; }
}

function persist(projects) {
  localStorage.setItem('ivr-projects', JSON.stringify(projects));
}

const useProjectsStore = create((set, get) => ({
  projects: load(),

  createProject: (data) => {
    const id = nanoid(10);
    const now = Date.now();
    const project = {
      id,
      name: data.name || 'Untitled IVR',
      createdAt: now,
      updatedAt: now,
      nodes: data.nodes || [],
      edges: data.edges || [],
      environment: 'uat',
      prodSnapshot: null,
      prodPushedAt: null,
    };
    const updated = [project, ...get().projects];
    persist(updated);
    set({ projects: updated });
    return id;
  },

  updateProject: (id, data) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
    );
    persist(updated);
    set({ projects: updated });
  },

  deleteProject: (id) => {
    const updated = get().projects.filter((p) => p.id !== id);
    persist(updated);
    set({ projects: updated });
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  /**
   * Promotes the current UAT flow to Production by snapshotting its nodes/edges.
   * The project's environment becomes 'production' and a frozen snapshot is saved.
   */
  pushToProduction: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return { success: false, error: 'Project not found.' };
    const snap = {
      nodes: JSON.parse(JSON.stringify(project.nodes)),
      edges: JSON.parse(JSON.stringify(project.edges)),
      pushedAt: Date.now(),
      pushedName: project.name,
    };
    const updated = get().projects.map((p) =>
      p.id === id
        ? { ...p, environment: 'production', prodSnapshot: snap, prodPushedAt: Date.now(), updatedAt: Date.now() }
        : p
    );
    persist(updated);
    set({ projects: updated });
    return { success: true };
  },

  /**
   * Reverts a project back to UAT (keeps the prod snapshot for reference).
   */
  revertToUat: (id) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, environment: 'uat', updatedAt: Date.now() } : p
    );
    persist(updated);
    set({ projects: updated });
  },
}));

export default useProjectsStore;
