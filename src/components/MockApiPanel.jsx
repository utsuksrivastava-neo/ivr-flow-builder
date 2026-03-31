import React, { useState, useRef, useEffect } from 'react';
import useFlowStore from '../store/flowStore';
import { generateApiCallsForNode } from '../utils/mockApi';
import { Terminal, ChevronUp, ChevronDown, Trash2, Play, X } from 'lucide-react';

export default function MockApiPanel({ isOpen, onToggle }) {
  const { nodes, edges, apiLogs, addApiLog, clearApiLogs, simulationActive, setSimulationActive, addSimulationStep } = useFlowStore();
  const [simStep, setSimStep] = useState(null);
  const [dtmfPrompt, setDtmfPrompt] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [apiLogs]);

  const walkFlow = async (nodeId, legSid) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    addSimulationStep(nodeId);
    setSimStep(node.data.label);

    if (node.type === 'menuNode') {
      const sayLog = {
        nodeLabel: node.data.label,
        action: 'Play Prompt (TTS)',
        method: 'POST',
        url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
        request: { action_custom_param: 'menu_prompt', exoml: `<Flow><Say>${node.data.prompt}</Say></Flow>` },
        response: { http_code: 202, status: 'Accepted' },
        type: 'request',
      };
      addApiLog(sayLog);
      await delay(600);

      const gatherLog = {
        nodeLabel: node.data.label,
        action: 'Gather DTMF',
        method: 'POST',
        url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
        request: { action_custom_param: 'gather', exoml: `<Flow><Gather numDigits="1" timeoutInSec="${node.data.timeout}"></Gather></Flow>` },
        response: { http_code: 202, status: 'Accepted' },
        type: 'request',
      };
      addApiLog(gatherLog);
      addApiLog({ type: 'event', event_name: 'gather_initiated', event_type: 'leg_action_event', nodeLabel: node.data.label });
      await delay(400);

      const chosenKey = await promptDtmf(node.data.options || []);

      addApiLog({ type: 'event', event_name: 'gather_success', event_type: 'leg_action_event', nodeLabel: node.data.label, event_data: { digits: chosenKey } });
      await delay(300);

      const matchedOption = node.data.options?.find((o) => o.key === chosenKey);
      const handleId = matchedOption ? `dtmf-${chosenKey}` : 'invalid';
      const nextEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === handleId);

      if (nextEdge) {
        await walkFlow(nextEdge.target, legSid);
      } else {
        addApiLog({ type: 'info', message: `No connection for key "${chosenKey}" — flow ends here.`, nodeLabel: node.data.label });
      }
      return;
    }

    const apiData = generateApiCallsForNode(node, legSid);
    if (apiData) {
      if (apiData.request) {
        addApiLog({
          nodeLabel: node.data.label,
          action: node.type.replace('Node', ''),
          method: apiData.request.method,
          url: apiData.request.url,
          request: apiData.request.body,
          response: apiData.response,
          type: 'request',
        });
      }
      if (apiData.events) {
        for (const evt of apiData.events) {
          await delay(300);
          addApiLog({ type: 'event', event_name: evt.event_name, event_type: evt.event_type, nodeLabel: node.data.label, event_data: evt.event_data });
        }
      }
      if (apiData.legSid) legSid = apiData.legSid;
    }

    await delay(500);

    if (node.type === 'hangupNode') {
      addApiLog({ type: 'info', message: 'Call ended.', nodeLabel: 'System' });
      return;
    }

    const nextEdge = edges.find((e) => e.source === nodeId && (e.sourceHandle === 'default' || !e.sourceHandle || e.sourceHandle === 'transfer-success' || e.sourceHandle === 'bot-end'));
    if (nextEdge) {
      await walkFlow(nextEdge.target, legSid);
    } else {
      addApiLog({ type: 'info', message: 'Flow ends — no further connections.', nodeLabel: node.data.label });
    }
  };

  const promptDtmf = (options) => {
    return new Promise((resolve) => {
      setDtmfPrompt({ options, resolve });
    });
  };

  const handleDtmfSelect = (key) => {
    if (dtmfPrompt) {
      dtmfPrompt.resolve(key);
      setDtmfPrompt(null);
    }
  };

  const startSimulation = async () => {
    clearApiLogs();
    setSimulationActive(true);
    const startNode = nodes.find((n) => n.type === 'startNode');
    if (!startNode) {
      addApiLog({ type: 'error', message: 'No Start node found. Add one to begin simulation.' });
      setSimulationActive(false);
      return;
    }
    addApiLog({ type: 'info', message: '▶ Starting IVR simulation...', nodeLabel: 'System' });
    await delay(300);
    await walkFlow(startNode.id, null);
    addApiLog({ type: 'info', message: '■ Simulation complete.', nodeLabel: 'System' });
    setSimulationActive(false);
    setSimStep(null);
  };

  const stopSimulation = () => {
    setSimulationActive(false);
    setDtmfPrompt(null);
    setSimStep(null);
    addApiLog({ type: 'info', message: '■ Simulation stopped by user.', nodeLabel: 'System' });
  };

  return (
    <div className={`api-panel ${isOpen ? 'open' : ''}`}>
      <div className="api-panel-header" onClick={onToggle}>
        <div className="api-panel-title">
          <Terminal size={16} />
          <span>Mock API Console</span>
          {simStep && <span className="sim-step-badge">Simulating: {simStep}</span>}
          {apiLogs.length > 0 && <span className="log-count">{apiLogs.length}</span>}
        </div>
        <div className="api-panel-actions">
          {!simulationActive && (
            <button className="config-btn-sm" onClick={(e) => { e.stopPropagation(); startSimulation(); }}>
              <Play size={12} /> Run
            </button>
          )}
          {simulationActive && (
            <button className="config-btn-sm danger" onClick={(e) => { e.stopPropagation(); stopSimulation(); }}>
              <X size={12} /> Stop
            </button>
          )}
          <button className="config-btn-sm" onClick={(e) => { e.stopPropagation(); clearApiLogs(); }}>
            <Trash2 size={12} />
          </button>
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="api-panel-body">
          {dtmfPrompt && (
            <div className="dtmf-prompt">
              <span className="dtmf-prompt-label">Caller presses:</span>
              <div className="dtmf-buttons">
                {dtmfPrompt.options.map((opt) => (
                  <button key={opt.key} className="dtmf-btn" onClick={() => handleDtmfSelect(opt.key)}>
                    <span className="dtmf-key">{opt.key}</span>
                    <span className="dtmf-label">{opt.label}</span>
                  </button>
                ))}
                <button className="dtmf-btn timeout" onClick={() => handleDtmfSelect('timeout')}>
                  <span className="dtmf-key">⏱</span>
                  <span className="dtmf-label">Timeout</span>
                </button>
              </div>
            </div>
          )}

          <div className="api-logs">
            {apiLogs.length === 0 && (
              <div className="api-logs-empty">
                <p>Click "Run" to simulate the IVR flow. Mock API calls will appear here.</p>
              </div>
            )}
            {apiLogs.map((log) => (
              <div key={log.id} className={`api-log-entry ${log.type}`}>
                {log.type === 'request' && (
                  <>
                    <div className="log-header">
                      <span className="log-method">{log.method}</span>
                      <span className="log-url">{log.url}</span>
                      <span className="log-node">{log.nodeLabel}</span>
                    </div>
                    <div className="log-details">
                      <div className="log-section">
                        <span className="log-section-label">Request</span>
                        <pre>{JSON.stringify(log.request, null, 2)}</pre>
                      </div>
                      <div className="log-section">
                        <span className="log-section-label">Response</span>
                        <pre>{JSON.stringify(log.response, null, 2)}</pre>
                      </div>
                    </div>
                  </>
                )}
                {log.type === 'event' && (
                  <div className="log-event">
                    <span className="log-event-badge">{log.event_type === 'leg_lifecycle_event' ? '🔄' : '⚡'}</span>
                    <span className="log-event-name">{log.event_name}</span>
                    <span className="log-node">{log.nodeLabel}</span>
                    {log.event_data && <span className="log-event-data">{JSON.stringify(log.event_data)}</span>}
                  </div>
                )}
                {log.type === 'info' && (
                  <div className="log-info">{log.message}</div>
                )}
                {log.type === 'error' && (
                  <div className="log-error">{log.message}</div>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
