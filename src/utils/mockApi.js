import { nanoid } from 'nanoid';

function sid(prefix = '') {
  return `${prefix}${nanoid(30)}00000`;
}

function timestamp() {
  return new Date().toISOString();
}

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

export function mockCreateLeg({ contactUri, exophone, eventEndpoint, networkType, timeout, timeLimit }) {
  const legSid = sid('2Q');
  return {
    request: {
      method: 'POST',
      url: '/v2/accounts/{AccountSID}/legs',
      body: {
        contact_uri: contactUri || '09163816621',
        exophone: exophone || '08030752400',
        leg_event_endpoint: eventEndpoint || 'grpc://127.0.0.1:9001',
        network_type: networkType || 'pstn',
        timeout: timeout || 30,
        time_limit: timeLimit || 14400,
      },
    },
    response: makeResponse('POST', 202, {
      leg_sid: legSid,
      created_at: timestamp(),
      account_sid: 'demo_account',
      contact_uri: contactUri || '09163816621',
      network_type: networkType || 'pstn',
      exophone: exophone || '08030752400',
      custom_param: null,
      leg_event_endpoint: eventEndpoint || 'grpc://127.0.0.1:9001',
    }),
    events: [
      { event_name: 'leg_connecting', event_type: 'leg_lifecycle_event', delay: 200 },
      { event_name: 'leg_ringing', event_type: 'leg_lifecycle_event', delay: 1000 },
      { event_name: 'leg_answered', event_type: 'leg_lifecycle_event', delay: 2000 },
    ],
    legSid,
  };
}

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
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'answer_action',
      exoml: '<Flow><Answer/></Flow>',
    }),
    events: [
      { event_name: 'leg_answered', event_type: 'leg_lifecycle_event', delay: 300 },
    ],
  };
}

export function mockPlayOnLeg(legSid, audioUrl, loop) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'play_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><StartPlay loop="${loop || 1}">${audioUrl}</StartPlay></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2P'),
      created_at: timestamp(),
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'play_action',
    }),
    events: [
      { event_name: 'play_started', event_type: 'leg_action_event', delay: 200 },
      { event_name: 'play_completed', event_type: 'leg_action_event', delay: 3000 },
    ],
  };
}

export function mockSayOnLeg(legSid, message, engine, voice, language, loop) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'say_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><Say loop="${loop || 1}" preferredTTSEngine="${engine || 'polly'}" language="${language || 'en'}" pollyVoiceId="${voice || 'Aditi'}">${message}</Say></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2S'),
      created_at: timestamp(),
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'say_action',
    }),
    events: [
      { event_name: 'say_started', event_type: 'leg_action_event', delay: 200 },
      { event_name: 'say_completed', event_type: 'leg_action_event', delay: 2500 },
    ],
  };
}

export function mockGatherOnLeg(legSid, numDigits, timeout, finishOnKey, simulatedDigit) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'gather_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><Gather numDigits="${numDigits || 1}" timeoutInSec="${timeout || 10}" finishOnKey="${finishOnKey || '#'}"></Gather></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2G'),
      created_at: timestamp(),
      account_sid: 'demo_account',
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

export function mockMenuAction(legSid, data, simulatedKey) {
  const promptAction = data.promptType === 'tts'
    ? mockSayOnLeg(legSid, data.prompt, data.ttsEngine, data.ttsVoice, data.ttsLanguage, 1)
    : mockPlayOnLeg(legSid, data.audioUrl, 1);

  const gatherAction = mockGatherOnLeg(legSid, 1, data.timeout, '*', simulatedKey);

  return {
    steps: [
      { label: 'Play Prompt', ...promptAction },
      { label: 'Gather DTMF', ...gatherAction },
    ],
    gatheredDigit: simulatedKey || '1',
  };
}

export function mockStartStream(legSid, streamType, streamUrl) {
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'stream_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><StartStream streamType="${streamType}" streamUrl="${streamUrl}"></StartStream></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2ST'),
      created_at: timestamp(),
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'stream_action',
    }),
    events: [
      { event_name: 'stream_initiated', event_type: 'leg_action_event', delay: 200, event_data: { data: { stream_sid: sid('2SS'), stream_type: streamType, stream_url: streamUrl } } },
      { event_name: 'stream_started', event_type: 'leg_action_event', delay: 800 },
    ],
  };
}

export function mockDialAction(legSid, contactUri, exophone, networkType, timeout) {
  const secondLegSid = sid('2D');
  const bridgeSid = sid('2B');
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'dial_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><Dial contactUri="${contactUri}" exophone="${exophone}" networkType="${networkType || 'pstn'}"></Dial></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2DA'),
      created_at: timestamp(),
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'dial_action',
    }),
    events: [
      { event_name: 'dial_initiated', event_type: 'leg_action_event', delay: 300, event_data: { data: { bridge_sid: bridgeSid, second_leg_sid: secondLegSid } } },
      { event_name: 'dial_success', event_type: 'leg_action_event', delay: 2000 },
    ],
    secondLegSid,
    bridgeSid,
  };
}

export function mockStartRecording(legSid, direction, format) {
  const recSid = sid('2R');
  return {
    request: {
      method: 'POST',
      url: `/v2/accounts/{AccountSID}/legs/${legSid}/actions`,
      body: {
        action_custom_param: 'recording_action',
        exoml: `<?xml version="1.0" encoding="UTF-8"?><Flow><StartRecording direction="${direction || 'both'}" format="${format || 'mp3'}" storageType="s3"></StartRecording></Flow>`,
      },
    },
    response: makeResponse('POST', 202, {
      action_sid: sid('2RA'),
      created_at: timestamp(),
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'recording_action',
    }),
    events: [
      { event_name: 'recording_started', event_type: 'leg_action_event', delay: 200, event_data: { data: { recording_sid: recSid } } },
    ],
    recordingSid: recSid,
  };
}

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
      account_sid: 'demo_account',
      leg_sid: legSid,
      action_custom_param: 'hangup_action',
    }),
    events: [
      { event_name: 'leg_terminated', event_type: 'leg_lifecycle_event', delay: 500 },
    ],
  };
}

export function generateApiCallsForNode(node, legSid) {
  const d = node.data;
  switch (node.type) {
    case 'startNode':
      return mockCreateLeg({ contactUri: d.exophone, exophone: d.exophone, eventEndpoint: d.eventEndpoint });
    case 'menuNode':
      return mockMenuAction(legSid, d);
    case 'playNode':
      return mockPlayOnLeg(legSid, d.audioUrl, d.loop);
    case 'sayNode':
      return mockSayOnLeg(legSid, d.message, d.ttsEngine, d.ttsVoice, d.ttsLanguage, d.loop);
    case 'voicebotNode':
      return mockStartStream(legSid, d.streamType, d.streamUrl);
    case 'transferNode':
      return mockDialAction(legSid, d.contactUri, d.exophone, d.networkType, d.timeout);
    case 'recordNode':
      return mockStartRecording(legSid, d.direction, d.format);
    case 'hangupNode':
      return mockHangupLeg(legSid);
    default:
      return null;
  }
}
