/**
 * Sidebar.jsx
 *
 * Left-hand panel showing draggable IVR node types grouped by category.
 * Users drag nodes from here onto the React Flow canvas to build flows.
 */
import React from 'react';
import ExotelLogo from './ExotelLogo';
import useThemeStore from '../store/themeStore';
import {
  List,
  Play,
  MessageSquare,
  MessageCircle,
  Bot,
  PhoneForwarded,
  Mic,
  MicOff,
  PhoneOff,
  Hash,
  Globe,
  Zap,
  Voicemail,
  GripVertical,
} from 'lucide-react';

/**
 * Node categories displayed in the sidebar.
 * Each item maps to a node type that can be dropped onto the canvas.
 */
const nodeCategories = [
  {
    title: 'Call Flow',
    items: [
      { type: 'menuNode', label: 'IVR Menu', icon: List, color: '#394FB6', desc: 'DTMF-based menu routing' },
      { type: 'gatherNode', label: 'Gather Digits', icon: Hash, color: '#eab308', desc: 'Collect multi-digit DTMF input' },
      { type: 'transferNode', label: 'Transfer', icon: PhoneForwarded, color: '#f97316', desc: 'Dial & transfer call' },
      { type: 'hangupNode', label: 'End Call', icon: PhoneOff, color: '#6b7280', desc: 'End the call' },
    ],
  },
  {
    title: 'Media',
    items: [
      { type: 'messageNode', label: 'Greetings', icon: MessageCircle, color: '#14b8a6', desc: 'Simple greeting message to caller' },
      { type: 'playNode', label: 'Play Audio', icon: Play, color: '#a855f7', desc: 'Play audio file / URL' },
      { type: 'sayNode', label: 'Say (TTS)', icon: MessageSquare, color: '#ec4899', desc: 'Text-to-speech with voice config' },
    ],
  },
  {
    title: 'Recording',
    items: [
      { type: 'startRecordNode', label: 'Start Recording', icon: Mic, color: '#d32f2f', desc: 'Begin call recording' },
      { type: 'stopRecordNode', label: 'Stop Recording', icon: MicOff, color: '#b71c1c', desc: 'End active recording' },
      { type: 'voicemailNode', label: 'Voicemail', icon: Voicemail, color: '#f59e0b', desc: 'Greeting + record caller message' },
    ],
  },
  {
    title: 'AI / Bot',
    items: [
      { type: 'voicebotNode', label: 'Voicebot', icon: Bot, color: '#06b6d4', desc: 'WebSocket voice bot' },
    ],
  },
  {
    title: 'Integration',
    items: [
      { type: 'syncApiNode', label: 'Sync API Call', icon: Globe, color: '#0ea5e9', desc: 'HTTP call — wait for response' },
      { type: 'asyncApiNode', label: 'Async API Call', icon: Zap, color: '#8b5cf6', desc: 'Fire HTTP call & continue' },
    ],
  },
];

/** Sets the drag data so FlowCanvas knows which node type to create on drop. */
function onDragStart(event, nodeType) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export default function Sidebar() {
  const themeMode = useThemeStore((s) => s.mode);
  return (
    <aside className="sidebar">
      {/* Header with Exotel branding */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ExotelLogo height={18} light={themeMode === 'dark'} />
        </div>
        <p className="sidebar-hint">Drag nodes onto the canvas</p>
      </div>

      {/* Scrollable node category list */}
      <div className="sidebar-content">
        {nodeCategories.map((cat) => (
          <div key={cat.title} className="sidebar-category">
            <h3 className="category-title">{cat.title}</h3>
            <div className="category-items">
              {cat.items.map((item) => (
                <div
                  key={item.type}
                  className="sidebar-node"
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                >
                  <div className="sidebar-node-icon" style={{ background: item.color + '20', color: item.color }}>
                    <item.icon size={16} />
                  </div>
                  <div className="sidebar-node-info">
                    <span className="sidebar-node-label">{item.label}</span>
                    <span className="sidebar-node-desc">{item.desc}</span>
                  </div>
                  <GripVertical size={14} className="sidebar-grip" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
