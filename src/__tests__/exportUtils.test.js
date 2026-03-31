/**
 * exportUtils.test.js
 *
 * Tests for the export layer: nodeTypeLabels coverage and getNodeDetails
 * output for every node type (box) in the IVR flow builder.
 *
 * We import the file dynamically to test internal helpers.
 * Since getNodeDetails is not exported, we test it indirectly via the
 * exported exportToJSON (which calls buildFlowTree → getNodeDetails).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

let nodeTypeLabels;
let exportToJSON;

beforeAll(async () => {
  const mod = await import('../utils/exportUtils');
  exportToJSON = mod.exportToJSON;

  const rawSrc = await import('../utils/exportUtils?raw');
  const match = rawSrc.default.match(/const nodeTypeLabels\s*=\s*\{([\s\S]*?)\};/);
  if (match) {
    const keys = [...match[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    nodeTypeLabels = keys;
  }
});

const ALL_NODE_TYPES = [
  'startNode', 'menuNode', 'playNode', 'sayNode', 'messageNode',
  'voicebotNode', 'transferNode', 'recordNode', 'startRecordNode',
  'stopRecordNode', 'hangupNode', 'gatherNode', 'apiCallNode',
  'syncApiNode', 'asyncApiNode', 'voicemailNode',
];

describe('nodeTypeLabels coverage', () => {
  it('has a label for every known node type', () => {
    ALL_NODE_TYPES.forEach((type) => {
      expect(nodeTypeLabels).toContain(type);
    });
  });
});

describe('exportToJSON', () => {
  it('does not throw for a minimal flow with each node type', () => {
    const nodes = ALL_NODE_TYPES.map((type, i) => ({
      id: `n${i}`,
      type,
      position: { x: i * 100, y: 0 },
      data: { label: type },
    }));

    const startIdx = ALL_NODE_TYPES.indexOf('startNode');
    const edges = nodes
      .filter((_, i) => i !== startIdx && i > 0)
      .map((n, i) => ({
        id: `e${i}`,
        source: nodes[i].id,
        target: n.id,
        sourceHandle: 'default',
      }));

    expect(() => {
      exportToJSON({ projectName: 'Test', nodes, edges });
    }).not.toThrow();
  });
});
