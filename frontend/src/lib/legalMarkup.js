/**
 * Tiny text format used to store the Terms / Privacy Policy in the database so an
 * admin can edit them in a plain textarea:
 *
 *   Intro paragraph(s) before the first heading.
 *
 *   ## Section title
 *   A paragraph. Blank lines separate paragraphs.
 *
 *   - bullet one
 *   - bullet two
 *
 * Text without any `##` headings is shown as a plain document (line breaks kept),
 * so older free-form text keeps working.
 */

function slugify(title, used) {
  let base = /^grievance/i.test(title)
    ? 'grievance'
    : title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section'
  let id = base
  let n = 2
  while (used.has(id)) id = `${base}-${n++}`
  used.add(id)
  return id
}

/** @returns {{ intro: string, sections: { id: string, title: string, content: (string|string[])[] }[] }} */
export function parseLegalText(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const hasHeadings = lines.some((l) => /^##\s+\S/.test(l))
  if (!hasHeadings) return { intro: String(text || '').trim(), sections: [] }

  const intro = []
  const sections = []
  const usedIds = new Set()
  let current = null
  let para = []
  let list = null

  const blocks = () => (current ? current.content : intro)
  const flushPara = () => {
    if (para.length) blocks().push(para.join(' '))
    para = []
  }
  const flushList = () => {
    if (list?.length) blocks().push(list)
    list = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    const heading = line.match(/^##\s+(.+)$/)
    if (heading) {
      flushPara()
      flushList()
      const title = heading[1].trim()
      current = { id: slugify(title, usedIds), title, content: [] }
      sections.push(current)
    } else if (/^[-•]\s+/.test(line)) {
      flushPara()
      list = list || []
      list.push(line.replace(/^[-•]\s+/, ''))
    } else if (!line) {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()

  return { intro: intro.filter((b) => typeof b === 'string').join('\n\n'), sections }
}

/** Inverse of parseLegalText — used to produce the default text stored in the database. */
export function legalDocToText(doc) {
  const out = []
  if (doc.intro) out.push(doc.intro)
  for (const s of doc.sections) {
    out.push(`## ${s.title}`)
    for (const block of s.content) {
      out.push(Array.isArray(block) ? block.map((b) => `- ${b}`).join('\n') : block)
    }
  }
  return out.join('\n\n') + '\n'
}
