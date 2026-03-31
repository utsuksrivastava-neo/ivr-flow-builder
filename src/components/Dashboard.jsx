import React, { useState, useMemo } from 'react';
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
  Search,
  ArrowUpDown,
  Rocket,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import ExotelLogo from './ExotelLogo';

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

/* Skeleton card shown while projects are loading */
function SkeletonCard() {
  return (
    <div className="dash-card skeleton">
      <div className="dash-card-top">
        <div className="skel-block skel-icon" />
        <div className="skel-block skel-badge" />
      </div>
      <div className="skel-block skel-title" />
      <div className="dash-card-meta">
        <div className="skel-block skel-meta" />
        <div className="skel-block skel-meta" />
      </div>
      <div className="dash-card-actions">
        <div className="skel-block skel-btn" />
        <div className="skel-block skel-btn-sm" />
        <div className="skel-block skel-btn-sm" />
      </div>
    </div>
  );
}

export default function Dashboard({ onOpenProject, onAdminPage }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const pushToProduction = useProjectsStore((s) => s.pushToProduction);
  const revertToUat = useProjectsStore((s) => s.revertToUat);
  const loadFlowData = useFlowStore((s) => s.loadFlowData);
  const clearCanvas = useFlowStore((s) => s.clearCanvas);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newIvrType, setNewIvrType] = useState('both');
  const [newIvrName, setNewIvrName] = useState('My IVR Flow');

  /* Search, filter, sort state */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEnv, setFilterEnv] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  /* Simulate loading for skeleton */
  const [isLoading, setIsLoading] = useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  /* Derived filtered + sorted list */
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (filterType !== 'all') {
      list = list.filter((p) => {
        const start = p.nodes?.find((n) => n.type === 'startNode');
        const dir = start?.data?.callDirection || 'both';
        return dir === filterType;
      });
    }

    if (filterEnv !== 'all') {
      list = list.filter((p) => (p.environment || 'uat') === filterEnv);
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });

    return list;
  }, [projects, searchQuery, filterType, filterEnv, sortBy]);

  const handleTemplateSelect = () => setGalleryOpen(true);

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

  const openNewIvrDialog = () => {
    setNewIvrName('My IVR Flow');
    setNewIvrType('both');
    setShowNewDialog(true);
  };

  const closeNewIvrDialog = () => setShowNewDialog(false);

  const handleCreateIvrFromDialog = () => {
    const name = newIvrName.trim() || 'My IVR Flow';
    clearCanvas();
    const state = useFlowStore.getState();
    const updatedNodes = state.nodes.map((n) =>
      n.type === 'startNode'
        ? { ...n, data: { ...n.data, callDirection: newIvrType, label: newIvrType === 'inbound' ? 'Incoming Call' : 'Inbound + Outbound Call' } }
        : n
    );
    loadFlowData({ projectName: name, nodes: updatedNodes, edges: state.edges });
    const id = createProject({ name, nodes: updatedNodes, edges: state.edges });
    setShowNewDialog(false);
    onOpenProject(id);
  };

  const handleOpenProject = (project) => {
    loadFlowData({ projectName: project.name, nodes: project.nodes, edges: project.edges });
    onOpenProject(project.id);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this IVR project? This cannot be undone.')) deleteProject(id);
  };

  const handleDuplicate = (e, project) => {
    e.stopPropagation();
    createProject({
      name: project.name + ' (Copy)',
      nodes: project.nodes.map((n) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: project.edges.map((ed) => ({ ...ed })),
    });
  };

  const handlePushToProd = (e, id) => {
    e.stopPropagation();
    if (!confirm('Push this IVR to Production? The current flow will be frozen as the live version.')) return;
    pushToProduction(id);
  };

  const handleRevertToUat = (e, id) => {
    e.stopPropagation();
    revertToUat(id);
  };

  const getStartDirection = (nodes) => {
    const start = nodes?.find((n) => n.type === 'startNode');
    return start?.data?.callDirection || 'outbound';
  };

  const directionBadgeLabel = (dir) => {
    if (dir === 'inbound') return 'Inbound';
    if (dir === 'both') return 'Inbound + Outbound';
    return 'Outbound';
  };

  const envBadge = (env) => {
    if (env === 'production') return { label: 'Production', cls: 'env-prod', icon: <Rocket size={10} /> };
    return { label: 'UAT', cls: 'env-uat', icon: <FlaskConical size={10} /> };
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

        {/* Search / Filter / Sort bar */}
        <div className="dash-filters">
          <div className="dash-search-wrap">
            <Search size={14} className="dash-search-icon" />
            <input
              type="text"
              className="dash-search-input"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="dash-search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <select className="dash-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="inbound">Inbound Only</option>
            <option value="both">Inbound + Outbound</option>
          </select>
          <select className="dash-filter-select" value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)}>
            <option value="all">All Environments</option>
            <option value="uat">UAT</option>
            <option value="production">Production</option>
          </select>
          <select className="dash-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="updated">Last Modified</option>
            <option value="created">Date Created</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {isLoading ? (
          <div className="dash-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredProjects.length === 0 && projects.length > 0 ? (
          <div className="dash-empty">
            <Search size={48} className="dash-empty-icon" />
            <h3>No matching projects</h3>
            <p>Try adjusting your search or filters.</p>
            <button className="toolbar-btn" onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterEnv('all'); }}>
              Clear Filters
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
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
            {filteredProjects.map((p) => {
              const dir = getStartDirection(p.nodes);
              const env = envBadge(p.environment || 'uat');
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
                    <div className="dash-card-badges">
                      <span className={`tpl-card-badge ${dir}`}>{directionBadgeLabel(dir)}</span>
                      <span className={`env-badge ${env.cls}`}>{env.icon} {env.label}</span>
                    </div>
                  </div>
                  <h3 className="dash-card-name">{p.name}</h3>
                  <div className="dash-card-meta">
                    <span><Layers size={12} /> {p.nodes?.length || 0} nodes</span>
                    <span><Clock size={12} /> {timeAgo(p.updatedAt)}</span>
                  </div>
                  {p.prodPushedAt && (
                    <div className="dash-card-prod-info">
                      <CheckCircle2 size={11} /> Prod pushed {timeAgo(p.prodPushedAt)}
                    </div>
                  )}
                  <div className="dash-card-actions">
                    <button className="dash-card-btn open" onClick={() => handleOpenProject(p)}>
                      <FolderOpen size={13} /> Open
                    </button>
                    {(p.environment || 'uat') === 'uat' ? (
                      <button className="dash-card-btn push-prod" onClick={(e) => handlePushToProd(e, p.id)} title="Push to Production">
                        <Rocket size={13} />
                      </button>
                    ) : (
                      <button className="dash-card-btn revert-uat" onClick={(e) => handleRevertToUat(e, p.id)} title="Revert to UAT">
                        <FlaskConical size={13} />
                      </button>
                    )}
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
          <div className="dash-dialog" role="dialog" aria-modal="true" aria-labelledby="new-ivr-dialog-title" onClick={(e) => e.stopPropagation()}>
            <div className="dash-dialog-header">
              <h2 id="new-ivr-dialog-title">Create New IVR</h2>
              <button type="button" className="dash-dialog-close" onClick={closeNewIvrDialog} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="dash-dialog-body">
              <label className="dash-dialog-label" htmlFor="new-ivr-name">Project name</label>
              <input id="new-ivr-name" type="text" className="dash-dialog-input" value={newIvrName} onChange={(e) => setNewIvrName(e.target.value)} placeholder="My IVR Flow" />
              <p className="dash-dialog-hint">IVR type</p>
              <div className="dash-dialog-options">
                <button type="button" className={`dash-dialog-option ${newIvrType === 'inbound' ? 'selected' : ''}`} onClick={() => setNewIvrType('inbound')}>
                  <PhoneIncoming size={22} className="dash-dialog-option-icon" />
                  <span className="dash-dialog-option-title">Inbound Only</span>
                  <span className="dash-dialog-option-desc">For IVRs that only receive incoming calls</span>
                </button>
                <button type="button" className={`dash-dialog-option ${newIvrType === 'both' ? 'selected' : ''}`} onClick={() => setNewIvrType('both')}>
                  <span className="dash-dialog-option-icons-row">
                    <PhoneIncoming size={20} />
                    <PhoneOutgoing size={20} />
                  </span>
                  <span className="dash-dialog-option-title">Inbound + Outbound</span>
                  <span className="dash-dialog-option-desc">For IVRs that can both receive and make calls</span>
                </button>
              </div>
            </div>
            <div className="dash-dialog-footer">
              <button type="button" className="toolbar-btn" onClick={closeNewIvrDialog}>Cancel</button>
              <button type="button" className="toolbar-btn primary" onClick={handleCreateIvrFromDialog}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
