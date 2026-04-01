import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const nodeTypeLabels = {
  startNode: 'Start (Incoming Call)',
  menuNode: 'IVR Menu',
  playNode: 'Play Audio (StartPlay)',
  sayNode: 'Say / TTS (StartSay)',
  messageNode: 'Greetings (Say)',
  voicebotNode: 'Voicebot (StartStream)',
  transferNode: 'Transfer Call (Dial)',
  recordNode: 'Record (StartRecording)',
  startRecordNode: 'Start Recording',
  stopRecordNode: 'Stop Recording',
  hangupNode: 'End Call (Hangup)',
  gatherNode: 'Gather Digits (Gather)',
  conditionNode: 'Condition',
  apiCallNode: 'API Call',
  syncApiNode: 'Sync API Call',
  asyncApiNode: 'Async API Call',
  voicemailNode: 'Voicemail',
};

function buildFlowTree(nodes, edges) {
  const tree = [];
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  const visited = new Set();

  function walk(nodeId, depth = 0, parentKey = '') {
    if (visited.has(nodeId) || !nodeMap[nodeId]) return;
    visited.add(nodeId);
    const node = nodeMap[nodeId];
    const entry = {
      id: node.id,
      type: nodeTypeLabels[node.type] || node.type,
      label: node.data.label || '',
      depth,
      parentKey,
      details: getNodeDetails(node),
      children: [],
    };
    tree.push(entry);

    const outEdges = edges.filter((e) => e.source === nodeId);
    outEdges.forEach((e) => {
      const handleLabel = e.sourceHandle
        ? e.sourceHandle.replace('dtmf-', 'Press ').replace('default', '→')
        : '→';
      const child = walk(e.target, depth + 1, handleLabel);
      if (child) entry.children.push({ key: handleLabel, nodeId: e.target });
    });

    return entry;
  }

  const startNode = nodes.find((n) => n.type === 'startNode');
  if (startNode) walk(startNode.id);

  nodes.forEach((n) => {
    if (!visited.has(n.id)) walk(n.id);
  });

  return tree;
}

function getNodeDetails(node) {
  const d = node.data;
  switch (node.type) {
    case 'startNode':
      return `Exophone: ${d.exophone || '—'}\nEvent Endpoint: ${d.eventEndpoint || '—'}`;
    case 'menuNode': {
      let s = `Prompt: ${d.prompt || '—'}\nOptions:\n`;
      (d.options || []).forEach((o) => (s += `  Press ${o.key} → ${o.label}\n`));
      s += `Timeout: ${d.timeout || 5}s\nMax Retries: ${d.maxRetries || 3}`;
      return s;
    }
    case 'playNode':
      return `Audio URL: ${d.audioUrl || '—'}\nLoop: ${d.loop || 1}`;
    case 'sayNode':
      return `Message: ${d.message || '—'}\nEngine: ${d.ttsEngine || 'polly'}\nVoice: ${d.ttsVoice || 'Aditi'}\nLanguage: ${d.ttsLanguage || 'en'}`;
    case 'voicebotNode':
      return `Stream Type: ${d.streamType || 'bidirectional'}\nStream URL: ${d.streamUrl || '—'}`;
    case 'transferNode':
      return `Contact: ${d.contactUri || '—'}\nExophone: ${d.exophone || '—'}\nNetwork: ${d.networkType || 'pstn'}\nTimeout: ${d.timeout || 30}s`;
    case 'recordNode':
      return `Direction: ${d.direction || 'both'}\nFormat: ${d.format || 'mp3'}\nBitrate: ${d.bitrate || '8'}\nStorage: ${d.storageType || 's3'}`;
    case 'hangupNode':
      return 'Ends the call.';
    case 'gatherNode': {
      const pt = d.promptType || 'none';
      let promptLine = '';
      if (pt === 'tts') promptLine = `Prompt (TTS): ${d.prompt || '—'}\nEngine: ${d.ttsEngine || 'polly'} · Voice: ${d.ttsVoice || 'Aditi'}\n`;
      else if (pt === 'audio') promptLine = `Prompt (audio): ${d.audioUrl || '—'}\n`;
      return `${promptLine}Digits: ${d.numDigits || 1}\nTimeout: ${d.timeout || 10}s\nFinish Key: ${d.finishOnKey || '#'}`;
    }
    case 'messageNode':
      return `Greeting: ${d.message || '—'}`;
    case 'startRecordNode':
      return `Direction: ${d.direction || 'both'}\nFormat: ${d.format || 'mp3'}\nBitrate: ${d.bitrate || '8'}\nStorage: ${d.storageType || 's3'}`;
    case 'stopRecordNode':
      return 'Stops active recording.';
    case 'syncApiNode':
      return `Method: ${d.method || 'POST'}\nURL: ${d.url || '—'}\nTimeout: ${d.timeout || 10}s\nSuccess: ${d.successCondition || '2xx'}`;
    case 'asyncApiNode':
      return `Method: ${d.method || 'POST'}\nURL: ${d.url || '—'}\nCallback: ${d.callbackUrl || '—'}`;
    case 'apiCallNode':
      return `Mode: ${d.mode || 'sync'}\nMethod: ${d.method || 'POST'}\nURL: ${d.url || '—'}`;
    case 'voicemailNode':
      return `Greeting: ${d.message || '—'}\nSilence: ${d.silenceInSec || 5}s\nFinish Key: ${d.finishOnKey || '#'}\nMax Time: ${d.timeoutInSec || 30}s`;
    default:
      return '';
  }
}

function addSheetFromRows(workbook, name, rows, columnWidths) {
  const ws = workbook.addWorksheet(name);
  if (rows.length > 0) {
    ws.addRow(Object.keys(rows[0]));
    rows.forEach((row) => ws.addRow(Object.values(row)));
  }
  columnWidths.forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });
}

export async function exportToExcel(flowData) {
  const { nodes, edges, projectName } = flowData;
  const tree = buildFlowTree(nodes, edges);

  const nodesSheet = tree.map((entry) => ({
    'Step': entry.depth + 1,
    'Indent': '  '.repeat(entry.depth),
    'Node ID': entry.id,
    'Type': entry.type,
    'Label': entry.label,
    'Trigger / Key': entry.parentKey || 'Start',
    'Configuration': entry.details,
  }));

  const edgesSheet = edges.map((e) => {
    const srcNode = nodes.find((n) => n.id === e.source);
    const tgtNode = nodes.find((n) => n.id === e.target);
    return {
      'From': srcNode?.data.label || e.source,
      'From Type': nodeTypeLabels[srcNode?.type] || '',
      'Handle / Key': e.sourceHandle || 'default',
      'To': tgtNode?.data.label || e.target,
      'To Type': nodeTypeLabels[tgtNode?.type] || '',
    };
  });

  const menuDetails = [];
  nodes.filter((n) => n.type === 'menuNode').forEach((n) => {
    const d = n.data;
    (d.options || []).forEach((opt) => {
      const targetEdge = edges.find((e) => e.source === n.id && e.sourceHandle === `dtmf-${opt.key}`);
      const targetNode = targetEdge ? nodes.find((nd) => nd.id === targetEdge.target) : null;
      menuDetails.push({
        'Menu': d.label,
        'Key': opt.key,
        'Option Label': opt.label,
        'Routes To': targetNode?.data.label || '(not connected)',
        'Prompt': d.prompt || '',
        'Timeout (s)': d.timeout || 5,
        'Max Retries': d.maxRetries || 3,
      });
    });
  });

  const workbook = new ExcelJS.Workbook();
  addSheetFromRows(workbook, 'IVR Flow', nodesSheet, [6, 10, 20, 18, 20, 15, 60]);
  addSheetFromRows(workbook, 'Connections', edgesSheet, [20, 18, 15, 20, 18]);
  if (menuDetails.length > 0) {
    addSheetFromRows(workbook, 'Menu Details', menuDetails, [18, 6, 18, 20, 40, 12, 12]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${projectName.replace(/\s+/g, '_')}_IVR.xlsx`);
}

export function exportToWord(flowData) {
  const { nodes, edges, projectName } = flowData;
  const tree = buildFlowTree(nodes, edges);

  const children = [];

  children.push(
    new Paragraph({
      text: projectName,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      text: `Generated on ${new Date().toLocaleString()}`,
      spacing: { after: 400 },
      style: 'Subtitle',
    })
  );

  children.push(
    new Paragraph({
      text: 'IVR Flow Overview',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    })
  );

  tree.forEach((entry) => {
    const indent = entry.depth * 720;
    const prefix = entry.parentKey ? `[${entry.parentKey}] ` : '';

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${prefix}${entry.label}`, bold: true, size: 24 }),
          new TextRun({ text: `  (${entry.type})`, italics: true, size: 20, color: '666666' }),
        ],
        spacing: { before: 150, after: 80 },
        indent: { left: indent },
      })
    );

    if (entry.details) {
      entry.details.split('\n').forEach((line) => {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 40 },
            indent: { left: indent + 360 },
            style: 'ListParagraph',
          })
        );
      });
    }
  });

  const menuNodes = nodes.filter((n) => n.type === 'menuNode');
  if (menuNodes.length > 0) {
    children.push(
      new Paragraph({
        text: 'Menu Configurations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    menuNodes.forEach((mn) => {
      const d = mn.data;
      children.push(
        new Paragraph({
          text: d.label,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Prompt: ', bold: true }),
            new TextRun({ text: d.prompt || '—' }),
          ],
          spacing: { after: 80 },
        })
      );

      const headerRow = new TableRow({
        children: ['Key', 'Label', 'Routes To'].map(
          (text) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF' })] })],
              shading: { fill: '3B82F6' },
              width: { size: 3000, type: WidthType.DXA },
            })
        ),
      });

      const rows = (d.options || []).map((opt) => {
        const targetEdge = edges.find((e) => e.source === mn.id && e.sourceHandle === `dtmf-${opt.key}`);
        const targetNode = targetEdge ? nodes.find((n) => n.id === targetEdge.target) : null;
        return new TableRow({
          children: [opt.key, opt.label, targetNode?.data.label || '(not connected)'].map(
            (text) =>
              new TableCell({
                children: [new Paragraph({ text, spacing: { after: 40 } })],
                width: { size: 3000, type: WidthType.DXA },
              })
          ),
        });
      });

      children.push(
        new Table({
          rows: [headerRow, ...rows],
          width: { size: 9000, type: WidthType.DXA },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Timeout: ${d.timeout || 5}s  |  Max Retries: ${d.maxRetries || 3}`, size: 20 }),
          ],
          spacing: { before: 80, after: 100 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${projectName.replace(/\s+/g, '_')}_IVR.docx`);
  });
}

export function exportToJSON(flowData) {
  const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
  saveAs(blob, `${flowData.projectName.replace(/\s+/g, '_')}_IVR.json`);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
