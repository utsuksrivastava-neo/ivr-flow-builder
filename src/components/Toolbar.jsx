import React, { useState, useRef, useEffect, useCallback } from 'react';
import useFlowStore from '../store/flowStore';
import useThemeStore from '../store/themeStore';
import { exportToExcel, exportToWord, exportToJSON, importFromJSON } from '../utils/exportUtils';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileJson,
  Trash2,
  Play,
  Square,
  ChevronDown,
  Pencil,
  Check,
  ShieldCheck,
  AlertTriangle,
  PhoneOutgoing,
  LayoutTemplate,
  Save,
  ArrowLeft,
  Undo2,
  Redo2,
  Sun,
  Moon,
} from 'lucide-react';

export default function Toolbar({ onSimulate, simulating, onTestIvr, onTemplates, onSave, onBack }) {
  const projectName = useFlowStore((s) => s.projectName);
  const setProjectName = useFlowStore((s) => s.setProjectName);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const getFlowData = useFlowStore((s) => s.getFlowData);
  const loadFlowData = useFlowStore((s) => s.loadFlowData);
  const clearCanvas = useFlowStore((s) => s.clearCanvas);
  const runValidation = useFlowStore((s) => s.runValidation);
  const validationIssues = useFlowStore((s) => s.validationIssues);
  const validationVisible = useFlowStore((s) => s.validationVisible);
  const setValidationVisible = useFlowStore((s) => s.setValidationVisible);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const canUndo = useFlowStore((s) => s.canUndo);
  const canRedo = useFlowStore((s) => s.canRedo);
  const lastAutoSaved = useFlowStore((s) => s.lastAutoSaved);

  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  /* Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z */
  useEffect(() => {
    const handler = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleExport = async (type) => {
    const data = getFlowData();
    switch (type) {
      case 'excel': await exportToExcel(data); break;
      case 'word': exportToWord(data); break;
      case 'json': exportToJSON(data); break;
    }
    setExportOpen(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      loadFlowData(data);
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
    e.target.value = '';
  };

  const saveName = () => {
    setProjectName(tempName);
    setEditing(false);
  };

  const handleSave = useCallback(() => {
    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [onSave]);

  const handleClearCanvas = () => {
    if (!confirm('Clear the entire canvas? This will remove all nodes and edges. You can undo this action.')) return;
    clearCanvas();
  };

  const autoSaveLabel = lastAutoSaved
    ? `Auto-saved ${new Date(lastAutoSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        {onBack && (
          <button className="toolbar-btn back-btn" onClick={onBack} title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="toolbar-title">
          {editing ? (
            <div className="title-edit">
              <input
                className="title-input"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                autoFocus
              />
              <button className="config-btn-icon" onClick={saveName}>
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="title-display" onClick={() => { setTempName(projectName); setEditing(true); }}>
              <h1>{projectName}</h1>
              <Pencil size={12} className="title-edit-icon" />
            </div>
          )}
        </div>
        {/* Undo / Redo buttons */}
        <div className="toolbar-undo-redo">
          <button
            className="toolbar-btn icon-only"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="toolbar-btn icon-only"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      <div className="toolbar-center">
        <button className="toolbar-btn templates-btn" onClick={onTemplates}>
          <LayoutTemplate size={14} />
          <span>Templates</span>
        </button>
        <button
          className={`toolbar-btn validate-btn ${validationVisible ? 'active' : ''}`}
          onClick={() => {
            if (validationVisible) {
              setValidationVisible(false);
            } else {
              runValidation();
            }
          }}
        >
          {validationIssues.length > 0 && validationVisible ? (
            <AlertTriangle size={14} />
          ) : (
            <ShieldCheck size={14} />
          )}
          <span>Validate</span>
          {validationIssues.length > 0 && validationVisible && (
            <span className="validate-badge">{validationIssues.length}</span>
          )}
        </button>
        <button className="toolbar-btn test-ivr-btn" onClick={onTestIvr}>
          <PhoneOutgoing size={14} />
          <span>Test IVR</span>
        </button>
        <button
          className={`toolbar-btn simulate-btn ${simulating ? 'active' : ''}`}
          onClick={onSimulate}
        >
          {simulating ? <Square size={14} /> : <Play size={14} />}
          <span>{simulating ? 'Stop' : 'Simulate'}</span>
        </button>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-btn icon-only" onClick={toggleTheme} title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {themeMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {autoSaveLabel && (
          <span className="autosave-badge" title="Autosave active">{autoSaveLabel}</span>
        )}
        <button className={`toolbar-btn save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
          <Save size={14} />
          <span>{saved ? 'Saved!' : 'Save'}</span>
        </button>
        <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        <div className="dropdown-wrapper">
          <button className="toolbar-btn primary" onClick={() => setExportOpen(!exportOpen)}>
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setExportOpen(false)} />
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet size={16} />
                  <div>
                    <span className="dropdown-item-label">Excel (.xlsx)</span>
                    <span className="dropdown-item-desc">Spreadsheet with all nodes & connections</span>
                  </div>
                </button>
                <button className="dropdown-item" onClick={() => handleExport('word')}>
                  <FileText size={16} />
                  <div>
                    <span className="dropdown-item-label">Word (.docx)</span>
                    <span className="dropdown-item-desc">Formatted document with flow details</span>
                  </div>
                </button>
                <button className="dropdown-item" onClick={() => handleExport('json')}>
                  <FileJson size={16} />
                  <div>
                    <span className="dropdown-item-label">JSON (.json)</span>
                    <span className="dropdown-item-desc">Raw flow data for re-import</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <button className="toolbar-btn danger" onClick={handleClearCanvas} title="Clear Canvas">
          <Trash2 size={14} />
        </button>
      </div>
    </header>
  );
}
