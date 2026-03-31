import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import useAuthStore from './store/authStore';
import useProjectsStore from './store/projectsStore';
import useFlowStore from './store/flowStore';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import ConfigPanel from './components/ConfigPanel';
import Toolbar from './components/Toolbar';
import MockApiPanel from './components/MockApiPanel';
import ValidationPanel from './components/ValidationPanel';
import IvrTester from './components/IvrTester';
import TemplateGallery from './components/TemplateGallery';

function Editor({ projectId, onBack }) {
  const [apiPanelOpen, setApiPanelOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const simulationActive = useFlowStore((s) => s.simulationActive);
  const updateProject = useProjectsStore((s) => s.updateProject);

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
  }, [projectId, updateProject]);

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

  if (!user) return <LoginPage />;

  if (page === 'dashboard') {
    return (
      <Dashboard
        onOpenProject={(id) => {
          setCurrentProjectId(id);
          setPage('editor');
        }}
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
