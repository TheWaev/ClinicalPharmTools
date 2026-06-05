/**
 * Persistent clinical disclaimer + information-governance reminder (PRD §7).
 * Rendered in the footer on every page so it is always visible.
 */
export default function Disclaimer() {
  return (
    <div
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p className="font-semibold">Clinical disclaimer</p>
      <p className="mt-1">
        This is a calculation aid only. All quantities must be clinically reviewed; the final
        prescribing decision rests with the prescriber. It does not account for clinical factors,
        interactions, titration or dose changes.
      </p>
      <p className="mt-2 font-semibold">Do not enter patient-identifiable data</p>
      <p className="mt-1">
        Do not type patient names, NHS numbers, dates of birth or any other identifiers into this
        tool.
      </p>
    </div>
  );
}
