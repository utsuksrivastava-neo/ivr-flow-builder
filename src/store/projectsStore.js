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
}));

export default useProjectsStore;
