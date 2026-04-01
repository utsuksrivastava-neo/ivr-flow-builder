/**
 * @file AdminConfigurationsPage.jsx — edit all app defaults (localStorage-backed).
 */
import React, { useMemo } from 'react';
import { CONFIG_GROUPS, CONFIG_LABELS, DEFAULT_APP_CONFIG } from '../config/appConfigSchema';
import useAppConfigStore from '../store/appConfigStore';

const NUMERIC_KEYS = new Set(['autosaveIntervalMs', 'ivrTesterDelayLongMs', 'ivrTesterDelayShortMs']);

export default function AdminConfigurationsPage() {
  const mergedConfig = useAppConfigStore((s) => s.mergedConfig);
  const setPartial = useAppConfigStore((s) => s.setPartial);
  const resetToDefaults = useAppConfigStore((s) => s.resetToDefaults);

  const allKeys = useMemo(() => CONFIG_GROUPS.flatMap((g) => g.keys), []);

  const handleChange = (key, raw) => {
    if (NUMERIC_KEYS.has(key)) {
      const n = parseInt(String(raw).replace(/\D/g, ''), 10);
      if (!Number.isFinite(n) || n < 0) return;
      setPartial(key, n);
      return;
    }
    setPartial(key, raw);
  };

  return (
    <div className="admin-config-page">
      <div className="admin-config-toolbar">
        <h2 className="admin-section-title">All configurations</h2>
        <p className="admin-config-lead">
          Values are stored in this browser only. They apply to new nodes, mock API fallbacks, templates, and UI hints.
        </p>
        <button type="button" className="toolbar-btn danger" onClick={() => resetToDefaults()}>
          Reset all to defaults
        </button>
      </div>

      {CONFIG_GROUPS.map((group) => (
        <section key={group.id} className="admin-config-group">
          <h3 className="admin-config-group-title">{group.label}</h3>
          {group.description && <p className="admin-config-group-desc">{group.description}</p>}
          <div className="admin-form-grid admin-config-grid">
            {group.keys.map((key) => {
              const label = CONFIG_LABELS[key] || key;
              const defValue = DEFAULT_APP_CONFIG[key];
              const value = mergedConfig[key];
              const isNum = NUMERIC_KEYS.has(key);
              return (
                <label key={key} className="admin-field admin-config-field">
                  <span>{label}</span>
                  <input
                    type={isNum ? 'number' : 'text'}
                    className="admin-input"
                    value={value === undefined || value === null ? '' : String(value)}
                    placeholder={defValue !== undefined ? String(defValue) : ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    min={isNum ? 0 : undefined}
                  />
                </label>
              );
            })}
          </div>
        </section>
      ))}

      <p className="admin-config-footnote" aria-hidden>
        Keys defined: {allKeys.length}
      </p>
    </div>
  );
}
