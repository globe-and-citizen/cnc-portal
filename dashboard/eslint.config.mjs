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

// Migration debt — every file that still formats by hand. This list only ever
// shrinks. If you're about to add an entry, extend `app/utils/format/` instead:
// the ceiling below fails lint at config load if the list grows.
const formattingLegacyFiles = [
  'app/components/accounting/AccountingIdentitiesCard.vue',
  'app/components/accounting/AccountingIncomeStatement.vue',
  'app/components/accounting/AccountingLedger.vue',
  'app/components/accounting/AccountingPositions.vue',
  'app/components/contracts/ContractHistoryCard.vue',
  'app/components/features/TeamOverridesSection.vue',
  'app/components/sections/FeeCollectorView/FeeConfigList.vue',
  'app/components/stats/StatsActivitySection.vue',
  'app/components/stats/StatsOverviewSection.vue',
  'app/components/teams/ContractBalance.vue',
  'app/components/teams/ProjectTvlCard.vue',
  'app/components/teams/TeamOfficersCell.vue',
  'app/components/teams/TeamsList.vue',
  'app/composables/useTeamsBalanceRecaps.ts',
  'app/pages/contracts/history.vue',
  'app/pages/features/index.vue',
  // Escaped: an unescaped `[id]` would read as a glob character class.
  'app/pages/teams/\\[id\\].vue',
  'app/queries/contractTokenBalances.query.ts',
  'app/utils/currency.ts',
  'app/utils/datePicker.ts',
  'app/utils/generalUtil.ts',
  'app/utils/mergedLedger.ts'
]

const FORMATTING_LEGACY_MAX = 22
if (formattingLegacyFiles.length > FORMATTING_LEGACY_MAX) {
  throw new Error(
    `formattingLegacyFiles has ${formattingLegacyFiles.length} entries (ceiling ${FORMATTING_LEGACY_MAX}). `
    + 'Format through `app/utils/format` instead of whitelisting a new file — see '
    + '.github/copilot-instructions/formatting-standards.md.'
  )
}

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
      'app/utils/format/**',
      ...formattingLegacyFiles
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
