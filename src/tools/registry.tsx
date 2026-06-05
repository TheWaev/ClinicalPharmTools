import type { ComponentType } from 'react';
import RepeatSync from './repeat-sync/RepeatSync';

/**
 * The single source of truth for the suite's tools.
 *
 * To add a future tool (e.g. CrCl): create a self-contained folder under
 * `src/tools/`, then add one entry here. The home page and the router both
 * read from this list, so no other file needs editing.
 */
export interface ToolDef {
  /** URL slug, e.g. "repeat-sync" -> /#/tools/repeat-sync */
  slug: string;
  name: string;
  /** One-line description shown on the home page card. */
  summary: string;
  status: 'available' | 'planned';
  /** Rendered at the tool's route. Omit for `planned` tools. */
  component?: ComponentType;
}

export const tools: ToolDef[] = [
  {
    slug: 'repeat-sync',
    name: 'Repeat Medication Synchronisation',
    summary:
      'Align a patient’s repeat medications onto a common run-out date and calculate the one-off bridging quantity per item.',
    status: 'available',
    component: RepeatSync,
  },
  {
    slug: 'crcl',
    name: 'Creatinine Clearance (CrCl)',
    summary: 'Cockcroft–Gault creatinine clearance estimate. Planned — not yet available.',
    status: 'planned',
  },
];

export const availableTools = tools.filter(
  (t): t is ToolDef & { component: ComponentType } =>
    t.status === 'available' && typeof t.component !== 'undefined',
);

export function findTool(slug: string): ToolDef | undefined {
  return tools.find((t) => t.slug === slug);
}
