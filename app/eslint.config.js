import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

const tailwindClassAssertionMessage =
  'Avoid asserting on Tailwind / utility classes — they break on every styling refactor. Prefer data-test selectors and behavioral assertions (text, emitted, attributes). See app/src/tests/README.md.'

// Direct: expect(x.classes()).toContain(...)
const tailwindClassAssertion = {
  selector:
    "CallExpression[callee.object.callee.name='expect'][callee.object.arguments.0.type='CallExpression'][callee.object.arguments.0.callee.property.name='classes']",
  message: tailwindClassAssertionMessage
}

// Optional chain: expect(x?.classes()).toContain(...)
const tailwindClassAssertionOptional = {
  selector:
    "CallExpression[callee.object.callee.name='expect'][callee.object.arguments.0.type='ChainExpression'][callee.object.arguments.0.expression.callee.property.name='classes']",
  message: tailwindClassAssertionMessage
}

// Includes matcher: x.classes().includes('...') — same fragility, different assertion shape
const tailwindClassIncludes = {
  selector:
    "CallExpression[callee.property.name='includes'][callee.object.type='CallExpression'][callee.object.callee.property.name='classes']",
  message: tailwindClassAssertionMessage
}

const vmCast = {
  selector: "TSAsExpression > MemberExpression.expression[property.name='vm']",
  message:
    'Avoid casting `wrapper.vm as Xxx` to reach component internals — it couples tests to implementation. Drive the component through DOM events (setValue, trigger) and assert via emitted()/text()/props. See app/src/tests/README.md.'
}

// Global-mock enforcement (issue #2014).
//
// `app/vitest.config.ts` loads a set of setup files from `src/tests/setup/`
// that call `vi.mock(...)` once for every commonly used dependency
// (wagmi, viem, TanStack Query, Pinia stores, the Nuxt UI primitives we
// stub, the `@/composables/<domain>/{reads,writes}` ERC20-style modules,
// the canned query hooks, …). Helpers for tweaking those mocks per test
// live under `@/tests/mocks`.
//
// New specs must reuse the global mocks rather than re-declare a local
// `vi.mock('<same-path>')` block — re-mocking shadows the global setup,
// duplicates `vi.hoisted` boilerplate, and drifts away from the canonical
// shape of the mock. Spec files that re-mock any of the paths below are
// flagged so they show up in code review (and in lint output) instead of
// silently regressing the system.
//
// Maintenance:
//   - The `bannedGlobalMockPaths` list mirrors the `vi.mock(...)` first
//     arguments found in `src/tests/setup/*.setup.ts`. Anything globally
//     mocked there must appear here, and vice-versa.
//   - `globalMockLegacyFiles` is the migration debt — each file in it
//     still carries one or more local `vi.mock(...)` calls that should
//     move onto the global helpers. Remove a file from this list once
//     its local re-mocks are gone; the rule then enforces the contract
//     for that file going forward.

const bannedGlobalMockPaths = [
  // store.setup.ts
  '@/stores/user',
  '@/stores/teamStore',
  '@/stores/currencyStore',
  '@/stores',
  '@nuxt/ui',
  '@nuxt/ui/composables',
  // composables.setup.ts
  '@tanstack/vue-query',
  '@vue/apollo-composable',
  '@/api',
  'vue-router',
  '@vueuse/core',
  '@/queries/team.queries',
  '@/queries/member.queries',
  '@/queries/wage.queries',
  '@/queries/notification.queries',
  '@/queries/expense.queries',
  // wagmi.vue.setup.ts
  '@wagmi/vue',
  '@wagmi/core',
  '@/wagmi.config',
  // viem.setup.ts
  'viem',
  // erc20-style domain setups
  '@/composables/erc20/reads',
  '@/composables/erc20/writes',
  '@/composables/elections/reads',
  '@/composables/elections/writes',
  '@/composables/bank/reads',
  '@/composables/bank/writes',
  '@/composables/cashRemuneration/reads',
  '@/composables/cashRemuneration/writes',
  '@/composables/expenseAccount/reads',
  '@/composables/expenseAccount/writes',
  '@/composables/bod/reads',
  '@/composables/bod/writes',
  '@/composables/investor/reads',
  '@/composables/investor/writes',
  '@/composables/safeDepositRouter/reads',
  '@/composables/safeDepositRouter/writes',
  '@/composables/vesting/writes',
  '@/composables/fixedReturn/reads',
  '@/composables/fixedReturn/writes',
  // nuxt-ui.setup.ts (component-level stubs)
  '@nuxt/ui/components/Modal.vue',
  '@nuxt/ui/components/Tooltip.vue',
  '@nuxt/ui/components/SelectMenu.vue',
  '@nuxt/ui/components/Icon.vue',
  '@nuxt/ui/components/Button.vue',
  '@nuxt/ui/components/Calendar.vue',
  '@nuxt/ui/components/Popover.vue',
  '@nuxt/ui/components/DropdownMenu.vue',
  // axios.setup.ts
  '@/lib/axios',
  // utils.setup.ts
  '@/utils'
]

const globalMockMessage = (path) =>
  `Don't re-mock '${path}' in a spec — it is already globally mocked via app/src/tests/setup/*.setup.ts. ` +
  `Import the helpers from '@/tests/mocks' (e.g. mockTeamStore, mockERC20Reads, resetERC20Mocks) and override per-test values on them. ` +
  `See app/src/tests/README.md and docs/testing/MOCK_SYSTEM.md.`

const globalMockReMockSelectors = bannedGlobalMockPaths.map((path) => ({
  selector: `CallExpression[callee.object.name='vi'][callee.property.name='mock'][arguments.0.value=${JSON.stringify(path)}]`,
  message: globalMockMessage(path)
}))

// Contract-writes V3 enforcement (issues #1798, #1926).
//
// All on-chain writes must go through `useContractWritesV3` from
// `@/composables/contracts`. Raw wagmi write hooks are banned in feature
// code so AI agents and humans cannot regress to V2-shaped patterns.
//
// Allowed importers (override below):
//   - `src/composables/contracts/**` — the V3 implementation itself.
//   - `src/composables/transactions/useSafeSendTransaction.ts` — Safe SDK
//     wrapper that legitimately wraps `waitForTransactionReceipt`.
//   - `src/composables/useContractFunctions.ts` — contract *deployment*
//     path; `waitForTransactionReceipt` awaits a deploy receipt, not a
//     write. Deployment is out of scope for the V3 writes migration.
//   - test-only mock setup files under `tests/`.
const v3WriteRestrictedImports = {
  paths: [
    {
      name: '@wagmi/vue',
      importNames: ['useWriteContract', 'useWaitForTransactionReceipt'],
      message:
        'Use `useContractWritesV3` from `@/composables/contracts` for on-chain writes. See AGENTS.md and issue #1798.'
    },
    {
      name: '@wagmi/core',
      importNames: ['writeContract', 'waitForTransactionReceipt'],
      message:
        'Use `useContractWritesV3` from `@/composables/contracts` for on-chain writes. `readContract` / `estimateGas` / `simulateContract` remain allowed. See AGENTS.md and issue #1798.'
    }
  ]
}

// Formatting standardization (issue #2383).
//
// `src/utils/format/` is the single canonical implementation of every display
// formatter (money, token amounts, dates, addresses). Everything else asks it
// for a *named* style instead of re-deriving one from the raw primitives.
//
// The primitives below are banned outside that module because each one grew a
// different convention in every file that reached for it: 14 dayjs pattern
// strings for the same date, three `Intl.NumberFormat` precision policies for
// the same amount, two ellipsis characters for the same address. #2376 is what
// that costs in production — a `maximumFractionDigits: 0` default rounded every
// fractional Community Credit amount to a whole number, so `0.2 USDC` displayed
// as `0`.

const formattingMessage =
  'Use the canonical formatters from `@/utils/format` (formatUsd, formatToken, formatNumber, formatPercent, formatDate, formatDateTime, formatAddress, …) instead of formatting by hand. See .github/copilot-instructions/formatting-standards.md and issue #2383.'

const bannedIntlFormatter = {
  selector: "NewExpression[callee.object.name='Intl']",
  message: formattingMessage
}

const bannedToLocale = {
  selector: 'CallExpression[callee.property.name=/^toLocale(String|DateString|TimeString)$/]',
  message: formattingMessage
}

// `toFixed` is banned for display *and* as an input to `parseUnits` — rounding a
// value before converting it on-chain silently changes the amount transacted.
const bannedToFixed = {
  selector: "CallExpression[callee.property.name='toFixed']",
  message: `${formattingMessage} For on-chain amounts, pass the unrounded value straight to \`parseUnits\` — never \`parseUnits(x.toFixed(d), d)\`.`
}

// `.format('MMM D, YYYY')` — a literal pattern string is the dayjs shape. Calls
// like `formatter.format(value)` pass a value, not a literal, and stay allowed.
const bannedDatePattern = {
  selector: "CallExpression[callee.property.name='format'][arguments.0.type='Literal']",
  message: formattingMessage
}

const formattingSelectors = [bannedIntlFormatter, bannedToLocale, bannedToFixed, bannedDatePattern]

// Migration debt for the formatting guard — every file that still formats by
// hand. This list only ever shrinks: PR 2 and PR 3 of #2383 drain it.
//
// If you're about to add an entry, you're adding a new convention to a codebase
// that just spent a PR removing them. Either the canonical module covers your
// case, or it should — extend `src/utils/format/` rather than whitelisting a
// file here. The ceiling below fails `npm run lint` at config load if the list
// grows; lower it as entries leave.
const formattingLegacyFiles = [
  'src/components/forms/TokenAmount.vue',
  'src/components/forms/TransferForm.vue',
  'src/components/sections/ClaimHistoryView/ClaimHistoryDailyBreakdown.vue',
  'src/components/sections/ClaimHistoryView/ClaimHistoryWeekNavigator.vue',
  'src/components/sections/ClaimHistoryView/WeeklyRecap.vue',
  'src/components/sections/CommunityCreditView/CreditCallTermsStep.vue',
  'src/components/sections/CommunityCreditView/CreditRepayPanel.vue',
  'src/components/sections/ExpenseAccountView/ExpenseAccountTable.vue',
  'src/components/sections/SherTokenView/InvestorsTransactions.vue',
  'src/components/sections/SherTokenView/forms/MintRecapCard.vue',
  'src/components/sections/VestingView/VestingFlow.vue',
  'src/components/sections/VestingView/VestingSummary.vue',
  'src/components/sections/WeeklyClaimView/WeeklyClaim.vue',
  'src/composables/useClaimForm.ts',
  'src/composables/vesting/useVestingDateRange.ts',
  'src/stores/communityCredit.ts',
  'src/utils/abiDecodeUtil.ts',
  'src/utils/accounting/ledgerPresenter.ts',
  'src/utils/accounting/mappers/expenseAccount.ts',
  'src/utils/accounting/presenter.ts',
  'src/utils/accounting/toUsd.ts',
  'src/utils/accountingPdf.ts',
  'src/utils/communityCreditUtil.ts',
  'src/utils/contractManagementUtil.ts',
  'src/utils/datePicker.ts',
  'src/utils/dayUtils.ts',
  'src/utils/generalUtil.ts',
  'src/utils/safe.ts',
  'src/utils/safeDepositRouterUtil.ts'
]

const FORMATTING_LEGACY_MAX = 46
if (formattingLegacyFiles.length > FORMATTING_LEGACY_MAX) {
  throw new Error(
    `formattingLegacyFiles has ${formattingLegacyFiles.length} entries (ceiling ${FORMATTING_LEGACY_MAX}). ` +
      'Format through `@/utils/format` instead of whitelisting a new file — see ' +
      '.github/copilot-instructions/formatting-standards.md.'
  )
}

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Generated contract artifacts are exempt from max-lines.
    files: ['src/artifacts/**/*.{ts,mts,tsx,vue}'],
    rules: {
      'max-lines': 'off'
    }
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/.cache-synpress/**',
      '**/test-results/**'
    ]
  },
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  {
    name: 'app/vitest-tests',
    files: ['**/__tests__/**/*.{ts,tsx,vue}', '**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    plugins: { vitest: pluginVitest },
    rules: {
      'vitest/no-disabled-tests': 'warn'
    }
  },
  {
    languageOptions: {
      ecmaVersion: 'latest'
    }
    // ...other config
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'error'
    }
  },
  {
    name: 'app/test-fragility-bans',
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/__tests__/**/*.{ts,tsx}'],
    ignores: ['src/tests/setup/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        tailwindClassAssertion,
        tailwindClassAssertionOptional,
        tailwindClassIncludes,
        vmCast,
        ...globalMockReMockSelectors
      ]
    }
  },
  {
    name: 'app/contract-writes-v3-only',
    files: ['src/**/*.{ts,tsx,vue}'],
    ignores: [
      'src/composables/contracts/**',
      'src/composables/transactions/useSafeSendTransaction.ts',
      '**/__tests__/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'tests/**',
      'src/composables/useContractFunctions.ts'
    ],
    rules: {
      'no-restricted-imports': ['error', v3WriteRestrictedImports]
    }
  },
  {
    name: 'app/formatting-standards',
    files: ['src/**/*.{ts,tsx,vue}'],
    ignores: [
      // The canonical implementation — the one place the primitives belong.
      'src/utils/format/**',
      // Specs may assert against natively formatted expectations.
      '**/__tests__/**',
      '**/*.spec.{ts,tsx}',
      ...formattingLegacyFiles
    ],
    rules: {
      // Two rules, one selector list: the core rule only walks `<script>`,
      // `vue/no-restricted-syntax` covers `<template>` expressions — and a
      // `{{ x.toFixed(2) }}` in a template is exactly the drift we're stopping.
      'no-restricted-syntax': ['error', ...formattingSelectors],
      'vue/no-restricted-syntax': ['error', ...formattingSelectors]
    }
  },
  skipFormatting
]
