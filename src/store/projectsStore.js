/**
 * projectsStore.js — Zustand store for IVR project management.
 *
 * Each project stores: id, name, timestamps, and the React Flow
 * node/edge arrays that represent the IVR graph. All data is
 * persisted to localStorage under the key "ivr-projects".
 */
import { create } from 'zustand';
import { nanoid } from 'nanoid';

/** Loads the project list from localStorage (or empty array on error). */
function load() {
  try { return JSON.parse(localStorage.getItem('ivr-projects') || '[]'); }
  catch { return []; }
}

/** Writes the full project list to localStorage. */
function persist(projects) {
  localStorage.setItem('ivr-projects', JSON.stringify(projects));
}

const useProjectsStore = create((set, get) => ({
  /** Array of saved projects, most recent first. */
  projects: load(),

  /**
   * Creates a new project with a unique nanoid and prepends it to the list.
   * @param {{ name?: string; nodes?: object[]; edges?: object[] }} data
   * @returns {string} The new project's ID
   */
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
    };
    const updated = [project, ...get().projects];
    persist(updated);
    set({ projects: updated });
    return id;
  },

  /**
   * Merges new fields into an existing project and bumps `updatedAt`.
   * @param {string} id - Project ID
   * @param {object} data - Fields to merge
   */
  updateProject: (id, data) => {
    const updated = get().projects.map((p) =>
      p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p
    );
    persist(updated);
    set({ projects: updated });
  },

  /**
   * Permanently removes a project by ID.
   * @param {string} id
   */
  deleteProject: (id) => {
    const updated = get().projects.filter((p) => p.id !== id);
    persist(updated);
    set({ projects: updated });
  },

  /**
   * Looks up a single project.
   * @param {string} id
   * @returns {object | undefined}
   */
  getProject: (id) => get().projects.find((p) => p.id === id),
}));

export default useProjectsStore;
