const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs']);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** English Title Case for headings, buttons, tabs and chips (same rule as the website). Brand names and acronyms keep their capitals. */
export function titleCase(s: string): string {
  const parts = s.split(/(\s+)/); const words = parts.filter((p) => p.trim()); let wi = 0;
  return parts.map((p) => {
    if (!p.trim()) return p;
    const first = wi === 0, last = wi === words.length - 1; wi++;
    const m = p.match(/[A-Za-z]/); if (!m || m.index === undefined) return p;
    const i = m.index, core = p.slice(i);
    if (/[A-Z]/.test(core.slice(1)) || /\d/.test(core) || /^[A-Z]{2,}/.test(core)) return p;
    const bare = core.replace(/[^A-Za-z]/g, '').toLowerCase();
    if (!first && !last && SMALL.has(bare)) return p.slice(0, i) + core.charAt(0).toLowerCase() + core.slice(1);
    return p.slice(0, i) + core.split('-').map(cap).join('-');
  }).join('');
}
/** Headings that are really sentences keep sentence case. */
export const looksLikeSentence = (s: string) => /\.\s|\.$/.test(s) || s.length > 80 || /^[\d+−-]/.test(s) || /^RM\u00A0|^RM /.test(s);
