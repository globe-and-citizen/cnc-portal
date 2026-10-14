import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectTables } from './check-markdown-table-readability.mjs'

const header = '| Item | Detail |\n| --- | --- |\n'

test('ignores long link destinations and fenced pseudo-tables', () => {
  const source =
    '```md\n' + header + `| A | ${'x'.repeat(300)} |\n` + '```\n\n' + header +
    `| A | [short](https://example.test/${'path/'.repeat(100)}) |\n`
  assert.deepEqual(inspectTables(source, 'guide.md'), [])
})

test('reports a long visible cell at its row, once for the table', () => {
  const source = header + `| A | ${'x'.repeat(121)} |\n| B | ${'y'.repeat(130)} |\n`
  assert.deepEqual(inspectTables(source, 'guide.md'), [
    { file: 'guide.md', tableLine: 1, flaggedRows: 2, line: 4, maxCell: 130, visible: 131, links: 0 },
  ])
})

test('detects long rows made from individually short cells', () => {
  const source = '| A | B | C |\n| --- | --- | --- |\n' +
    `| ${'a'.repeat(90)} | ${'b'.repeat(90)} | ${'c'.repeat(90)} |\n`
  assert.equal(inspectTables(source, 'guide.md')[0].visible, 270)
})

test('detects many links while keeping destinations out of visible width', () => {
  const links = Array.from({ length: 6 }, (_, index) => `[${index}](target-${index}.md)`).join(', ')
  const result = inspectTables(header + `| A | ${links} |\n`, 'guide.md')[0]
  assert.equal(result.links, 6)
  assert.ok(result.maxCell < 120)
})

test('parses escaped pipes and inline code without splitting a cell', () => {
  const source = header + '| `a|b` | a\\|b |\n'
  assert.deepEqual(inspectTables(source, 'guide.md'), [])
})

test('checks table headings as well as body cells', () => {
  const source = `| ${'x'.repeat(121)} | Detail |\n| --- | --- |\n| A | Short |\n`
  const result = inspectTables(source, 'guide.md')[0]
  assert.equal(result.line, 1)
  assert.equal(result.maxCell, 121)
})
