import { describe, it, expect } from 'vitest';
import { migrateHangupNodeLabels } from '../utils/flowLabelMigrations';

describe('migrateHangupNodeLabels', () => {
  it('renames legacy Hang Up / Hangup labels to End Call', () => {
    const nodes = [
      { id: 'a', type: 'hangupNode', data: { label: 'Hang Up' } },
      { id: 'b', type: 'hangupNode', data: { label: 'Hangup' } },
      { id: 'c', type: 'sayNode', data: { label: 'Say' } },
    ];
    const out = migrateHangupNodeLabels(nodes);
    expect(out[0].data.label).toBe('End Call');
    expect(out[1].data.label).toBe('End Call');
    expect(out[2].data.label).toBe('Say');
  });

  it('leaves End Call and other labels unchanged', () => {
    const nodes = [{ id: 'a', type: 'hangupNode', data: { label: 'End Call' } }];
    expect(migrateHangupNodeLabels(nodes)[0].data.label).toBe('End Call');
  });
});
