// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

// Formatting standardization (issue #2383).
//
// `app/utils/format/` is the single canonical implementation of every display
// formatter, kept identical to `app/src/utils/format/` in the SPA — the two
// front-ends render the same figures for the same teams, so they must render
// them the same way.
//
// The primitives below are banned outside that module because each one grew a
// different convention in every file that reached for it. Rules and rationale:
// `.github/copilot-instructions/formatting-standards.md`.

const formattingMessage
  = 'Use the canonical formatters from `app/utils/format` (formatUsd, formatToken, formatNumber, formatPercent, formatDate, formatDateTime, formatAddress, …) instead of formatting by hand. See .github/copilot-instructions/formatting-standards.md and issue #2383.'

const formattingSelectors = [
  {
    selector: 'NewExpression[callee.object.name="Intl"]',
    message: formattingMessage
  },
  {
    selector: 'CallExpression[callee.property.name=/^toLocale(String|DateString|TimeString)$/]',
    message: formattingMessage
  },
  {
    selector: 'CallExpression[callee.property.name="toFixed"]',
    message: `${formattingMessage} For on-chain amounts, pass the unrounded value straight to \`parseUnits\` — never \`parseUnits(x.toFixed(d), d)\`.`
  },
  // `.format('MMM D, YYYY')` — a literal pattern string is the dayjs shape.
  // `formatter.format(value)` passes a value, not a literal, and stays allowed.
  {
    selector: 'CallExpression[callee.property.name="format"][arguments.0.type="Literal"]',
    message: formattingMessage
  }
]

export default withNuxt(
  {
    rules: {
      'vue/no-multiple-template-root': 'off',
      'vue/max-attributes-per-line': ['error', { singleline: 3 }]
    }
  },
  {
    name: 'dashboard/formatting-standards',
    files: ['app/**/*.{ts,vue}', 'server/**/*.ts'],
    ignores: [
      // The canonical implementation — the one place the primitives belong.
      'app/utils/format/**'
    ],
    rules: {
      // Two rules, one selector list: the core rule only walks `<script>`,
      // `vue/no-restricted-syntax` covers `<template>` expressions — and a
      // `{{ x.toFixed(2) }}` in a template is exactly the drift we're stopping.
      'no-restricted-syntax': ['error', ...formattingSelectors],
      'vue/no-restricted-syntax': ['error', ...formattingSelectors]
    }
  }
)
