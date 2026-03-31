import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';
import ConfigPanel from './components/ConfigPanel';
import Toolbar from './components/Toolbar';
import MockApiPanel from './components/MockApiPanel';
import ValidationPanel from './components/ValidationPanel';
import IvrTester from './components/IvrTester';
import TemplateGallery from './components/TemplateGallery';
import useFlowStore from './store/flowStore';

export default function App() {
  const [apiPanelOpen, setApiPanelOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const simulationActive = useFlowStore((s) => s.simulationActive);

  const handleSimulate = useCallback(() => {
    if (simulationActive) {
      useFlowStore.getState().setSimulationActive(false);
    } else {
      setApiPanelOpen(true);
    }
  }, [simulationActive]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar
          onSimulate={handleSimulate}
          simulating={simulationActive}
          onTestIvr={() => setTesterOpen(true)}
          onTemplates={() => setGalleryOpen(true)}
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
