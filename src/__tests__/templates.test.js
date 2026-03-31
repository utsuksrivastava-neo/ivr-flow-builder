/**
 * templates.test.js
 *
 * Validates every IVR template has well-formed nodes, edges, and metadata.
 * Ensures templates won't crash the flow builder when loaded.
 */
import { describe, it, expect } from 'vitest';
import { templates } from '../data/templates';

const VALID_NODE_TYPES = new Set([
  'startNode', 'menuNode', 'playNode', 'sayNode', 'messageNode',
  'voicebotNode', 'transferNode', 'recordNode', 'startRecordNode',
  'stopRecordNode', 'hangupNode', 'gatherNode', 'apiCallNode',
  'syncApiNode', 'asyncApiNode', 'conditionNode', 'voicemailNode',
]);

describe('Template list', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });
});

templates.forEach((tpl) => {
  describe(`Template: "${tpl.name}" (${tpl.id})`, () => {
    /* ─── Metadata ─────────────── */
    it('has required metadata fields', () => {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.category).toBeTruthy();
      expect(tpl.projectName).toBeTruthy();
    });

    /* ─── Node array ───────────── */
    it('has a non-empty nodes array', () => {
      expect(Array.isArray(tpl.nodes)).toBe(true);
      expect(tpl.nodes.length).toBeGreaterThan(0);
    });

    it('every node has id, type, position, and data', () => {
      tpl.nodes.forEach((n) => {
        expect(n.id).toBeTruthy();
        expect(n.type).toBeTruthy();
        expect(n.position).toBeDefined();
        expect(typeof n.position.x).toBe('number');
        expect(typeof n.position.y).toBe('number');
        expect(n.data).toBeDefined();
      });
    });

    it('every node uses a known node type', () => {
      tpl.nodes.forEach((n) => {
        expect(VALID_NODE_TYPES.has(n.type)).toBe(true);
      });
    });

    it('has exactly one startNode', () => {
      const starts = tpl.nodes.filter((n) => n.type === 'startNode');
      expect(starts).toHaveLength(1);
    });

    it('all node IDs are unique', () => {
      const ids = tpl.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every node has a label', () => {
      tpl.nodes.forEach((n) => {
        expect(n.data.label).toBeTruthy();
      });
    });

    /* ─── Edge array ───────────── */
    it('has a non-empty edges array', () => {
      expect(Array.isArray(tpl.edges)).toBe(true);
      expect(tpl.edges.length).toBeGreaterThan(0);
    });

    it('every edge has id, source, target', () => {
      tpl.edges.forEach((e) => {
        expect(e.id).toBeTruthy();
        expect(e.source).toBeTruthy();
        expect(e.target).toBeTruthy();
      });
    });

    it('every edge references existing node IDs', () => {
      const nodeIds = new Set(tpl.nodes.map((n) => n.id));
      tpl.edges.forEach((e) => {
        expect(nodeIds.has(e.source)).toBe(true);
        expect(nodeIds.has(e.target)).toBe(true);
      });
    });

    it('all edge IDs are unique', () => {
      const ids = tpl.edges.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    /* ─── At least one terminal ── */
    it('has at least one hangupNode or transferNode', () => {
      const terminals = tpl.nodes.filter((n) => n.type === 'hangupNode' || n.type === 'transferNode');
      expect(terminals.length).toBeGreaterThan(0);
    });

    /* ─── Start node is connected ─ */
    it('startNode has at least one outgoing edge', () => {
      const start = tpl.nodes.find((n) => n.type === 'startNode');
      const outgoing = tpl.edges.filter((e) => e.source === start.id);
      expect(outgoing.length).toBeGreaterThan(0);
    });
  });
});
