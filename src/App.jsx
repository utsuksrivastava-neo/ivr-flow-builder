/**
 * @file App.jsx — application shell: login, dashboard, admin, and the flow editor with autosave.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import useAuthStore from './store/authStore';
import useProjectsStore from './store/projectsStore';
import useFlowStore from './store/flowStore';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import ConfigPanel from './components/ConfigPanel';
import Toolbar from './components/Toolbar';
import MockApiPanel from './components/MockApiPanel';
import ValidationPanel from './components/ValidationPanel';
import IvrTester from './components/IvrTester';
import TemplateGallery from './components/TemplateGallery';

const AUTOSAVE_INTERVAL_MS = 30_000;

/**
 * Full-screen flow editor with autosave every 30 seconds.
 */
function Editor({ projectId, onBack }) {
  const [apiPanelOpen, setApiPanelOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const simulationActive = useFlowStore((s) => s.simulationActive);
  const isDirty = useFlowStore((s) => s.isDirty);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const autosaveRef = useRef(null);

  const handleSimulate = useCallback(() => {
    if (simulationActive) {
      useFlowStore.getState().setSimulationActive(false);
    } else {
      setApiPanelOpen(true);
    }
  }, [simulationActive]);

  const handleSave = useCallback(() => {
    if (!projectId) return;
    const { nodes, edges, projectName } = useFlowStore.getState();
    updateProject(projectId, { name: projectName, nodes, edges });
    useFlowStore.getState().markClean();
  }, [projectId, updateProject]);

  /* Autosave: runs every 30s if dirty */
  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      if (!projectId) return;
      const store = useFlowStore.getState();
      if (store.isActuallyDirty()) {
        const { nodes, edges, projectName } = store;
        updateProject(projectId, { name: projectName, nodes, edges });
        store.markClean();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(autosaveRef.current);
  }, [projectId, updateProject]);

  /* Save on unmount (navigate away) */
  useEffect(() => {
    return () => {
      if (!projectId) return;
      const store = useFlowStore.getState();
      if (store.isActuallyDirty()) {
        const { nodes, edges, projectName } = store;
        useProjectsStore.getState().updateProject(projectId, { name: projectName, nodes, edges });
      }
    };
  }, [projectId]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar
          onSimulate={handleSimulate}
          simulating={simulationActive}
          onTestIvr={() => setTesterOpen(true)}
          onTemplates={() => setGalleryOpen(true)}
          onSave={handleSave}
          onBack={onBack}
        />
        <div className="app-body">
          <Sidebar />
          <main className="app-main">
            <FlowCanvas />
            <ValidationPanel />
            <MockApiPanel isOpen={apiPanelOpen} onToggle={() => setApiPanelOpen(!apiPanelOpen)} />
          </main>
          <ConfigPanel />
        </div>
      </div>
      <IvrTester isOpen={testerOpen} onClose={() => setTesterOpen(false)} />
      <TemplateGallery isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </ReactFlowProvider>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Simulated app initialization (hydrate stores) */
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (page === 'admin' && user?.role !== 'admin') {
      setPage('dashboard');
    }
  }, [page, user]);

  if (loading) {
    return (
      <div className="app-loader">
        <div className="app-loader-spinner" />
        <p>Loading Exotel IVR Flow Builder...</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (page === 'admin' && user.role === 'admin') {
    return <AdminPage onBack={() => setPage('dashboard')} />;
  }

  if (page === 'dashboard' || (page === 'admin' && user.role !== 'admin')) {
    return (
      <Dashboard
        onOpenProject={(id) => {
          setCurrentProjectId(id);
          setPage('editor');
        }}
        onAdminPage={() => setPage('admin')}
      />
    );
  }

  return (
    <Editor
      key={currentProjectId}
      projectId={currentProjectId}
      onBack={() => {
        const { nodes, edges, projectName } = useFlowStore.getState();
        if (currentProjectId) {
          useProjectsStore.getState().updateProject(currentProjectId, { name: projectName, nodes, edges });
        }
        setPage('dashboard');
        setCurrentProjectId(null);
      }}
    />
  );
}
