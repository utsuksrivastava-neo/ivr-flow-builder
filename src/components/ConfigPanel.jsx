import React from 'react';
import useFlowStore from '../store/flowStore';
import { nodeColors, nodeIcons } from './CustomNodes';
import { Trash2, Copy, Plus, X, Settings } from 'lucide-react';

// -----------------------------------------------------------------------------
// Shared field shell: label + arbitrary children (inputs, textareas, etc.)
// -----------------------------------------------------------------------------
function Field({ label, children }) {
  return (
    <div className="config-field">
      <label className="config-label">{label}</label>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Basic text input — single-line strings for URLs, labels, etc.
// -----------------------------------------------------------------------------
function TextInput({ value, onChange, placeholder, maxLength = 500, ...props }) {
  return (
    <input
      className="config-input"
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      placeholder={placeholder}
      maxLength={maxLength}
      {...props}
    />
  );
}

// -----------------------------------------------------------------------------
// Numeric input with optional min/max for timeouts, loops, etc.
// -----------------------------------------------------------------------------
function NumberInput({ value, onChange, min, max, ...props }) {
  return (
    <input
      className="config-input"
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      {...props}
    />
  );
}

// -----------------------------------------------------------------------------
// Dropdown — options are { value, label } pairs
// -----------------------------------------------------------------------------
function SelectInput({ value, onChange, options }) {
  return (
    <select className="config-input config-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// -----------------------------------------------------------------------------
// Multi-line text for prompts, JSON, messages
// -----------------------------------------------------------------------------
function TextArea({ value, onChange, placeholder, rows = 3, maxLength = 2000 }) {
  return (
    <textarea
      className="config-input config-textarea"
      value={value || ''}
      onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
    />
  );
}

/**
 * Toggle switch for barge-in (allow DTMF input during message playback).
 */
function BargeInToggle({ data, update }) {
  const enabled = data.bargeIn !== false;
  return (
    <Field label="Barge-in (accept input during playback)">
      <div
        className="config-toggle-row"
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => update({ bargeIn: !enabled })}
      >
        <div
          className={`config-toggle ${enabled ? 'on' : ''}`}
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: enabled ? '#4DB961' : '#475569',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: '#fff',
              position: 'absolute',
              top: 2,
              left: enabled ? 18 : 2,
              transition: 'left 0.2s',
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: enabled ? '#4DB961' : '#94a3b8' }}>
          {enabled ? 'Enabled — caller can press keys during playback' : 'Disabled — caller must wait for playback to finish'}
        </span>
      </div>
    </Field>
  );
}

// -----------------------------------------------------------------------------
// Start node — entry point: call direction, optional outbound number, exophone, gRPC
// Legacy `outbound` is treated as `both` for the selector (outbound leg needs a number).
// -----------------------------------------------------------------------------
function StartConfig({ data, update }) {
  const raw = data.callDirection;
  const callDirection = raw === 'outbound' ? 'both' : raw || 'inbound';
  const isInboundOnly = callDirection === 'inbound';
  const showContactUri = callDirection === 'both' || raw === 'outbound';

  return (
    <>
      <Field label="Call Direction">
        <SelectInput
          value={callDirection}
          onChange={(v) =>
            update({
              callDirection: v,
              label: v === 'inbound' ? 'Incoming Call' : 'Inbound + Outbound Call',
            })
          }
          options={[
            { value: 'inbound', label: '📥 Inbound Only' },
            { value: 'both', label: '📞 Inbound + Outbound' },
          ]}
        />
      </Field>
      {showContactUri && (
        <Field label="Contact URI (Number to call)">
          <TextInput value={data.contactUri} onChange={(v) => update({ contactUri: v })} placeholder="09163816621" />
        </Field>
      )}
      <Field
        label={
          isInboundOnly
            ? 'Exophone (Virtual Number)'
            : 'Exophone (Virtual Number / Caller ID)'
        }
      >
        <TextInput value={data.exophone} onChange={(v) => update({ exophone: v })} placeholder="08030752400" />
      </Field>
      <Field label="Event Endpoint (gRPC)">
        <TextInput value={data.eventEndpoint} onChange={(v) => update({ eventEndpoint: v })} placeholder="grpc://127.0.0.1:9001" />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// IVR menu — TTS or audio prompt, DTMF options, timeouts
// -----------------------------------------------------------------------------
function MenuConfig({ data, update }) {
  const addOption = () => {
    const nextKey = String((data.options?.length || 0) + 1);
    update({ options: [...(data.options || []), { key: nextKey, label: `Option ${nextKey}` }] });
  };

  const removeOption = (idx) => {
    const opts = [...(data.options || [])];
    opts.splice(idx, 1);
    update({ options: opts });
  };

  const updateOption = (idx, field, value) => {
    const opts = [...(data.options || [])];
    opts[idx] = { ...opts[idx], [field]: value };
    update({ options: opts });
  };

  return (
    <>
      <Field label="Prompt Type">
        <SelectInput
          value={data.promptType}
          onChange={(v) => update({ promptType: v })}
          options={[
            { value: 'tts', label: 'Text-to-Speech' },
            { value: 'audio', label: 'Audio URL' },
          ]}
        />
      </Field>
      {data.promptType === 'tts' ? (
        <>
          <Field label="Prompt Message">
            <TextArea
              value={data.prompt}
              onChange={(v) => update({ prompt: v })}
              placeholder="Press 1 for Sales, Press 2 for Support..."
              rows={3}
            />
          </Field>
          <Field label="TTS Engine">
            <SelectInput
              value={data.ttsEngine}
              onChange={(v) => update({ ttsEngine: v })}
              options={[
                { value: 'polly', label: 'Amazon Polly' },
                { value: 'googletts', label: 'Google TTS' },
              ]}
            />
          </Field>
          <Field label="Voice">
            <TextInput value={data.ttsVoice} onChange={(v) => update({ ttsVoice: v })} placeholder="Aditi" />
          </Field>
          <Field label="Language">
            <SelectInput
              value={data.ttsLanguage}
              onChange={(v) => update({ ttsLanguage: v })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' },
                { value: 'te', label: 'Telugu' },
                { value: 'kn', label: 'Kannada' },
                { value: 'ml', label: 'Malayalam' },
                { value: 'bn', label: 'Bengali' },
                { value: 'mr', label: 'Marathi' },
                { value: 'gu', label: 'Gujarati' },
              ]}
            />
          </Field>
        </>
      ) : (
        <Field label="Audio URL">
          <TextInput value={data.audioUrl} onChange={(v) => update({ audioUrl: v })} placeholder="https://..." />
        </Field>
      )}

      <div className="config-section-header">
        <span>Menu Options</span>
        <button className="config-btn-sm" onClick={addOption}>
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="menu-options-config">
        {(data.options || []).map((opt, idx) => (
          <div key={idx} className="menu-option-config">
            <input
              className="config-input key-input"
              value={opt.key}
              onChange={(e) => updateOption(idx, 'key', e.target.value)}
              maxLength={1}
              placeholder="#"
            />
            <input
              className="config-input flex-1"
              value={opt.label}
              onChange={(e) => updateOption(idx, 'label', e.target.value)}
              placeholder="Option label"
            />
            <button className="config-btn-icon danger" onClick={() => removeOption(idx)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <Field label="Timeout (seconds)">
        <NumberInput value={data.timeout} onChange={(v) => update({ timeout: v })} min={1} max={60} />
      </Field>
      <Field label="Max Retries">
        <NumberInput value={data.maxRetries} onChange={(v) => update({ maxRetries: v })} min={0} max={10} />
      </Field>
      <Field label="Invalid Input Message">
        <TextInput value={data.invalidMessage} onChange={(v) => update({ invalidMessage: v })} placeholder="Invalid option..." />
      </Field>
      <BargeInToggle data={data} update={update} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Play audio from URL (optional HTTPS auth)
// -----------------------------------------------------------------------------
function PlayConfig({ data, update }) {
  return (
    <>
      <Field label="Audio URL">
        <TextInput value={data.audioUrl} onChange={(v) => update({ audioUrl: v })} placeholder="https://exotel.s3.mum-1.amazonaws.com/123.wav" />
      </Field>
      <Field label="Loop Count">
        <NumberInput value={data.loop} onChange={(v) => update({ loop: v })} min={0} max={10} />
      </Field>
      <Field label="Username (for HTTPS)">
        <TextInput value={data.username} onChange={(v) => update({ username: v })} placeholder="Optional" />
      </Field>
      <Field label="Password (for HTTPS)">
        <TextInput value={data.password} onChange={(v) => update({ password: v })} placeholder="Optional" type="password" />
      </Field>
      <BargeInToggle data={data} update={update} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Say / TTS — spoken message with engine and voice settings
// -----------------------------------------------------------------------------
function SayConfig({ data, update }) {
  return (
    <>
      <Field label="Message">
        <TextArea value={data.message} onChange={(v) => update({ message: v })} placeholder="Thank you for calling..." rows={4} />
      </Field>
      <Field label="TTS Engine">
        <SelectInput
          value={data.ttsEngine}
          onChange={(v) => update({ ttsEngine: v })}
          options={[
            { value: 'polly', label: 'Amazon Polly' },
            { value: 'googletts', label: 'Google TTS' },
          ]}
        />
      </Field>
      <Field label="Voice ID">
        <TextInput value={data.ttsVoice} onChange={(v) => update({ ttsVoice: v })} placeholder="Aditi" />
      </Field>
      <Field label="Language">
        <SelectInput
          value={data.ttsLanguage}
          onChange={(v) => update({ ttsLanguage: v })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'Hindi' },
            { value: 'ta', label: 'Tamil' },
            { value: 'te', label: 'Telugu' },
            { value: 'kn', label: 'Kannada' },
            { value: 'ml', label: 'Malayalam' },
          ]}
        />
      </Field>
      <Field label="Loop Count">
        <NumberInput value={data.loop} onChange={(v) => update({ loop: v })} min={0} max={10} />
      </Field>
      <BargeInToggle data={data} update={update} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Voice bot — WebSocket streaming (bidirectional or transcription)
// -----------------------------------------------------------------------------
function VoicebotConfig({ data, update }) {
  return (
    <>
      <Field label="Stream Type">
        <SelectInput
          value={data.streamType}
          onChange={(v) => update({ streamType: v })}
          options={[
            { value: 'bidirectional', label: 'Bidirectional (Voice Bot)' },
            { value: 'unidirectional', label: 'Unidirectional (Transcription)' },
          ]}
        />
      </Field>
      <Field label="WebSocket URL">
        <TextInput value={data.streamUrl} onChange={(v) => update({ streamUrl: v })} placeholder="wss://bot.example.com/voice" />
      </Field>
      <Field label="Bot Greeting">
        <TextArea value={data.greeting} onChange={(v) => update({ greeting: v })} placeholder="Hello! How can I help?" rows={2} />
      </Field>
      {data.streamType === 'unidirectional' && (
        <Field label="Source Direction">
          <SelectInput
            value={data.sourceDirection || 'both'}
            onChange={(v) => update({ sourceDirection: v })}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'in', label: 'Inbound audio only' },
              { value: 'out', label: 'Outbound audio only' },
            ]}
          />
        </Field>
      )}
      {data.streamType === 'bidirectional' && (
        <Field label="Secure DTMF">
          <SelectInput
            value={data.secureDtmf ? 'true' : 'false'}
            onChange={(v) => update({ secureDtmf: v === 'true' })}
            options={[
              { value: 'false', label: 'Disabled' },
              { value: 'true', label: 'Enabled' },
            ]}
          />
        </Field>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Transfer — bridge call to another URI / network
// -----------------------------------------------------------------------------
function TransferConfig({ data, update }) {
  return (
    <>
      <Field label="Contact URI">
        <TextInput value={data.contactUri} onChange={(v) => update({ contactUri: v })} placeholder="09163816623 or sip:..." />
      </Field>
      <Field label="Exophone / Caller ID">
        <TextInput value={data.exophone} onChange={(v) => update({ exophone: v })} placeholder="08030752400" />
      </Field>
      <Field label="Network Type">
        <SelectInput
          value={data.networkType}
          onChange={(v) => update({ networkType: v })}
          options={[
            { value: 'pstn', label: 'PSTN' },
            { value: 'voip', label: 'VoIP' },
          ]}
        />
      </Field>
      <Field label="Timeout (seconds)">
        <NumberInput value={data.timeout} onChange={(v) => update({ timeout: v })} min={5} max={120} />
      </Field>
      <Field label="Custom Parameter">
        <TextInput value={data.customParam} onChange={(v) => update({ customParam: v })} placeholder="Optional metadata" />
      </Field>
      <Field label="Absorb DTMF">
        <SelectInput
          value={data.absorbDtmf != null ? String(data.absorbDtmf) : 'false'}
          onChange={(v) => update({ absorbDtmf: v === 'true' })}
          options={[
            { value: 'false', label: 'No — pass DTMF to callee' },
            { value: 'true', label: 'Yes — absorb DTMF tones' },
          ]}
        />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Record — in-call recording (format, storage, etc.)
// -----------------------------------------------------------------------------
function RecordConfig({ data, update }) {
  return (
    <>
      <Field label="Direction">
        <SelectInput
          value={data.direction}
          onChange={(v) => update({ direction: v })}
          options={[
            { value: 'both', label: 'Both' },
            { value: 'in', label: 'Inbound Only' },
            { value: 'out', label: 'Outbound Only' },
          ]}
        />
      </Field>
      <Field label="Format">
        <SelectInput
          value={data.format}
          onChange={(v) => update({ format: v })}
          options={[
            { value: 'mp3', label: 'MP3' },
            { value: 'wav', label: 'WAV' },
          ]}
        />
      </Field>
      <Field label="Bitrate">
        <SelectInput
          value={data.bitrate}
          onChange={(v) => update({ bitrate: v })}
          options={['8', '24', '32', '64', '128'].map((b) => ({ value: b, label: `${b} kbps` }))}
        />
      </Field>
      <Field label="Channel">
        <SelectInput
          value={data.channel}
          onChange={(v) => update({ channel: v })}
          options={[
            { value: 'mono', label: 'Mono' },
            { value: 'stereo', label: 'Stereo' },
          ]}
        />
      </Field>
      <Field label="Storage Type">
        <SelectInput
          value={data.storageType}
          onChange={(v) => update({ storageType: v })}
          options={[
            { value: 's3', label: 'Exotel S3' },
            { value: 'https', label: 'Custom HTTPS' },
          ]}
        />
      </Field>
      {data.storageType === 'https' && (
        <>
          <Field label="Storage URL">
            <TextInput value={data.storageUrl} onChange={(v) => update({ storageUrl: v })} placeholder="https://upload.example.com" />
          </Field>
          <Field label="Storage URL Key (Basic Auth)">
            <TextInput value={data.storageUrlKey} onChange={(v) => update({ storageUrlKey: v })} placeholder="key" />
          </Field>
          <Field label="Storage URL Token (Basic Auth)">
            <TextInput value={data.storageUrlToken} onChange={(v) => update({ storageUrlToken: v })} placeholder="token" type="password" />
          </Field>
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Start Record node — same recording options as the generic Record node
// -----------------------------------------------------------------------------
function StartRecordConfig({ data, update }) {
  return (
    <>
      <Field label="Direction">
        <SelectInput
          value={data.direction}
          onChange={(v) => update({ direction: v })}
          options={[
            { value: 'both', label: 'Both' },
            { value: 'in', label: 'Inbound Only' },
            { value: 'out', label: 'Outbound Only' },
          ]}
        />
      </Field>
      <Field label="Format">
        <SelectInput
          value={data.format}
          onChange={(v) => update({ format: v })}
          options={[
            { value: 'mp3', label: 'MP3' },
            { value: 'wav', label: 'WAV' },
          ]}
        />
      </Field>
      <Field label="Bitrate">
        <SelectInput
          value={data.bitrate}
          onChange={(v) => update({ bitrate: v })}
          options={['8', '24', '32', '64', '128'].map((b) => ({ value: b, label: `${b} kbps` }))}
        />
      </Field>
      <Field label="Channel">
        <SelectInput
          value={data.channel}
          onChange={(v) => update({ channel: v })}
          options={[
            { value: 'mono', label: 'Mono' },
            { value: 'stereo', label: 'Stereo' },
          ]}
        />
      </Field>
      <Field label="Storage Type">
        <SelectInput
          value={data.storageType}
          onChange={(v) => update({ storageType: v })}
          options={[
            { value: 's3', label: 'Exotel S3' },
            { value: 'https', label: 'Custom HTTPS' },
          ]}
        />
      </Field>
      {data.storageType === 'https' && (
        <>
          <Field label="Storage URL">
            <TextInput value={data.storageUrl} onChange={(v) => update({ storageUrl: v })} placeholder="https://upload.example.com" />
          </Field>
          <Field label="Storage URL Key (Basic Auth)">
            <TextInput value={data.storageUrlKey} onChange={(v) => update({ storageUrlKey: v })} placeholder="key" />
          </Field>
          <Field label="Storage URL Token (Basic Auth)">
            <TextInput value={data.storageUrlToken} onChange={(v) => update({ storageUrlToken: v })} placeholder="token" type="password" />
          </Field>
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Message node — plain text played to the caller (TTS or similar downstream)
// -----------------------------------------------------------------------------
function MessageConfig({ data, update }) {
  return (
    <>
      <Field label="Message">
        <TextArea
          value={data.message}
          onChange={(v) => update({ message: v })}
          placeholder="Enter message to play to caller..."
          rows={4}
        />
      </Field>
      <BargeInToggle data={data} update={update} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Stop Record node — no editable fields; informational copy only
// -----------------------------------------------------------------------------
function StopRecordConfig() {
  return (
    <div className="config-empty-state">
      <p>This node stops any active recording on the call. No configuration required.</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sync API node — blocking HTTP call with timeout, variable binding, success rule
// -----------------------------------------------------------------------------
function SyncApiConfig({ data, update }) {
  const method = data.method || 'POST';
  const showBody = method === 'POST' || method === 'PUT' || method === 'PATCH';

  return (
    <>
      <Field label="HTTP Method">
        <SelectInput
          value={method}
          onChange={(v) => update({ method: v })}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'PATCH', label: 'PATCH' },
          ]}
        />
      </Field>
      <Field label="URL">
        <TextInput value={data.url} onChange={(v) => update({ url: v })} placeholder="https://api.example.com/endpoint" />
      </Field>
      <Field label="Headers JSON">
        <TextArea
          value={data.headers}
          onChange={(v) => update({ headers: v })}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
        />
      </Field>
      {showBody && (
        <Field label="Request Body JSON">
          <TextArea
            value={data.body}
            onChange={(v) => update({ body: v })}
            placeholder='{"key": "value"}'
            rows={4}
          />
        </Field>
      )}
      <Field label="Timeout in seconds">
        <NumberInput value={data.timeout} onChange={(v) => update({ timeout: v })} min={1} max={120} />
      </Field>
      <Field label="Response Variable Name">
        <TextInput value={data.responseVariable} onChange={(v) => update({ responseVariable: v })} placeholder="api_response" />
      </Field>
      <Field label="Success Condition">
        <SelectInput
          value={data.successCondition || '2xx'}
          onChange={(v) => update({ successCondition: v })}
          options={[
            { value: '2xx', label: 'Any 2xx' },
            { value: '200', label: 'Exactly 200 OK' },
            { value: 'non-5xx', label: 'Anything except 5xx' },
          ]}
        />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Async API node — non-blocking request; server calls back when done
// -----------------------------------------------------------------------------
function AsyncApiConfig({ data, update }) {
  const method = data.method || 'POST';
  const showBody = method === 'POST' || method === 'PUT' || method === 'PATCH';

  return (
    <>
      <Field label="HTTP Method">
        <SelectInput
          value={method}
          onChange={(v) => update({ method: v })}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'PATCH', label: 'PATCH' },
          ]}
        />
      </Field>
      <Field label="URL">
        <TextInput value={data.url} onChange={(v) => update({ url: v })} placeholder="https://api.example.com/endpoint" />
      </Field>
      <Field label="Headers JSON">
        <TextArea
          value={data.headers}
          onChange={(v) => update({ headers: v })}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
        />
      </Field>
      {showBody && (
        <Field label="Request Body JSON">
          <TextArea
            value={data.body}
            onChange={(v) => update({ body: v })}
            placeholder='{"key": "value"}'
            rows={4}
          />
        </Field>
      )}
      <Field label="Callback URL">
        <TextInput
          value={data.callbackUrl}
          onChange={(v) => update({ callbackUrl: v })}
          placeholder="https://your-server.com/callback"
        />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Voicemail — plays a greeting then records (Exotel Voicemail action)
// Uses special StartRecording with silenceInSec, finishOnKey, timeoutInSec
// and nested Say for the greeting message.
// -----------------------------------------------------------------------------
function VoicemailConfig({ data, update }) {
  return (
    <>
      <Field label="Greeting Message">
        <TextArea
          value={data.message}
          onChange={(v) => update({ message: v })}
          placeholder="Please leave a message after the beep."
          rows={3}
        />
      </Field>
      <Field label="Silence Timeout (seconds)">
        <NumberInput value={data.silenceInSec} onChange={(v) => update({ silenceInSec: v })} min={1} max={60} />
      </Field>
      <Field label="Finish On Key">
        <TextInput value={data.finishOnKey} onChange={(v) => update({ finishOnKey: v })} placeholder="#" maxLength={1} />
      </Field>
      <Field label="Max Recording Time (seconds)">
        <NumberInput value={data.timeoutInSec} onChange={(v) => update({ timeoutInSec: v })} min={5} max={300} />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Gather DTMF — digit collection
// -----------------------------------------------------------------------------
function GatherConfig({ data, update }) {
  return (
    <>
      <Field label="Number of Digits">
        <NumberInput value={data.numDigits} onChange={(v) => update({ numDigits: v })} min={1} max={20} />
      </Field>
      <Field label="Timeout (seconds)">
        <NumberInput value={data.timeout} onChange={(v) => update({ timeout: v })} min={1} max={60} />
      </Field>
      <Field label="Finish On Key">
        <TextInput value={data.finishOnKey} onChange={(v) => update({ finishOnKey: v })} placeholder="#" maxLength={1} />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Hangup — explicit call end (no fields)
// -----------------------------------------------------------------------------
function HangupConfig() {
  return (
    <div className="config-empty-state">
      <p>No configuration needed. This node ends the call.</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Legacy combined API node — sync vs async in one panel
// -----------------------------------------------------------------------------
function ApiCallConfig({ data, update }) {
  return (
    <>
      <Field label="Mode">
        <SelectInput
          value={data.mode || 'sync'}
          onChange={(v) => update({ mode: v })}
          options={[
            { value: 'sync', label: 'Synchronous (wait for response)' },
            { value: 'async', label: 'Asynchronous (fire & continue)' },
          ]}
        />
      </Field>
      <Field label="HTTP Method">
        <SelectInput
          value={data.method || 'POST'}
          onChange={(v) => update({ method: v })}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'PATCH', label: 'PATCH' },
          ]}
        />
      </Field>
      <Field label="URL">
        <TextInput
          value={data.url}
          onChange={(v) => update({ url: v })}
          placeholder="https://api.example.com/endpoint"
        />
      </Field>
      <Field label="Headers (JSON)">
        <TextArea
          value={data.headers}
          onChange={(v) => update({ headers: v })}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
        />
      </Field>
      {(data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH') && (
        <Field label="Request Body (JSON)">
          <TextArea
            value={data.body}
            onChange={(v) => update({ body: v })}
            placeholder='{"key": "value"}'
            rows={4}
          />
        </Field>
      )}
      <Field label="Timeout (seconds)">
        <NumberInput value={data.timeout} onChange={(v) => update({ timeout: v })} min={1} max={120} />
      </Field>
      {data.mode === 'async' && (
        <Field label="Callback URL">
          <TextInput
            value={data.callbackUrl}
            onChange={(v) => update({ callbackUrl: v })}
            placeholder="https://your-server.com/callback"
          />
        </Field>
      )}
      <Field label="Response Variable Name">
        <TextInput
          value={data.responseVariable}
          onChange={(v) => update({ responseVariable: v })}
          placeholder="api_response"
        />
      </Field>
      <Field label="Success Condition">
        <SelectInput
          value={data.successCondition || '2xx'}
          onChange={(v) => update({ successCondition: v })}
          options={[
            { value: '2xx', label: 'Any 2xx status' },
            { value: '200', label: 'Exactly 200 OK' },
            { value: 'non-5xx', label: 'Anything except 5xx' },
          ]}
        />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Maps React Flow node `type` strings to their settings panel components
// -----------------------------------------------------------------------------
const configComponents = {
  startNode: StartConfig,
  menuNode: MenuConfig,
  playNode: PlayConfig,
  sayNode: SayConfig,
  voicebotNode: VoicebotConfig,
  transferNode: TransferConfig,
  recordNode: RecordConfig,
  hangupNode: HangupConfig,
  gatherNode: GatherConfig,
  apiCallNode: ApiCallConfig,
  messageNode: MessageConfig,
  startRecordNode: StartRecordConfig,
  stopRecordNode: StopRecordConfig,
  syncApiNode: SyncApiConfig,
  asyncApiNode: AsyncApiConfig,
  voicemailNode: VoicemailConfig,
};

// -----------------------------------------------------------------------------
// Right-hand sidebar: selected node label + type-specific form
// -----------------------------------------------------------------------------
export default function ConfigPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const duplicateNode = useFlowStore((s) => s.duplicateNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <aside className="config-panel">
        <div className="config-panel-empty">
          <Settings size={32} className="config-empty-icon" />
          <h3>Node Properties</h3>
          <p>Select a node on the canvas to configure its properties</p>
        </div>
      </aside>
    );
  }

  const ConfigComp = configComponents[node.type];
  const colors = nodeColors[node.type] || {};
  const Icon = nodeIcons[node.type];

  const update = (newData) => updateNodeData(node.id, newData);

  return (
    <aside className="config-panel">
      <div className="config-header" style={{ borderBottomColor: colors.border + '40' }}>
        <div className="config-header-title">
          {Icon && (
            <div className="config-node-icon" style={{ background: colors.border + '30', color: colors.accent }}>
              <Icon size={16} />
            </div>
          )}
          <div>
            <h3>{node.data.label}</h3>
            <span className="config-node-type">{node.type.replace('Node', '')}</span>
          </div>
        </div>
        <div className="config-actions">
          {node.type !== 'startNode' && (
            <>
              <button className="config-btn-icon" onClick={() => duplicateNode(node.id)} title="Duplicate">
                <Copy size={14} />
              </button>
              <button className="config-btn-icon danger" onClick={() => deleteNode(node.id)} title="Delete">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="config-body">
        <Field label="Label">
          <TextInput value={node.data.label} onChange={(v) => update({ label: v })} placeholder="Node label" />
        </Field>
        {ConfigComp && <ConfigComp data={node.data} update={update} />}
      </div>
    </aside>
  );
}
