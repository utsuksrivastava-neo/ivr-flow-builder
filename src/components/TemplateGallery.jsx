import React, { useState, useMemo } from 'react';
import { getTemplates } from '../data/templates';
import useFlowStore from '../store/flowStore';
import useAppConfigStore from '../store/appConfigStore';
import {
  X,
  LayoutTemplate,
  ArrowRight,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Layers,
} from 'lucide-react';

const TABS = [
  { key: 'all', label: 'All Templates', icon: Layers },
  { key: 'inbound', label: 'Inbound', icon: PhoneIncoming },
  { key: 'outbound', label: 'Outbound', icon: PhoneOutgoing },
];

export default function TemplateGallery({ isOpen, onClose }) {
  const loadFlowData = useFlowStore((s) => s.loadFlowData);
  const setProjectName = useFlowStore((s) => s.setProjectName);
  const mergedConfig = useAppConfigStore((s) => s.mergedConfig);
  const [tab, setTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const templates = useMemo(() => getTemplates(mergedConfig), [mergedConfig]);

  const filtered = useMemo(
    () => (tab === 'all' ? templates : templates.filter((t) => t.category === tab)),
    [tab, templates]
  );

  const handleUseTemplate = (tpl) => {
    const clonedNodes = tpl.nodes.map((n) => ({
      ...n,
      data: { ...n.data },
      position: { ...n.position },
    }));
    const clonedEdges = tpl.edges.map((e) => ({ ...e }));
    loadFlowData({
      projectName: tpl.projectName,
      nodes: clonedNodes,
      edges: clonedEdges,
    });
    onClose();
  };

  const handleStartScratch = () => {
    useFlowStore.getState().clearCanvas();
    setProjectName('My IVR Flow');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="tpl-overlay">
      <div className="tpl-modal">
        {/* Header */}
        <div className="tpl-header">
          <div className="tpl-header-left">
            <LayoutTemplate size={20} />
            <div>
              <h2 className="tpl-title">Choose a Template</h2>
              <p className="tpl-subtitle">
                Start with a pre-built IVR flow or build your own from scratch
              </p>
            </div>
          </div>
          <button className="config-btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tpl-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.key === 'all'
                ? templates.length
                : templates.filter((tp) => tp.category === t.key).length;
            return (
              <button
                key={t.key}
                className={`tpl-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className="tpl-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="tpl-body">
          <div className="tpl-grid">
            {filtered.map((tpl) => (
              <div
                key={tpl.id}
                className={`tpl-card ${selectedId === tpl.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(tpl.id === selectedId ? null : tpl.id)}
              >
                <div className="tpl-card-top">
                  <span className="tpl-card-icon">{tpl.icon}</span>
                  <span
                    className={`tpl-card-badge ${tpl.category}`}
                  >
                    {tpl.category === 'inbound' ? (
                      <><PhoneIncoming size={10} /> Inbound</>
                    ) : (
                      <><PhoneOutgoing size={10} /> Outbound</>
                    )}
                  </span>
                </div>
                <h3 className="tpl-card-name">{tpl.name}</h3>
                <p className="tpl-card-industry">{tpl.industry}</p>
                <p className="tpl-card-desc">{tpl.description}</p>
                <div className="tpl-card-meta">
                  <span>{tpl.nodes.length} nodes</span>
                  <span>·</span>
                  <span>{tpl.edges.length} connections</span>
                </div>
                {tpl.tags && (
                  <div className="tpl-card-tags">
                    {tpl.tags.map((tag) => (
                      <span key={tag} className="tpl-tag">{tag}</span>
                    ))}
                  </div>
                )}
                <button
                  className="tpl-card-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(tpl);
                  }}
                >
                  Use This Template
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="tpl-footer">
          <div className="tpl-footer-divider">
            <span>or</span>
          </div>
          <button className="tpl-scratch-btn" onClick={handleStartScratch}>
            <Phone size={16} />
            Start from Scratch
          </button>
          <p className="tpl-footer-hint">
            Begin with a blank canvas and a single Start node
          </p>
        </div>
      </div>
    </div>
  );
}
