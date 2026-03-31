/**
 * mockApi.test.js
 *
 * One test section per IVR box/node type, verifying the mock Exotel CPaaS
 * API layer produces correct ExoML, events, endpoints, and parameters.
 */
import { describe, it, expect } from 'vitest';
import {
  mockCreateLeg,
  mockAnswerLeg,
  mockPlayOnLeg,
  mockStopPlay,
  mockSayOnLeg,
  mockStopSay,
  mockGatherOnLeg,
  mockMenuAction,
  mockStartStream,
  mockStopStream,
  mockDialAction,
  mockStartRecording,
  mockStopRecording,
  mockVoicemail,
  mockHoldLeg,
  mockUnHoldLeg,
  mockMuteLeg,
  mockUnMuteLeg,
  mockHangupLeg,
  mockSendDigits,
  mockCreateBridge,
  mockMessageOnLeg,
  generateApiCallsForNode,
} from '../utils/mockApi';

/* ──────────────────────────────────────────────── */
/*  1. Start Node → Create Leg                      */
/* ──────────────────────────────────────────────── */
describe('Start Node (mockCreateLeg)', () => {
  it('generates POST /legs endpoint', () => {
    const r = mockCreateLeg({ contactUri: '09111111111', exophone: '08000000000', eventEndpoint: 'grpc://test:9001' });
    expect(r.request.method).toBe('POST');
    expect(r.request.url).toBe('/v2/accounts/{AccountSID}/legs');
  });

  it('includes all required body parameters', () => {
    const r = mockCreateLeg({ contactUri: '09111111111', exophone: '08000000000' });
    expect(r.request.body.contact_uri).toBe('09111111111');
    expect(r.request.body.exophone).toBe('08000000000');
    expect(r.request.body.leg_event_endpoint).toBeDefined();
    expect(r.request.body.network_type).toBe('pstn');
    expect(r.request.body.timeout).toBeDefined();
    expect(r.request.body.time_limit).toBeDefined();
  });

  it('returns 202 response with leg_sid', () => {
    const r = mockCreateLeg({});
    expect(r.response.http_code).toBe(202);
    expect(r.response.response.data.leg_sid).toBeDefined();
    expect(r.legSid).toBeTruthy();
  });

  it('generates lifecycle events: connecting → ringing → answered', () => {
    const r = mockCreateLeg({});
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['leg_connecting', 'leg_ringing', 'leg_answered']);
    r.events.forEach((e) => expect(e.event_type).toBe('leg_lifecycle_event'));
  });
});

/* ──────────────────────────────────────────────── */
/*  2. Answer Action (for inbound calls)            */
/* ──────────────────────────────────────────────── */
describe('Answer Action (mockAnswerLeg)', () => {
  it('generates ExoML with <Answer> tag', () => {
    const r = mockAnswerLeg('leg123');
    expect(r.request.body.exoml).toContain('<Answer>');
    expect(r.request.body.exoml).toContain('</Answer>');
  });

  it('returns leg_answered event', () => {
    const r = mockAnswerLeg('leg123');
    expect(r.events[0].event_name).toBe('leg_answered');
  });
});

/* ──────────────────────────────────────────────── */
/*  3. Play Audio Node → StartPlay Action           */
/* ──────────────────────────────────────────────── */
describe('Play Audio Node (mockPlayOnLeg)', () => {
  it('generates ExoML with <StartPlay> and audio URL', () => {
    const r = mockPlayOnLeg('leg1', 'https://example.com/audio.wav', 2);
    expect(r.request.body.exoml).toContain('<StartPlay');
    expect(r.request.body.exoml).toContain('loop="2"');
    expect(r.request.body.exoml).toContain('https://example.com/audio.wav');
  });

  it('includes username/password when provided', () => {
    const r = mockPlayOnLeg('leg1', 'https://example.com/audio.wav', 1, 'user1', 'pass1');
    expect(r.request.body.exoml).toContain('username="user1"');
    expect(r.request.body.exoml).toContain('password="pass1"');
  });

  it('omits username/password when not provided', () => {
    const r = mockPlayOnLeg('leg1', 'https://example.com/audio.wav', 1);
    expect(r.request.body.exoml).not.toContain('username=');
    expect(r.request.body.exoml).not.toContain('password=');
  });

  it('generates play_started → play_completed events', () => {
    const r = mockPlayOnLeg('leg1', 'https://example.com/audio.wav', 1);
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['play_started', 'play_completed']);
    r.events.forEach((e) => expect(e.event_type).toBe('leg_action_event'));
  });
});

/* ──────────────────────────────────────────────── */
/*  4. StopPlay Action                              */
/* ──────────────────────────────────────────────── */
describe('StopPlay Action (mockStopPlay)', () => {
  it('generates ExoML with <StopPlay> tag', () => {
    const r = mockStopPlay('leg1');
    expect(r.request.body.exoml).toContain('<StopPlay>');
  });

  it('generates play_interrupted event', () => {
    const r = mockStopPlay('leg1');
    expect(r.events[0].event_name).toBe('play_interrupted');
  });
});

/* ──────────────────────────────────────────────── */
/*  5. Say (TTS) Node → StartSay Action             */
/* ──────────────────────────────────────────────── */
describe('Say Node (mockSayOnLeg)', () => {
  it('generates ExoML with <Say> and TTS attributes', () => {
    const r = mockSayOnLeg('leg1', 'Hello world', 'googletts', 'en-IN-Wavenet-A', 'hi', 2);
    expect(r.request.body.exoml).toContain('<Say');
    expect(r.request.body.exoml).toContain('preferredTTSEngine="googletts"');
    expect(r.request.body.exoml).toContain('language="hi"');
    expect(r.request.body.exoml).toContain('pollyVoiceId="en-IN-Wavenet-A"');
    expect(r.request.body.exoml).toContain('loop="2"');
    expect(r.request.body.exoml).toContain('Hello world');
  });

  it('defaults to polly/Aditi/en when not specified', () => {
    const r = mockSayOnLeg('leg1', 'Test');
    expect(r.request.body.exoml).toContain('preferredTTSEngine="polly"');
    expect(r.request.body.exoml).toContain('pollyVoiceId="Aditi"');
    expect(r.request.body.exoml).toContain('language="en"');
  });

  it('generates say_started → say_completed events', () => {
    const r = mockSayOnLeg('leg1', 'Hi');
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['say_started', 'say_completed']);
  });
});

/* ──────────────────────────────────────────────── */
/*  6. StopSay Action                               */
/* ──────────────────────────────────────────────── */
describe('StopSay Action (mockStopSay)', () => {
  it('generates ExoML with <StopSay> tag', () => {
    const r = mockStopSay('leg1');
    expect(r.request.body.exoml).toContain('<StopSay>');
  });

  it('generates say_interrupted event', () => {
    const r = mockStopSay('leg1');
    expect(r.events[0].event_name).toBe('say_interrupted');
  });
});

/* ──────────────────────────────────────────────── */
/*  7. Message Node → Say (simple)                  */
/* ──────────────────────────────────────────────── */
describe('Message Node (mockMessageOnLeg)', () => {
  it('delegates to mockSayOnLeg with default TTS settings', () => {
    const r = mockMessageOnLeg('leg1', 'Welcome!');
    expect(r.request.body.exoml).toContain('<Say');
    expect(r.request.body.exoml).toContain('Welcome!');
    expect(r.request.body.exoml).toContain('preferredTTSEngine="polly"');
  });

  it('generates say_started → say_completed events', () => {
    const r = mockMessageOnLeg('leg1', 'Test message');
    expect(r.events.map((e) => e.event_name)).toEqual(['say_started', 'say_completed']);
  });
});

/* ──────────────────────────────────────────────── */
/*  8. Gather Digits Node → Gather Action           */
/* ──────────────────────────────────────────────── */
describe('Gather Digits Node (mockGatherOnLeg)', () => {
  it('generates ExoML with <Gather> and parameters', () => {
    const r = mockGatherOnLeg('leg1', 5, 30, '#', '12345');
    expect(r.request.body.exoml).toContain('<Gather');
    expect(r.request.body.exoml).toContain('numDigits="5"');
    expect(r.request.body.exoml).toContain('timeoutInSec="30"');
    expect(r.request.body.exoml).toContain('finishOnKey="#"');
  });

  it('supports nested inner ExoML (Gather with Play)', () => {
    const inner = '<StartPlay loop="1">https://example.com/prompt.wav</StartPlay>';
    const r = mockGatherOnLeg('leg1', 1, 10, '*', '1', inner);
    expect(r.request.body.exoml).toContain('<Gather');
    expect(r.request.body.exoml).toContain('<StartPlay loop="1">');
    expect(r.request.body.exoml).toContain('</StartPlay>');
    expect(r.request.body.exoml).toContain('</Gather>');
  });

  it('generates gather lifecycle events', () => {
    const r = mockGatherOnLeg('leg1', 1, 10, '#', '5');
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['gather_initiated', 'gather_started', 'gather_success']);
  });

  it('gather_success event contains the pressed digits', () => {
    const r = mockGatherOnLeg('leg1', 4, 10, '#', '1234');
    const success = r.events.find((e) => e.event_name === 'gather_success');
    expect(success.event_data.data.digits).toBe('1234');
  });
});

/* ──────────────────────────────────────────────── */
/*  9. IVR Menu Node → Gather + Play/Say            */
/* ──────────────────────────────────────────────── */
describe('IVR Menu Node (mockMenuAction)', () => {
  it('generates prompt + gather steps for TTS mode', () => {
    const data = {
      prompt: 'Press 1 for Sales',
      promptType: 'tts',
      ttsEngine: 'polly',
      ttsVoice: 'Aditi',
      ttsLanguage: 'en',
      timeout: 5,
    };
    const r = mockMenuAction('leg1', data, '1');
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0].label).toBe('Play Prompt');
    expect(r.steps[1].label).toContain('Gather');
    expect(r.gatheredDigit).toBe('1');
  });

  it('generates prompt + gather steps for audio mode', () => {
    const data = {
      promptType: 'audio',
      audioUrl: 'https://example.com/menu.wav',
      timeout: 10,
    };
    const r = mockMenuAction('leg1', data, '2');
    expect(r.steps).toHaveLength(2);
    expect(r.gatheredDigit).toBe('2');
  });

  it('Gather step has nested ExoML (Gather with Play)', () => {
    const data = {
      prompt: 'Press 1',
      promptType: 'tts',
      ttsEngine: 'polly',
      ttsVoice: 'Aditi',
      ttsLanguage: 'en',
      timeout: 5,
    };
    const r = mockMenuAction('leg1', data, '1');
    const gatherStep = r.steps[1];
    expect(gatherStep.request.body.exoml).toContain('<Gather');
    expect(gatherStep.request.body.exoml).toContain('<Say');
  });
});

/* ──────────────────────────────────────────────── */
/*  10. Voicebot Node → StartStream Action          */
/* ──────────────────────────────────────────────── */
describe('Voicebot Node (mockStartStream)', () => {
  it('generates ExoML for bidirectional stream', () => {
    const r = mockStartStream('leg1', 'bidirectional', 'wss://bot.example.com', false);
    expect(r.request.body.exoml).toContain('<StartStream');
    expect(r.request.body.exoml).toContain('streamType="bidirectional"');
    expect(r.request.body.exoml).toContain('streamUrl="wss://bot.example.com"');
    expect(r.request.body.exoml).toContain('secureDtmf="false"');
  });

  it('generates ExoML for unidirectional stream with sourceDirection', () => {
    const r = mockStartStream('leg1', 'unidirectional', 'wss://transcribe.example.com', null, 'in');
    expect(r.request.body.exoml).toContain('streamType="unidirectional"');
    expect(r.request.body.exoml).toContain('sourceDirection="in"');
    expect(r.request.body.exoml).not.toContain('secureDtmf');
  });

  it('generates stream lifecycle events', () => {
    const r = mockStartStream('leg1', 'bidirectional', 'wss://bot.example.com');
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['stream_initiated', 'stream_started']);
  });

  it('stream_initiated event contains stream_sid and metadata', () => {
    const r = mockStartStream('leg1', 'bidirectional', 'wss://test.com');
    const initiated = r.events.find((e) => e.event_name === 'stream_initiated');
    expect(initiated.event_data.data.stream_sid).toBeDefined();
    expect(initiated.event_data.data.stream_type).toBe('bidirectional');
    expect(initiated.event_data.data.stream_url).toBe('wss://test.com');
  });
});

/* ──────────────────────────────────────────────── */
/*  11. StopStream Action                           */
/* ──────────────────────────────────────────────── */
describe('StopStream Action (mockStopStream)', () => {
  it('generates ExoML with <StopStream>', () => {
    const r = mockStopStream('leg1', 'stream123');
    expect(r.request.body.exoml).toContain('<StopStream');
    expect(r.request.body.exoml).toContain('streamSid="stream123"');
  });

  it('generates stream_stopped event', () => {
    const r = mockStopStream('leg1');
    expect(r.events[0].event_name).toBe('stream_stopped');
  });
});

/* ──────────────────────────────────────────────── */
/*  12. Transfer Node → Dial Action                 */
/* ──────────────────────────────────────────────── */
describe('Transfer Node (mockDialAction)', () => {
  it('generates ExoML with <Dial> and all parameters', () => {
    const r = mockDialAction('leg1', '09123456789', '08030752400', 'pstn', 30, 'my_param', true);
    expect(r.request.body.exoml).toContain('<Dial');
    expect(r.request.body.exoml).toContain('contactUri="09123456789"');
    expect(r.request.body.exoml).toContain('exophone="08030752400"');
    expect(r.request.body.exoml).toContain('networkType="pstn"');
    expect(r.request.body.exoml).toContain('timeout="30"');
    expect(r.request.body.exoml).toContain('customParam="my_param"');
    expect(r.request.body.exoml).toContain('absorbDtmf="true"');
  });

  it('generates dial lifecycle events including dial_completed', () => {
    const r = mockDialAction('leg1', '09123456789', '08030752400');
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['dial_initiated', 'dial_success', 'dial_completed']);
  });

  it('dial_initiated contains bridge_sid and second_leg_sid', () => {
    const r = mockDialAction('leg1', '09123456789', '08030752400');
    const initiated = r.events.find((e) => e.event_name === 'dial_initiated');
    expect(initiated.event_data.data.bridge_sid).toBeDefined();
    expect(initiated.event_data.data.second_leg_sid).toBeDefined();
    expect(r.secondLegSid).toBeTruthy();
    expect(r.bridgeSid).toBeTruthy();
  });
});

/* ──────────────────────────────────────────────── */
/*  13. Start Recording Node → StartRecording       */
/* ──────────────────────────────────────────────── */
describe('Start Recording Node (mockStartRecording)', () => {
  it('generates ExoML with all recording parameters', () => {
    const r = mockStartRecording('leg1', 'both', 'wav', '32', 'stereo', 's3');
    expect(r.request.body.exoml).toContain('<StartRecording');
    expect(r.request.body.exoml).toContain('direction="both"');
    expect(r.request.body.exoml).toContain('format="wav"');
    expect(r.request.body.exoml).toContain('bitrate="32"');
    expect(r.request.body.exoml).toContain('channel="stereo"');
    expect(r.request.body.exoml).toContain('storageType="s3"');
  });

  it('includes HTTPS storage parameters when storageType=https', () => {
    const r = mockStartRecording('leg1', 'both', 'mp3', '8', 'mono', 'https', 'https://upload.example.com', 'mykey', 'mytoken');
    expect(r.request.body.exoml).toContain('storageType="https"');
    expect(r.request.body.exoml).toContain('storageURLKey="mykey"');
    expect(r.request.body.exoml).toContain('storageURLToken="mytoken"');
    expect(r.request.body.exoml).toContain('storageURL="https://upload.example.com"');
  });

  it('generates recording_started and recording_available events', () => {
    const r = mockStartRecording('leg1');
    const names = r.events.map((e) => e.event_name);
    expect(names).toContain('recording_started');
    expect(names).toContain('recording_available');
  });

  it('recording_started event contains recording_sid', () => {
    const r = mockStartRecording('leg1');
    const started = r.events.find((e) => e.event_name === 'recording_started');
    expect(started.event_data.data.recording_sid).toBeDefined();
    expect(r.recordingSid).toBeTruthy();
  });
});

/* ──────────────────────────────────────────────── */
/*  14. Stop Recording Node → StopRecording         */
/* ──────────────────────────────────────────────── */
describe('Stop Recording Node (mockStopRecording)', () => {
  it('generates ExoML with <StopRecording>', () => {
    const r = mockStopRecording('leg1');
    expect(r.request.body.exoml).toContain('<StopRecording>');
  });

  it('generates recording_stopped → recording_available events', () => {
    const r = mockStopRecording('leg1', 'rec123');
    const names = r.events.map((e) => e.event_name);
    expect(names).toEqual(['recording_stopped', 'recording_available']);
  });

  it('recording_available event contains URL', () => {
    const r = mockStopRecording('leg1', 'rec123');
    const available = r.events.find((e) => e.event_name === 'recording_available');
    expect(available.event_data.data.url).toContain('rec123');
    expect(available.event_data.data.status).toBe('completed');
  });
});

/* ──────────────────────────────────────────────── */
/*  15. Voicemail Node                              */
/* ──────────────────────────────────────────────── */
describe('Voicemail Node (mockVoicemail)', () => {
  it('generates ExoML with StartRecording + nested Say', () => {
    const r = mockVoicemail('leg1', 'Leave a message', 5, '#', 30);
    expect(r.request.body.exoml).toContain('<StartRecording');
    expect(r.request.body.exoml).toContain('silenceInSec="5"');
    expect(r.request.body.exoml).toContain('finishOnKey="#"');
    expect(r.request.body.exoml).toContain('timeoutInSec="30"');
    expect(r.request.body.exoml).toContain('<Say>Leave a message</Say>');
  });

  it('generates recording lifecycle events', () => {
    const r = mockVoicemail('leg1', 'Hi');
    const names = r.events.map((e) => e.event_name);
    expect(names).toContain('recording_started');
    expect(names).toContain('recording_stopped');
    expect(names).toContain('recording_available');
  });
});

/* ──────────────────────────────────────────────── */
/*  16. Hang Up Node → Hangup Action                */
/* ──────────────────────────────────────────────── */
describe('Hang Up Node (mockHangupLeg)', () => {
  it('generates ExoML with <Hangup>', () => {
    const r = mockHangupLeg('leg1');
    expect(r.request.body.exoml).toContain('<Hangup>');
    expect(r.request.body.exoml).toContain('</Hangup>');
  });

  it('generates leg_terminated event', () => {
    const r = mockHangupLeg('leg1');
    expect(r.events[0].event_name).toBe('leg_terminated');
    expect(r.events[0].event_type).toBe('leg_lifecycle_event');
  });
});

/* ──────────────────────────────────────────────── */
/*  17. Hold Action                                 */
/* ──────────────────────────────────────────────── */
describe('Hold Action (mockHoldLeg)', () => {
  it('generates ExoML with <Hold> (default MOH)', () => {
    const r = mockHoldLeg('leg1');
    expect(r.request.body.exoml).toContain('<Hold>');
    expect(r.request.body.exoml).toContain('</Hold>');
    expect(r.request.body.exoml).not.toContain('<StartPlay>');
  });

  it('generates ExoML with custom MOH URL', () => {
    const r = mockHoldLeg('leg1', 'https://example.com/moh.wav');
    expect(r.request.body.exoml).toContain('<Hold>');
    expect(r.request.body.exoml).toContain('<StartPlay>https://example.com/moh.wav</StartPlay>');
  });

  it('generates hold_success event', () => {
    const r = mockHoldLeg('leg1');
    expect(r.events[0].event_name).toBe('hold_success');
  });
});

/* ──────────────────────────────────────────────── */
/*  18. UnHold Action                               */
/* ──────────────────────────────────────────────── */
describe('UnHold Action (mockUnHoldLeg)', () => {
  it('generates ExoML with <UnHold>', () => {
    const r = mockUnHoldLeg('leg1');
    expect(r.request.body.exoml).toContain('<UnHold>');
  });

  it('generates unhold_success event', () => {
    const r = mockUnHoldLeg('leg1');
    expect(r.events[0].event_name).toBe('unhold_success');
  });
});

/* ──────────────────────────────────────────────── */
/*  19. Mute Action                                 */
/* ──────────────────────────────────────────────── */
describe('Mute Action (mockMuteLeg)', () => {
  it('generates ExoML with <Mute> and direction', () => {
    const r = mockMuteLeg('leg1', 'out');
    expect(r.request.body.exoml).toContain('<Mute');
    expect(r.request.body.exoml).toContain('direction="out"');
  });

  it('defaults direction to "both"', () => {
    const r = mockMuteLeg('leg1');
    expect(r.request.body.exoml).toContain('direction="both"');
  });

  it('generates mute_success event with direction', () => {
    const r = mockMuteLeg('leg1', 'in');
    expect(r.events[0].event_name).toBe('mute_success');
    expect(r.events[0].event_data.data.direction).toBe('in');
  });
});

/* ──────────────────────────────────────────────── */
/*  20. UnMute Action                               */
/* ──────────────────────────────────────────────── */
describe('UnMute Action (mockUnMuteLeg)', () => {
  it('generates ExoML with <UnMute>', () => {
    const r = mockUnMuteLeg('leg1', 'both');
    expect(r.request.body.exoml).toContain('<UnMute');
    expect(r.request.body.exoml).toContain('direction="both"');
  });

  it('generates unmute_success event', () => {
    const r = mockUnMuteLeg('leg1');
    expect(r.events[0].event_name).toBe('unmute_success');
  });
});

/* ──────────────────────────────────────────────── */
/*  21. SendDigits Action                           */
/* ──────────────────────────────────────────────── */
describe('SendDigits Action (mockSendDigits)', () => {
  it('generates ExoML with <SendDigits> and timing params', () => {
    const r = mockSendDigits('leg1', '123#', 200, 300);
    expect(r.request.body.exoml).toContain('<SendDigits');
    expect(r.request.body.exoml).toContain('duration="200"');
    expect(r.request.body.exoml).toContain('between="300"');
    expect(r.request.body.exoml).toContain('>123#<');
  });

  it('generates digits_sent event with the digits', () => {
    const r = mockSendDigits('leg1', '456');
    expect(r.events[0].event_name).toBe('digits_sent');
    expect(r.events[0].event_data.data.digits).toBe('456');
  });
});

/* ──────────────────────────────────────────────── */
/*  22. Create Bridge                               */
/* ──────────────────────────────────────────────── */
describe('Create Bridge (mockCreateBridge)', () => {
  it('generates POST /bridges endpoint', () => {
    const r = mockCreateBridge(['leg1', 'leg2'], 'grpc://test:9001', true);
    expect(r.request.method).toBe('POST');
    expect(r.request.url).toBe('/v2/accounts/{AccountSID}/bridges');
    expect(r.request.body.leg_sids).toEqual(['leg1', 'leg2']);
    expect(r.request.body.absorb_dtmf).toBe(true);
  });

  it('generates bridge_created and leg_joined_bridge events', () => {
    const r = mockCreateBridge(['leg1', 'leg2']);
    const names = r.events.map((e) => e.event_name);
    expect(names).toContain('bridge_created');
    expect(names.filter((n) => n === 'leg_joined_bridge')).toHaveLength(2);
  });
});

/* ──────────────────────────────────────────────── */
/*  23. generateApiCallsForNode — routing           */
/* ──────────────────────────────────────────────── */
describe('generateApiCallsForNode', () => {
  const mkNode = (type, data = {}) => ({ id: 'n1', type, data });

  it('routes startNode to mockCreateLeg', () => {
    const r = generateApiCallsForNode(mkNode('startNode', { contactUri: '09111', exophone: '08000', eventEndpoint: 'grpc://x:1' }), null);
    expect(r.request.url).toContain('/legs');
    expect(r.legSid).toBeDefined();
  });

  it('routes menuNode to mockMenuAction', () => {
    const r = generateApiCallsForNode(mkNode('menuNode', { prompt: 'Hi', promptType: 'tts', ttsEngine: 'polly', ttsVoice: 'Aditi', ttsLanguage: 'en', timeout: 5 }), 'leg1');
    expect(r.steps).toBeDefined();
    expect(r.gatheredDigit).toBeDefined();
  });

  it('routes playNode to mockPlayOnLeg', () => {
    const r = generateApiCallsForNode(mkNode('playNode', { audioUrl: 'https://x.wav', loop: 1 }), 'leg1');
    expect(r.request.body.exoml).toContain('<StartPlay');
  });

  it('routes sayNode to mockSayOnLeg', () => {
    const r = generateApiCallsForNode(mkNode('sayNode', { message: 'Hi', ttsEngine: 'polly', ttsVoice: 'Aditi', ttsLanguage: 'en', loop: 1 }), 'leg1');
    expect(r.request.body.exoml).toContain('<Say');
  });

  it('routes messageNode to mockMessageOnLeg (Say)', () => {
    const r = generateApiCallsForNode(mkNode('messageNode', { message: 'Hello' }), 'leg1');
    expect(r.request.body.exoml).toContain('<Say');
    expect(r.request.body.exoml).toContain('Hello');
  });

  it('routes voicebotNode to mockStartStream', () => {
    const r = generateApiCallsForNode(mkNode('voicebotNode', { streamType: 'bidirectional', streamUrl: 'wss://x' }), 'leg1');
    expect(r.request.body.exoml).toContain('<StartStream');
  });

  it('routes transferNode to mockDialAction', () => {
    const r = generateApiCallsForNode(mkNode('transferNode', { contactUri: '09123', exophone: '08000' }), 'leg1');
    expect(r.request.body.exoml).toContain('<Dial');
  });

  it('routes recordNode to mockStartRecording', () => {
    const r = generateApiCallsForNode(mkNode('recordNode', { direction: 'both', format: 'mp3' }), 'leg1');
    expect(r.request.body.exoml).toContain('<StartRecording');
  });

  it('routes startRecordNode to mockStartRecording', () => {
    const r = generateApiCallsForNode(mkNode('startRecordNode', { direction: 'in', format: 'wav' }), 'leg1');
    expect(r.request.body.exoml).toContain('<StartRecording');
    expect(r.request.body.exoml).toContain('direction="in"');
  });

  it('routes stopRecordNode to mockStopRecording', () => {
    const r = generateApiCallsForNode(mkNode('stopRecordNode', {}), 'leg1');
    expect(r.request.body.exoml).toContain('<StopRecording>');
  });

  it('routes gatherNode to mockGatherOnLeg', () => {
    const r = generateApiCallsForNode(mkNode('gatherNode', { numDigits: 4, timeout: 10, finishOnKey: '#' }), 'leg1');
    expect(r.request.body.exoml).toContain('<Gather');
    expect(r.request.body.exoml).toContain('numDigits="4"');
  });

  it('routes hangupNode to mockHangupLeg', () => {
    const r = generateApiCallsForNode(mkNode('hangupNode', {}), 'leg1');
    expect(r.request.body.exoml).toContain('<Hangup>');
  });

  it('routes voicemailNode to mockVoicemail', () => {
    const r = generateApiCallsForNode(mkNode('voicemailNode', { message: 'Leave msg', silenceInSec: 3, finishOnKey: '*', timeoutInSec: 20 }), 'leg1');
    expect(r.request.body.exoml).toContain('<StartRecording');
    expect(r.request.body.exoml).toContain('Leave msg');
  });

  it('returns null for syncApiNode (not an Exotel action)', () => {
    expect(generateApiCallsForNode(mkNode('syncApiNode', {}), 'leg1')).toBeNull();
  });

  it('returns null for asyncApiNode (not an Exotel action)', () => {
    expect(generateApiCallsForNode(mkNode('asyncApiNode', {}), 'leg1')).toBeNull();
  });

  it('returns null for unknown node types', () => {
    expect(generateApiCallsForNode(mkNode('unknownNode', {}), 'leg1')).toBeNull();
  });
});

/* ──────────────────────────────────────────────── */
/*  24. Response envelope structure                  */
/* ──────────────────────────────────────────────── */
describe('Response envelope', () => {
  it('all action responses use 202 status and standard envelope', () => {
    const actions = [
      mockCreateLeg({}),
      mockAnswerLeg('l'),
      mockPlayOnLeg('l', 'url', 1),
      mockSayOnLeg('l', 'hi'),
      mockGatherOnLeg('l', 1, 10, '#'),
      mockStartStream('l', 'bidirectional', 'wss://x'),
      mockDialAction('l', '09x', '08x'),
      mockStartRecording('l'),
      mockStopRecording('l'),
      mockHangupLeg('l'),
      mockVoicemail('l', 'msg'),
      mockHoldLeg('l'),
      mockUnHoldLeg('l'),
      mockMuteLeg('l'),
      mockUnMuteLeg('l'),
      mockSendDigits('l', '1'),
    ];
    actions.forEach((r) => {
      expect(r.response.http_code).toBe(202);
      expect(r.response.response.error_data).toBeNull();
      expect(r.response.response.data).toBeDefined();
      expect(r.response.request_id).toBeDefined();
    });
  });
});
