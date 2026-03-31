/**
 * validationUtils.test.js
 *
 * Unit tests for IVR flow graph validation: missing start nodes,
 * orphan nodes, unconnected handles, dead ends, and per-node issue counts.
 */
import { describe, it, expect } from 'vitest';
import { validateFlow, getIssueCountsForNodes } from '../utils/validationUtils';

/* ────────────────────────────────────────────── */
/*  Helpers: quick node / edge builders           */
/* ────────────────────────────────────────────── */

/** Creates a minimal node object. */
function mkNode(id, type, label) {
  return { id, type, position: { x: 0, y: 0 }, data: { label: label || id } };
}

/** Creates a minimal edge between two node IDs with optional handle. */
function mkEdge(source, target, sourceHandle = 'default') {
  return { id: `e-${source}-${target}`, source, target, sourceHandle };
}

/* ────────────────────────────────────────────── */
/*  Missing start node                            */
/* ────────────────────────────────────────────── */
describe('Missing start node', () => {
  it('returns an error when no start node exists', () => {
    const issues = validateFlow([mkNode('a', 'menuNode')], []);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toMatch(/No Start node/i);
  });
});

/* ────────────────────────────────────────────── */
/*  Simple valid flow                             */
/* ────────────────────────────────────────────── */
describe('Simple valid flow', () => {
  it('reports no errors for a Start → Hangup flow', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('h', 'hangupNode', 'Hangup'),
    ];
    const edges = [mkEdge('s', 'h')];
    const issues = validateFlow(nodes, edges);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────── */
/*  Orphan / unreachable detection                */
/* ────────────────────────────────────────────── */
describe('Orphan nodes', () => {
  it('flags nodes not reachable from start', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('h', 'hangupNode', 'Hangup'),
      mkNode('orphan', 'menuNode', 'Orphan Menu'),
    ];
    const edges = [mkEdge('s', 'h')];
    const issues = validateFlow(nodes, edges);
    const orphan = issues.find((i) => i.nodeId === 'orphan' && i.category === 'orphan');
    expect(orphan).toBeDefined();
  });
});

/* ────────────────────────────────────────────── */
/*  Dead end detection                            */
/* ────────────────────────────────────────────── */
describe('Dead ends', () => {
  it('flags a non-terminal node with no outgoing edges', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('m', 'messageNode', 'Message'),
    ];
    const edges = [mkEdge('s', 'm')];
    const issues = validateFlow(nodes, edges);
    const deadEnd = issues.find((i) => i.nodeId === 'm' && i.category === 'dead-end');
    expect(deadEnd).toBeDefined();
    expect(deadEnd.severity).toBe('error');
  });

  it('does not flag hangupNode as a dead end', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('h', 'hangupNode', 'Hangup'),
    ];
    const edges = [mkEdge('s', 'h')];
    const issues = validateFlow(nodes, edges);
    const deadEnd = issues.find((i) => i.nodeId === 'h' && i.category === 'dead-end');
    expect(deadEnd).toBeUndefined();
  });
});

/* ────────────────────────────────────────────── */
/*  Menu node handle validation                   */
/* ────────────────────────────────────────────── */
describe('Menu node unconnected handles', () => {
  it('warns when DTMF option handles are not connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      {
        ...mkNode('menu', 'menuNode', 'IVR Menu'),
        data: { label: 'IVR Menu', options: [{ key: '1', label: 'Sales' }, { key: '2', label: 'Support' }] },
      },
    ];
    const edges = [mkEdge('s', 'menu')];
    const issues = validateFlow(nodes, edges);
    const menuWarnings = issues.filter((i) => i.nodeId === 'menu' && i.category === 'unconnected');
    expect(menuWarnings.length).toBeGreaterThanOrEqual(2); // at least 2 DTMF + timeout + invalid
  });
});

/* ────────────────────────────────────────────── */
/*  Sync API node handle validation               */
/* ────────────────────────────────────────────── */
describe('Sync API node unconnected handles', () => {
  it('warns when api-success / api-fail handles are not connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('api', 'syncApiNode', 'Sync API'),
    ];
    const edges = [mkEdge('s', 'api')];
    const issues = validateFlow(nodes, edges);
    const apiWarnings = issues.filter((i) => i.nodeId === 'api' && i.category === 'unconnected');
    expect(apiWarnings).toHaveLength(2); // success + failure
  });

  it('does not warn when both handles are connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('api', 'syncApiNode', 'Sync API'),
      mkNode('ok', 'hangupNode', 'OK'),
      mkNode('err', 'hangupNode', 'Err'),
    ];
    const edges = [
      mkEdge('s', 'api'),
      mkEdge('api', 'ok', 'api-success'),
      mkEdge('api', 'err', 'api-fail'),
    ];
    const issues = validateFlow(nodes, edges);
    const apiWarnings = issues.filter((i) => i.nodeId === 'api' && i.category === 'unconnected');
    expect(apiWarnings).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────── */
/*  Legacy API call node handle validation        */
/* ────────────────────────────────────────────── */
describe('Legacy apiCallNode handle validation', () => {
  it('warns when api-success / api-fail are not connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('api', 'apiCallNode', 'API Call'),
    ];
    const edges = [mkEdge('s', 'api')];
    const issues = validateFlow(nodes, edges);
    const apiWarnings = issues.filter((i) => i.nodeId === 'api' && i.category === 'unconnected');
    expect(apiWarnings).toHaveLength(2);
  });
});

/* ────────────────────────────────────────────── */
/*  Transfer node handle validation               */
/* ────────────────────────────────────────────── */
describe('Transfer node handle validation', () => {
  it('warns when transfer-success / transfer-fail are not connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('t', 'transferNode', 'Transfer'),
    ];
    const edges = [mkEdge('s', 't')];
    const issues = validateFlow(nodes, edges);
    const xferWarnings = issues.filter((i) => i.nodeId === 't' && i.category === 'unconnected');
    expect(xferWarnings).toHaveLength(2);
  });
});

/* ────────────────────────────────────────────── */
/*  Voicebot node handle validation               */
/* ────────────────────────────────────────────── */
describe('Voicebot node handle validation', () => {
  it('warns when bot-end / bot-error handles are not connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('v', 'voicebotNode', 'Voicebot'),
    ];
    const edges = [mkEdge('s', 'v')];
    const issues = validateFlow(nodes, edges);
    const botWarnings = issues.filter((i) => i.nodeId === 'v' && i.category === 'unconnected');
    expect(botWarnings).toHaveLength(2);
  });
});

/* ────────────────────────────────────────────── */
/*  Generic single-output nodes                   */
/* ────────────────────────────────────────────── */
describe('Single-output nodes (message, record, async API, etc.)', () => {
  const singleOutputTypes = ['messageNode', 'startRecordNode', 'stopRecordNode', 'asyncApiNode', 'playNode', 'sayNode', 'gatherNode', 'voicemailNode'];

  singleOutputTypes.forEach((type) => {
    it(`warns when ${type} has no outgoing connection`, () => {
      const nodes = [
        mkNode('s', 'startNode', 'Start'),
        mkNode('n', type, type),
      ];
      const edges = [mkEdge('s', 'n')];
      const issues = validateFlow(nodes, edges);
      const noConn = issues.find((i) => i.nodeId === 'n' && i.category === 'unconnected');
      expect(noConn).toBeDefined();
    });
  });
});

/* ────────────────────────────────────────────── */
/*  No incoming edges (floating)                  */
/* ────────────────────────────────────────────── */
describe('Floating nodes', () => {
  it('flags non-start nodes with no incoming edges', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('h', 'hangupNode', 'Hangup'),
      mkNode('float', 'messageNode', 'Floating'),
    ];
    const edges = [mkEdge('s', 'h')];
    const issues = validateFlow(nodes, edges);
    const floating = issues.find((i) => i.nodeId === 'float');
    expect(floating).toBeDefined();
  });
});

/* ────────────────────────────────────────────── */
/*  Full valid flow (no errors / warnings)        */
/* ────────────────────────────────────────────── */
describe('Full valid flow', () => {
  it('returns zero errors for a well-connected Start → Menu → Hangup flow', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      {
        ...mkNode('m', 'menuNode', 'Menu'),
        data: { label: 'Menu', options: [{ key: '1', label: 'A' }] },
      },
      mkNode('h1', 'hangupNode', 'Hangup 1'),
      mkNode('h2', 'hangupNode', 'Hangup Timeout'),
      mkNode('h3', 'hangupNode', 'Hangup Invalid'),
    ];
    const edges = [
      mkEdge('s', 'm'),
      mkEdge('m', 'h1', 'dtmf-1'),
      mkEdge('m', 'h2', 'timeout'),
      mkEdge('m', 'h3', 'invalid'),
    ];
    const issues = validateFlow(nodes, edges);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────── */
/*  getIssueCountsForNodes                        */
/* ────────────────────────────────────────────── */
describe('getIssueCountsForNodes', () => {
  it('aggregates errors and warnings per node', () => {
    const issues = [
      { severity: 'error', nodeId: 'a', message: 'err1' },
      { severity: 'warning', nodeId: 'a', message: 'warn1' },
      { severity: 'warning', nodeId: 'a', message: 'warn2' },
      { severity: 'error', nodeId: 'b', message: 'err2' },
    ];
    const counts = getIssueCountsForNodes(issues);
    expect(counts.a.errors).toBe(1);
    expect(counts.a.warnings).toBe(2);
    expect(counts.b.errors).toBe(1);
    expect(counts.b.warnings).toBe(0);
  });

  it('ignores issues with no nodeId', () => {
    const issues = [{ severity: 'error', nodeId: null, message: 'global' }];
    const counts = getIssueCountsForNodes(issues);
    expect(Object.keys(counts)).toHaveLength(0);
  });
});

/* ────────────────────────────────────────────── */
/*  Full flow path per box type (error-free)      */
/* ────────────────────────────────────────────── */
describe('Full flow per node type — zero errors', () => {
  function flowWithMiddle(type, extraData) {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      { ...mkNode('mid', type, type), data: { label: type, ...extraData } },
      mkNode('h', 'hangupNode', 'Hangup'),
    ];
    const edges = [mkEdge('s', 'mid'), mkEdge('mid', 'h')];
    return { nodes, edges };
  }

  const singleOutputBoxes = [
    ['messageNode', {}],
    ['playNode', {}],
    ['sayNode', {}],
    ['gatherNode', {}],
    ['startRecordNode', {}],
    ['stopRecordNode', {}],
    ['recordNode', {}],
    ['voicemailNode', {}],
  ];

  singleOutputBoxes.forEach(([type, data]) => {
    it(`Start → ${type} → Hangup has zero errors`, () => {
      const { nodes, edges } = flowWithMiddle(type, data);
      const issues = validateFlow(nodes, edges);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  it('Start → transferNode → Hangup has zero errors when both handles connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('t', 'transferNode', 'Transfer'),
      mkNode('h1', 'hangupNode', 'H1'),
      mkNode('h2', 'hangupNode', 'H2'),
    ];
    const edges = [
      mkEdge('s', 't'),
      mkEdge('t', 'h1', 'transfer-success'),
      mkEdge('t', 'h2', 'transfer-fail'),
    ];
    const errors = validateFlow(nodes, edges).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('Start → voicebotNode → Hangup has zero errors when both handles connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('v', 'voicebotNode', 'Bot'),
      mkNode('h1', 'hangupNode', 'H1'),
      mkNode('h2', 'hangupNode', 'H2'),
    ];
    const edges = [
      mkEdge('s', 'v'),
      mkEdge('v', 'h1', 'bot-end'),
      mkEdge('v', 'h2', 'bot-error'),
    ];
    const errors = validateFlow(nodes, edges).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('Start → syncApiNode → Hangup has zero errors when both handles connected', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      mkNode('a', 'syncApiNode', 'API'),
      mkNode('h1', 'hangupNode', 'OK'),
      mkNode('h2', 'hangupNode', 'Fail'),
    ];
    const edges = [
      mkEdge('s', 'a'),
      mkEdge('a', 'h1', 'api-success'),
      mkEdge('a', 'h2', 'api-fail'),
    ];
    const errors = validateFlow(nodes, edges).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('Start → asyncApiNode → Hangup has zero errors', () => {
    const { nodes, edges } = flowWithMiddle('asyncApiNode', {});
    const errors = validateFlow(nodes, edges).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('Start → menuNode → Hangup has zero errors with all handles', () => {
    const nodes = [
      mkNode('s', 'startNode', 'Start'),
      { ...mkNode('m', 'menuNode', 'Menu'), data: { label: 'Menu', options: [{ key: '1', label: 'A' }] } },
      mkNode('h1', 'hangupNode', 'H1'),
      mkNode('h2', 'hangupNode', 'H2'),
      mkNode('h3', 'hangupNode', 'H3'),
    ];
    const edges = [
      mkEdge('s', 'm'),
      mkEdge('m', 'h1', 'dtmf-1'),
      mkEdge('m', 'h2', 'timeout'),
      mkEdge('m', 'h3', 'invalid'),
    ];
    const errors = validateFlow(nodes, edges).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
