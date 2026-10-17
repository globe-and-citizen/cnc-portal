import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const scriptsDir = fileURLToPath(new URL('.', import.meta.url))
const requireFromApp = createRequire(join(scriptsDir, '../app/package.json'))
const { JSDOM, VirtualConsole } = requireFromApp('jsdom')
const html = readFileSync(join(scriptsDir, 'audit-contract-coverage.html'), 'utf8')
const generator = readFileSync(join(scriptsDir, 'audit-contract-coverage.mjs'), 'utf8')
const reportPattern = /<script id="report" type="application\/json">([\s\S]*?)<\/script>/
const inlineScriptPattern = /<script>\n(  const report =[\s\S]*?)\n<\/script>\n<\/body>/

test('the checked-in report uses the generator script', () => {
  assert.equal(html.match(inlineScriptPattern)?.[1], generator.match(inlineScriptPattern)?.[1])
})

test('report data remains text and filtering still works', () => {
  const report = JSON.parse(html.match(reportPattern)[1])
  const contract = report.contracts.find((item) => item.functions.length > 1)
  assert.ok(contract)
  contract.functions[0].status = 'partial'

  const payload = '<img src=x onerror="window.injected=true">'
  contract.slug = payload
  contract.abiFile = payload
  contract.functions[0].name = payload
  contract.functions[0].signature = payload
  contract.functions[0].kind = payload
  contract.functions[1].status = payload
  contract.orphans.mocksWithoutComposable.push(payload)

  const json = JSON.stringify(report)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => errors.push(error))
  const dom = new JSDOM(html.replace(reportPattern, () =>
    `<script id="report" type="application/json">${json}</script>`), {
    runScripts: 'dangerously',
    virtualConsole
  })
  const { document, Event } = dom.window

  assert.deepEqual(errors, [])
  assert.equal(document.querySelectorAll('.card').length, report.contracts.length)
  assert.equal(document.querySelector('option[value="__all__"]').textContent, '(all contracts)')
  assert.equal(document.querySelector('#contract-select option:nth-child(2)').value, payload)
  assert.equal(document.querySelectorAll('img').length, 0)
  assert.equal(dom.window.injected, undefined)
  assert.ok(document.querySelector('#content').textContent.includes(payload))

  const selector = document.getElementById('contract-select')
  selector.value = payload
  selector.dispatchEvent(new Event('change'))
  assert.equal(document.querySelectorAll('.card').length, 1)

  const status = document.getElementById('status-filter')
  status.value = 'partial'
  status.dispatchEvent(new Event('change'))
  assert.equal(
    document.querySelectorAll('tbody tr').length,
    contract.functions.filter((fn) => fn.status === 'partial').length
  )
  assert.equal(document.querySelectorAll('img').length, 0)
  dom.window.close()
})
