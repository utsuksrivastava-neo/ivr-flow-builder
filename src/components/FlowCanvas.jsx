import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useFlowStore from '../store/flowStore';
import useThemeStore from '../store/themeStore';
import { nodeTypes } from './CustomNodes';
import { LayoutGrid } from 'lucide-react';

export default function FlowCanvas() {
  const reactFlowWrapper = useRef(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
    applyAutoLayout,
    validationNodeCounts,
  } = useFlowStore();

  const themeMode = useThemeStore((s) => s.mode);
  const isLight = themeMode === 'light';

  const [reactFlowInstance, setReactFlowInstance] = React.useState(null);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout();
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [applyAutoLayout, reactFlowInstance]);

  const simulationPath = useFlowStore((s) => s.simulationPath);

  const styledNodes = nodes.map((n) => {
    const classes = [];
    if (simulationPath.includes(n.id)) classes.push('simulation-active');
    const counts = validationNodeCounts[n.id];
    if (counts?.errors) classes.push('has-error');
    else if (counts?.warnings) classes.push('has-warning');
    return { ...n, className: classes.join(' ') };
  });

  const edgeColor = isLight ? '#394FB6' : '#6366f1';
  const dotColor = isLight ? '#cbd5e1' : '#334155';
  const minimapMask = isLight ? 'rgba(241, 245, 249, 0.8)' : 'rgba(15, 23, 42, 0.8)';

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionLineStyle={{ stroke: edgeColor, strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={dotColor} />
        <Controls className="flow-controls" showInteractive={false} />
        <Panel position="bottom-left" className="auto-layout-panel">
          <button
            className="auto-layout-btn"
            onClick={handleAutoLayout}
            title="Auto-arrange all nodes"
          >
            <LayoutGrid size={15} />
            <span>Auto Layout</span>
          </button>
        </Panel>
        <MiniMap
          className="flow-minimap"
          nodeColor={(n) => {
            const counts = validationNodeCounts[n.id];
            if (counts?.errors) return '#ef4444';
            if (counts?.warnings) return '#f59e0b';
            const colorMap = {
              startNode: '#10b981',
              menuNode: '#3b82f6',
              playNode: '#a855f7',
              sayNode: '#ec4899',
              voicebotNode: '#06b6d4',
              transferNode: '#f97316',
              recordNode: '#ef4444',
              hangupNode: '#6b7280',
              gatherNode: '#eab308',
            };
            return colorMap[n.type] || '#64748b';
          }}
          maskColor={minimapMask}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
