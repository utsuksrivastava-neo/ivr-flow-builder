import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import useProjectsStore from '../store/projectsStore';
import useFlowStore from '../store/flowStore';
import TemplateGallery from './TemplateGallery';
import {
  PhoneOutgoing,
  Plus,
  LayoutTemplate,
  LogOut,
  Trash2,
  FolderOpen,
  Clock,
  Layers,
  PhoneIncoming,
  Copy,
} from 'lucide-react';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Dashboard({ onOpenProject }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const loadFlowData = useFlowStore((s) => s.loadFlowData);
  const clearCanvas = useFlowStore((s) => s.clearCanvas);

  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleNewBlank = () => {
    clearCanvas();
    const id = createProject({
      name: 'My IVR Flow',
      nodes: useFlowStore.getState().nodes,
      edges: useFlowStore.getState().edges,
    });
    onOpenProject(id);
  };

  const handleOpenProject = (project) => {
    loadFlowData({
      projectName: project.name,
      nodes: project.nodes,
      edges: project.edges,
    });
    onOpenProject(project.id);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this IVR project? This cannot be undone.')) {
      deleteProject(id);
    }
  };

  const handleDuplicate = (e, project) => {
    e.stopPropagation();
    createProject({
      name: project.name + ' (Copy)',
      nodes: project.nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: project.edges.map((ed) => ({ ...ed })),
    });
  };

  const handleTemplateSelect = () => {
    setGalleryOpen(true);
  };

  const handleGalleryClose = () => {
    setGalleryOpen(false);
    const state = useFlowStore.getState();
    if (state.nodes.length > 1 || state.projectName !== 'My IVR Flow') {
      const id = createProject({
        name: state.projectName,
        nodes: state.nodes,
        edges: state.edges,
      });
      onOpenProject(id);
    }
  };

  const getStartDirection = (nodes) => {
    const start = nodes?.find((n) => n.type === 'startNode');
    return start?.data?.callDirection || 'outbound';
  };

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-left">
          <PhoneOutgoing size={22} />
          <h1>IVR Flow Builder</h1>
        </div>
        <div className="dash-header-right">
          <span className="dash-user">Welcome, {user?.name || 'User'}</span>
          <button className="toolbar-btn" onClick={logout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="dash-body">
        <div className="dash-top-row">
          <div>
            <h2 className="dash-section-title">
              Your IVR Projects
              <span className="dash-count">{projects.length}</span>
            </h2>
          </div>
          <div className="dash-actions">
            <button className="toolbar-btn templates-btn" onClick={handleTemplateSelect}>
              <LayoutTemplate size={14} />
              <span>From Template</span>
            </button>
            <button className="toolbar-btn primary" onClick={handleNewBlank}>
              <Plus size={14} />
              <span>New IVR</span>
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="dash-empty">
            <Layers size={48} className="dash-empty-icon" />
            <h3>No projects yet</h3>
            <p>Create a new IVR from scratch or start with a pre-built template.</p>
            <div className="dash-empty-actions">
              <button className="toolbar-btn primary" onClick={handleNewBlank}>
                <Plus size={14} /> New Blank IVR
              </button>
              <button className="toolbar-btn templates-btn" onClick={handleTemplateSelect}>
                <LayoutTemplate size={14} /> Browse Templates
              </button>
            </div>
          </div>
        ) : (
          <div className="dash-grid">
            {projects.map((p) => {
              const dir = getStartDirection(p.nodes);
              return (
                <div key={p.id} className="dash-card" onClick={() => handleOpenProject(p)}>
                  <div className="dash-card-top">
                    <div className="dash-card-icon-wrap">
                      {dir === 'inbound' ? <PhoneIncoming size={20} /> : <PhoneOutgoing size={20} />}
                    </div>
                    <span className={`tpl-card-badge ${dir}`}>
                      {dir === 'inbound' ? 'Inbound' : 'Outbound'}
                    </span>
                  </div>
                  <h3 className="dash-card-name">{p.name}</h3>
                  <div className="dash-card-meta">
                    <span><Layers size={12} /> {p.nodes?.length || 0} nodes</span>
                    <span><Clock size={12} /> {timeAgo(p.updatedAt)}</span>
                  </div>
                  <div className="dash-card-actions">
                    <button className="dash-card-btn open" onClick={() => handleOpenProject(p)}>
                      <FolderOpen size={13} /> Open
                    </button>
                    <button className="dash-card-btn" onClick={(e) => handleDuplicate(e, p)} title="Duplicate">
                      <Copy size={13} />
                    </button>
                    <button className="dash-card-btn del" onClick={(e) => handleDelete(e, p.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <TemplateGallery isOpen={galleryOpen} onClose={handleGalleryClose} />
    </div>
  );
}
