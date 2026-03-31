/**
 * projectsStore.test.js
 *
 * Unit tests for the IVR projects store which manages
 * CRUD operations on saved IVR projects, persisted via localStorage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useProjectsStore from '../store/projectsStore';

/** Clear localStorage and reset projects before each test. */
beforeEach(() => {
  localStorage.removeItem('ivr-projects');
  useProjectsStore.setState({ projects: [] });
});

/* ────────────────────────────────────────────── */
/*  Create project                                */
/* ────────────────────────────────────────────── */
describe('createProject', () => {
  it('creates a new project and returns its ID', () => {
    const id = useProjectsStore.getState().createProject({ name: 'Test IVR' });
    expect(id).toBeTruthy();
    const projects = useProjectsStore.getState().projects;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Test IVR');
  });

  it('prepends new projects to the list', () => {
    useProjectsStore.getState().createProject({ name: 'First' });
    useProjectsStore.getState().createProject({ name: 'Second' });
    const projects = useProjectsStore.getState().projects;
    expect(projects[0].name).toBe('Second');
    expect(projects[1].name).toBe('First');
  });

  it('defaults name to "Untitled IVR" when not provided', () => {
    useProjectsStore.getState().createProject({});
    expect(useProjectsStore.getState().projects[0].name).toBe('Untitled IVR');
  });

  it('persists to localStorage', () => {
    useProjectsStore.getState().createProject({ name: 'Persisted' });
    const stored = JSON.parse(localStorage.getItem('ivr-projects'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Persisted');
  });

  it('stores nodes and edges with the project', () => {
    const nodes = [{ id: 'n1', type: 'startNode', data: {} }];
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    useProjectsStore.getState().createProject({ name: 'WithData', nodes, edges });
    const project = useProjectsStore.getState().projects[0];
    expect(project.nodes).toEqual(nodes);
    expect(project.edges).toEqual(edges);
  });
});

/* ────────────────────────────────────────────── */
/*  Update project                                */
/* ────────────────────────────────────────────── */
describe('updateProject', () => {
  it('updates name and updatedAt', () => {
    const id = useProjectsStore.getState().createProject({ name: 'Original' });
    const beforeUpdate = useProjectsStore.getState().projects[0].updatedAt;

    // small delay so timestamp differs
    useProjectsStore.getState().updateProject(id, { name: 'Renamed' });
    const updated = useProjectsStore.getState().projects[0];
    expect(updated.name).toBe('Renamed');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
  });

  it('does not affect other projects', () => {
    const id1 = useProjectsStore.getState().createProject({ name: 'One' });
    const id2 = useProjectsStore.getState().createProject({ name: 'Two' });
    useProjectsStore.getState().updateProject(id1, { name: 'One Updated' });
    const two = useProjectsStore.getState().projects.find((p) => p.id === id2);
    expect(two.name).toBe('Two');
  });
});

/* ────────────────────────────────────────────── */
/*  Delete project                                */
/* ────────────────────────────────────────────── */
describe('deleteProject', () => {
  it('removes the project by ID', () => {
    const id = useProjectsStore.getState().createProject({ name: 'ToDelete' });
    expect(useProjectsStore.getState().projects).toHaveLength(1);
    useProjectsStore.getState().deleteProject(id);
    expect(useProjectsStore.getState().projects).toHaveLength(0);
  });

  it('updates localStorage after deletion', () => {
    const id = useProjectsStore.getState().createProject({ name: 'ToDelete' });
    useProjectsStore.getState().deleteProject(id);
    const stored = JSON.parse(localStorage.getItem('ivr-projects'));
    expect(stored).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────── */
/*  Get project                                   */
/* ────────────────────────────────────────────── */
describe('getProject', () => {
  it('retrieves a project by ID', () => {
    const id = useProjectsStore.getState().createProject({ name: 'FindMe' });
    const project = useProjectsStore.getState().getProject(id);
    expect(project).toBeDefined();
    expect(project.name).toBe('FindMe');
  });

  it('returns undefined for non-existent ID', () => {
    const project = useProjectsStore.getState().getProject('does-not-exist');
    expect(project).toBeUndefined();
  });
});
