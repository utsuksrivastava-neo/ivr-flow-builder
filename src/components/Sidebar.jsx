import React from 'react';
import ExotelLogo from './ExotelLogo';
import {
  List,
  Play,
  MessageSquare,
  Bot,
  PhoneForwarded,
  Mic,
  PhoneOff,
  Hash,
  Globe,
  GripVertical,
} from 'lucide-react';

const nodeCategories = [
  {
    title: 'Call Flow',
    items: [
      { type: 'menuNode', label: 'IVR Menu', icon: List, color: '#394FB6', desc: 'DTMF-based menu routing' },
      { type: 'gatherNode', label: 'Gather Digits', icon: Hash, color: '#eab308', desc: 'Collect DTMF input' },
      { type: 'transferNode', label: 'Transfer', icon: PhoneForwarded, color: '#f97316', desc: 'Dial & transfer call' },
      { type: 'hangupNode', label: 'Hang Up', icon: PhoneOff, color: '#6b7280', desc: 'End the call' },
    ],
  },
  {
    title: 'Media',
    items: [
      { type: 'playNode', label: 'Play Audio', icon: Play, color: '#a855f7', desc: 'Play audio file/URL' },
      { type: 'sayNode', label: 'Say (TTS)', icon: MessageSquare, color: '#ec4899', desc: 'Text-to-speech message' },
      { type: 'recordNode', label: 'Record', icon: Mic, color: '#ef4444', desc: 'Record the call' },
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
      { type: 'apiCallNode', label: 'API Call', icon: Globe, color: '#0ea5e9', desc: 'HTTP API call (sync / async)' },
    ],
  },
];

function onDragStart(event, nodeType) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ExotelLogo height={18} light={true} />
        </div>
        <p className="sidebar-hint">Drag nodes onto the canvas</p>
      </div>

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
