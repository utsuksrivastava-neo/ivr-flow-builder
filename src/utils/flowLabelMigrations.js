/**
 * Normalizes legacy hangup node labels to the current product copy ("End Call").
 * @param {import('@xyflow/react').Node[]|undefined} nodes
 * @returns {import('@xyflow/react').Node[]}
 */
export function migrateHangupNodeLabels(nodes) {
  if (!Array.isArray(nodes)) return nodes || [];
  return nodes.map((n) => {
    if (n.type !== 'hangupNode' || !n.data) return n;
    const label = n.data.label;
    if (label === 'Hang Up' || label === 'Hangup') {
      return { ...n, data: { ...n.data, label: 'End Call' } };
    }
    return n;
  });
}
