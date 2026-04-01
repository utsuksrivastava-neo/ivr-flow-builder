/**
 * Single source of default application configuration (no hardcoded product strings in consumers).
 * Persisted overrides live in appConfigStore (localStorage).
 */

/** @typedef {{ id: string, label: string, description?: string, keys: string[] }} ConfigGroup */

/**
 * Default values — used for new nodes, mock API fallbacks, templates, and UI hints.
 */
export const DEFAULT_APP_CONFIG = {
  // ── New node defaults (flow editor) ─────────────────────────
  defaultStartContactUri: '09163816621',
  defaultStartExophone: '08030752400',
  defaultStartEventEndpoint: 'grpc://127.0.0.1:9001',
  defaultPlayAudioSampleUrl: 'https://exotel.s3.mum-1.amazonaws.com/123.wav',
  defaultTransferContactUri: '09163816623',
  defaultTransferExophone: '08030752400',
  defaultApiCheckUrl: 'https://api.example.com/check',
  defaultApiWebhookUrl: 'https://api.example.com/webhook',
  defaultApiCallbackUrl: 'https://your-server.com/callback',
  defaultVoicebotStreamUrl: 'wss://bot.example.com/voice',

  // ── Mock API (CPaaS simulation) ──────────────────────────────
  mockAccountSid: 'demo_account',
  mockDefaultContactUri: '09163816621',
  mockDefaultExophone: '08030752400',
  mockDefaultEventEndpoint: 'grpc://127.0.0.1:9001',
  mockRecordingBaseUrl: 'https://exotel-recordings.s3.amazonaws.com/',

  // ── Editor behaviour ─────────────────────────────────────────
  autosaveIntervalMs: 30000,

  // ── Login screen (hints only — not credentials) ─────────────
  loginDemoUsernameHint: 'demo',
  loginDemoPasswordHint: 'demo123',

  // ── IVR Tester (simulation delays) ─────────────────────────
  ivrTesterDelayLongMs: 1800,
  ivrTesterDelayShortMs: 900,

  // ── Template demo literals (banking) ─────────────────────────
  tplBankingInboundExophone: '18001234567',
  tplBankingTransferAgentUri: '08012345678',

  // ── Template demo literals (insurance) ─────────────────────
  tplInsuranceInboundExophone: '18002669999',
  tplInsuranceTransferAdvisorUri: '08044556677',
  tplInsuranceTransferSupportUri: '08011223344',
  tplInsuranceTransferClaimsUri: '08099887766',

  // ── Template demo literals (e‑commerce) ─────────────────────
  tplEcommerceInboundExophone: '18001023456',
  tplEcommerceTransferConnectUri: '08055667788',
  tplEcommerceTransferReturnsUri: '08055667789',

  // ── Template demo literals (shared / outbound) ─────────────
  tplSharedOutboundExophone: '08030752400',
  tplOnboardingOutboundContact: '09876543210',
  tplOrderOutboundContact: '09988776655',
  tplFeedbackOutboundContact: '09112233445',
  tplOrderTransferRestaurantUri: '08099001122',

  // ── KYC template API URLs ───────────────────────────────────
  tplKycVerifyApiUrl: 'https://api.example.com/kyc/verify-aadhaar',
  tplKycAsyncApiUrl: 'https://api.example.com/kyc/status-async',
  tplKycWebhookUrl: 'https://your-bank.com/webhooks/kyc-callback',
};

/**
 * Ordered replacements: [literalSubstring, configKey] — longest literals first.
 * Applied when hydrating templates so admin values flow into template graphs.
 */
export const TEMPLATE_LITERAL_REPLACEMENTS = [
  ['https://your-bank.com/webhooks/kyc-callback', 'tplKycWebhookUrl'],
  ['https://api.example.com/kyc/verify-aadhaar', 'tplKycVerifyApiUrl'],
  ['https://api.example.com/kyc/status-async', 'tplKycAsyncApiUrl'],
  ['grpc://127.0.0.1:9001', 'defaultStartEventEndpoint'],
  ['18001234567', 'tplBankingInboundExophone'],
  ['08012345678', 'tplBankingTransferAgentUri'],
  ['18002669999', 'tplInsuranceInboundExophone'],
  ['08044556677', 'tplInsuranceTransferAdvisorUri'],
  ['08011223344', 'tplInsuranceTransferSupportUri'],
  ['08099887766', 'tplInsuranceTransferClaimsUri'],
  ['18001023456', 'tplEcommerceInboundExophone'],
  ['08055667788', 'tplEcommerceTransferConnectUri'],
  ['08055667789', 'tplEcommerceTransferReturnsUri'],
  ['08099001122', 'tplOrderTransferRestaurantUri'],
  ['09876543210', 'tplOnboardingOutboundContact'],
  ['09988776655', 'tplOrderOutboundContact'],
  ['09112233445', 'tplFeedbackOutboundContact'],
  ['08030752400', 'tplSharedOutboundExophone'],
];

/** Groups for Admin "All configurations" UI */
export const CONFIG_GROUPS = /** @type {ConfigGroup[]} */ ([
  {
    id: 'new-nodes',
    label: 'New node defaults',
    description: 'Used when dragging a new node onto the canvas.',
    keys: [
      'defaultStartContactUri',
      'defaultStartExophone',
      'defaultStartEventEndpoint',
      'defaultPlayAudioSampleUrl',
      'defaultTransferContactUri',
      'defaultTransferExophone',
      'defaultApiCheckUrl',
      'defaultApiWebhookUrl',
      'defaultApiCallbackUrl',
      'defaultVoicebotStreamUrl',
    ],
  },
  {
    id: 'mock-api',
    label: 'Mock API (simulation)',
    description: 'Fallbacks when generating demo Exotel API payloads.',
    keys: [
      'mockAccountSid',
      'mockDefaultContactUri',
      'mockDefaultExophone',
      'mockDefaultEventEndpoint',
      'mockRecordingBaseUrl',
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    keys: ['autosaveIntervalMs'],
  },
  {
    id: 'login',
    label: 'Login screen hints',
    description: 'Shown on the login page (not the actual password).',
    keys: ['loginDemoUsernameHint', 'loginDemoPasswordHint'],
  },
  {
    id: 'ivr-tester',
    label: 'IVR Tester',
    keys: ['ivrTesterDelayLongMs', 'ivrTesterDelayShortMs'],
  },
  {
    id: 'templates',
    label: 'Template demo data',
    description: 'Phone numbers and URLs embedded in industry templates. Changing these updates templates when you open the gallery.',
    keys: [
      'tplBankingInboundExophone',
      'tplBankingTransferAgentUri',
      'tplInsuranceInboundExophone',
      'tplInsuranceTransferAdvisorUri',
      'tplInsuranceTransferSupportUri',
      'tplInsuranceTransferClaimsUri',
      'tplEcommerceInboundExophone',
      'tplEcommerceTransferConnectUri',
      'tplEcommerceTransferReturnsUri',
      'tplSharedOutboundExophone',
      'tplOnboardingOutboundContact',
      'tplOrderOutboundContact',
      'tplFeedbackOutboundContact',
      'tplOrderTransferRestaurantUri',
      'tplKycVerifyApiUrl',
      'tplKycAsyncApiUrl',
      'tplKycWebhookUrl',
    ],
  },
]);

/** Human-readable labels for form fields */
export const CONFIG_LABELS = {
  defaultStartContactUri: 'Start node — contact URI',
  defaultStartExophone: 'Start node — exophone',
  defaultStartEventEndpoint: 'Start node — event endpoint (gRPC)',
  defaultPlayAudioSampleUrl: 'Play Audio — sample URL',
  defaultTransferContactUri: 'Transfer — default contact URI',
  defaultTransferExophone: 'Transfer — default exophone',
  defaultApiCheckUrl: 'API Call — default check URL',
  defaultApiWebhookUrl: 'Async API — default webhook URL',
  defaultApiCallbackUrl: 'Async API — default callback URL',
  defaultVoicebotStreamUrl: 'Voicebot — default WebSocket URL',
  mockAccountSid: 'Mock account SID',
  mockDefaultContactUri: 'Mock — default contact URI',
  mockDefaultExophone: 'Mock — default exophone',
  mockDefaultEventEndpoint: 'Mock — default event endpoint',
  mockRecordingBaseUrl: 'Mock — recording file base URL',
  autosaveIntervalMs: 'Autosave interval (milliseconds)',
  loginDemoUsernameHint: 'Login hint — demo username',
  loginDemoPasswordHint: 'Login hint — demo password',
  ivrTesterDelayLongMs: 'IVR Tester — long delay (ms)',
  ivrTesterDelayShortMs: 'IVR Tester — short delay (ms)',
  tplBankingInboundExophone: 'Banking template — inbound exophone',
  tplBankingTransferAgentUri: 'Banking template — agent transfer URI',
  tplInsuranceInboundExophone: 'Insurance template — inbound exophone',
  tplInsuranceTransferAdvisorUri: 'Insurance — advisor transfer',
  tplInsuranceTransferSupportUri: 'Insurance — support transfer',
  tplInsuranceTransferClaimsUri: 'Insurance — claims transfer',
  tplEcommerceInboundExophone: 'E‑commerce template — inbound exophone',
  tplEcommerceTransferConnectUri: 'E‑commerce — connect to agent',
  tplEcommerceTransferReturnsUri: 'E‑commerce — returns agent',
  tplSharedOutboundExophone: 'Templates — shared outbound exophone',
  tplOnboardingOutboundContact: 'Onboarding — outbound contact',
  tplOrderOutboundContact: 'Order confirmation — outbound contact',
  tplFeedbackOutboundContact: 'Feedback — outbound contact',
  tplOrderTransferRestaurantUri: 'Order — restaurant transfer',
  tplKycVerifyApiUrl: 'KYC template — verify API URL',
  tplKycAsyncApiUrl: 'KYC template — async API URL',
  tplKycWebhookUrl: 'KYC template — webhook URL',
};

/**
 * @param {Partial<typeof DEFAULT_APP_CONFIG>} partial
 * @returns {typeof DEFAULT_APP_CONFIG}
 */
export function mergeAppConfig(partial) {
  return { ...DEFAULT_APP_CONFIG, ...partial };
}
