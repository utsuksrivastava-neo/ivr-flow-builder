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

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Formats seconds as `MM:SS` for the call timer display.
 * @param {number} s - Duration in seconds
 * @returns {string}
 */
function formatDuration(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Modal IVR flow simulator: walks the canvas graph, simulates leg actions,
 * DTMF, barge-in, countdown timers, and API calls with a decision log.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the tester overlay is visible
 * @param {() => void} props.onClose - Called when the user closes the modal
 * @returns {React.ReactElement|null}
 */
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
  const [bargeInActive, setBargeInActive] = useState(false);
  /** When non-null, listening-phase countdown is shown (seconds remaining). */
  const [countdownSec, setCountdownSec] = useState(null);

  const skipRef = useRef(null);
  const dtmfRef = useRef(null);
  const abortRef = useRef(false);
  const typeTimer = useRef(null);
  const durTimer = useRef(null);
  const logEndRef = useRef(null);
  /** Sequential step index for visited nodes (persists across async `walkNode` calls). */
  const stepCounterRef = useRef(0);
  /** If set, the next menu/gather node should treat this key as already pressed (barge-in from prior node). */
  const pendingDtmfKeyRef = useRef(null);
  const countdownTimerRef = useRef(null);
  /** Original timeout (seconds) for the progress bar denominator while countdown is active. */
  const maxTimeoutRef = useRef(0);

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
      clearInterval(countdownTimerRef.current);
    };
  }, []);

  /**
   * Starts the listening-phase countdown; at 0 fires gather timeout on `dtmfRef`.
   * @param {number} seconds - Initial countdown value
   */
  const startCountdown = useCallback((seconds) => {
    maxTimeoutRef.current = seconds;
    setCountdownSec(seconds);
    clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimerRef.current);
          if (dtmfRef.current) dtmfRef.current(null, 'timeout');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * Clears the listening countdown interval and hides the UI.
   */
  const stopCountdown = useCallback(() => {
    clearInterval(countdownTimerRef.current);
    setCountdownSec(null);
  }, []);

  /**
   * Appends one entry to the decision log.
   * @param {object} step - Step fields (type, text, detail, stepNum, etc.)
   */
  const addStep = useCallback((step) => {
    setSteps((prev) => [...prev, { id: nanoid(6), ...step }]);
  }, []);

  /**
   * Animates the given text into the message area (typing effect); skip resolves early.
   * @param {string} text - Full message to display
   * @returns {Promise<'completed'|'skipped'|'aborted'>}
   */
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

  /**
   * Resolves when the user presses a DTMF key or triggers timeout/abort.
   * @param {Array<{key: string, label: string}>} [options] - Optional menu keys to highlight
   * @returns {Promise<{ key: string|null, how: string }>}
   */
  const waitForDtmf = (options) =>
    new Promise((resolve) => {
      if (abortRef.current) return resolve({ key: null, how: 'aborted' });
      setMenuOptions(options || []);
      dtmfRef.current = (key, how) => {
        dtmfRef.current = null;
        resolve({ key, how: how || 'pressed' });
      };
    });

  /** Skips the current typewriter animation if one is active. */
  const handleSkip = () => skipRef.current?.();

  /**
   * Forwards a keypad press to the active gather/menu wait handler or barge-in listener.
   * @param {string} key - DTMF digit pressed
   */
  const handleDtmfPress = (key) => {
    if (dtmfRef.current && (phase === 'listening' || (phase === 'playing' && bargeInActive))) {
      dtmfRef.current(key, 'pressed');
    }
  };

  /** Simulates gather timeout for the current listening phase. */
  const handleTimeout = () => {
    if (dtmfRef.current && phase === 'listening') dtmfRef.current(null, 'timeout');
  };

  /**
   * Finds an outgoing edge from `nodeId` by source handle id.
   * @param {string} nodeId - Source node id
   * @param {string} handle - Handle id (e.g. 'default', 'api-success')
   * @returns {object|undefined} Edge object from the flow store, if any
   */
  const findEdge = (nodeId, handle) =>
    edges.find(
      (e) =>
        e.source === nodeId &&
        (e.sourceHandle === handle || (!e.sourceHandle && handle === 'default'))
    );

  /**
   * Ends the simulated call and optionally logs an error step.
   * @param {string} [msg] - Optional error message for the log
   */
  const endFlow = (msg) => {
    if (msg) addStep({ type: 'error', text: msg });
    setPhase('ended');
  };

  /**
   * Recursively executes the flow from a node: Say, Gather, API, etc.
   * @param {string} nodeId - Current node id
   * @param {string} legSid - Simulated leg SID for log context
   * @returns {Promise<void>}
   */
  const walkNode = async (nodeId, legSid) => {
    if (abortRef.current) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return endFlow('Node not found — broken connection.');

    setCurrentNode(node);
    const label = node.data.label;
    const typeLabel = node.type.replace('Node', '').toUpperCase();
    stepCounterRef.current += 1;
    const stepNum = stepCounterRef.current;
    addStep({ type: 'node', text: `Step ${stepNum}: ${label}`, detail: typeLabel, stepNum });

    switch (node.type) {
      case 'sayNode': {
        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${node.data.message}</Say>` });
        addStep({ type: 'event', text: 'say_started' });

        const nextEdge = findEdge(nodeId, 'default');
        const nextNode = nextEdge ? nodes.find((n) => n.id === nextEdge.target) : null;
        const canBargeIn =
          node.data.bargeIn !== false &&
          nextNode &&
          (nextNode.type === 'menuNode' || nextNode.type === 'gatherNode');

        if (canBargeIn) {
          setBargeInActive(true);
          const earlyDtmfPromise = new Promise((resolve) => {
            dtmfRef.current = (key, how) => {
              dtmfRef.current = null;
              resolve({ key, how: how || 'pressed' });
            };
          });
          const result = await Promise.race([
            typeMessage(node.data.message || '(empty message)').then((r) => ({ type: 'message', result: r })),
            earlyDtmfPromise.then((d) => ({ type: 'dtmf', ...d })),
          ]);
          setBargeInActive(false);
          if (abortRef.current) return;
          if (result.type === 'dtmf') {
            clearInterval(typeTimer.current);
            skipRef.current = null;
            pendingDtmfKeyRef.current = result.key;
            addStep({ type: 'dtmf', text: `Barge-in: caller pressed "${result.key}" during message` });
            addStep({ type: 'event', text: 'say_completed' });
            setPhase('processing');
            await delay(150);
            await walkNode(nextEdge.target, legSid);
            break;
          }
          addStep({
            type: result.result === 'skipped' ? 'skip' : 'info',
            text: result.result === 'skipped' ? 'Skipped by tester' : 'Message finished',
          });
          addStep({ type: 'event', text: 'say_completed' });
          setPhase('processing');
          await delay(150);
          const nx = findEdge(nodeId, 'default');
          if (nx) await walkNode(nx.target, legSid);
          else endFlow('No outgoing connection — flow ends.');
        } else {
          const r = await typeMessage(node.data.message || '(empty message)');
          if (abortRef.current) return;
          addStep({ type: r === 'skipped' ? 'skip' : 'info', text: r === 'skipped' ? 'Skipped by tester' : 'Message finished' });
          addStep({ type: 'event', text: 'say_completed' });
          setPhase('processing');
          await delay(150);
          const nx = findEdge(nodeId, 'default');
          if (nx) await walkNode(nx.target, legSid);
          else endFlow('No outgoing connection — flow ends.');
        }
        break;
      }

      case 'playNode': {
        setPhase('playing');
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<StartPlay loop="${node.data.loop}">${node.data.audioUrl}</StartPlay>`,
        });
        addStep({ type: 'event', text: 'play_started' });

        const playText = `♪ Playing audio: ${node.data.audioUrl || '(no URL)'}`;
        const nextEdge = findEdge(nodeId, 'default');
        const nextNode = nextEdge ? nodes.find((n) => n.id === nextEdge.target) : null;
        const canBargeIn =
          node.data.bargeIn !== false &&
          nextNode &&
          (nextNode.type === 'menuNode' || nextNode.type === 'gatherNode');

        if (canBargeIn) {
          setBargeInActive(true);
          const earlyDtmfPromise = new Promise((resolve) => {
            dtmfRef.current = (key, how) => {
              dtmfRef.current = null;
              resolve({ key, how: how || 'pressed' });
            };
          });
          const result = await Promise.race([
            typeMessage(playText).then((r) => ({ type: 'message', result: r })),
            earlyDtmfPromise.then((d) => ({ type: 'dtmf', ...d })),
          ]);
          setBargeInActive(false);
          if (abortRef.current) return;
          if (result.type === 'dtmf') {
            clearInterval(typeTimer.current);
            skipRef.current = null;
            pendingDtmfKeyRef.current = result.key;
            addStep({ type: 'dtmf', text: `Barge-in: caller pressed "${result.key}" during playback` });
            addStep({ type: 'event', text: 'play_completed' });
            setPhase('processing');
            await delay(150);
            await walkNode(nextEdge.target, legSid);
            break;
          }
          addStep({
            type: result.result === 'skipped' ? 'skip' : 'info',
            text: result.result === 'skipped' ? 'Audio skipped' : 'Audio finished',
          });
          addStep({ type: 'event', text: 'play_completed' });
          setPhase('processing');
          await delay(150);
          const nx = findEdge(nodeId, 'default');
          if (nx) await walkNode(nx.target, legSid);
          else endFlow('No outgoing connection — flow ends.');
        } else {
          const r = await typeMessage(playText);
          if (abortRef.current) return;
          addStep({ type: r === 'skipped' ? 'skip' : 'info', text: r === 'skipped' ? 'Audio skipped' : 'Audio finished' });
          addStep({ type: 'event', text: 'play_completed' });
          setPhase('processing');
          await delay(150);
          const nx = findEdge(nodeId, 'default');
          if (nx) await walkNode(nx.target, legSid);
          else endFlow('No outgoing connection — flow ends.');
        }
        break;
      }

      case 'menuNode': {
        const promptText =
          node.data.promptType === 'tts' ? node.data.prompt : `♪ Playing audio: ${node.data.audioUrl}`;
        const allowBargeIn = node.data.bargeIn !== false;

        let earlyKey = pendingDtmfKeyRef.current;
        pendingDtmfKeyRef.current = null;

        /**
         * Routes menu digit: timeout edge, DTMF option edge, or invalid.
         * @param {string|null} key
         * @param {string} how
         */
        const processMenuKeyResult = async (key, how) => {
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
        };

        if (earlyKey) {
          addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${promptText}</Say>` });
          addStep({ type: 'event', text: 'say_started' });
          addStep({ type: 'skip', text: 'Prompt skipped (barge-in from previous node)' });
          addStep({ type: 'event', text: 'say_completed' });
          addStep({
            type: 'api',
            text: `POST /legs/{LegSID}/actions`,
            detail: `<Gather numDigits="1" timeoutInSec="${node.data.timeout}"/>`,
          });
          addStep({ type: 'event', text: 'gather_initiated' });
          await processMenuKeyResult(earlyKey, 'pressed');
          break;
        }

        if (allowBargeIn) {
          setBargeInActive(allowBargeIn);

          const earlyDtmfPromise = new Promise((resolve) => {
            dtmfRef.current = (key, how) => {
              dtmfRef.current = null;
              resolve({ key, how: how || 'pressed' });
            };
          });

          setPhase('playing');
          addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${promptText}</Say>` });
          addStep({ type: 'event', text: 'say_started' });

          const result = await Promise.race([
            typeMessage(promptText || '(empty prompt)').then((r) => ({ type: 'message', result: r })),
            earlyDtmfPromise.then((d) => ({ type: 'dtmf', ...d })),
          ]);

          if (abortRef.current) return;
          setBargeInActive(false);

          if (result.type === 'dtmf') {
            clearInterval(typeTimer.current);
            skipRef.current = null;
            earlyKey = result.key;
            addStep({ type: 'dtmf', text: `Barge-in: caller pressed "${earlyKey}" during prompt` });
            addStep({ type: 'event', text: 'say_completed' });
          } else {
            addStep({
              type: result.result === 'skipped' ? 'skip' : 'info',
              text: result.result === 'skipped' ? 'Prompt skipped' : 'Prompt finished',
            });
            addStep({ type: 'event', text: 'say_completed' });
          }
        } else {
          setPhase('playing');
          addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${promptText}</Say>` });
          addStep({ type: 'event', text: 'say_started' });
          const pr = await typeMessage(promptText || '(empty prompt)');
          if (abortRef.current) return;
          addStep({ type: pr === 'skipped' ? 'skip' : 'info', text: pr === 'skipped' ? 'Prompt skipped' : 'Prompt finished' });
          addStep({ type: 'event', text: 'say_completed' });
        }

        if (earlyKey) {
          addStep({
            type: 'api',
            text: `POST /legs/{LegSID}/actions`,
            detail: `<Gather numDigits="1" timeoutInSec="${node.data.timeout}"/>`,
          });
          addStep({ type: 'event', text: 'gather_initiated' });
          await processMenuKeyResult(earlyKey, 'pressed');
          break;
        }

        const timeoutSec = node.data.timeout || 5;
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<Gather numDigits="1" timeoutInSec="${node.data.timeout}"/>`,
        });
        addStep({ type: 'event', text: 'gather_initiated' });
        startCountdown(timeoutSec);
        setPhase('listening');
        addStep({ type: 'listening', text: `Listening for input... (${timeoutSec}s timeout)` });

        const { key, how } = await waitForDtmf(node.data.options || []);
        stopCountdown();
        if (abortRef.current) return;

        await processMenuKeyResult(key, how);
        break;
      }

      case 'voicebotNode': {
        setPhase('playing');
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<StartStream streamType="${node.data.streamType}" streamUrl="${node.data.streamUrl}"/>`,
        });
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
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<Dial contactUri="${node.data.contactUri}" exophone="${node.data.exophone}"/>`,
        });
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
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<StartRecording direction="${node.data.direction}" format="${node.data.format}"/>`,
        });
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
        const pt = node.data.promptType || 'none';
        if (pt === 'tts' && (node.data.prompt || '').trim()) {
          setPhase('playing');
          addStep({
            type: 'api',
            text: `POST /legs/{LegSID}/actions`,
            detail: `<Say>${node.data.prompt}</Say>`,
          });
          addStep({ type: 'event', text: 'say_started' });
          const pr = await typeMessage(node.data.prompt);
          if (abortRef.current) return;
          addStep({
            type: pr === 'skipped' ? 'skip' : 'info',
            text: pr === 'skipped' ? 'Prompt skipped' : 'Prompt finished',
          });
          addStep({ type: 'event', text: 'say_completed' });
        } else if (pt === 'audio' && (node.data.audioUrl || '').trim()) {
          setPhase('playing');
          addStep({
            type: 'api',
            text: `POST /legs/{LegSID}/actions`,
            detail: `<StartPlay loop="1">${node.data.audioUrl}</StartPlay>`,
          });
          addStep({ type: 'event', text: 'play_started' });
          await delay(900);
          if (abortRef.current) return;
          addStep({ type: 'event', text: 'play_completed' });
        }

        let collected = '';
        const numDigits = node.data.numDigits || 1;
        const finishOnKey = node.data.finishOnKey || '#';
        const timeoutVal = node.data.timeout || 5;

        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<Gather numDigits="${numDigits}" timeoutInSec="${node.data.timeout}" finishOnKey="${finishOnKey}"/>`,
        });
        addStep({ type: 'event', text: 'gather_initiated' });
        setPhase('listening');
        addStep({
          type: 'listening',
          text: `Collecting up to ${numDigits} digit(s)... Press ${finishOnKey} to finish early.`,
        });

        let pendingKey = pendingDtmfKeyRef.current;
        pendingDtmfKeyRef.current = null;

        if (pendingKey) {
          addStep({
            type: 'dtmf',
            text: `Barge-in: first digit "${pendingKey}" from previous node`,
          });
          if (pendingKey === finishOnKey) {
            addStep({ type: 'dtmf', text: `Finish key "${finishOnKey}" pressed — ending input` });
          } else {
            collected += pendingKey;
            addStep({
              type: 'dtmf',
              text: `Digit ${collected.length}/${numDigits}: "${pendingKey}" (collected so far: "${collected}")`,
            });
            const display = collected.padEnd(numDigits, '_').split('').join(' ');
            setFullMessage(`Digits: [ ${display} ]`);
            setTypedText(`Digits: [ ${display} ]`);
          }
        }

        startCountdown(timeoutVal);

        while (collected.length < numDigits) {
          const { key, how } = await waitForDtmf([]);
          stopCountdown();
          if (abortRef.current) return;

          if (how === 'timeout') {
            addStep({ type: 'dtmf', text: `Timeout — collected ${collected.length} of ${numDigits} digits` });
            break;
          }

          if (key === finishOnKey) {
            addStep({ type: 'dtmf', text: `Finish key "${finishOnKey}" pressed — ending input` });
            break;
          }

          collected += key;
          addStep({
            type: 'dtmf',
            text: `Digit ${collected.length}/${numDigits}: "${key}" (collected so far: "${collected}")`,
          });

          const display = collected.padEnd(numDigits, '_').split('').join(' ');
          setFullMessage(`Digits: [ ${display} ]`);
          setTypedText(`Digits: [ ${display} ]`);

          if (collected.length >= numDigits) break;
          startCountdown(timeoutVal);
        }

        stopCountdown();

        if (collected.length > 0) {
          addStep({ type: 'event', text: `gather_success {digits: "${collected}"}` });
          addStep({ type: 'decision', text: `Gathered "${collected}" (${collected.length} digits)` });
        } else {
          addStep({ type: 'event', text: 'gather_failed {reason: "no_input"}' });
        }

        setPhase('processing');
        await delay(200);
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after gather.');
        break;
      }

      case 'hangupNode': {
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: '<Hangup/>' });
        addStep({ type: 'event', text: 'leg_terminated' });
        addStep({ type: 'info', text: 'Call ended — End Call.' });
        setFullMessage('Call ended');
        setTypedText('Call ended');
        setPhase('ended');
        break;
      }

      case 'apiCallNode': {
        setPhase('processing');
        const isSyncMode = node.data.mode !== 'async';
        addStep({
          type: 'api',
          text: `${node.data.method || 'POST'} ${node.data.url || '(no URL)'}`,
          detail: `Mode: ${isSyncMode ? 'Synchronous' : 'Asynchronous'} · Timeout: ${node.data.timeout || 10}s`,
        });
        if (node.data.headers) {
          addStep({ type: 'info', text: `Headers: ${node.data.headers}` });
        }
        if (node.data.body && ['POST', 'PUT', 'PATCH'].includes(node.data.method)) {
          addStep({ type: 'info', text: `Body: ${node.data.body}` });
        }

        if (isSyncMode) {
          setFullMessage(`Calling API: ${node.data.method} ${node.data.url}`);
          setTypedText(`Calling API: ${node.data.method} ${node.data.url}`);
          addStep({ type: 'listening', text: `Waiting for response... (timeout: ${node.data.timeout}s)` });
          await delay(1800);
          if (abortRef.current) return;
          addStep({ type: 'event', text: 'api_response: 200 OK' });
          addStep({ type: 'decision', text: '{"status":"success","data":{"verified":true,"balance":12500}}' });
          addStep({ type: 'info', text: `Stored in variable: ${node.data.responseVariable || 'api_response'}` });
        } else {
          addStep({ type: 'info', text: 'Async call dispatched — not waiting for response' });
          if (node.data.callbackUrl) {
            addStep({ type: 'event', text: `Callback URL: ${node.data.callbackUrl}` });
          }
          setFullMessage(`Async API fired: ${node.data.method} ${node.data.url}`);
          setTypedText(`Async API fired: ${node.data.method} ${node.data.url}`);
          await delay(600);
        }
        if (abortRef.current) return;

        addStep({ type: 'decision', text: 'Routing → Success path' });
        setPhase('processing');
        await delay(300);
        const apiNext = edges.find((e) => e.source === nodeId && e.sourceHandle === 'api-success');
        if (apiNext) await walkNode(apiNext.target, legSid);
        else endFlow('No success path connected to API Call.');
        break;
      }

      case 'messageNode': {
        setPhase('playing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: `<Say>${node.data.message}</Say>` });

        const nextEdge = findEdge(nodeId, 'default');
        const nextNode = nextEdge ? nodes.find((n) => n.id === nextEdge.target) : null;
        const canBargeIn =
          node.data.bargeIn !== false &&
          nextNode &&
          (nextNode.type === 'menuNode' || nextNode.type === 'gatherNode');

        if (canBargeIn) {
          setBargeInActive(true);
          const earlyDtmfPromise = new Promise((resolve) => {
            dtmfRef.current = (key, how) => {
              dtmfRef.current = null;
              resolve({ key, how: how || 'pressed' });
            };
          });
          const result = await Promise.race([
            typeMessage(node.data.message || '(empty message)').then((r) => ({ type: 'message', result: r })),
            earlyDtmfPromise.then((d) => ({ type: 'dtmf', ...d })),
          ]);
          setBargeInActive(false);
          if (abortRef.current) return;
          if (result.type === 'dtmf') {
            clearInterval(typeTimer.current);
            skipRef.current = null;
            pendingDtmfKeyRef.current = result.key;
            addStep({ type: 'dtmf', text: `Barge-in: caller pressed "${result.key}" during message` });
            setPhase('processing');
            await delay(150);
            await walkNode(nextEdge.target, legSid);
            break;
          }
          setPhase('processing');
          await delay(150);
          const nx = findEdge(nodeId, 'default');
          if (nx) await walkNode(nx.target, legSid);
          else endFlow('No outgoing connection — flow ends.');
          break;
        }

        await typeMessage(node.data.message || '(empty message)');
        if (abortRef.current) return;
        setPhase('processing');
        await delay(150);
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No outgoing connection — flow ends.');
        break;
      }

      case 'startRecordNode': {
        setPhase('processing');
        addStep({
          type: 'api',
          text: `POST /legs/{LegSID}/actions`,
          detail: `<StartRecording direction="${node.data.direction}" format="${node.data.format}"/>`,
        });
        addStep({ type: 'event', text: 'recording_started' });
        setFullMessage('Recording started');
        setTypedText('Recording started');
        await delay(800);
        if (abortRef.current) return;
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after start record.');
        break;
      }

      case 'stopRecordNode': {
        setPhase('processing');
        addStep({ type: 'api', text: `POST /legs/{LegSID}/actions`, detail: '<StopRecording/>' });
        addStep({ type: 'event', text: 'recording_stopped' });
        setFullMessage('Recording stopped');
        setTypedText('Recording stopped');
        await delay(500);
        if (abortRef.current) return;
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after stop record.');
        break;
      }

      case 'syncApiNode': {
        setPhase('processing');
        addStep({
          type: 'api',
          text: `${node.data.method || 'POST'} ${node.data.url || '(no URL)'}`,
          detail: `Mode: Synchronous · Timeout: ${node.data.timeout || 10}s`,
        });
        if (node.data.headers) {
          addStep({ type: 'info', text: `Headers: ${node.data.headers}` });
        }
        if (node.data.body && ['POST', 'PUT', 'PATCH'].includes(node.data.method)) {
          addStep({ type: 'info', text: `Body: ${node.data.body}` });
        }
        setFullMessage(`Calling API: ${node.data.method} ${node.data.url}`);
        setTypedText(`Calling API: ${node.data.method} ${node.data.url}`);
        addStep({ type: 'listening', text: `Waiting for response... (timeout: ${node.data.timeout}s)` });
        await delay(1800);
        if (abortRef.current) return;
        addStep({ type: 'event', text: 'api_response: 200 OK' });
        addStep({ type: 'decision', text: '{"status":"success","data":{"verified":true,"balance":12500}}' });
        addStep({ type: 'info', text: `Stored in variable: ${node.data.responseVariable || 'api_response'}` });
        if (abortRef.current) return;
        addStep({ type: 'decision', text: 'Routing → Success path' });
        setPhase('processing');
        await delay(300);
        const apiNext = edges.find((e) => e.source === nodeId && e.sourceHandle === 'api-success');
        if (apiNext) await walkNode(apiNext.target, legSid);
        else endFlow('No success path connected to API Call.');
        break;
      }

      case 'asyncApiNode': {
        setPhase('processing');
        addStep({
          type: 'api',
          text: `${node.data.method || 'POST'} ${node.data.url || '(no URL)'}`,
          detail: `Mode: Asynchronous · Timeout: ${node.data.timeout || 10}s`,
        });
        if (node.data.headers) {
          addStep({ type: 'info', text: `Headers: ${node.data.headers}` });
        }
        if (node.data.body && ['POST', 'PUT', 'PATCH'].includes(node.data.method)) {
          addStep({ type: 'info', text: `Body: ${node.data.body}` });
        }
        addStep({ type: 'info', text: 'Async call dispatched — not waiting for response' });
        if (node.data.callbackUrl) {
          addStep({ type: 'event', text: `Callback URL: ${node.data.callbackUrl}` });
        }
        setFullMessage(`Async API fired: ${node.data.method} ${node.data.url}`);
        setTypedText(`Async API fired: ${node.data.method} ${node.data.url}`);
        await delay(500);
        if (abortRef.current) return;
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after async API.');
        break;
      }

      case 'voicemailNode': {
        setPhase('processing');
        const vmMsg = node.data.message || 'Please leave a message after the beep.';
        const vmTimeout = node.data.timeoutInSec || 30;
        const vmSilence = node.data.silenceInSec || 5;
        const vmFinish = node.data.finishOnKey || '#';
        addStep({
          type: 'api',
          text: 'POST /legs/{LegSID}/actions',
          detail: `<StartRecording silenceInSec="${vmSilence}" finishOnKey="${vmFinish}" timeoutInSec="${vmTimeout}"><Say>${vmMsg}</Say></StartRecording>`,
        });
        addStep({ type: 'event', text: 'recording_started (voicemail)' });
        setFullMessage(vmMsg);
        setTypedText('');
        await typeMessage(vmMsg);
        if (abortRef.current) return;
        addStep({ type: 'info', text: `Recording for up to ${vmTimeout}s (silence timeout: ${vmSilence}s, finish: ${vmFinish})` });
        await delay(2000);
        if (abortRef.current) return;
        addStep({ type: 'event', text: 'recording_stopped' });
        addStep({ type: 'event', text: 'recording_available' });
        setFullMessage('Voicemail recorded');
        setTypedText('Voicemail recorded');
        await delay(500);
        if (abortRef.current) return;
        const nx = findEdge(nodeId, 'default');
        if (nx) await walkNode(nx.target, legSid);
        else endFlow('No connection after voicemail.');
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

  /**
   * Starts the simulated call from the Start node (inbound, outbound, or both).
   * @returns {Promise<void>}
   */
  const startTest = async () => {
    abortRef.current = false;
    stepCounterRef.current = 0;
    pendingDtmfKeyRef.current = null;
    setBargeInActive(false);
    stopCountdown();
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
    const callDirection = startNode.data.callDirection;
    const isInbound = callDirection === 'inbound';

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
      addStep({
        type: 'info',
        text: `Initiating outbound call to ${startNode.data.contactUri || startNode.data.exophone}`,
      });
      addStep({
        type: 'api',
        text: 'POST /v2/accounts/{AccountSID}/legs',
        detail: `contact_uri: "${startNode.data.contactUri}", exophone: "${startNode.data.exophone}"`,
      });
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

  /** Aborts typing, DTMF wait, countdown, and marks the test ended. */
  const endTest = () => {
    abortRef.current = true;
    clearInterval(typeTimer.current);
    clearInterval(countdownTimerRef.current);
    stopCountdown();
    skipRef.current = null;
    if (dtmfRef.current) {
      dtmfRef.current(null, 'aborted');
      dtmfRef.current = null;
    }
    setPhase('ended');
    addStep({ type: 'info', text: 'Test ended by user.' });
  };

  /** Ends current run and restarts `startTest` after a short delay. */
  const resetAndRestart = () => {
    abortRef.current = true;
    clearInterval(typeTimer.current);
    clearInterval(countdownTimerRef.current);
    stopCountdown();
    setPhase('idle');
    setTimeout(() => startTest(), 60);
  };

  if (!isOpen) return null;

  const validKeys = new Set(menuOptions.map((o) => o.key));
  const isListening = phase === 'listening';
  const isPlaying = phase === 'playing';
  const maxTimeout = maxTimeoutRef.current || 1;

  /** Maps log step types to emoji icons in the decision log. */
  const stepIcon = (type) => {
    const map = {
      api: '🔌',
      event: '📡',
      node: '▶',
      decision: '➡️',
      dtmf: '🔢',
      listening: '👂',
      skip: '⏭',
      info: 'ℹ️',
      error: '❌',
    };
    return map[type] || '•';
  };

  const startDir = currentNode?.data?.callDirection;
  const isRingingInbound = startDir === 'inbound';

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
              <button type="button" className="toolbar-btn danger" onClick={endTest}>
                <PhoneOff size={14} />
                <span>End Call</span>
              </button>
            )}
            <button
              type="button"
              className="config-btn-icon"
              onClick={() => {
                abortRef.current = true;
                clearInterval(typeTimer.current);
                clearInterval(countdownTimerRef.current);
                stopCountdown();
                setPhase('idle');
                onClose();
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="tester-body">
          <div className="tester-phone">
            {phase === 'idle' && (
              <div className="tester-idle">
                <div className="tester-idle-icon-wrap">
                  <PhoneOutgoing size={44} />
                </div>
                <h3>Ready to Test Your IVR</h3>
                <p>
                  Experience your flow as a caller would. You&apos;ll hear every message, press DTMF keys, and see
                  every system decision.
                </p>
                <button type="button" className="tester-start-btn" onClick={startTest}>
                  <PhoneOutgoing size={16} />
                  Start Test Call
                </button>
              </div>
            )}

            {phase === 'ringing' && (
              <div className="tester-ringing">
                <div className="ringing-anim">
                  {isRingingInbound ? <PhoneIncoming size={36} /> : <PhoneOutgoing size={36} />}
                </div>
                <h3>{isRingingInbound ? 'Incoming Call...' : 'Calling...'}</h3>
                <p className="ringing-number">
                  {isRingingInbound
                    ? currentNode?.data.exophone
                    : currentNode?.data.contactUri || currentNode?.data.exophone}
                </p>
                <div className="ringing-dots">
                  <span />
                  <span />
                  <span />
                </div>
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
                      {bargeInActive ? (
                        <>
                          <Mic size={13} className="status-bargein" />
                          <span className="status-sub">Accepting input (barge-in)</span>
                        </>
                      ) : (
                        <>
                          <MicOff size={13} className="status-muted" />
                          <span className="status-sub">Not accepting input</span>
                        </>
                      )}
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

                {(isPlaying ||
                  phase === 'processing' ||
                  (isListening && fullMessage.startsWith('Digits:'))) &&
                  fullMessage && (
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
                          <button type="button" className="tester-skip-btn" onClick={handleSkip}>
                            <SkipForward size={13} />
                            Skip to end
                          </button>
                        </div>
                      )}
                      <div className="tester-progress">
                        <div
                          className="tester-progress-fill"
                          style={{
                            width: `${fullMessage.length ? (typedText.length / fullMessage.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                {isListening && (
                  <div className="tester-listen-box">
                    <div className="listen-wave">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="listen-label">Waiting for your input...</p>
                    {countdownSec !== null && (
                      <div className="listen-countdown">
                        <Clock size={14} />
                        <span>{countdownSec}s remaining</span>
                        <div className="countdown-bar">
                          <div
                            className="countdown-fill"
                            style={{ width: `${(countdownSec / maxTimeout) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
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

                <div className={`tester-keypad ${isListening || (isPlaying && bargeInActive) ? 'active' : ''}`}>
                  {DTMF_KEYS.map((row, ri) => (
                    <div key={ri} className="kp-row">
                      {row.map((k) => (
                        <button
                          type="button"
                          key={k}
                          className={`kp-btn ${isListening && validKeys.has(k) ? 'hl' : ''}`}
                          disabled={!isListening && !(isPlaying && bargeInActive)}
                          onClick={() => handleDtmfPress(k)}
                        >
                          <span className="kp-digit">{k}</span>
                          <span className="kp-letters">{DTMF_LABELS[k]}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="kp-row">
                    <button
                      type="button"
                      className="kp-btn kp-timeout"
                      disabled={!isListening}
                      onClick={handleTimeout}
                    >
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
                <p>
                  Duration: {formatDuration(callDuration)} · {steps.length} steps
                </p>
                <div className="tester-ended-btns">
                  <button type="button" className="tester-start-btn" onClick={resetAndRestart}>
                    <RotateCcw size={14} /> Test Again
                  </button>
                  <button
                    type="button"
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

          <div className="tester-log">
            <div className="tester-log-head">
              <span>System Decision Log</span>
              <span className="tester-log-badge">{steps.length}</span>
            </div>
            <div className="tester-log-body">
              {steps.length === 0 && (
                <div className="tester-log-empty">
                  Start the test to see every API call, event, and routing decision made by the IVR system.
                </div>
              )}
              {steps.map((s) => (
                <div key={s.id} className={`ts ${s.type}`}>
                  <span className="ts-icon">{stepIcon(s.type)}</span>
                  <div className="ts-body">
                    {s.type === 'node' && s.stepNum != null && (
                      <span className="ts-step-badge">Step {s.stepNum}</span>
                    )}
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

