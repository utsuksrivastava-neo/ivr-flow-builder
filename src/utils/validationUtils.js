/**
 * Flow graph validation for IVR/canvas editors.
 *
 * Inspects React Flow–style `nodes` and `edges` and returns human-readable issues:
 * missing Start, unreachable nodes, unconnected outputs/handles, dead ends that do not
 * terminate at End Call (hangup) / Transfer, and nodes with no incoming edges. Consumers use this
 * to surface warnings and errors in the builder UI.
 *
 * @module utils/validationUtils
 */

/**
 * Validates an IVR flow graph.
 *
 * @param {import('@xyflow/react').Node[]} nodes - Flow nodes (must include `id`, `type`, `data.label`).
 * @param {import('@xyflow/react').Edge[]} edges - Flow edges (`source`, `target`, optional `sourceHandle`).
 * @returns {Array<{ severity: 'error' | 'warning', nodeId: string | null, message: string, category?: string }>}
 */
export function validateFlow(nodes, edges) {
  const issues = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // --- Start node: exactly one flow entry point ---
  const startNodes = nodes.filter((n) => n.type === 'startNode');
  if (startNodes.length === 0) {
    issues.push({ severity: 'error', nodeId: null, message: 'No Start node found. Every IVR flow needs a Start node.' });
    return issues;
  }

  // --- Reachability: BFS from Start; flag nodes not on any path from Start ---
  const reachable = new Set();
  const queue = [startNodes[0].id];
  reachable.add(startNodes[0].id);
  while (queue.length > 0) {
    const current = queue.shift();
    edges
      .filter((e) => e.source === current)
      .forEach((e) => {
        if (!reachable.has(e.target)) {
          reachable.add(e.target);
          queue.push(e.target);
        }
      });
  }

  const orphanNodes = nodes.filter((n) => !reachable.has(n.id) && n.type !== 'startNode');
  orphanNodes.forEach((n) => {
    issues.push({
      severity: 'warning',
      nodeId: n.id,
      message: `"${n.data.label}" is unreachable — not connected to the Start node.`,
      category: 'orphan',
    });
  });

  // --- Unconnected handles / outputs ---
  // Per-type rules for named handles (e.g. menu DTMF, API success/fail). Nodes that use a single
  // `default` handle (`asyncApiNode`, `messageNode`, `startRecordNode`, `stopRecordNode`, etc.)
  // fall through to the generic "no outgoing edges" check at the end.
  nodes.forEach((node) => {
    if (node.type === 'hangupNode') return;

    const outEdges = edges.filter((e) => e.source === node.id);

    if (node.type === 'menuNode') {
      const options = node.data.options || [];
      options.forEach((opt) => {
        const hasConnection = outEdges.some((e) => e.sourceHandle === `dtmf-${opt.key}`);
        if (!hasConnection) {
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            message: `"${node.data.label}" — Press ${opt.key} (${opt.label}) is not connected to any node.`,
            category: 'unconnected',
          });
        }
      });
      if (!outEdges.some((e) => e.sourceHandle === 'timeout')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — Timeout path is not connected.`,
          category: 'unconnected',
        });
      }
      if (!outEdges.some((e) => e.sourceHandle === 'invalid')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — Invalid input path is not connected.`,
          category: 'unconnected',
        });
      }
    } else if (node.type === 'voicebotNode') {
      if (!outEdges.some((e) => e.sourceHandle === 'bot-end')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Bot Ends" output is not connected.`,
          category: 'unconnected',
        });
      }
      if (!outEdges.some((e) => e.sourceHandle === 'bot-error')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Error" output is not connected.`,
          category: 'unconnected',
        });
      }
    } else if (node.type === 'apiCallNode') {
      if (!outEdges.some((e) => e.sourceHandle === 'api-success')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Success" path is not connected.`,
          category: 'unconnected',
        });
      }
      if (!outEdges.some((e) => e.sourceHandle === 'api-fail')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Failure" path is not connected.`,
          category: 'unconnected',
        });
      }
    } else if (node.type === 'syncApiNode') {
      if (!outEdges.some((e) => e.sourceHandle === 'api-success')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Success" path is not connected.`,
          category: 'unconnected',
        });
      }
      if (!outEdges.some((e) => e.sourceHandle === 'api-fail')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Failure" path is not connected.`,
          category: 'unconnected',
        });
      }
    } else if (node.type === 'transferNode') {
      if (!outEdges.some((e) => e.sourceHandle === 'transfer-success')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Success" path is not connected.`,
          category: 'unconnected',
        });
      }
      if (!outEdges.some((e) => e.sourceHandle === 'transfer-fail')) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" — "Failed" path is not connected.`,
          category: 'unconnected',
        });
      }
    } else if (outEdges.length === 0 && node.type !== 'startNode') {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        message: `"${node.data.label}" has no outgoing connection.`,
        category: 'unconnected',
      });
    }
  });

  // --- Dead-end detection: every path from Start must eventually reach End Call or Transfer ---
  const terminalTypes = new Set(['hangupNode', 'transferNode']);

  /**
   * Recursively finds node IDs reachable from `nodeId` that have no continuation to a terminal node.
   * @param {string} nodeId
   * @param {Set<string>} visited - Path stack to avoid infinite loops on cycles.
   * @returns {string[]} Node IDs that are dead ends (no outgoing edges, non-terminal).
   */
  function findDeadEnds(nodeId, visited) {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return [];

    if (terminalTypes.has(node.type)) return [];

    const outEdges = edges.filter((e) => e.source === nodeId);
    if (outEdges.length === 0) {
      return [nodeId];
    }

    const deadEnds = [];
    outEdges.forEach((e) => {
      deadEnds.push(...findDeadEnds(e.target, new Set(visited)));
    });
    return deadEnds;
  }

  const deadEndIds = new Set(findDeadEnds(startNodes[0].id, new Set()));
  deadEndIds.forEach((id) => {
    const n = nodeMap.get(id);
    if (!n || n.type === 'startNode') return;
    const alreadyHasOrphan = issues.some((i) => i.nodeId === id && i.category === 'orphan');
    if (alreadyHasOrphan) return;
    issues.push({
      severity: 'error',
      nodeId: id,
      message: `"${n.data.label}" is a dead end — every path must end with "End Call" or "Transfer".`,
      category: 'dead-end',
    });
  });

  // --- Floating nodes: non-Start nodes with no incoming edge (skip if already reported as orphan) ---
  nodes.forEach((n) => {
    if (n.type === 'startNode') return;
    const hasIncoming = edges.some((e) => e.target === n.id);
    if (!hasIncoming) {
      const alreadyReported = issues.some((i) => i.nodeId === n.id);
      if (!alreadyReported) {
        issues.push({
          severity: 'warning',
          nodeId: n.id,
          message: `"${n.data.label}" has no incoming connection — it will never be reached.`,
          category: 'orphan',
        });
      }
    }
  });

  return issues;
}

/**
 * Aggregates error and warning counts per node for UI badges or highlights.
 *
 * @param {Array<{ severity: string, nodeId?: string | null }>} issues - Output from {@link validateFlow}.
 * @returns {Record<string, { errors: number, warnings: number }>} Map of nodeId → counts (only nodes with issues).
 */
export function getIssueCountsForNodes(issues) {
  const counts = {};
  issues.forEach((issue) => {
    if (issue.nodeId) {
      if (!counts[issue.nodeId]) counts[issue.nodeId] = { errors: 0, warnings: 0 };
      if (issue.severity === 'error') counts[issue.nodeId].errors++;
      else counts[issue.nodeId].warnings++;
    }
  });
  return counts;
}
