/**
 * nodeDefaults.test.js
 *
 * Verifies every node type (box) in the IVR flow builder has the correct
 * default data shape when created via the flow store's addNode.
 * One describe block per node type.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useFlowStore from '../store/flowStore';

beforeEach(() => {
  useFlowStore.getState().clearCanvas();
});

function addAndGet(type) {
  const id = useFlowStore.getState().addNode(type, { x: 0, y: 0 });
  return useFlowStore.getState().nodes.find((n) => n.id === id);
}

/* ─── Start Node ─────────────────────────────── */
describe('startNode defaults', () => {
  it('exists on initial canvas', () => {
    const start = useFlowStore.getState().nodes[0];
    expect(start.type).toBe('startNode');
  });

  it('has correct default data', () => {
    const d = useFlowStore.getState().nodes[0].data;
    expect(d.callDirection).toBe('both');
    expect(d.label).toBe('Inbound + Outbound Call');
    expect(d.contactUri).toBeDefined();
    expect(d.exophone).toBeDefined();
    expect(d.eventEndpoint).toContain('grpc://');
  });
});

/* ─── Menu Node ──────────────────────────────── */
describe('menuNode defaults', () => {
  it('has prompt, options, TTS settings, and bargeIn', () => {
    const n = addAndGet('menuNode');
    expect(n.data.label).toBe('IVR Menu');
    expect(n.data.prompt).toBeDefined();
    expect(n.data.promptType).toBe('tts');
    expect(Array.isArray(n.data.options)).toBe(true);
    expect(n.data.options.length).toBeGreaterThanOrEqual(2);
    expect(n.data.ttsEngine).toBe('polly');
    expect(n.data.ttsVoice).toBe('Aditi');
    expect(n.data.ttsLanguage).toBe('en');
    expect(n.data.timeout).toBeDefined();
    expect(n.data.maxRetries).toBeDefined();
    expect(n.data.bargeIn).toBe(true);
  });
});

/* ─── Play Audio Node ────────────────────────── */
describe('playNode defaults', () => {
  it('has audioUrl, loop, auth fields, and bargeIn', () => {
    const n = addAndGet('playNode');
    expect(n.data.label).toBe('Play Audio');
    expect(n.data.audioUrl).toContain('exotel');
    expect(n.data.loop).toBe(1);
    expect(n.data.username).toBeDefined();
    expect(n.data.password).toBeDefined();
    expect(n.data.bargeIn).toBe(true);
  });
});

/* ─── Say (TTS) Node ─────────────────────────── */
describe('sayNode defaults', () => {
  it('has message, TTS config, loop, and bargeIn', () => {
    const n = addAndGet('sayNode');
    expect(n.data.label).toBe('Say Message');
    expect(n.data.message).toBeDefined();
    expect(n.data.ttsEngine).toBe('polly');
    expect(n.data.ttsVoice).toBe('Aditi');
    expect(n.data.ttsLanguage).toBe('en');
    expect(n.data.loop).toBe(1);
    expect(n.data.bargeIn).toBe(true);
  });
});

/* ─── Greetings Node ─────────────────────────── */
describe('messageNode defaults', () => {
  it('has message text and bargeIn', () => {
    const n = addAndGet('messageNode');
    expect(n.data.label).toBe('Greetings');
    expect(n.data.message).toBeDefined();
    expect(n.data.bargeIn).toBe(true);
  });
});

/* ─── Voicebot Node ──────────────────────────── */
describe('voicebotNode defaults', () => {
  it('has streamType, streamUrl, greeting, and secureDtmf', () => {
    const n = addAndGet('voicebotNode');
    expect(n.data.label).toBe('Voicebot');
    expect(n.data.streamType).toBe('bidirectional');
    expect(n.data.streamUrl).toContain('wss://');
    expect(n.data.greeting).toBeDefined();
    expect(n.data.secureDtmf).toBe(false);
  });
});

/* ─── Transfer Node ──────────────────────────── */
describe('transferNode defaults', () => {
  it('has contactUri, exophone, networkType, timeout', () => {
    const n = addAndGet('transferNode');
    expect(n.data.label).toBe('Transfer Call');
    expect(n.data.contactUri).toBeDefined();
    expect(n.data.exophone).toBeDefined();
    expect(n.data.networkType).toBe('pstn');
    expect(n.data.timeout).toBe(30);
    expect(n.data.customParam).toBeDefined();
  });
});

/* ─── Record Node (legacy) ───────────────────── */
describe('recordNode defaults', () => {
  it('has all recording parameters including storage auth', () => {
    const n = addAndGet('recordNode');
    expect(n.data.label).toBe('Record');
    expect(n.data.direction).toBe('both');
    expect(n.data.format).toBe('mp3');
    expect(n.data.bitrate).toBe('8');
    expect(n.data.channel).toBe('mono');
    expect(n.data.storageType).toBe('s3');
    expect(n.data.storageUrl).toBeDefined();
    expect(n.data.storageUrlKey).toBeDefined();
    expect(n.data.storageUrlToken).toBeDefined();
  });
});

/* ─── Start Recording Node ───────────────────── */
describe('startRecordNode defaults', () => {
  it('has all recording parameters', () => {
    const n = addAndGet('startRecordNode');
    expect(n.data.label).toBe('Start Recording');
    expect(n.data.direction).toBe('both');
    expect(n.data.format).toBe('mp3');
    expect(n.data.bitrate).toBe('8');
    expect(n.data.channel).toBe('mono');
    expect(n.data.storageType).toBe('s3');
    expect(n.data.storageUrlKey).toBeDefined();
    expect(n.data.storageUrlToken).toBeDefined();
  });
});

/* ─── Stop Recording Node ────────────────────── */
describe('stopRecordNode defaults', () => {
  it('has label and no extra config', () => {
    const n = addAndGet('stopRecordNode');
    expect(n.data.label).toBe('Stop Recording');
    expect(Object.keys(n.data)).toHaveLength(1);
  });
});

/* ─── End Call Node ──────────────────────────── */
describe('hangupNode defaults', () => {
  it('has label and no extra config', () => {
    const n = addAndGet('hangupNode');
    expect(n.data.label).toBe('End Call');
    expect(Object.keys(n.data)).toHaveLength(1);
  });
});

/* ─── Gather Digits Node ─────────────────────── */
describe('gatherNode defaults', () => {
  it('has numDigits, timeout, finishOnKey, prompt settings', () => {
    const n = addAndGet('gatherNode');
    expect(n.data.label).toBe('Gather Digits');
    expect(n.data.numDigits).toBe(5);
    expect(n.data.timeout).toBe(10);
    expect(n.data.finishOnKey).toBe('#');
    expect(n.data.promptType).toBe('tts');
    expect(n.data.ttsEngine).toBe('polly');
    expect(n.data.prompt).toBeDefined();
  });
});

/* ─── API Call Node (legacy) ─────────────────── */
describe('apiCallNode defaults', () => {
  it('has mode, method, url, headers, body, timeout, callback, responseVariable', () => {
    const n = addAndGet('apiCallNode');
    expect(n.data.label).toBe('API Call');
    expect(n.data.mode).toBe('sync');
    expect(n.data.method).toBe('POST');
    expect(n.data.url).toContain('https://');
    expect(n.data.headers).toBeDefined();
    expect(n.data.body).toBeDefined();
    expect(n.data.timeout).toBe(10);
    expect(n.data.responseVariable).toBe('api_response');
    expect(n.data.successCondition).toBe('2xx');
  });
});

/* ─── Sync API Node ──────────────────────────── */
describe('syncApiNode defaults', () => {
  it('has method, url, headers, body, timeout, successCondition', () => {
    const n = addAndGet('syncApiNode');
    expect(n.data.label).toBe('Sync API');
    expect(n.data.method).toBe('POST');
    expect(n.data.url).toContain('https://');
    expect(n.data.timeout).toBe(10);
    expect(n.data.responseVariable).toBe('api_response');
    expect(n.data.successCondition).toBe('2xx');
  });
});

/* ─── Async API Node ─────────────────────────── */
describe('asyncApiNode defaults', () => {
  it('has method, url, headers, body, callbackUrl', () => {
    const n = addAndGet('asyncApiNode');
    expect(n.data.label).toBe('Async API');
    expect(n.data.method).toBe('POST');
    expect(n.data.url).toContain('https://');
    expect(n.data.callbackUrl).toContain('https://');
  });
});

/* ─── Voicemail Node ─────────────────────────── */
describe('voicemailNode defaults', () => {
  it('has message, silenceInSec, finishOnKey, timeoutInSec', () => {
    const n = addAndGet('voicemailNode');
    expect(n.data.label).toBe('Voicemail');
    expect(n.data.message).toBeDefined();
    expect(n.data.silenceInSec).toBe(5);
    expect(n.data.finishOnKey).toBe('#');
    expect(n.data.timeoutInSec).toBe(30);
  });
});

/* ─── Condition Node ─────────────────────────── */
describe('conditionNode defaults', () => {
  it('has variable and conditions array', () => {
    const n = addAndGet('conditionNode');
    expect(n.data.label).toBe('Condition');
    expect(n.data.variable).toBe('digits');
    expect(Array.isArray(n.data.conditions)).toBe(true);
    expect(n.data.conditions.length).toBeGreaterThanOrEqual(2);
  });
});

/* ─── Unknown node type ──────────────────────── */
describe('unknown node type', () => {
  it('gets a generic label default', () => {
    const n = addAndGet('somethingNew');
    expect(n.data.label).toBe('Node');
  });
});
