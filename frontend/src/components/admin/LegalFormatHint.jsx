/** Explains the text format used by the Terms / Privacy editors in the Admin panel. */
export function LegalFormatHint() {
  return (
    <div className="mb-4 rounded-xl bg-emerald-50 p-3.5 text-[13px] leading-relaxed text-emerald-900 ring-1 ring-emerald-100">
      <p className="font-bold">How to format</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>
          Start each section with <code className="rounded bg-white px-1 font-mono text-[12px]">## Section title</code> — sections are
          numbered automatically and shown in the contents list.
        </li>
        <li>Leave a blank line between paragraphs.</li>
        <li>
          Start list items with <code className="rounded bg-white px-1 font-mono text-[12px]">- </code> (dash and a space).
        </li>
        <li>
          A section titled “Grievance …” shows the Grievance Officer and company contact cards. Changes appear in the apps and website
          right after you save.
        </li>
      </ul>
    </div>
  )
}
