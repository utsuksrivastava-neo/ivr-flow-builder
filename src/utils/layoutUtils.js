import dagre from 'dagre';

function estimateNodeHeight(node) {
  switch (node.type) {
    case 'startNode':
      return 72;
    case 'menuNode': {
      const optCount = (node.data.options || []).length;
      return 64 + optCount * 28 + 56;
    }
    case 'playNode':
      return 88;
    case 'sayNode':
      return 96;
    case 'voicebotNode':
      return 140;
    case 'transferNode':
      return 128;
    case 'recordNode':
      return 88;
    case 'hangupNode':
      return 64;
    case 'gatherNode':
      return 88;
    default:
      return 80;
  }
}

const NODE_WIDTH = 220;

export function autoLayoutNodes(nodes, edges, direction = 'LR') {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 200,
    marginx: 60,
    marginy: 60,
    align: 'UL',
  });

  nodes.forEach((node) => {
    const height = estimateNodeHeight(node);
    g.setNode(node.id, { width: NODE_WIDTH, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const height = estimateNodeHeight(node);
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });
}
