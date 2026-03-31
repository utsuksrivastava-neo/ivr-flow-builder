import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { nanoid } from 'nanoid';
import { autoLayoutNodes } from '../utils/layoutUtils';
import { validateFlow, getIssueCountsForNodes } from '../utils/validationUtils';

const defaultStartNode = {
  id: 'start-1',
  type: 'startNode',
  position: { x: 80, y: 300 },
  data: {
    label: 'Outbound Call',
    callDirection: 'outbound',
    contactUri: '09163816621',
    exophone: '08030752400',
    eventEndpoint: 'grpc://127.0.0.1:9001',
  },
};

const useFlowStore = create((set, get) => ({
  nodes: [defaultStartNode],
  edges: [],
  selectedNodeId: null,
  projectName: 'My IVR Flow',
  apiLogs: [],
  simulationActive: false,
  simulationPath: [],
  validationIssues: [],
  validationNodeCounts: {},
  validationVisible: false,

  setProjectName: (name) => set({ projectName: name }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const edge = {
      ...connection,
      id: `e-${nanoid(8)}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#394FB6', strokeWidth: 2 },
    };
    set({ edges: addEdge(edge, get().edges) });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return nodes.find((n) => n.id === selectedNodeId) || null;
  },

  addNode: (type, position) => {
    const id = `${type}-${nanoid(8)}`;
    const defaults = getNodeDefaults(type);
    const newNode = {
      id,
      type,
      position,
      data: { ...defaults },
    };
    set({ nodes: [...get().nodes, newNode], selectedNodeId: id });
    return id;
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
      ),
    });
  },

  deleteNode: (nodeId) => {
    const target = get().nodes.find((n) => n.id === nodeId);
    if (!target || target.type === 'startNode') return;
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node || node.type === 'startNode') return;
    const id = `${node.type}-${nanoid(8)}`;
    const newNode = {
      ...node,
      id,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data },
      selected: false,
    };
    set({ nodes: [...get().nodes, newNode], selectedNodeId: id });
  },

  clearCanvas: () => {
    set({
      nodes: [defaultStartNode],
      edges: [],
      selectedNodeId: null,
      apiLogs: [],
      simulationActive: false,
      simulationPath: [],
      validationIssues: [],
      validationNodeCounts: {},
      validationVisible: false,
    });
  },

  addApiLog: (log) => {
    set({ apiLogs: [...get().apiLogs, { id: nanoid(8), timestamp: new Date().toISOString(), ...log }] });
  },

  clearApiLogs: () => set({ apiLogs: [] }),

  setSimulationActive: (active) => set({ simulationActive: active, simulationPath: active ? [] : [] }),

  addSimulationStep: (nodeId) => {
    set({ simulationPath: [...get().simulationPath, nodeId] });
  },

  getFlowData: () => {
    const { nodes, edges, projectName } = get();
    return { projectName, nodes, edges };
  },

  loadFlowData: (data) => {
    set({
      projectName: data.projectName || 'Imported Flow',
      nodes: data.nodes || [defaultStartNode],
      edges: data.edges || [],
      selectedNodeId: null,
      validationIssues: [],
      validationNodeCounts: {},
    });
  },

  applyAutoLayout: () => {
    const { nodes, edges } = get();
    const layouted = autoLayoutNodes(nodes, edges, 'LR');
    set({ nodes: layouted });
  },

  runValidation: () => {
    const { nodes, edges } = get();
    const issues = validateFlow(nodes, edges);
    const counts = getIssueCountsForNodes(issues);
    set({ validationIssues: issues, validationNodeCounts: counts, validationVisible: true });
    return issues;
  },

  clearValidation: () => {
    set({ validationIssues: [], validationNodeCounts: {}, validationVisible: false });
  },

  setValidationVisible: (v) => set({ validationVisible: v }),
}));

function getNodeDefaults(type) {
  switch (type) {
    case 'startNode':
      return {
        label: 'Outbound Call',
        callDirection: 'outbound',
        contactUri: '09163816621',
        exophone: '08030752400',
        eventEndpoint: 'grpc://127.0.0.1:9001',
      };
    case 'menuNode':
      return {
        label: 'IVR Menu',
        prompt: 'Welcome! Press 1 for Sales, Press 2 for Support.',
        promptType: 'tts',
        audioUrl: '',
        ttsEngine: 'polly',
        ttsVoice: 'Aditi',
        ttsLanguage: 'en',
        options: [
          { key: '1', label: 'Sales' },
          { key: '2', label: 'Support' },
        ],
        timeout: 5,
        maxRetries: 3,
        invalidMessage: 'Invalid option. Please try again.',
      };
    case 'playNode':
      return {
        label: 'Play Audio',
        audioUrl: 'https://exotel.s3.mum-1.amazonaws.com/123.wav',
        loop: 1,
        username: '',
        password: '',
      };
    case 'sayNode':
      return {
        label: 'Say Message',
        message: 'Thank you for calling.',
        ttsEngine: 'polly',
        ttsVoice: 'Aditi',
        ttsLanguage: 'en',
        loop: 1,
      };
    case 'voicebotNode':
      return {
        label: 'Voicebot',
        streamType: 'bidirectional',
        streamUrl: 'wss://bot.example.com/voice',
        greeting: 'Hello! How can I help you today?',
        secureDtmf: false,
      };
    case 'transferNode':
      return {
        label: 'Transfer Call',
        contactUri: '09163816623',
        exophone: '08030752400',
        networkType: 'pstn',
        timeout: 30,
        customParam: '',
      };
    case 'recordNode':
      return {
        label: 'Record',
        direction: 'both',
        format: 'mp3',
        bitrate: '8',
        channel: 'mono',
        storageType: 's3',
        storageUrl: '',
      };
    case 'hangupNode':
      return {
        label: 'Hang Up',
      };
    case 'gatherNode':
      return {
        label: 'Gather Digits',
        numDigits: 1,
        timeout: 10,
        finishOnKey: '#',
        prompt: '',
        promptType: 'none',
      };
    case 'apiCallNode':
      return {
        label: 'API Call',
        mode: 'sync',
        method: 'POST',
        url: 'https://api.example.com/check',
        headers: '{"Content-Type": "application/json"}',
        body: '{"phone": "{{caller_number}}"}',
        timeout: 10,
        callbackUrl: '',
        responseVariable: 'api_response',
        successCondition: '2xx',
      };
    case 'conditionNode':
      return {
        label: 'Condition',
        variable: 'digits',
        conditions: [
          { operator: 'equals', value: '1', label: 'Option 1' },
          { operator: 'equals', value: '2', label: 'Option 2' },
        ],
      };
    default:
      return { label: 'Node' };
  }
}

export default useFlowStore;
