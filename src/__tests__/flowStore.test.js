/**
 * flowStore.test.js
 *
 * Unit tests for the Zustand flow store that manages
 * the IVR node/edge graph, selection, validation, and project data.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useFlowStore from '../store/flowStore';

/** Reset the store to its initial state before each test. */
beforeEach(() => {
  useFlowStore.getState().clearCanvas();
});

/* ────────────────────────────────────────────────────────────── */
/*  Initial state                                                 */
/* ────────────────────────────────────────────────────────────── */
describe('Initial state', () => {
  it('starts with exactly one start node', () => {
    const { nodes } = useFlowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('startNode');
  });

  it('start node defaults to "both" direction', () => {
    const { nodes } = useFlowStore.getState();
    expect(nodes[0].data.callDirection).toBe('both');
    expect(nodes[0].data.label).toBe('Inbound + Outbound Call');
  });

  it('starts with no edges', () => {
    expect(useFlowStore.getState().edges).toHaveLength(0);
  });

  it('starts with no selected node', () => {
    expect(useFlowStore.getState().selectedNodeId).toBeNull();
  });

  it('project name defaults to "My IVR Flow"', () => {
    expect(useFlowStore.getState().projectName).toBe('My IVR Flow');
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Adding nodes                                                  */
/* ────────────────────────────────────────────────────────────── */
describe('addNode', () => {
  it('adds a menuNode at the given position', () => {
    const id = useFlowStore.getState().addNode('menuNode', { x: 200, y: 100 });
    const { nodes, selectedNodeId } = useFlowStore.getState();
    expect(nodes).toHaveLength(2);
    const added = nodes.find((n) => n.id === id);
    expect(added).toBeDefined();
    expect(added.type).toBe('menuNode');
    expect(added.data.label).toBe('IVR Menu');
    expect(selectedNodeId).toBe(id);
  });

  it('adds a messageNode with correct defaults', () => {
    const id = useFlowStore.getState().addNode('messageNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Greetings');
    expect(node.data.message).toBe('Hello! Thank you for calling.');
  });

  it('adds a syncApiNode with correct defaults', () => {
    const id = useFlowStore.getState().addNode('syncApiNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Sync API');
    expect(node.data.method).toBe('POST');
    expect(node.data.timeout).toBe(10);
    expect(node.data.successCondition).toBe('2xx');
  });

  it('adds an asyncApiNode with correct defaults', () => {
    const id = useFlowStore.getState().addNode('asyncApiNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Async API');
    expect(node.data.callbackUrl).toBe('https://your-server.com/callback');
  });

  it('adds a startRecordNode with correct defaults', () => {
    const id = useFlowStore.getState().addNode('startRecordNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Start Recording');
    expect(node.data.direction).toBe('both');
    expect(node.data.format).toBe('mp3');
  });

  it('adds a stopRecordNode with correct defaults', () => {
    const id = useFlowStore.getState().addNode('stopRecordNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Stop Recording');
  });

  it('adds a gatherNode with numDigits default of 5', () => {
    const id = useFlowStore.getState().addNode('gatherNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.numDigits).toBe(5);
    expect(node.data.finishOnKey).toBe('#');
  });

  it('adds a hangupNode', () => {
    const id = useFlowStore.getState().addNode('hangupNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('End Call');
  });

  it('adds a playNode with audio URL default', () => {
    const id = useFlowStore.getState().addNode('playNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.audioUrl).toContain('exotel');
  });

  it('adds a sayNode with TTS defaults', () => {
    const id = useFlowStore.getState().addNode('sayNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.ttsEngine).toBe('polly');
    expect(node.data.ttsVoice).toBe('Aditi');
  });

  it('adds a voicebotNode with stream defaults', () => {
    const id = useFlowStore.getState().addNode('voicebotNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.streamType).toBe('bidirectional');
    expect(node.data.streamUrl).toContain('wss://');
  });

  it('adds a transferNode', () => {
    const id = useFlowStore.getState().addNode('transferNode', { x: 100, y: 100 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.networkType).toBe('pstn');
    expect(node.data.timeout).toBe(30);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Updating node data                                            */
/* ────────────────────────────────────────────────────────────── */
describe('updateNodeData', () => {
  it('merges new properties into node.data', () => {
    const id = useFlowStore.getState().addNode('menuNode', { x: 0, y: 0 });
    useFlowStore.getState().updateNodeData(id, { label: 'Updated Menu', timeout: 15 });
    const node = useFlowStore.getState().nodes.find((n) => n.id === id);
    expect(node.data.label).toBe('Updated Menu');
    expect(node.data.timeout).toBe(15);
    expect(node.data.prompt).toBeDefined(); // existing fields preserved
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Deleting nodes                                                */
/* ────────────────────────────────────────────────────────────── */
describe('deleteNode', () => {
  it('removes a non-start node', () => {
    const id = useFlowStore.getState().addNode('hangupNode', { x: 0, y: 0 });
    expect(useFlowStore.getState().nodes).toHaveLength(2);
    useFlowStore.getState().deleteNode(id);
    expect(useFlowStore.getState().nodes).toHaveLength(1);
  });

  it('refuses to delete the startNode', () => {
    const startId = useFlowStore.getState().nodes[0].id;
    useFlowStore.getState().deleteNode(startId);
    expect(useFlowStore.getState().nodes).toHaveLength(1);
  });

  it('removes edges connected to the deleted node', () => {
    const menuId = useFlowStore.getState().addNode('menuNode', { x: 0, y: 0 });
    const startId = useFlowStore.getState().nodes[0].id;
    useFlowStore.getState().onConnect({ source: startId, target: menuId, sourceHandle: 'default', targetHandle: null });
    expect(useFlowStore.getState().edges).toHaveLength(1);
    useFlowStore.getState().deleteNode(menuId);
    expect(useFlowStore.getState().edges).toHaveLength(0);
  });

  it('clears selectedNodeId if deleted node was selected', () => {
    const id = useFlowStore.getState().addNode('hangupNode', { x: 0, y: 0 });
    expect(useFlowStore.getState().selectedNodeId).toBe(id);
    useFlowStore.getState().deleteNode(id);
    expect(useFlowStore.getState().selectedNodeId).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Duplicating nodes                                             */
/* ────────────────────────────────────────────────────────────── */
describe('duplicateNode', () => {
  it('creates a copy with offset position', () => {
    const id = useFlowStore.getState().addNode('menuNode', { x: 100, y: 200 });
    useFlowStore.getState().duplicateNode(id);
    const { nodes } = useFlowStore.getState();
    expect(nodes).toHaveLength(3); // start + original + dup
    const dup = nodes.find((n) => n.id !== id && n.type === 'menuNode');
    expect(dup.position.x).toBe(140);
    expect(dup.position.y).toBe(240);
  });

  it('refuses to duplicate the startNode', () => {
    const startId = useFlowStore.getState().nodes[0].id;
    useFlowStore.getState().duplicateNode(startId);
    expect(useFlowStore.getState().nodes).toHaveLength(1);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Connecting nodes (edges)                                      */
/* ────────────────────────────────────────────────────────────── */
describe('onConnect', () => {
  it('creates an edge between two nodes', () => {
    const menuId = useFlowStore.getState().addNode('menuNode', { x: 200, y: 100 });
    const startId = useFlowStore.getState().nodes[0].id;
    useFlowStore.getState().onConnect({ source: startId, target: menuId, sourceHandle: 'default', targetHandle: null });
    const { edges } = useFlowStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(startId);
    expect(edges[0].target).toBe(menuId);
    expect(edges[0].type).toBe('smoothstep');
    expect(edges[0].animated).toBe(true);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Clearing canvas                                               */
/* ────────────────────────────────────────────────────────────── */
describe('clearCanvas', () => {
  it('resets to a single start node and no edges', () => {
    useFlowStore.getState().addNode('menuNode', { x: 0, y: 0 });
    useFlowStore.getState().addNode('hangupNode', { x: 0, y: 0 });
    useFlowStore.getState().clearCanvas();
    const { nodes, edges, selectedNodeId } = useFlowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('startNode');
    expect(edges).toHaveLength(0);
    expect(selectedNodeId).toBeNull();
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Project name                                                  */
/* ────────────────────────────────────────────────────────────── */
describe('projectName', () => {
  it('can be updated', () => {
    useFlowStore.getState().setProjectName('New Name');
    expect(useFlowStore.getState().projectName).toBe('New Name');
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Load / export flow data                                       */
/* ────────────────────────────────────────────────────────────── */
describe('loadFlowData / getFlowData', () => {
  it('round-trips project data', () => {
    useFlowStore.getState().setProjectName('Test Project');
    useFlowStore.getState().addNode('menuNode', { x: 0, y: 0 });
    const data = useFlowStore.getState().getFlowData();
    expect(data.projectName).toBe('Test Project');
    expect(data.nodes).toHaveLength(2);

    useFlowStore.getState().clearCanvas();
    useFlowStore.getState().loadFlowData(data);
    const loaded = useFlowStore.getState();
    expect(loaded.projectName).toBe('Test Project');
    expect(loaded.nodes).toHaveLength(2);
  });

  it('uses defaults for missing fields', () => {
    useFlowStore.getState().loadFlowData({});
    expect(useFlowStore.getState().projectName).toBe('Imported Flow');
    expect(useFlowStore.getState().nodes).toHaveLength(1);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  API logs                                                      */
/* ────────────────────────────────────────────────────────────── */
describe('apiLogs', () => {
  it('adds and clears API logs', () => {
    useFlowStore.getState().addApiLog({ method: 'GET', url: '/test' });
    expect(useFlowStore.getState().apiLogs).toHaveLength(1);
    useFlowStore.getState().clearApiLogs();
    expect(useFlowStore.getState().apiLogs).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Simulation state                                              */
/* ────────────────────────────────────────────────────────────── */
describe('simulation', () => {
  it('toggles simulation active state', () => {
    useFlowStore.getState().setSimulationActive(true);
    expect(useFlowStore.getState().simulationActive).toBe(true);
    useFlowStore.getState().setSimulationActive(false);
    expect(useFlowStore.getState().simulationActive).toBe(false);
  });

  it('tracks simulation path steps', () => {
    useFlowStore.getState().setSimulationActive(true);
    useFlowStore.getState().addSimulationStep('node-1');
    useFlowStore.getState().addSimulationStep('node-2');
    expect(useFlowStore.getState().simulationPath).toEqual(['node-1', 'node-2']);
  });
});

/* ────────────────────────────────────────────────────────────── */
/*  Selection                                                     */
/* ────────────────────────────────────────────────────────────── */
describe('selection', () => {
  it('selects and retrieves a node', () => {
    const id = useFlowStore.getState().addNode('hangupNode', { x: 0, y: 0 });
    useFlowStore.getState().setSelectedNodeId(id);
    const selected = useFlowStore.getState().getSelectedNode();
    expect(selected).not.toBeNull();
    expect(selected.id).toBe(id);
  });

  it('returns null when nothing is selected', () => {
    useFlowStore.getState().setSelectedNodeId(null);
    expect(useFlowStore.getState().getSelectedNode()).toBeNull();
  });
});
