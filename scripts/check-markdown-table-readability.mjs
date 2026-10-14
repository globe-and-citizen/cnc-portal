import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

export const limits = Object.freeze({ cell: 120, row: 260, links: 5 })

const markdown = new MarkdownIt()

function visibleCell(inline) {
  let text = ''
  let links = 0

  for (const token of inline.children ?? []) {
    if (['text', 'code_inline', 'image'].includes(token.type)) text += token.content
    if (token.type === 'html_inline') text += token.content.replace(/<[^>]*>/gu, '')
    if (['softbreak', 'hardbreak'].includes(token.type)) text += ' '
    if (token.type === 'link_open') links += 1
  }

  return { length: Array.from(text.replace(/\s+/gu, ' ').trim()).length, links }
}

export function inspectTables(source, file, thresholds = limits) {
  const results = []
  let table
  let row
  let cell

  for (const token of markdown.parse(source, {})) {
    if (token.type === 'table_open') {
      table = { file, line: token.map[0] + 1, rows: [] }
    } else if (token.type === 'table_close') {
      const flagged = table.rows.filter(
        (entry) =>
          entry.maxCell > thresholds.cell ||
          entry.visible > thresholds.row ||
          entry.links > thresholds.links,
      )
      if (flagged.length) {
        const worst = flagged.reduce((current, entry) =>
          Math.max(entry.maxCell / thresholds.cell, entry.visible / thresholds.row, entry.links / thresholds.links) >
          Math.max(current.maxCell / thresholds.cell, current.visible / thresholds.row, current.links / thresholds.links)
            ? entry
            : current,
        )
        results.push({ file, tableLine: table.line, flaggedRows: flagged.length, ...worst })
      }
      table = undefined
    } else if (table && token.type === 'tr_open') {
      row = { line: token.map[0] + 1, cells: [], links: 0 }
    } else if (row && ['th_open', 'td_open'].includes(token.type)) {
      cell = { length: 0, links: 0 }
    } else if (cell && token.type === 'inline') {
      cell = visibleCell(token)
    } else if (cell && ['th_close', 'td_close'].includes(token.type)) {
      row.cells.push(cell.length)
      row.links += cell.links
      cell = undefined
    } else if (row && token.type === 'tr_close') {
      if (row.cells.length) {
        table.rows.push({
          line: row.line,
          maxCell: Math.max(...row.cells),
          visible: row.cells.reduce((sum, length) => sum + length, 0),
          links: row.links,
        })
      }
      row = undefined
    }
  }

  return results
}

function githubProperty(value) {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll(',', '%2C')
}

export function formatWarning(result) {
  const message =
    `Table starting at line ${result.tableLine} has ${result.flaggedRows} dense row(s); ` +
    `example row: ${result.visible} visible chars, longest cell ${result.maxCell}, ${result.links} links. ` +
    'Consider a short comparison table plus a list or section for details; preserve IDs and links.'
  return process.env.GITHUB_ACTIONS === 'true'
    ? `::warning file=${githubProperty(result.file)},line=${result.line},title=Markdown table readability::${message}`
    : `${result.file}:${result.line}: warning: ${message}`
}

function main() {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => file.endsWith('.md') && existsSync(file))
  const results = files.flatMap((file) => inspectTables(readFileSync(file, 'utf8'), file))

  for (const result of results) console.log(formatWarning(result))
  console.log(`Markdown table readability: ${results.length} table(s) to review across ${files.length} tracked files. Advisory only.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
