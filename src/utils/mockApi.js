/**
 * Mock Exotel CPaaS API layer.
 *
 * Every function mirrors a real Exotel v2 REST call and returns:
 *   { request, response, events, ...extra }
 *
 * ExoML tags, parameter names, event names, and response shapes are
 * aligned with the official Exotel CPaaS API specification (v2.x).
 *
 * Reference: Exotel-CPaaS-APIs.docx in project root.
 */

import { nanoid } from 'nanoid';
import { getMergedAppConfig } from '../store/appConfigStore';

function mockAccountSid() {
  return getMergedAppConfig().mockAccountSid;
}

function mockRecordingFileUrl(recSid) {
  const base = getMergedAppConfig().mockRecordingBaseUrl.replace(/\/?$/, '/');
  return `${base}${recSid}.mp3`;
}

/** Generate a SID matching the Exotel pattern (prefix + 30-char id + 00000). */
function sid(prefix = '') {
  return `${prefix}${nanoid(30)}00000`;
}

function timestamp() {
  return new Date().toISOString();
}

/** Standard Exotel response envelope. */
function makeResponse(method, httpCode, data) {
  return {
    request_id: nanoid(32).replace(/-/g, ''),
    method,
    http_code: httpCode,
    response: {
      error_data: null,
      data,
    },
  };
}

// ---------------------------------------------------------------------------
// POST /v2/accounts/{AccountSID}/legs  –  Create Leg
// ---------------------------------------------------------------------------
export function mockCreateLeg({ contactUri, exophone, eventEndpoint, networkType, timeout, timeLimit }) {
  const cfg = getMergedAppConfig();
  const cu = contactUri || cfg.mockDefaultContactUri;
  const ex = exophone || cfg.mockDefaultExophone;
  const ep = eventEndpoint || cfg.mockDefaultEventEndpoint;
  const legSid = sid('2Q');
  return {
    request: {
      method: 'POST',
      url: '/v2/accounts/{AccountSID}/legs',
      body: {
        contact_uri: cu,
        exophone: ex,
        leg_event_endpoint: ep,
        network_type: networkType || 'pstn',
        timeout: timeout || 30,
        time_limit: timeLimit || 14400,
      },
    },
    response: makeResponse('POST', 202, {
      leg_sid: legSid,
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      contact_uri: cu,
      network_type: networkType || 'pstn',
      exophone: ex,
      custom_param: null,
      leg_event_endpoint: ep,
    }),
    events: [
      { event_name: 'leg_connecting', event_type: 'leg_lifecycle_event', delay: 200 },
      { event_name: 'leg_ringing', event_type: 'leg_lifecycle_event', delay: 1000 },
      { event_name: 'leg_answered', event_type: 'leg_lifecycle_event', delay: 2000 },
    ],
    legSid,
  };
}

// ---------------------------------------------------------------------------
// Answer Action  (Leg)
// ExoML: <Flow><Answer></Answer></Flow>
// ---------------------------------------------------------------------------
export function mockAnswerLeg(legSid) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'answer_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><Answer></Answer></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2A'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'answer_action',
      exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><Answer></Answer></Flow>',
    }),
    events: [
      { event_name: 'leg_answered', event_type: 'leg_lifecycle_event', delay: 300 },
    ],
  };
}

// ---------------------------------------------------------------------------
// StartPlay Action  (Leg)
// ExoML: <Flow><StartPlay loop="N" username="..." password="...">URL</StartPlay></Flow>
// ---------------------------------------------------------------------------
export function mockPlayOnLeg(legSid, audioUrl, loop, username, password) {
  const attrs = [`loop="${loop || 1}"`];
  if (username) attrs.push(`username="${username}"`);
  if (password) attrs.push(`password="${password}"`);

  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><StartPlay ${attrs.join(' ')}>${audioUrl}</StartPlay></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'play_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2P'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'play_action',
    }),
    events: [
      { event_name: 'play_started', event_type: 'leg_action_event', delay: 200 },
      { event_name: 'play_completed', event_type: 'leg_action_event', delay: 3000 },
    ],
  };
}

// ---------------------------------------------------------------------------
// StopPlay Action  (Leg)
// ExoML: <Flow><StopPlay></StopPlay></Flow>
// ---------------------------------------------------------------------------
export function mockStopPlay(legSid) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'stop_play_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><StopPlay></StopPlay></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2SP'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'stop_play_action',
    }),
    events: [
      { event_name: 'play_interrupted', event_type: 'leg_action_event', delay: 100 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Say (StartSay) Action  (Leg)
// ExoML: <Flow><Say loop="N" preferredTTSEngine="polly" language="en" pollyVoiceId="Aditi">msg</Say></Flow>
// ---------------------------------------------------------------------------
export function mockSayOnLeg(legSid, message, engine, voice, language, loop) {
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><Say loop="${loop || 1}" preferredTTSEngine="${engine || 'polly'}" language="${language || 'en'}" pollyVoiceId="${voice || 'Aditi'}">${message}</Say></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'say_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2S'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'say_action',
    }),
    events: [
      { event_name: 'say_started', event_type: 'leg_action_event', delay: 200 },
      { event_name: 'say_completed', event_type: 'leg_action_event', delay: 2500 },
    ],
  };
}

// ---------------------------------------------------------------------------
// StopSay Action  (Leg)
// ExoML: <Flow><StopSay></StopSay></Flow>
// ---------------------------------------------------------------------------
export function mockStopSay(legSid) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'stop_say_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><StopSay></StopSay></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2SS'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'stop_say_action',
    }),
    events: [
      { event_name: 'say_interrupted', event_type: 'leg_action_event', delay: 100 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Gather Action  (Leg)
// ExoML (standalone):  <Flow><Gather numDigits="N" timeoutInSec="T" finishOnKey="K"></Gather></Flow>
// ExoML (with play):   <Flow><Gather numDigits="N" timeoutInSec="T" finishOnKey="K"><StartPlay loop="1">url</StartPlay></Gather></Flow>
// ExoML (with say):    <Flow><Gather numDigits="N" timeoutInSec="T" finishOnKey="K"><Say ...>msg</Say></Gather></Flow>
// ---------------------------------------------------------------------------
export function mockGatherOnLeg(legSid, numDigits, timeout, finishOnKey, simulatedDigit, innerExoml) {
  const innerTag = innerExoml ? innerExoml : '';
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><Gather numDigits="${numDigits || 1}" timeoutInSec="${timeout || 10}" finishOnKey="${finishOnKey || '#'}">${innerTag}</Gather></Flow>`;

  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'gather_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2G'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'gather_action',
    }),
    events: [
      { event_name: 'gather_initiated', event_type: 'leg_action_event', delay: 100 },
      { event_name: 'gather_started', event_type: 'leg_action_event', delay: 500 },
      {
        event_name: 'gather_success',
        event_type: 'leg_action_event',
        delay: 1500,
        event_data: { data: { digits: simulatedDigit || '1' } },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Menu = Play/Say prompt  +  Gather (1 digit)
// Exotel API: Gather with nested StartPlay or Say (single action)
// ---------------------------------------------------------------------------
export function mockMenuAction(legSid, data, simulatedKey) {
  let innerExoml;
  if (data.promptType === 'tts' || data.promptType === 'audio') {
    innerExoml = data.promptType === 'tts'
      ? `<Say loop="1" preferredTTSEngine="${data.ttsEngine || 'polly'}" language="${data.ttsLanguage || 'en'}" pollyVoiceId="${data.ttsVoice || 'Aditi'}">${data.prompt}</Say>`
      : `<StartPlay loop="1">${data.audioUrl}</StartPlay>`;
  }

  const gatherAction = mockGatherOnLeg(legSid, 1, data.timeout, '*', simulatedKey, innerExoml);

  const promptAction = data.promptType === 'tts'
    ? mockSayOnLeg(legSid, data.prompt, data.ttsEngine, data.ttsVoice, data.ttsLanguage, 1)
    : mockPlayOnLeg(legSid, data.audioUrl, 1);

  return {
    steps: [
      { label: 'Play Prompt', ...promptAction },
      { label: 'Gather DTMF (via Gather+Play)', ...gatherAction },
    ],
    gatheredDigit: simulatedKey || '1',
  };
}

// ---------------------------------------------------------------------------
// StartStream Action  (Leg)
// ExoML: <Flow><StartStream streamType="bidirectional" secureDtmf="false" streamUrl="wss://..."></StartStream></Flow>
// Unidirectional variant adds sourceDirection attribute.
// ---------------------------------------------------------------------------
export function mockStartStream(legSid, streamType, streamUrl, secureDtmf, sourceDirection) {
  const attrs = [`streamType="${streamType}"`, `streamUrl="${streamUrl}"`];
  if (streamType === 'bidirectional' && secureDtmf != null) {
    attrs.push(`secureDtmf="${secureDtmf}"`);
  }
  if (streamType === 'unidirectional' && sourceDirection) {
    attrs.push(`sourceDirection="${sourceDirection}"`);
  }

  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><StartStream ${attrs.join(' ')}></StartStream></Flow>`;
  const streamSid = sid('2SS');
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'stream_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2ST'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'stream_action',
    }),
    events: [
      { event_name: 'stream_initiated', event_type: 'leg_action_event', delay: 200, event_data: { data: { stream_sid: streamSid, stream_type: streamType, stream_url: streamUrl, streaming_leg_sid: legSid } } },
      { event_name: 'stream_started', event_type: 'leg_action_event', delay: 800 },
    ],
    streamSid,
  };
}

// ---------------------------------------------------------------------------
// StopStream Action  (Leg)
// ExoML: <Flow><StopStream streamSid="..."></StopStream></Flow>
// ---------------------------------------------------------------------------
export function mockStopStream(legSid, streamSid) {
  const streamAttr = streamSid ? ` streamSid="${streamSid}"` : '';
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><StopStream${streamAttr}></StopStream></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'stop_stream_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2STS'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'stop_stream_action',
    }),
    events: [
      { event_name: 'stream_stopped', event_type: 'leg_action_event', delay: 300 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Dial Action  (Leg)
// ExoML: <Flow><Dial contactUri="..." exophone="..." networkType="pstn" timeout="30" absorbDtmf="true" customParam="..."></Dial></Flow>
// ---------------------------------------------------------------------------
export function mockDialAction(legSid, contactUri, exophone, networkType, timeout, customParam, absorbDtmf) {
  const secondLegSid = sid('2D');
  const bridgeSid = sid('2B');
  const attrs = [
    `contactUri="${contactUri}"`,
    `exophone="${exophone}"`,
    `networkType="${networkType || 'pstn'}"`,
  ];
  if (timeout) attrs.push(`timeout="${timeout}"`);
  if (customParam) attrs.push(`customParam="${customParam}"`);
  if (absorbDtmf != null) attrs.push(`absorbDtmf="${absorbDtmf}"`);

  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><Dial ${attrs.join(' ')}></Dial></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'dial_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2DA'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'dial_action',
    }),
    events: [
      { event_name: 'dial_initiated', event_type: 'leg_action_event', delay: 300, event_data: { data: { bridge_sid: bridgeSid, second_leg_sid: secondLegSid } } },
      { event_name: 'dial_success', event_type: 'leg_action_event', delay: 2000 },
      { event_name: 'dial_completed', event_type: 'leg_action_event', delay: 5000 },
    ],
    secondLegSid,
    bridgeSid,
  };
}

// ---------------------------------------------------------------------------
// StartRecording Action  (Leg)
// ExoML: <Flow><StartRecording direction="both" format="mp3" bitrate="8" channel="mono"
//         storageType="s3"></StartRecording></Flow>
// When storageType=https, adds storageURLKey, storageURLToken, storageURL.
// ---------------------------------------------------------------------------
export function mockStartRecording(legSid, direction, format, bitrate, channel, storageType, storageUrl, storageUrlKey, storageUrlToken) {
  const recSid = sid('2R');
  const attrs = [
    `direction="${direction || 'both'}"`,
    `format="${format || 'mp3'}"`,
    `bitrate="${bitrate || '8'}"`,
    `channel="${channel || 'mono'}"`,
    `storageType="${storageType || 's3'}"`,
  ];
  if (storageType === 'https') {
    if (storageUrlKey) attrs.push(`storageURLKey="${storageUrlKey}"`);
    if (storageUrlToken) attrs.push(`storageURLToken="${storageUrlToken}"`);
    if (storageUrl) attrs.push(`storageURL="${storageUrl}"`);
  }

  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><StartRecording ${attrs.join(' ')}></StartRecording></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'recording_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2RA'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'recording_action',
    }),
    events: [
      { event_name: 'recording_started', event_type: 'leg_action_event', delay: 200, event_data: { data: { recording_sid: recSid } } },
      { event_name: 'recording_available', event_type: 'leg_action_event', delay: 5000, event_data: { data: { status: 'completed', recording_sid: recSid, url: mockRecordingFileUrl(recSid) } } },
    ],
    recordingSid: recSid,
  };
}

// ---------------------------------------------------------------------------
// StopRecording Action  (Leg)
// ExoML: <Flow><StopRecording></StopRecording></Flow>
// ---------------------------------------------------------------------------
export function mockStopRecording(legSid, recordingSid) {
  const recSid = recordingSid || sid('2R');
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'stop_recording_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><StopRecording></StopRecording></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2SRA'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'stop_recording_action',
    }),
    events: [
      { event_name: 'recording_stopped', event_type: 'leg_action_event', delay: 200 },
      { event_name: 'recording_available', event_type: 'leg_action_event', delay: 1000, event_data: { data: { status: 'completed', recording_sid: recSid, url: mockRecordingFileUrl(recSid) } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Voicemail Action  (Leg)
// ExoML: <Flow><StartRecording silenceInSec="5" finishOnKey="#" timeoutInSec="20"><Say>msg</Say></StartRecording></Flow>
// Voicemail is a special StartRecording with inner Say/Play and stop conditions.
// ---------------------------------------------------------------------------
export function mockVoicemail(legSid, message, silenceInSec, finishOnKey, timeoutInSec) {
  const recSid = sid('2VM');
  const inner = message ? `<Say>${message}</Say>` : '';
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><StartRecording silenceInSec="${silenceInSec || 5}" finishOnKey="${finishOnKey || '#'}" timeoutInSec="${timeoutInSec || 20}">${inner}</StartRecording></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'voicemail_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2VMA'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'voicemail_action',
    }),
    events: [
      { event_name: 'recording_started', event_type: 'leg_action_event', delay: 200, event_data: { data: { recording_sid: recSid } } },
      { event_name: 'recording_stopped', event_type: 'leg_action_event', delay: 8000, event_data: { data: { recording_sid: recSid } } },
      { event_name: 'recording_available', event_type: 'leg_action_event', delay: 10000, event_data: { data: { status: 'completed', recording_sid: recSid, url: mockRecordingFileUrl(recSid) } } },
    ],
    recordingSid: recSid,
  };
}

// ---------------------------------------------------------------------------
// Hold Action  (Leg)
// ExoML: <Flow><Hold><StartPlay>url</StartPlay></Hold></Flow>  (custom MOH)
// ExoML: <Flow><Hold></Hold></Flow>  (default MOH)
// ---------------------------------------------------------------------------
export function mockHoldLeg(legSid, mohUrl) {
  const inner = mohUrl ? `<StartPlay>${mohUrl}</StartPlay>` : '';
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><Hold>${inner}</Hold></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'hold_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2HL'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'hold_action',
    }),
    events: [
      { event_name: 'hold_success', event_type: 'leg_action_event', delay: 200 },
    ],
  };
}

// ---------------------------------------------------------------------------
// UnHold Action  (Leg)
// ExoML: <Flow><UnHold></UnHold></Flow>
// ---------------------------------------------------------------------------
export function mockUnHoldLeg(legSid) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'unhold_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><UnHold></UnHold></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2UHL'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'unhold_action',
    }),
    events: [
      { event_name: 'unhold_success', event_type: 'leg_action_event', delay: 200 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Mute Action  (Leg)
// ExoML: <Flow><Mute direction="both"></Mute></Flow>
// ---------------------------------------------------------------------------
export function mockMuteLeg(legSid, direction) {
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><Mute direction="${direction || 'both'}"></Mute></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'mute_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2MU'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'mute_action',
    }),
    events: [
      { event_name: 'mute_success', event_type: 'leg_action_event', delay: 100, event_data: { data: { direction: direction || 'both' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// UnMute Action  (Leg)
// ExoML: <Flow><UnMute direction="both"></UnMute></Flow>
// ---------------------------------------------------------------------------
export function mockUnMuteLeg(legSid, direction) {
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><UnMute direction="${direction || 'both'}"></UnMute></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'unmute_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2UM'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'unmute_action',
    }),
    events: [
      { event_name: 'unmute_success', event_type: 'leg_action_event', delay: 100, event_data: { data: { direction: direction || 'both' } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Hangup Action  (Leg)
// ExoML: <Flow><Hangup></Hangup></Flow>
// ---------------------------------------------------------------------------
export function mockHangupLeg(legSid) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'hangup_action',
        exoml: '<?xml version="1.0" encoding="UTF-8"?><Flow><Hangup></Hangup></Flow>',
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2H'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'hangup_action',
    }),
    events: [
      { event_name: 'leg_terminated', event_type: 'leg_lifecycle_event', delay: 500 },
    ],
  };
}

// ---------------------------------------------------------------------------
// SendDigits Action  (Leg)
// ExoML: <Flow><SendDigits duration="100" between="100">123456#</SendDigits></Flow>
// ---------------------------------------------------------------------------
export function mockSendDigits(legSid, digits, duration, between) {
  const exoml = `<?xml version="1.0" encoding="UTF-8"?><Flow><SendDigits duration="${duration || 100}" between="${between || 100}">${digits}</SendDigits></Flow>`;
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: { action_custom_param: 'send_digits_action', exoml },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2SD'),
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sid: legSid,
      action_custom_param: 'send_digits_action',
    }),
    events: [
      { event_name: 'digits_sent', event_type: 'leg_action_event', delay: 300, event_data: { data: { digits } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// POST /v2/accounts/{AccountSID}/bridges  –  Create Bridge
// ---------------------------------------------------------------------------
export function mockCreateBridge(legSids, bridgeEventEndpoint, absorbDtmf) {
  const bridgeSid = sid('2B');
  const ep = bridgeEventEndpoint || getMergedAppConfig().mockDefaultEventEndpoint;
  return {
    request: {
      method: 'POST',
      url: '/v2/accounts/{AccountSID}/bridges',
      body: {
        leg_sids: legSids,
        bridge_event_endpoint: ep,
        absorb_dtmf: absorbDtmf || false,
      },
    },
    response: makeResponse('POST', 202, {
      bridge_sid: bridgeSid,
      created_at: timestamp(),
      account_sid: mockAccountSid(),
      leg_sids: legSids,
      bridge_event_endpoint: ep,
    }),
    events: [
      { event_name: 'bridge_created', event_type: 'bridge_lifecycle_event', delay: 200 },
      ...legSids.map((ls, i) => ({
        event_name: 'leg_joined_bridge',
        event_type: 'leg_lifecycle_event',
        delay: 300 + i * 100,
        event_data: { data: { bridge_sid: bridgeSid } },
      })),
    ],
    bridgeSid,
  };
}

// ---------------------------------------------------------------------------
// Message Node  –  Maps to the Say action (simple text, default TTS settings)
// ExoML: <Flow><Say loop="1" preferredTTSEngine="polly" language="en" pollyVoiceId="Aditi">msg</Say></Flow>
// ---------------------------------------------------------------------------
export function mockMessageOnLeg(legSid, message) {
  return mockSayOnLeg(legSid, message, 'polly', 'Aditi', 'en', 1);
}

// ---------------------------------------------------------------------------
// Node → API call mapper
// Generates the appropriate mock Exotel API call(s) for a given IVR node.
// ---------------------------------------------------------------------------
export function generateApiCallsForNode(node, legSid) {
  const d = node.data;
  switch (node.type) {
    case 'startNode':
      return mockCreateLeg({ contactUri: d.contactUri, exophone: d.exophone, eventEndpoint: d.eventEndpoint });
    case 'menuNode':
      return mockMenuAction(legSid, d);
    case 'playNode':
      return mockPlayOnLeg(legSid, d.audioUrl, d.loop, d.username, d.password);
    case 'sayNode':
      return mockSayOnLeg(legSid, d.message, d.ttsEngine, d.ttsVoice, d.ttsLanguage, d.loop);
    case 'messageNode':
      return mockMessageOnLeg(legSid, d.message);
    case 'voicebotNode':
      return mockStartStream(legSid, d.streamType, d.streamUrl, d.secureDtmf, d.sourceDirection);
    case 'transferNode':
      return mockDialAction(legSid, d.contactUri, d.exophone, d.networkType, d.timeout, d.customParam, d.absorbDtmf);
    case 'recordNode':
      return mockStartRecording(legSid, d.direction, d.format, d.bitrate, d.channel, d.storageType, d.storageUrl, d.storageUrlKey, d.storageUrlToken);
    case 'startRecordNode':
      return mockStartRecording(legSid, d.direction, d.format, d.bitrate, d.channel, d.storageType, d.storageUrl, d.storageUrlKey, d.storageUrlToken);
    case 'stopRecordNode':
      return mockStopRecording(legSid);
    case 'hangupNode':
      return mockHangupLeg(legSid);
    case 'gatherNode': {
      let innerExoml;
      if (d.promptType === 'tts' && (d.prompt || '').trim()) {
        innerExoml = `<Say loop="1" preferredTTSEngine="${d.ttsEngine || 'polly'}" language="${d.ttsLanguage || 'en'}" pollyVoiceId="${d.ttsVoice || 'Aditi'}">${d.prompt}</Say>`;
      } else if (d.promptType === 'audio' && (d.audioUrl || '').trim()) {
        innerExoml = `<StartPlay loop="1">${d.audioUrl}</StartPlay>`;
      }
      return mockGatherOnLeg(legSid, d.numDigits, d.timeout, d.finishOnKey, undefined, innerExoml);
    }
    case 'voicemailNode':
      return mockVoicemail(legSid, d.message, d.silenceInSec, d.finishOnKey, d.timeoutInSec);
    case 'syncApiNode':
    case 'asyncApiNode':
    case 'apiCallNode':
      return null;
    default:
      return null;
  }
}
