// Bromley PCNs and their member GP practices, sourced from NHS ODS (ORD API)
// and refreshed via `npm run build:practices` (scripts/build-bromley-practices.mjs).
import raw from './bromleyPractices.json';

export interface Pcn {
  name: string;
  code: string;
  practices: string[];
}

const data = raw as { source: string; pcns: Pcn[] };

export const odsSource: string = data.source;
export const pcns: Pcn[] = data.pcns;
export const pcnNames: string[] = data.pcns.map((p) => p.name);

/** Sentinel for a practice not in the ODS list (locum, new merge, etc.). */
export const OTHER_PRACTICE = 'Other / not listed';

export function practicesForPcn(pcnName: string): string[] {
  return data.pcns.find((p) => p.name === pcnName)?.practices ?? [];
}
