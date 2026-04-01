import { TEMPLATE_LITERAL_REPLACEMENTS } from '../config/appConfigSchema';

/**
 * Deep-clones template definitions and replaces known literals with values from merged config.
 * Replacement order is longest literal first to avoid partial matches.
 *
 * @param {unknown} raw
 * @param {Record<string, string | number>} mergedConfig
 * @returns {unknown}
 */
export function hydrateTemplatesFromRaw(raw, mergedConfig) {
  const json = JSON.stringify(raw);
  let out = json;
  const reps = [...TEMPLATE_LITERAL_REPLACEMENTS].sort((a, b) => b[0].length - a[0].length);
  for (const [literal, key] of reps) {
    const val = mergedConfig[key];
    if (val === undefined || val === null || val === '') continue;
    const s = String(val);
    out = out.split(literal).join(s);
  }
  return JSON.parse(out);
}
