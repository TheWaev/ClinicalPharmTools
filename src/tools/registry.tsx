import type { ComponentType } from 'react';
import type { Icon } from '@phosphor-icons/react';
import RepeatSync from './repeat-sync/RepeatSync';
import CrCl from './crcl/CrCl';
import WeightMgmt from './weight-management/WeightMgmt';
import AfRisk from './af-risk/AfRisk';
import AcbCalc from './acb/AcbCalc';
import OpioidConvert from './opioid/OpioidConvert';
import {
  CalculatorIcon,
  HeartPulseIcon,
  ScalesIcon,
  PulseIcon,
  BrainIcon,
  ConvertIcon,
} from '../components/icons';

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
  /** Icon shown on the home page card. */
  icon: Icon;
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
    icon: CalculatorIcon,
    component: RepeatSync,
  },
  {
    slug: 'crcl',
    name: 'Creatinine Clearance (CrCl)',
    summary:
      'Estimate creatinine clearance (Cockcroft–Gault) for renal dose adjustment, with actual / ideal / adjusted body weight.',
    status: 'available',
    icon: HeartPulseIcon,
    component: CrCl,
  },
  {
    slug: 'weight-management',
    name: 'Weight Management Eligibility',
    summary:
      'Check eligibility for NHS tirzepatide (Mounjaro) weight management against the South East London pathway.',
    status: 'available',
    icon: ScalesIcon,
    component: WeightMgmt,
  },
  {
    slug: 'af-risk',
    name: 'Atrial Fibrillation Risk',
    summary:
      'CHA₂DS₂-VASc stroke risk and ORBIT bleeding risk (NICE NG196) to support anticoagulation decisions.',
    status: 'available',
    icon: PulseIcon,
    component: AfRisk,
  },
  {
    slug: 'acb',
    name: 'Anticholinergic Burden (ACB)',
    summary:
      'Total a patient’s anticholinergic cognitive burden from their medicines (ACB scale); flags a score ≥3.',
    status: 'available',
    icon: BrainIcon,
    component: AcbCalc,
  },
  {
    slug: 'opioid-converter',
    name: 'Opioid Dose Converter',
    summary:
      'Approximate oral morphine equivalent (OME) and opioid switching guide, with cross-tolerance and safety caveats.',
    status: 'available',
    icon: ConvertIcon,
    component: OpioidConvert,
  },
];

export const availableTools = tools.filter(
  (t): t is ToolDef & { component: ComponentType } =>
    t.status === 'available' && typeof t.component !== 'undefined',
);

export function findTool(slug: string): ToolDef | undefined {
  return tools.find((t) => t.slug === slug);
}
