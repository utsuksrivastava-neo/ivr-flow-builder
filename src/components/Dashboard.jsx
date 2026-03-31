import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import useProjectsStore from '../store/projectsStore';
import useFlowStore from '../store/flowStore';
import TemplateGallery from './TemplateGallery';
import {
  Plus,
  LayoutTemplate,
  LogOut,
  Trash2,
  FolderOpen,
  Clock,
  Layers,
  PhoneIncoming,
  PhoneOutgoing,
  Copy,
  X,
  Shield,
} from 'lucide-react';
import ExotelLogo from './ExotelLogo';

/**
 * Formats a timestamp as a short relative time string for project cards.
 *
 * @param {number} ts - Unix timestamp in milliseconds
 * @returns {string} Human-readable relative time (e.g. "5m ago", "2d ago")
 */
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

/**
 * Dashboard: lists saved IVR projects and entry points for new flows (blank dialog, templates).
 *
 * @param {object} props
 * @param {(projectId: string) => void} props.onOpenProject - Navigates to the editor with the given project id
 * @param {(() => void) | undefined} props.onAdminPage - Opens the user management screen (admins only)
 */
export default function Dashboard({ onOpenProject, onAdminPage }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const loadFlowData = useFlowStore((s) => s.loadFlowData);
  const clearCanvas = useFlowStore((s) => s.clearCanvas);

  const [galleryOpen, setGalleryOpen] = useState(false);
  /** When true, the Create New IVR modal is shown. */
  const [showNewDialog, setShowNewDialog] = useState(false);
  /** Start node `callDirection`: inbound-only vs inbound+outbound. */
  const [newIvrType, setNewIvrType] = useState('both');
  const [newIvrName, setNewIvrName] = useState('My IVR Flow');

  /**
   * Opens the template gallery; on close, persists the loaded flow as a project if it was changed.
   */
  const handleTemplateSelect = () => {
    setGalleryOpen(true);
  };

  /**
   * After the gallery closes, creates a project if the user applied a template (non-default graph/name).
   */
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

  /**
   * Resets dialog fields and shows the new-IVR modal.
   */
  const openNewIvrDialog = () => {
    setNewIvrName('My IVR Flow');
    setNewIvrType('both');
    setShowNewDialog(true);
  };

  /**
   * Closes the new-IVR modal without creating a project.
   */
  const closeNewIvrDialog = () => {
    setShowNewDialog(false);
  };

  /**
   * Clears the canvas, applies start-node direction from the dialog, persists a new project, and opens it.
   */
  const handleCreateIvrFromDialog = () => {
    const name = newIvrName.trim() || 'My IVR Flow';
    clearCanvas();
    const state = useFlowStore.getState();
    const updatedNodes = state.nodes.map((n) =>
      n.type === 'startNode'
        ? {
            ...n,
            data: {
              ...n.data,
              callDirection: newIvrType,
              label: newIvrType === 'inbound' ? 'Incoming Call' : 'Inbound + Outbound Call',
            },
          }
        : n
    );
    loadFlowData({
      projectName: name,
      nodes: updatedNodes,
      edges: state.edges,
    });
    const id = createProject({
      name,
      nodes: updatedNodes,
      edges: state.edges,
    });
    setShowNewDialog(false);
    onOpenProject(id);
  };

  /**
   * Loads project flow data into the store and navigates to the editor.
   *
   * @param {{ id: string; name: string; nodes: unknown[]; edges: unknown[] }} project - Saved project from the list
   */
  const handleOpenProject = (project) => {
    loadFlowData({
      projectName: project.name,
      nodes: project.nodes,
      edges: project.edges,
    });
    onOpenProject(project.id);
  };

  /**
   * Deletes a project after confirmation.
   *
   * @param {React.MouseEvent} e - Click event (propagation stopped so the card does not open)
   * @param {string} id - Project id
   */
  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this IVR project? This cannot be undone.')) {
      deleteProject(id);
    }
  };

  /**
   * Duplicates a project as a new entry in the list.
   *
   * @param {React.MouseEvent} e - Click event
   * @param {{ name: string; nodes: unknown[]; edges: unknown[] }} project - Source project
   */
  const handleDuplicate = (e, project) => {
    e.stopPropagation();
    createProject({
      name: project.name + ' (Copy)',
      nodes: project.nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: project.edges.map((ed) => ({ ...ed })),
    });
  };

  /**
   * Reads `callDirection` from the flow's start node for dashboard badges.
   *
   * @param {unknown[] | undefined} nodes - Flow nodes
   * @returns {'inbound' | 'both' | 'outbound'}
   */
  const getStartDirection = (nodes) => {
    const start = nodes?.find((n) => n.type === 'startNode');
    return start?.data?.callDirection || 'outbound';
  };

  /**
   * Badge label for a project's call direction.
   *
   * @param {'inbound' | 'both' | 'outbound'} dir
   * @returns {string}
   */
  const directionBadgeLabel = (dir) => {
    if (dir === 'inbound') return 'Inbound';
    if (dir === 'both') return 'Inbound + Outbound';
    return 'Outbound';
  };

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-left">
          <ExotelLogo height={22} light={true} />
          <span className="dash-divider">|</span>
          <h1>IVR Flow Builder</h1>
        </div>
        <div className="dash-header-right">
          <span className="dash-user">Welcome, {user?.name || 'User'}</span>
          {user?.role === 'admin' && (
            <button type="button" className="toolbar-btn" onClick={() => onAdminPage?.()}>
              <Shield size={14} />
              <span>Admin</span>
            </button>
          )}
          <button type="button" className="toolbar-btn" onClick={logout}>
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
            <button className="toolbar-btn primary" onClick={openNewIvrDialog}>
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
              <button className="toolbar-btn primary" onClick={openNewIvrDialog}>
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
                      {dir === 'inbound' ? (
                        <PhoneIncoming size={20} />
                      ) : dir === 'both' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PhoneIncoming size={18} />
                          <PhoneOutgoing size={18} />
                        </span>
                      ) : (
                        <PhoneOutgoing size={20} />
                      )}
                    </div>
                    <span className={`tpl-card-badge ${dir}`}>{directionBadgeLabel(dir)}</span>
                  </div>
                  <h3 className="dash-card-name">{p.name}</h3>
                  <div className="dash-card-meta">
                    <span>
                      <Layers size={12} /> {p.nodes?.length || 0} nodes
                    </span>
                    <span>
                      <Clock size={12} /> {timeAgo(p.updatedAt)}
                    </span>
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

      {showNewDialog && (
        <div className="dash-dialog-overlay" role="presentation" onClick={closeNewIvrDialog}>
          <div
            className="dash-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ivr-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dash-dialog-header">
              <h2 id="new-ivr-dialog-title">Create New IVR</h2>
              <button type="button" className="dash-dialog-close" onClick={closeNewIvrDialog} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="dash-dialog-body">
              <label className="dash-dialog-label" htmlFor="new-ivr-name">
                Project name
              </label>
              <input
                id="new-ivr-name"
                type="text"
                className="dash-dialog-input"
                value={newIvrName}
                onChange={(e) => setNewIvrName(e.target.value)}
                placeholder="My IVR Flow"
              />
              <p className="dash-dialog-hint">IVR type</p>
              <div className="dash-dialog-options">
                <button
                  type="button"
                  className={`dash-dialog-option ${newIvrType === 'inbound' ? 'selected' : ''}`}
                  onClick={() => setNewIvrType('inbound')}
                >
                  <PhoneIncoming size={22} className="dash-dialog-option-icon" />
                  <span className="dash-dialog-option-title">Inbound Only</span>
                  <span className="dash-dialog-option-desc">For IVRs that only receive incoming calls</span>
                </button>
                <button
                  type="button"
                  className={`dash-dialog-option ${newIvrType === 'both' ? 'selected' : ''}`}
                  onClick={() => setNewIvrType('both')}
                >
                  <span className="dash-dialog-option-icons-row">
                    <PhoneIncoming size={20} />
                    <PhoneOutgoing size={20} />
                  </span>
                  <span className="dash-dialog-option-title">Inbound + Outbound</span>
                  <span className="dash-dialog-option-desc">
                    For IVRs that can both receive and make calls (e.g., outbound bots that callers can also call)
                  </span>
                </button>
              </div>
            </div>
            <div className="dash-dialog-footer">
              <button type="button" className="toolbar-btn" onClick={closeNewIvrDialog}>
                Cancel
              </button>
              <button type="button" className="toolbar-btn primary" onClick={handleCreateIvrFromDialog}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
