import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useFlowStore from '../store/flowStore';
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react';

export default function ValidationPanel() {
  const {
    validationIssues,
    validationVisible,
    setValidationVisible,
    setSelectedNodeId,
    runValidation,
  } = useFlowStore(
    useShallow((s) => ({
      validationIssues: s.validationIssues,
      validationVisible: s.validationVisible,
      setValidationVisible: s.setValidationVisible,
      setSelectedNodeId: s.setSelectedNodeId,
      runValidation: s.runValidation,
    }))
  );

  if (!validationVisible) return null;

  const errors = validationIssues.filter((i) => i.severity === 'error');
  const warnings = validationIssues.filter((i) => i.severity === 'warning');
  const isClean = validationIssues.length === 0;

  const handleClickIssue = (issue) => {
    if (issue.nodeId) {
      setSelectedNodeId(issue.nodeId);
    }
  };

  return (
    <div className="validation-panel">
      <div className="validation-header">
        <div className="validation-title">
          {isClean ? (
            <CheckCircle2 size={16} className="validation-icon-ok" />
          ) : (
            <AlertTriangle size={16} className="validation-icon-warn" />
          )}
          <span>Flow Validation</span>
        </div>
        <div className="validation-header-actions">
          <button
            className="config-btn-icon"
            onClick={() => runValidation()}
            title="Re-run validation"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="config-btn-icon"
            onClick={() => setValidationVisible(false)}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {isClean ? (
        <div className="validation-clean">
          <CheckCircle2 size={32} className="validation-clean-icon" />
          <h4>All good!</h4>
          <p>Your IVR flow has no issues. Every path ends with a Hang Up or Transfer node.</p>
        </div>
      ) : (
        <>
          <div className="validation-summary">
            {errors.length > 0 && (
              <div className="validation-count error">
                <AlertCircle size={14} />
                <span>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="validation-count warning">
                <AlertTriangle size={14} />
                <span>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="validation-issues">
            {errors.length > 0 && (
              <div className="validation-group">
                <div className="validation-group-label error">Errors — Must Fix</div>
                {errors.map((issue, idx) => (
                  <button
                    key={`e-${idx}`}
                    className="validation-issue error"
                    onClick={() => handleClickIssue(issue)}
                  >
                    <AlertCircle size={14} className="issue-icon" />
                    <span className="issue-message">{issue.message}</span>
                    {issue.nodeId && <MousePointerClick size={12} className="issue-goto" />}
                  </button>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="validation-group">
                <div className="validation-group-label warning">Warnings — Recommended</div>
                {warnings.map((issue, idx) => (
                  <button
                    key={`w-${idx}`}
                    className="validation-issue warning"
                    onClick={() => handleClickIssue(issue)}
                  >
                    <AlertTriangle size={14} className="issue-icon" />
                    <span className="issue-message">{issue.message}</span>
                    {issue.nodeId && <MousePointerClick size={12} className="issue-goto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="validation-tip">
            <p>Click any issue to select the problematic node. Every flow path should end with a <strong>Hang Up</strong> or <strong>Transfer</strong> node.</p>
          </div>
        </>
      )}
    </div>
  );
}
