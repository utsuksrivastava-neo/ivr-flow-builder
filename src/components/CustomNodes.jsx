import React, { memo, useMemo, createContext, useContext } from 'react';
import { Handle, Position, useStore as useReactFlowStore } from 'reactflow';
import useFlowStore from '../store/flowStore';
import useThemeStore from '../store/themeStore';
import {
  PhoneOutgoing,
  PhoneIncoming,
  List,
  Play,
  MessageSquare,
  Bot,
  PhoneForwarded,
  Mic,
  MicOff,
  PhoneOff,
  Hash,
  GitBranch,
  Globe,
  MessageCircle,
  Zap,
  Voicemail,
} from 'lucide-react';

/**
 * BFS traversal from the start node to assign sequential step numbers.
 * @param {Array} nodes - React Flow nodes array
 * @param {Array} edges - React Flow edges array
 * @returns {Object} Map of nodeId to step number (1-indexed)
 */
function computeStepNumbers(nodes, edges) {
  const startNode = nodes.find((n) => n.type === 'startNode');
  if (!startNode) return {};
  const adj = {};
  edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  });
  const result = {};
  const visited = new Set();
  const queue = [startNode.id];
  let step = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    step++;
    result[id] = step;
    (adj[id] || []).forEach((t) => { if (!visited.has(t)) queue.push(t); });
  }
  return result;
}

/**
 * Context that provides the BFS step-number map to all nodes at once.
 * Computed once per render cycle in StepNumberProvider rather than per-node.
 */
const StepNumberContext = createContext({});

/**
 * Provider that computes step numbers once and shares via context.
 * Wrap around the ReactFlow tree (see FlowCanvas).
 */
export function StepNumberProvider({ children }) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const map = useMemo(() => computeStepNumbers(nodes, edges), [nodes, edges]);
  return (
    <StepNumberContext.Provider value={map}>
      {children}
    </StepNumberContext.Provider>
  );
}

function useStepNumber(nodeId) {
  const map = useContext(StepNumberContext);
  return map[nodeId] || null;
}

/** Dark-mode node backgrounds — rich saturated tints. */
const darkBg = {
  startNode: '#0d3a1a',
  menuNode: '#1c2a5e',
  playNode: '#4a1d6a',
  sayNode: '#6b1d4a',
  voicebotNode: '#134e5e',
  transferNode: '#5c3310',
  recordNode: '#6b1a1a',
  hangupNode: '#374151',
  gatherNode: '#5c4b10',
  conditionNode: '#3b3470',
  apiCallNode: '#1a3652',
  messageNode: '#1a3a3a',
  startRecordNode: '#6b1a1a',
  stopRecordNode: '#4a2020',
  syncApiNode: '#1a3652',
  asyncApiNode: '#2d1a52',
  voicemailNode: '#5c4b10',
};

/** Light-mode node backgrounds — very light tints. */
const lightBg = {
  startNode: '#e8f5e9',
  menuNode: '#e8eaf6',
  playNode: '#f3e5f5',
  sayNode: '#fce4ec',
  voicebotNode: '#e0f7fa',
  transferNode: '#fff3e0',
  recordNode: '#ffebee',
  hangupNode: '#f5f5f5',
  gatherNode: '#fffde7',
  conditionNode: '#ede7f6',
  apiCallNode: '#e1f5fe',
  messageNode: '#e0f2f1',
  startRecordNode: '#ffebee',
  stopRecordNode: '#ffcdd2',
  syncApiNode: '#e1f5fe',
  asyncApiNode: '#ede7f6',
  voicemailNode: '#fffde7',
};

/** Maps node type keys to theme colors (border, accent). bg comes from theme-specific maps. */
const nodeColorBase = {
  startNode: { border: '#4DB961', accent: '#5EC972' },
  menuNode: { border: '#394FB6', accent: '#6175C5' },
  playNode: { border: '#a855f7', accent: '#c084fc' },
  sayNode: { border: '#ec4899', accent: '#f472b6' },
  voicebotNode: { border: '#06b6d4', accent: '#22d3ee' },
  transferNode: { border: '#f97316', accent: '#fb923c' },
  recordNode: { border: '#d32f2f', accent: '#ef5350' },
  hangupNode: { border: '#6b7280', accent: '#9ca3af' },
  gatherNode: { border: '#eab308', accent: '#facc15' },
  conditionNode: { border: '#8b5cf6', accent: '#a78bfa' },
  apiCallNode: { border: '#0ea5e9', accent: '#38bdf8' },
  messageNode: { border: '#14b8a6', accent: '#2dd4bf' },
  startRecordNode: { border: '#d32f2f', accent: '#ef5350' },
  stopRecordNode: { border: '#b71c1c', accent: '#e57373' },
  syncApiNode: { border: '#0ea5e9', accent: '#38bdf8' },
  asyncApiNode: { border: '#8b5cf6', accent: '#a78bfa' },
  voicemailNode: { border: '#f59e0b', accent: '#fbbf24' },
};

/** Alias for internal use — `export { nodeColorBase as nodeColors }` does not create a local `nodeColors` binding. */
const nodeColors = nodeColorBase;

/** Returns theme-resolved { bg, border, accent } for a given node type. */
function useNodeColors(type) {
  const mode = useThemeStore((s) => s.mode);
  const base = nodeColorBase[type] || { border: '#6b7280', accent: '#9ca3af' };
  const bg = mode === 'light'
    ? (lightBg[type] || '#f5f5f5')
    : (darkBg[type] || '#374151');
  return { ...base, bg };
}

/** Lucide icon component per node type (used by NodeShell unless iconOverride is set). */
const nodeIcons = {
  startNode: PhoneOutgoing,
  menuNode: List,
  playNode: Play,
  sayNode: MessageSquare,
  voicebotNode: Bot,
  transferNode: PhoneForwarded,
  recordNode: Mic,
  hangupNode: PhoneOff,
  gatherNode: Hash,
  conditionNode: GitBranch,
  apiCallNode: Globe,
  messageNode: MessageCircle,
  startRecordNode: Mic,
  stopRecordNode: MicOff,
  syncApiNode: Globe,
  asyncApiNode: Zap,
  voicemailNode: Voicemail,
};

/**
 * Renders the shared chrome for custom nodes: optional target handle, header with icon/title,
 * body slot, and either a single default source handle or none (multi-output nodes add handles in children).
 * @param {object} props
 * @param {string} props.type — key into nodeColors / nodeIcons
 * @param {{ label: string }} props.data
 * @param {boolean} props.selected
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.hasInput=true]
 * @param {string[]} [props.outputIds=['default']] — non-default ids suppress the built-in default handle
 * @param {React.ComponentType<{ size?: number }>} [props.iconOverride]
 */
function NodeShell({ type, data, selected, children, hasInput = true, outputIds = ['default'], iconOverride, nodeId }) {
  const colors = useNodeColors(type);
  const Icon = iconOverride || nodeIcons[type];
  const stepNum = useStepNumber(nodeId);

  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{
        borderColor: selected ? colors.accent : colors.border,
        background: colors.bg,
      }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="node-handle node-handle-target"
          style={{ borderColor: colors.accent }}
        />
      )}
      <div className="node-header" style={{ borderBottomColor: colors.border + '40' }}>
        {stepNum && (
          <span
            className="node-step-badge"
            style={{ background: colors.accent, color: '#fff' }}
          >
            {stepNum}
          </span>
        )}
        <div className="node-icon" style={{ background: colors.border + '30', color: colors.accent }}>
          <Icon size={14} />
        </div>
        <span className="node-title">{data.label}</span>
      </div>
      <div className="node-body">{children}</div>
      {outputIds.length === 1 && outputIds[0] === 'default' && (
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          className="node-handle node-handle-source"
          style={{ borderColor: colors.accent }}
        />
      )}
    </div>
  );
}

/** Two stacked Lucide icons for start nodes that handle both inbound and outbound. */
function BothDirectionIcons({ size = 14 }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <PhoneIncoming size={size} />
      <PhoneOutgoing size={size} />
    </span>
  );
}

/**
 * Entry node: shows call direction, and contact/exophone (or caller id) based on direction.
 * Supports inbound, outbound, and both (dual-direction) flows.
 */
export const StartNode = memo(({ id, data, selected }) => {
  const callDirection = data.callDirection;
  const isBoth = callDirection === 'both';
  const isInbound = callDirection === 'inbound';

  // Icon: both directions show incoming+outgoing; otherwise inbound vs outbound
  const iconOverride = isBoth ? BothDirectionIcons : isInbound ? PhoneIncoming : PhoneOutgoing;

  // Direction label copy
  let directionLabel = '📤 Outbound';
  if (isBoth) directionLabel = '📞 Inbound + Outbound';
  else if (isInbound) directionLabel = '📥 Inbound';

  return (
    <NodeShell type="startNode" data={data} selected={selected} hasInput={false} iconOverride={iconOverride} nodeId={id}>
      <div className="node-info">
        <span className="node-info-label">Direction</span>
        <span className="node-info-value">{directionLabel}</span>
      </div>
      {/* Both: show Contact URI and Exophone */}
      {isBoth && (
        <>
          <div className="node-info">
            <span className="node-info-label">Contact URI</span>
            <span className="node-info-value">{data.contactUri || '—'}</span>
          </div>
          <div className="node-info">
            <span className="node-info-label">Exophone</span>
            <span className="node-info-value">{data.exophone || '—'}</span>
          </div>
        </>
      )}
      {/* Outbound only: Call To + Caller ID row */}
      {!isBoth && !isInbound && (
        <div className="node-info">
          <span className="node-info-label">Call To</span>
          <span className="node-info-value">{data.contactUri || '—'}</span>
        </div>
      )}
      {/* Inbound or outbound: second row (not duplicated for both — handled above) */}
      {!isBoth && (
        <div className="node-info">
          <span className="node-info-label">{isInbound ? 'Exophone' : 'Caller ID'}</span>
          <span className="node-info-value">{data.exophone || '—'}</span>
        </div>
      )}
    </NodeShell>
  );
});

/** DTMF / IVR menu with per-option and timeout/invalid source handles. */
export const MenuNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.menuNode;
  const options = data.options || [];
  const allOutputs = [
    ...options.map((o) => `dtmf-${o.key}`),
    'timeout',
    'invalid',
  ];

  return (
    <NodeShell type="menuNode" data={data} selected={selected} outputIds={allOutputs} nodeId={id}>
      {data.prompt && (
        <div className="node-prompt">{data.prompt.length > 60 ? data.prompt.slice(0, 60) + '…' : data.prompt}</div>
      )}
      <div className="menu-options">
        {options.map((opt, idx) => (
          <div key={opt.key} className="menu-option-row">
            <span className="key-badge" style={{ background: colors.border, color: '#fff' }}>
              {opt.key}
            </span>
            <span className="option-label">{opt.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`dtmf-${opt.key}`}
              className="node-handle node-handle-source"
              style={{ borderColor: colors.accent }}
            />
          </div>
        ))}
        <div className="menu-option-row timeout-row">
          <span className="key-badge timeout-badge">⏱</span>
          <span className="option-label">Timeout</span>
          <Handle
            type="source"
            position={Position.Right}
            id="timeout"
            className="node-handle node-handle-source"
            style={{ borderColor: '#f59e0b' }}
          />
        </div>
        <div className="menu-option-row invalid-row">
          <span className="key-badge invalid-badge">✗</span>
          <span className="option-label">Invalid</span>
          <Handle
            type="source"
            position={Position.Right}
            id="invalid"
            className="node-handle node-handle-source"
            style={{ borderColor: '#d32f2f' }}
          />
        </div>
      </div>
    </NodeShell>
  );
});

/** Plays an audio URL with optional loop count. */
export const PlayNode = memo(({ id, data, selected }) => (
  <NodeShell type="playNode" data={data} selected={selected} nodeId={id}>
    <div className="node-info">
      <span className="node-info-label">Audio</span>
      <span className="node-info-value url-value">
        {data.audioUrl ? (data.audioUrl.length > 35 ? '…' + data.audioUrl.slice(-35) : data.audioUrl) : 'Not set'}
      </span>
    </div>
    {data.loop > 1 && (
      <div className="node-info">
        <span className="node-info-label">Loop</span>
        <span className="node-info-value">{data.loop}×</span>
      </div>
    )}
  </NodeShell>
));

/** TTS say node: message preview and voice/engine. */
export const SayNode = memo(({ id, data, selected }) => (
  <NodeShell type="sayNode" data={data} selected={selected} nodeId={id}>
    <div className="node-prompt">{data.message ? (data.message.length > 60 ? data.message.slice(0, 60) + '…' : data.message) : 'No message set'}</div>
    <div className="node-info">
      <span className="node-info-label">Voice</span>
      <span className="node-info-value">{data.ttsVoice || 'Aditi'} ({data.ttsEngine || 'polly'})</span>
    </div>
  </NodeShell>
));

/** Streaming voicebot with success and error outputs. */
export const VoicebotNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.voicebotNode;
  return (
    <NodeShell type="voicebotNode" data={data} selected={selected} outputIds={['bot-end', 'bot-error']} nodeId={id}>
      <div className="node-info">
        <span className="node-info-label">Type</span>
        <span className="node-info-value">{data.streamType || 'bidirectional'}</span>
      </div>
      <div className="node-info">
        <span className="node-info-label">URL</span>
        <span className="node-info-value url-value">
          {data.streamUrl ? (data.streamUrl.length > 30 ? '…' + data.streamUrl.slice(-30) : data.streamUrl) : 'Not set'}
        </span>
      </div>
      <div className="menu-options" style={{ marginTop: 6 }}>
        <div className="menu-option-row">
          <span className="key-badge" style={{ background: colors.border, color: '#fff', fontSize: 10 }}>✓</span>
          <span className="option-label">Bot Ends</span>
          <Handle type="source" position={Position.Right} id="bot-end" className="node-handle node-handle-source" style={{ borderColor: colors.accent }} />
        </div>
        <div className="menu-option-row">
          <span className="key-badge invalid-badge" style={{ fontSize: 10 }}>✗</span>
          <span className="option-label">Error</span>
          <Handle type="source" position={Position.Right} id="bot-error" className="node-handle node-handle-source" style={{ borderColor: '#d32f2f' }} />
        </div>
      </div>
    </NodeShell>
  );
});

/** Transfer to another destination with success/failure branches. */
export const TransferNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.transferNode;
  return (
    <NodeShell type="transferNode" data={data} selected={selected} outputIds={['transfer-success', 'transfer-fail']} nodeId={id}>
      <div className="node-info">
        <span className="node-info-label">To</span>
        <span className="node-info-value">{data.contactUri || '—'}</span>
      </div>
      <div className="node-info">
        <span className="node-info-label">Network</span>
        <span className="node-info-value">{data.networkType || 'pstn'}</span>
      </div>
      <div className="menu-options" style={{ marginTop: 6 }}>
        <div className="menu-option-row">
          <span className="key-badge" style={{ background: colors.border, color: '#fff', fontSize: 10 }}>✓</span>
          <span className="option-label">Success</span>
          <Handle type="source" position={Position.Right} id="transfer-success" className="node-handle node-handle-source" style={{ borderColor: colors.accent }} />
        </div>
        <div className="menu-option-row">
          <span className="key-badge invalid-badge" style={{ fontSize: 10 }}>✗</span>
          <span className="option-label">Failed</span>
          <Handle type="source" position={Position.Right} id="transfer-fail" className="node-handle node-handle-source" style={{ borderColor: '#d32f2f' }} />
        </div>
      </div>
    </NodeShell>
  );
});

/** Legacy full record configuration (direction + format). */
export const RecordNode = memo(({ id, data, selected }) => (
  <NodeShell type="recordNode" data={data} selected={selected} nodeId={id}>
    <div className="node-info">
      <span className="node-info-label">Direction</span>
      <span className="node-info-value">{data.direction || 'both'}</span>
    </div>
    <div className="node-info">
      <span className="node-info-label">Format</span>
      <span className="node-info-value">{data.format || 'mp3'} · {data.channel || 'mono'}</span>
    </div>
  </NodeShell>
));

/** Terminal end-call node — no outgoing edges. */
export const HangupNode = memo(({ id, data, selected }) => (
  <NodeShell type="hangupNode" data={data} selected={selected} outputIds={[]} nodeId={id}>
    <div className="node-prompt" style={{ opacity: 0.6, textAlign: 'center' }}>
      End Call
    </div>
  </NodeShell>
));

/** Collect DTMF digits with optional TTS/audio prompt (like IVR Menu). */
export const GatherNode = memo(({ id, data, selected }) => {
  const pt = data.promptType || 'none';
  const promptPreview =
    pt === 'tts' && data.prompt
      ? data.prompt.length > 60
        ? data.prompt.slice(0, 60) + '…'
        : data.prompt
      : pt === 'audio' && data.audioUrl
        ? data.audioUrl.length > 40
          ? '…' + data.audioUrl.slice(-40)
          : data.audioUrl
        : null;

  return (
    <NodeShell type="gatherNode" data={data} selected={selected} nodeId={id}>
      {promptPreview && (
        <div className="node-prompt" title={pt === 'tts' ? data.prompt : data.audioUrl}>
          {pt === 'audio' ? `♪ ${promptPreview}` : promptPreview}
        </div>
      )}
      <div className="node-info">
        <span className="node-info-label">Digits</span>
        <span className="node-info-value">{data.numDigits || 1}</span>
      </div>
      <div className="node-info">
        <span className="node-info-label">Finish Key</span>
        <span className="node-info-value">{data.finishOnKey || '#'}</span>
      </div>
    </NodeShell>
  );
});

/** Generic API call with sync/async in data and success/failure handles. */
export const ApiCallNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.apiCallNode;
  return (
    <NodeShell type="apiCallNode" data={data} selected={selected} outputIds={['api-success', 'api-fail']} nodeId={id}>
      <div className="node-info">
        <span className="node-info-label">Method</span>
        <span className="node-info-value">
          <span className={`method-badge method-${(data.method || 'POST').toLowerCase()}`}>{data.method || 'POST'}</span>
          {data.mode === 'async' ? ' Async' : ' Sync'}
        </span>
      </div>
      <div className="node-info">
        <span className="node-info-label">URL</span>
        <span className="node-info-value url-value">
          {data.url ? (data.url.length > 32 ? data.url.slice(0, 32) + '…' : data.url) : 'Not set'}
        </span>
      </div>
      <div className="menu-options" style={{ marginTop: 6 }}>
        <div className="menu-option-row">
          <span className="key-badge" style={{ background: colors.border, color: '#fff', fontSize: 10 }}>✓</span>
          <span className="option-label">Success</span>
          <Handle type="source" position={Position.Right} id="api-success" className="node-handle node-handle-source" style={{ borderColor: colors.accent }} />
        </div>
        <div className="menu-option-row">
          <span className="key-badge invalid-badge" style={{ fontSize: 10 }}>✗</span>
          <span className="option-label">Failure</span>
          <Handle type="source" position={Position.Right} id="api-fail" className="node-handle node-handle-source" style={{ borderColor: '#d32f2f' }} />
        </div>
      </div>
    </NodeShell>
  );
});

/**
 * Simple message display: shows `data.message` truncated to 80 characters; single default output.
 */
export const MessageNode = memo(({ id, data, selected }) => {
  const raw = data.message || '';
  const preview = raw.length > 80 ? raw.slice(0, 80) + '…' : raw || 'No message';
  return (
    <NodeShell type="messageNode" data={data} selected={selected} nodeId={id}>
      <div className="node-prompt">{preview}</div>
    </NodeShell>
  );
});

/**
 * Begins recording: shows capture direction and audio format (same fields as legacy RecordNode).
 */
export const StartRecordNode = memo(({ id, data, selected }) => (
  <NodeShell type="startRecordNode" data={data} selected={selected} nodeId={id}>
    <div className="node-info">
      <span className="node-info-label">Direction</span>
      <span className="node-info-value">{data.direction || 'both'}</span>
    </div>
    <div className="node-info">
      <span className="node-info-label">Format</span>
      <span className="node-info-value">{data.format || 'mp3'} · {data.channel || 'mono'}</span>
    </div>
  </NodeShell>
));

/** Stops the active recording; single linear output. */
export const StopRecordNode = memo(({ id, data, selected }) => (
  <NodeShell type="stopRecordNode" data={data} selected={selected} nodeId={id}>
    <div className="node-prompt" style={{ opacity: 0.9 }}>
      Stops active recording
    </div>
  </NodeShell>
));

/**
 * Synchronous HTTP API: method badge + Sync label, URL, and api-success / api-fail source handles.
 */
export const SyncApiNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.syncApiNode;
  return (
    <NodeShell type="syncApiNode" data={data} selected={selected} outputIds={['api-success', 'api-fail']} nodeId={id}>
      <div className="node-info">
        <span className="node-info-label">Method</span>
        <span className="node-info-value">
          <span className={`method-badge method-${(data.method || 'POST').toLowerCase()}`}>{data.method || 'POST'}</span>
          {' '}Sync
        </span>
      </div>
      <div className="node-info">
        <span className="node-info-label">URL</span>
        <span className="node-info-value url-value">
          {data.url ? (data.url.length > 32 ? data.url.slice(0, 32) + '…' : data.url) : 'Not set'}
        </span>
      </div>
      <div className="menu-options" style={{ marginTop: 6 }}>
        <div className="menu-option-row">
          <span className="key-badge" style={{ background: colors.border, color: '#fff', fontSize: 10 }}>✓</span>
          <span className="option-label">Success</span>
          <Handle type="source" position={Position.Right} id="api-success" className="node-handle node-handle-source" style={{ borderColor: colors.accent }} />
        </div>
        <div className="menu-option-row">
          <span className="key-badge invalid-badge" style={{ fontSize: 10 }}>✗</span>
          <span className="option-label">Failure</span>
          <Handle type="source" position={Position.Right} id="api-fail" className="node-handle node-handle-source" style={{ borderColor: '#d32f2f' }} />
        </div>
      </div>
    </NodeShell>
  );
});

/**
 * Asynchronous / fire-and-forget API: method badge + Async label, URL, single default output.
 */
export const AsyncApiNode = memo(({ id, data, selected }) => (
  <NodeShell type="asyncApiNode" data={data} selected={selected} nodeId={id}>
    <div className="node-info">
      <span className="node-info-label">Method</span>
      <span className="node-info-value">
        <span className={`method-badge method-${(data.method || 'POST').toLowerCase()}`}>{data.method || 'POST'}</span>
        {' '}Async
      </span>
    </div>
    <div className="node-info">
      <span className="node-info-label">URL</span>
      <span className="node-info-value url-value">
        {data.url ? (data.url.length > 32 ? data.url.slice(0, 32) + '…' : data.url) : 'Not set'}
      </span>
    </div>
  </NodeShell>
));

/** React Flow node type registry — map type string to component. */
/** Voicemail: plays a greeting then records the caller's message (Exotel Voicemail action). */
export const VoicemailNode = memo(({ id, data, selected }) => {
  const colors = nodeColors.voicemailNode;
  return (
    <NodeShell type="voicemailNode" data={data} selected={selected} nodeId={id}>
      <div className="node-info">
        <span className="node-detail">
          <strong>Greeting:</strong> {data.message || '—'}
        </span>
        <span className="node-detail" style={{ color: colors.accent }}>
          Silence: {data.silenceInSec || 5}s &middot; Timeout: {data.timeoutInSec || 30}s &middot; Finish: {data.finishOnKey || '#'}
        </span>
      </div>
    </NodeShell>
  );
});

export const nodeTypes = {
  startNode: StartNode,
  menuNode: MenuNode,
  playNode: PlayNode,
  sayNode: SayNode,
  voicebotNode: VoicebotNode,
  transferNode: TransferNode,
  recordNode: RecordNode,
  hangupNode: HangupNode,
  gatherNode: GatherNode,
  apiCallNode: ApiCallNode,
  messageNode: MessageNode,
  startRecordNode: StartRecordNode,
  stopRecordNode: StopRecordNode,
  syncApiNode: SyncApiNode,
  asyncApiNode: AsyncApiNode,
  voicemailNode: VoicemailNode,
};

export { nodeColorBase as nodeColors, nodeIcons };
