import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
  PhoneOutgoing,
  PhoneIncoming,
  List,
  Play,
  MessageSquare,
  Bot,
  PhoneForwarded,
  Mic,
  PhoneOff,
  Hash,
  GitBranch,
} from 'lucide-react';

const nodeColors = {
  startNode: { bg: '#065f46', border: '#10b981', accent: '#34d399' },
  menuNode: { bg: '#1e3a5f', border: '#3b82f6', accent: '#60a5fa' },
  playNode: { bg: '#4a1d6a', border: '#a855f7', accent: '#c084fc' },
  sayNode: { bg: '#6b1d4a', border: '#ec4899', accent: '#f472b6' },
  voicebotNode: { bg: '#134e5e', border: '#06b6d4', accent: '#22d3ee' },
  transferNode: { bg: '#5c3310', border: '#f97316', accent: '#fb923c' },
  recordNode: { bg: '#6b1a1a', border: '#ef4444', accent: '#f87171' },
  hangupNode: { bg: '#374151', border: '#6b7280', accent: '#9ca3af' },
  gatherNode: { bg: '#5c4b10', border: '#eab308', accent: '#facc15' },
  conditionNode: { bg: '#3b3470', border: '#8b5cf6', accent: '#a78bfa' },
};

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
};

function NodeShell({ type, data, selected, children, hasInput = true, outputIds = ['default'], iconOverride }) {
  const colors = nodeColors[type];
  const Icon = iconOverride || nodeIcons[type];

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

export const StartNode = memo(({ data, selected }) => {
  const isInbound = data.callDirection === 'inbound';
  return (
    <NodeShell
      type="startNode"
      data={data}
      selected={selected}
      hasInput={false}
      iconOverride={isInbound ? PhoneIncoming : PhoneOutgoing}
    >
      <div className="node-info">
        <span className="node-info-label">Direction</span>
        <span className="node-info-value">{isInbound ? '📥 Inbound' : '📤 Outbound'}</span>
      </div>
      {!isInbound && (
        <div className="node-info">
          <span className="node-info-label">Call To</span>
          <span className="node-info-value">{data.contactUri || '—'}</span>
        </div>
      )}
      <div className="node-info">
        <span className="node-info-label">{isInbound ? 'Exophone' : 'Caller ID'}</span>
        <span className="node-info-value">{data.exophone || '—'}</span>
      </div>
    </NodeShell>
  );
});

export const MenuNode = memo(({ data, selected }) => {
  const colors = nodeColors.menuNode;
  const options = data.options || [];
  const allOutputs = [
    ...options.map((o) => o.key),
    'timeout',
    'invalid',
  ];

  return (
    <NodeShell type="menuNode" data={data} selected={selected} outputIds={allOutputs}>
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
            style={{ borderColor: '#ef4444' }}
          />
        </div>
      </div>
    </NodeShell>
  );
});

export const PlayNode = memo(({ data, selected }) => (
  <NodeShell type="playNode" data={data} selected={selected}>
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

export const SayNode = memo(({ data, selected }) => (
  <NodeShell type="sayNode" data={data} selected={selected}>
    <div className="node-prompt">{data.message ? (data.message.length > 60 ? data.message.slice(0, 60) + '…' : data.message) : 'No message set'}</div>
    <div className="node-info">
      <span className="node-info-label">Voice</span>
      <span className="node-info-value">{data.ttsVoice || 'Aditi'} ({data.ttsEngine || 'polly'})</span>
    </div>
  </NodeShell>
));

export const VoicebotNode = memo(({ data, selected }) => {
  const colors = nodeColors.voicebotNode;
  return (
    <NodeShell type="voicebotNode" data={data} selected={selected} outputIds={['bot-end', 'bot-error']}>
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
          <Handle type="source" position={Position.Right} id="bot-error" className="node-handle node-handle-source" style={{ borderColor: '#ef4444' }} />
        </div>
      </div>
    </NodeShell>
  );
});

export const TransferNode = memo(({ data, selected }) => {
  const colors = nodeColors.transferNode;
  return (
    <NodeShell type="transferNode" data={data} selected={selected} outputIds={['transfer-success', 'transfer-fail']}>
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
          <Handle type="source" position={Position.Right} id="transfer-fail" className="node-handle node-handle-source" style={{ borderColor: '#ef4444' }} />
        </div>
      </div>
    </NodeShell>
  );
});

export const RecordNode = memo(({ data, selected }) => (
  <NodeShell type="recordNode" data={data} selected={selected}>
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

export const HangupNode = memo(({ data, selected }) => (
  <NodeShell type="hangupNode" data={data} selected={selected} outputIds={[]}>
    <div className="node-prompt" style={{ opacity: 0.6, textAlign: 'center' }}>
      End of call
    </div>
  </NodeShell>
));

export const GatherNode = memo(({ data, selected }) => (
  <NodeShell type="gatherNode" data={data} selected={selected}>
    <div className="node-info">
      <span className="node-info-label">Digits</span>
      <span className="node-info-value">{data.numDigits || 1}</span>
    </div>
    <div className="node-info">
      <span className="node-info-label">Finish Key</span>
      <span className="node-info-value">{data.finishOnKey || '#'}</span>
    </div>
  </NodeShell>
));

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
};

export { nodeColors, nodeIcons };
