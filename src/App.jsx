/**
 * @file App.jsx — HashRouter shell: login, dashboard, admin, per-project editor URLs.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import useAuthStore from './store/authStore';
import useProjectsStore from './store/projectsStore';
import useFlowStore from './store/flowStore';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AdminLayout from './components/AdminLayout';
import AdminPage from './components/AdminPage';
import AdminConfigurationsPage from './components/AdminConfigurationsPage';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import ConfigPanel from './components/ConfigPanel';
import Toolbar from './components/Toolbar';
import MockApiPanel from './components/MockApiPanel';
import ValidationPanel from './components/ValidationPanel';
import IvrTester from './components/IvrTester';
import TemplateGallery from './components/TemplateGallery';
import useAppConfigStore from './store/appConfigStore';

/**
 * Full-screen flow editor with autosave every 30 seconds.
 */
function Editor({ projectId, onBack }) {
  const [apiPanelOpen, setApiPanelOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const simulationActive = useFlowStore((s) => s.simulationActive);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const autosaveIntervalMs = useAppConfigStore((s) => s.mergedConfig.autosaveIntervalMs);
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
    }, autosaveIntervalMs);
    return () => clearInterval(autosaveRef.current);
  }, [projectId, updateProject, autosaveIntervalMs]);

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

/**
 * Loads project flow from the store when the URL is #/project/:projectId
 */
function EditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const getProject = useProjectsStore((s) => s.getProject);
  const loadFlowData = useFlowStore((s) => s.loadFlowData);

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadFlowData({ projectName: p.name, nodes: p.nodes, edges: p.edges });
  }, [projectId, getProject, loadFlowData, navigate]);

  const handleBack = useCallback(() => {
    const { nodes, edges, projectName } = useFlowStore.getState();
    if (projectId) {
      useProjectsStore.getState().updateProject(projectId, { name: projectName, nodes, edges });
    }
    navigate('/dashboard');
  }, [projectId, navigate]);

  return <Editor key={projectId} projectId={projectId} onBack={handleBack} />;
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user);

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin"
        element={
          user?.role === 'admin' ? (
            <AdminLayout />
          ) : (
            <Navigate to={user ? '/dashboard' : '/login'} replace />
          )
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminPage />} />
        <Route path="config" element={<AdminConfigurationsPage />} />
      </Route>
      <Route
        path="/project/:projectId"
        element={user ? <EditorPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
