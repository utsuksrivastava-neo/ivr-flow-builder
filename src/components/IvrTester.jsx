import React, { useState, useRef, useEffect, useCallback } from 'react';
import useFlowStore from '../store/flowStore';
import { nanoid } from 'nanoid';
import {
  PhoneOutgoing,
  PhoneIncoming,
  PhoneOff,
  SkipForward,
  X,
  Mic,
  MicOff,
  Volume2,
  Loader,
  Clock,
  RotateCcw,
} from 'lucide-react';

const DTMF_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const DTMF_LABELS = {
  '1': '', '2': 'ABC', '3': 'DEF',
  '4': 'GHI', '5': 'JKL', '6': 'MNO',
  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
  '*': '', '0': '+', '#': '',
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDuration(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function IvrTester({ isOpen, onClose }) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const [phase, setPhase] = useState('idle');
  const [currentNode, setCurrentNode] = useState(null);
  const [fullMessage, setFullMessage] = useState('');
  const [typedText, setTypedText] = useState('');
  const [menuOptions, setMenuOptions] = useState([]);
  const [steps, setSteps] = useState([]);
  const [callDuration, setCallDuration] = useState(0);

  const skipRef = useRef(null);
  const dtmfRef = useRef(null);
  const abortRef = useRef(false);
  const typeTimer = useRef(null);
  const durTimer = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  useEffect(() => {
    if (phase !== 'idle' && phase !== 'ended') {
      durTimer.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      clearInterval(durTimer.current);
    }
    return () => clearInterval(durTimer.current);
  }, [phase]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      clearInterval(typeTimer.current);
      clearInterval(durTimer.current);
    };
  }, []);

  const addStep = useCallback((step) => {
    setSteps((prev) => [...prev, { id: nanoid(6), ...step }]);
  }, []);

  const typeMessage = (text) =>
    new Promise((resolve) => {
      if (abortRef.current) return resolve('aborted');
      setFullMessage(text);
      setTypedText('');
      let idx = 0;
      skipRef.current = () => {
        clearInterval(typeTimer.current);
        setTypedText(text);
        skipRef.current = null;
        setTimeout(() => resolve('skipped'), 150);
      };
      typeTimer.current = setInterval(() => {
        idx++;
        setTypedText(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(typeTimer.current);
          skipRef.current = null;
          setTimeout(() => resolve('completed'), 400);
        }
      }, 38);
    });

  const waitForDtmf = (options) =>
    new Promise((resolve) => {
      if (abortRef.current) return resolve({ key: null, how: 'aborted' });
      setMenuOptions(options || []);
      dtmfRef.current = (key, how) => {
        dtmfRef.current = null;
        resolve({ key, how: how || 'pressed' });
      };
    });

  const handleSkip = () => skipRef.current?.();

  const handleDtmfPress = (key) => {
    if (dtmfRef.current && phase === 'listening') dtmfRef.current(key, 'pressed');
  };

  const handleTimeout = () => {
    if (dtmfRef.current && phase === 'listening') dtmfRef.current(null, 'timeout');
  };

  const findEdge = (nodeId, handle) =>
    edges.find(
      (e) =>
        e.source === nodeId &&
        (e.sourceHandle === handle || (!e.sourceHandle && handle === 'default'))
    );

  const endFlow = (msg) => {
    if (msg) addStep({ type: 'error', text: msg });
    setPhase('ended');
  };

  const walkNode = async (nodeId, legSid) => {
    if (abortRef.current) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return endFlow('Node not found — broken connection.');

    setCurrentNode(node);
    const label = node.data.label;
    const typeLabel = node.type.replace('Node', '').toUpperCase();
    addStep({ type: 'node', text: `${label}`, detail: typeLabel });

    switch (node.type) {
      case 'sayNode': {
        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${node.data.message}</Say>` });
        addStep({ type: 'event', text: 'say_started' });
        const r = await typeMessage(node.data.message || '(empty message)');
        if (abortRef.current) return;
        addStep({ type: r === 'skipped' ? 'skip' : 'info', text: r === 'skipped' ? 'Skipped by tester' : 'Message finished' });
        addStep({ type: 'event', text: 'say_completed' });
        setPhase('processing');
        await delay(150);
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No outgoing connection — flow ends.');
        break;
      }

      case 'playNode': {
        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<StartPlay loop="${node.data.loop}">${node.data.audioUrl}</StartPlay>` });
        addStep({ type: 'event', text: 'play_started' });
        const r = await typeMessage(`♪ Playing audio: ${node.data.audioUrl || '(no URL)'}`);
        if (abortRef.current) return;
        addStep({ type: r === 'skipped' ? 'skip' : 'info', text: r === 'skipped' ? 'Audio skipped' : 'Audio finished' });
        addStep({ type: 'event', text: 'play_completed' });
        setPhase('processing');
        await delay(150);
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No outgoing connection — flow ends.');
        break;
      }

      case 'menuNode': {
        const promptText =
          node.data.promptType === 'tts'
            ? node.data.prompt
            : `♪ Playing audio: ${node.data.audioUrl}`;

        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${promptText}</Say>` });
        addStep({ type: 'event', text: 'say_started' });
        const pr = await typeMessage(promptText || '(empty prompt)');
        if (abortRef.current) return;
        addStep({ type: pr === 'skipped' ? 'skip' : 'info', text: pr === 'skipped' ? 'Prompt skipped' : 'Prompt finished' });
        addStep({ type: 'event', text: 'say_completed' });

        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Gather numDigits="1" timeoutInSec="${node.data.timeout}"/>` });
        addStep({ type: 'event', text: 'gather_initiated' });
        setPhase('listening');
        addStep({ type: 'listening', text: `Listening for input... (${node.data.timeout}s timeout)` });

        const { key, how } = await waitForDtmf(node.data.options || []);
        if (abortRef.current) return;

        if (how === 'timeout') {
          addStep({ type: 'dtmf', text: 'Timeout — no input received' });
          addStep({ type: 'event', text: 'gather_failed {reason: "timeout"}' });
          const te = edges.find((e) => e.source === nodeId && e.sourceHandle === 'timeout');
          if (te) {
            addStep({ type: 'decision', text: 'Routing → Timeout handler' });
            setPhase('processing');
            await delay(250);
            await walkNode(te.target, legSid);
          } else {
            endFlow('No timeout handler connected.');
          }
        } else {
          addStep({ type: 'dtmf', text: `Caller pressed: ${key}` });
          addStep({ type: 'event', text: `gather_success {digits: "${key}"}` });
          const opt = node.data.options?.find((o) => o.key === key);
          const hid = opt ? `dtmf-${key}` : 'invalid';
          const ne = edges.find((e) => e.source === nodeId && e.sourceHandle === hid);

          if (opt) addStep({ type: 'decision', text: `Press ${key} → "${opt.label}"` });
          else addStep({ type: 'decision', text: `"${key}" is invalid → Invalid handler` });

          setPhase('processing');
          await delay(250);
          if (ne) await walkNode(ne.target, legSid);
          else endFlow(`No connection for "${hid}" — flow ends.`);
        }
        break;
      }

      case 'voicebotNode': {
        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<StartStream streamType="${node.data.streamType}" streamUrl="${node.data.streamUrl}"/>` });
        addStep({ type: 'event', text: 'stream_initiated' });
        addStep({ type: 'event', text: 'stream_started' });
        const r = await typeMessage(node.data.greeting || 'Voicebot: Hello! How can I help you?');
        if (abortRef.current) return;
        addStep({ type: 'info', text: 'Voicebot session ended' });
        addStep({ type: 'event', text: 'stream_stopped' });
        setPhase('processing');
        await delay(150);
        const nx = edges.find((e) => e.source === nodeId && e.sourceHandle === 'bot-end');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after voicebot.');
        break;
      }

      case 'transferNode': {
        setPhase('processing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Dial contactUri="${node.data.contactUri}" exophone="${node.data.exophone}"/>` });
        addStep({ type: 'event', text: 'dial_initiated' });
        setFullMessage(`Transferring call to ${node.data.contactUri}...`);
        setTypedText(`Transferring call to ${node.data.contactUri}...`);
        await delay(2000);
        if (abortRef.current) return;
        addStep({ type: 'event', text: 'dial_success' });
        addStep({ type: 'info', text: `Call transferred to ${node.data.contactUri}` });
        const nx = edges.find((e) => e.source === nodeId && e.sourceHandle === 'transfer-success');
        if (nx) await walkNode(nx.target, legSid);
        else {
          addStep({ type: 'info', text: 'Flow complete — call transferred.' });
          setPhase('ended');
        }
        break;
      }

      case 'recordNode': {
        setPhase('processing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<StartRecording direction="${node.data.direction}" format="${node.data.format}"/>` });
        addStep({ type: 'event', text: 'recording_started' });
        setFullMessage('🔴 Recording in progress...');
        setTypedText('🔴 Recording in progress...');
        await delay(1200);
        if (abortRef.current) return;
        addStep({ type: 'info', text: 'Recording started — continuing flow' });
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after record.');
        break;
      }

      case 'gatherNode': {
        setPhase('listening');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Gather numDigits="${node.data.numDigits}" timeoutInSec="${node.data.timeout}" finishOnKey="${node.data.finishOnKey}"/>` });
        addStep({ type: 'event', text: 'gather_initiated' });
        addStep({ type: 'listening', text: `Listening for ${node.data.numDigits} digit(s)...` });
        const { key, how } = await waitForDtmf([]);
        if (abortRef.current) return;
        if (how === 'timeout') addStep({ type: 'dtmf', text: 'Timeout — no input' });
        else {
          addStep({ type: 'dtmf', text: `Digits received: "${key}"` });
          addStep({ type: 'event', text: `gather_success {digits: "${key}"}` });
        }
        setPhase('processing');
        await delay(150);
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after gather.');
        break;
      }

      case 'hangupNode': {
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: '<Hangup/>' });
        addStep({ type: 'event', text: 'leg_terminated' });
        addStep({ type: 'info', text: 'Call ended — Hangup.' });
        setFullMessage('Call ended');
        setTypedText('Call ended');
        setPhase('ended');
        break;
      }

      default: {
        addStep({ type: 'info', text: `Unknown node "${node.type}" — skipping` });
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else setPhase('ended');
      }
    }
  };

  const startTest = async () => {
    abortRef.current = false;
    setSteps([]);
    setCallDuration(0);
    setMenuOptions([]);
    setFullMessage('');
    setTypedText('');

    const startNode = nodes.find((n) => n.type === 'startNode');
    if (!startNode) {
      addStep({ type: 'error', text: 'No Start node found on the canvas.' });
      setPhase('ended');
      return;
    }

    const legSid = `2Q${nanoid(20)}00000`;

    setPhase('ringing');
    setCurrentNode(startNode);
    const isInbound = startNode.data.callDirection === 'inbound';

    if (isInbound) {
      addStep({ type: 'info', text: `Incoming call on ${startNode.data.exophone}` });
      addStep({ type: 'event', text: 'leg_incoming' });
      await delay(800);
      if (abortRef.current) return;
      addStep({ type: 'api', text: 'POST /v2/accounts/{AccountSID}/legs/{LegSID}', detail: 'Action: Answer' });
      await delay(600);
      if (abortRef.current) return;
      addStep({ type: 'event', text: 'leg_answered' });
      addStep({ type: 'info', text: 'Call answered' });
    } else {
      addStep({ type: 'info', text: `Initiating outbound call to ${startNode.data.contactUri || startNode.data.exophone}` });
      addStep({ type: 'api', text: 'POST /v2/accounts/{AccountSID}/legs', detail: `contact_uri: "${startNode.data.contactUri}", exophone: "${startNode.data.exophone}"` });
      await delay(700);
      if (abortRef.current) return;
      addStep({ type: 'event', text: 'leg_connecting' });
      await delay(900);
      if (abortRef.current) return;
      addStep({ type: 'event', text: 'leg_ringing' });
      await delay(1100);
      if (abortRef.current) return;
      addStep({ type: 'event', text: 'leg_answered' });
      addStep({ type: 'info', text: 'Call connected' });
    }

    setPhase('processing');
    const firstEdge = edges.find((e) => e.source === startNode.id);
    if (!firstEdge) return endFlow('Nothing connected after Start node.');
    await walkNode(firstEdge.target, legSid);
  };

  const endTest = () => {
    abortRef.current = true;
    clearInterval(typeTimer.current);
    skipRef.current = null;
    if (dtmfRef.current) {
      dtmfRef.current(null, 'aborted');
      dtmfRef.current = null;
    }
    setPhase('ended');
    addStep({ type: 'info', text: 'Test ended by user.' });
  };

  const resetAndRestart = () => {
    abortRef.current = true;
    clearInterval(typeTimer.current);
    setPhase('idle');
    setTimeout(() => startTest(), 60);
  };

  if (!isOpen) return null;

  const validKeys = new Set(menuOptions.map((o) => o.key));
  const isListening = phase === 'listening';
  const isPlaying = phase === 'playing';

  const stepIcon = (type) => {
    const map = { api: '🔌', event: '📡', node: '▶', decision: '➡️', dtmf: '🔢', listening: '👂', skip: '⏭', info: 'ℹ️', error: '❌' };
    return map[type] || '•';
  };

  return (
    <div className="tester-overlay">
      <div className="tester-modal">
        <div className="tester-header">
          <div className="tester-header-left">
            <PhoneOutgoing size={18} />
            <span className="tester-header-title">IVR Test Mode</span>
            {phase !== 'idle' && phase !== 'ended' && (
              <span className="tester-timer">{formatDuration(callDuration)}</span>
            )}
          </div>
          <div className="tester-header-right">
            {phase !== 'idle' && phase !== 'ended' && (
              <button className="toolbar-btn danger" onClick={endTest}>
                <PhoneOff size={14} />
                <span>End Call</span>
              </button>
            )}
            <button
              className="config-btn-icon"
              onClick={() => {
                abortRef.current = true;
                clearInterval(typeTimer.current);
                setPhase('idle');
                onClose();
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="tester-body">
          {/* ─── Phone Panel ─── */}
          <div className="tester-phone">
            {phase === 'idle' && (
              <div className="tester-idle">
                <div className="tester-idle-icon-wrap">
                  <PhoneOutgoing size={44} />
                </div>
                <h3>Ready to Test Your IVR</h3>
                <p>
                  Experience your flow as a caller would. You'll hear every
                  message, press DTMF keys, and see every system decision.
                </p>
                <button className="tester-start-btn" onClick={startTest}>
                  <PhoneOutgoing size={16} />
                  Start Test Call
                </button>
              </div>
            )}

            {phase === 'ringing' && (
              <div className="tester-ringing">
                <div className="ringing-anim">
                  {currentNode?.data.callDirection === 'inbound' ? <PhoneIncoming size={36} /> : <PhoneOutgoing size={36} />}
                </div>
                <h3>{currentNode?.data.callDirection === 'inbound' ? 'Incoming Call...' : 'Calling...'}</h3>
                <p className="ringing-number">{currentNode?.data.callDirection === 'inbound' ? currentNode?.data.exophone : (currentNode?.data.contactUri || currentNode?.data.exophone)}</p>
                <div className="ringing-dots"><span /><span /><span /></div>
              </div>
            )}

            {(isPlaying || isListening || phase === 'processing') && (
              <div className="tester-active">
                {currentNode && (
                  <div className="tester-current-node">
                    <span className="tcn-dot" />
                    <span>{currentNode.data.label}</span>
                  </div>
                )}

                <div className={`tester-status-bar ${phase}`}>
                  {isPlaying && (
                    <>
                      <Volume2 size={15} />
                      <span>SPEAKING</span>
                      <span className="status-sep">·</span>
                      <MicOff size={13} className="status-muted" />
                      <span className="status-sub">Not accepting input</span>
                    </>
                  )}
                  {isListening && (
                    <>
                      <Mic size={15} />
                      <span>LISTENING</span>
                      <span className="status-sep">·</span>
                      <span className="status-sub">Enter your input now</span>
                    </>
                  )}
                  {phase === 'processing' && (
                    <>
                      <Loader size={15} className="spin" />
                      <span>PROCESSING</span>
                    </>
                  )}
                </div>

                {/* Message being spoken */}
                {(isPlaying || phase === 'processing') && fullMessage && (
                  <div className="tester-message-box">
                    <div className="tester-msg-label">System says:</div>
                    <div className="tester-msg-text">
                      <span>{typedText}</span>
                      {isPlaying && typedText.length < fullMessage.length && (
                        <span className="typing-cursor">|</span>
                      )}
                    </div>
                    {isPlaying && typedText.length < fullMessage.length && (
                      <div className="tester-msg-actions">
                        <button className="tester-skip-btn" onClick={handleSkip}>
                          <SkipForward size={13} />
                          Skip to end
                        </button>
                      </div>
                    )}
                    <div className="tester-progress">
                      <div
                        className="tester-progress-fill"
                        style={{ width: `${fullMessage.length ? (typedText.length / fullMessage.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Listening indicator */}
                {isListening && (
                  <div className="tester-listen-box">
                    <div className="listen-wave">
                      <span /><span /><span /><span /><span />
                    </div>
                    <p className="listen-label">Waiting for your input...</p>
                    {menuOptions.length > 0 && (
                      <div className="listen-options">
                        {menuOptions.map((o) => (
                          <span key={o.key} className="listen-chip">
                            <strong>{o.key}</strong> {o.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* DTMF Keypad */}
                <div className={`tester-keypad ${isListening ? 'active' : ''}`}>
                  {DTMF_KEYS.map((row, ri) => (
                    <div key={ri} className="kp-row">
                      {row.map((k) => (
                        <button
                          key={k}
                          className={`kp-btn ${isListening && validKeys.has(k) ? 'hl' : ''}`}
                          disabled={!isListening}
                          onClick={() => handleDtmfPress(k)}
                        >
                          <span className="kp-digit">{k}</span>
                          <span className="kp-letters">{DTMF_LABELS[k]}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="kp-row">
                    <button className="kp-btn kp-timeout" disabled={!isListening} onClick={handleTimeout}>
                      <Clock size={13} />
                      <span className="kp-digit">Timeout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'ended' && (
              <div className="tester-ended">
                <PhoneOff size={36} className="tester-ended-icon" />
                <h3>Call Ended</h3>
                <p>Duration: {formatDuration(callDuration)} · {steps.length} steps</p>
                <div className="tester-ended-btns">
                  <button className="tester-start-btn" onClick={resetAndRestart}>
                    <RotateCcw size={14} /> Test Again
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => {
                      setPhase('idle');
                      onClose();
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Decision Log ─── */}
          <div className="tester-log">
            <div className="tester-log-head">
              <span>System Decision Log</span>
              <span className="tester-log-badge">{steps.length}</span>
            </div>
            <div className="tester-log-body">
              {steps.length === 0 && (
                <div className="tester-log-empty">
                  Start the test to see every API call, event, and routing
                  decision made by the IVR system.
                </div>
              )}
              {steps.map((s) => (
                <div key={s.id} className={`ts ${s.type}`}>
                  <span className="ts-icon">{stepIcon(s.type)}</span>
                  <div className="ts-body">
                    <span className="ts-text">{s.text}</span>
                    {s.detail && <span className="ts-detail">{s.detail}</span>}
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
