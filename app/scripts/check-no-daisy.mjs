#!/usr/bin/env node
// Fail if any DaisyUI semantic class slips back into app/src.
// DaisyUI was removed in #1920; any of these in a class attribute is dead code.

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname

const DAISY_CLASSES = [
  // layout / surfaces
  'card-body',
  'card-title',
  'card-actions',
  'modal-action',
  'modal-box',
  'hero-content',
  // forms
  'form-control',
  'label-text',
  'label-text-alt',
  'input-bordered',
  'input-sm',
  'input-md',
  'input-lg',
  'input-group',
  'select-bordered',
  'select-sm',
  'textarea-bordered',
  // controls
  'btn-primary',
  'btn-secondary',
  'btn-error',
  'btn-success',
  'btn-warning',
  'btn-info',
  'btn-ghost',
  'btn-outline',
  'btn-circle',
  'btn-square',
  'btn-block',
  'btn-link',
  // feedback
  'loading-spinner',
  'loading-lg',
  'loading-md',
  'loading-sm',
  'loading-xs',
  'progress-info',
  'progress-success',
  'progress-error',
  'progress-warning',
  'skeleton',
  // menus / nav
  'menu-title',
  'menu-disabled',
  'dropdown-end',
  'dropdown-content',
  'tab-bordered',
  'tab-lifted',
  'tab-active',
  'navbar-start',
  'navbar-center',
  'navbar-end',
  // data display
  'stat-title',
  'stat-value',
  'stat-desc',
  'stats',
  'badge-primary',
  'badge-secondary',
  'badge-success',
  'badge-info',
  'badge-warning',
  'badge-error',
  'badge-neutral',
  'badge-outline',
  'avatar-group',
  'timeline-vertical',
  'timeline-compact',
  'timeline-end',
  'timeline-box',
  'timeline-middle',
  // collapse / join
  'collapse-arrow',
  'collapse-title',
  'collapse-content',
  'join-item',
  // tokens
  'bg-base-100',
  'bg-base-200',
  'bg-base-300',
  'text-base-content',
  'border-base-100',
  'border-base-200',
  'border-base-300',
  'rounded-box'
]

const CLASS_ATTR_RE = /class\s*=\s*"([^"]*)"/g
const escape = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
const TOKEN_RES = DAISY_CLASSES.map((c) => new RegExp(`(?:^|\\s)${escape(c)}(?:$|\\s)`))

/** @returns {AsyncGenerator<string>} */
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.name.endsWith('.vue')) yield full
  }
}

const findings = []
for await (const file of walk(ROOT)) {
  const content = await readFile(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    let match
    while ((match = CLASS_ATTR_RE.exec(line)) !== null) {
      const classes = match[1]
      for (let i = 0; i < TOKEN_RES.length; i++) {
        if (TOKEN_RES[i].test(` ${classes} `)) {
          findings.push({
            file: relative(process.cwd(), file),
            line: idx + 1,
            class: DAISY_CLASSES[i],
            attr: match[0]
          })
        }
      }
    }
    CLASS_ATTR_RE.lastIndex = 0
  })
}

if (findings.length === 0) {
  console.log('OK: no DaisyUI residual classes in app/src.')
  process.exit(0)
}

console.error(`Found ${findings.length} DaisyUI residual class usage(s):\n`)
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  →  ${f.class}`)
}
console.error(
  '\nThese classes have no styling effect since DaisyUI was removed (#1920). ' +
    'Replace them with Nuxt UI components or Tailwind utilities.'
)
process.exit(1)
