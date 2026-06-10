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

// Legacy offenders for the wrapper.vm cast rule. Tailwind class assertions
// are now banned globally — all previous Tailwind offenders were refactored.
// Refactor and remove from this list; once empty, drop the override block
// and the helper lists below.

const vmCastLegacyFiles = [
  'src/components/forms/__tests__/EditUserForm.spec.ts',
  'src/components/forms/__tests__/TransferForm.spec.ts',
  'src/components/sections/ClaimHistoryView/__tests__/ClaimHistoryWeekNavigator.spec.ts'
]

// Ratchet — this list was drained in PR #2024 (closes #1850) and further in
// #2031. It MUST NOT grow. If you're about to add a new entry:
//   1. First try to refactor — see app/src/tests/README.md
//      "Migrating Legacy Specs Off `wrapper.vm as X`".
//   2. If the cast is genuinely unavoidable, use a scoped
//      `// eslint-disable-next-line no-restricted-syntax -- <reason>`
//      on the cast line itself, not a file-level opt-out here.
// This guard fires at config load time, so `npm run lint` fails fast
// with the message below if the ceiling is breached. To lower the
// ceiling after a refactor, drop the entry AND decrement the constant.
const VM_CAST_LEGACY_MAX = 3
if (vmCastLegacyFiles.length > VM_CAST_LEGACY_MAX) {
  throw new Error(
    `vmCastLegacyFiles has ${vmCastLegacyFiles.length} entries (ceiling ${VM_CAST_LEGACY_MAX}). ` +
      'Refactor the new entry instead of whitelisting it — see app/src/tests/README.md ' +
      '"Migrating Legacy Specs Off `wrapper.vm as X`".'
  )
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

// Legacy offenders — each of these spec files still carries at least one
// `vi.mock(...)` call against a globally-mocked module path. The rule is
// disabled for them so CI does not break on day one; each removal is a
// follow-up to issue #2014.
const globalMockLegacyFiles = [
  'src/components/sections/AdministrationView/__tests__/CurrentBoDSection.spec.ts',
  'src/components/sections/AdministrationView/__tests__/PastBoDElectionCard.spec.ts',
  'src/components/sections/AdministrationView/__tests__/PublishResult.spec.ts',
  'src/components/sections/CashRemunerationView/__tests__/CRSigne.migration.spec.ts',
  'src/components/sections/CashRemunerationView/__tests__/CRSigne.spec.ts',
  'src/components/sections/CashRemunerationView/__tests__/CRWithdrawClaim.spec.ts',
  'src/components/sections/DashboardView/__tests__/MemberSection.spec.ts',
  'src/components/sections/ExpenseAccountView/__tests__/ExpenseMonthSpent.spec.ts',
  'src/components/sections/ExpenseAccountView/__tests__/TransferAction.spec.ts',
  'src/components/sections/SafeView/__tests__/RemoveOwnerButton.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeBalanceSection.rendering.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeBalanceSection.transfer.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeOwnersCard.spec.ts',
  'src/components/sections/SafeView/forms/__tests__/AddSignerModal.spec.ts',
  'src/components/sections/SafeView/forms/__tests__/UpdateThresholdModal.spec.ts',
  'src/components/sections/SherTokenView/__tests__/InvestorsTransaction.advanced.spec.ts',
  'src/components/sections/SherTokenView/__tests__/InvestorsTransaction.spec.ts',
  'src/components/sections/SherTokenView/__tests__/InvestorsTransaction.test-utils.ts',
  'src/components/sections/SherTokenView/forms/__tests__/MintForm.spec.ts',
  'src/components/sections/SherTokenView/forms/__tests__/MintRecapCard.spec.ts',
  'src/components/sections/SherTokenView/forms/__tests__/MintStakeSection.spec.ts',
  'src/components/sections/SherTokenView/forms/__tests__/TwinAmountInputs.spec.ts',
  'src/components/sections/VestingView/__tests__/VestingFlow.spec.ts',
  'src/components/sections/VestingView/__tests__/VestingStats.spec.ts',
  'src/components/sections/VestingView/forms/__tests__/CreateVestingSubmission.spec.ts',
  'src/components/sections/WeeklyClaimView/__tests__/WeeklyClaimActionDropdown.spec.ts',
  'src/components/sections/WeeklyClaimView/__tests__/WeeklyClaimActionEnable.spec.ts',
  'src/composables/__tests__/useFileUrl.spec.ts',
  'src/composables/__tests__/useSiwe.spec.ts',
  'src/composables/contracts/__tests__/useOfficerDeployment.spec.ts',
  'src/composables/contracts/__tests__/useOfficerRedeploy.spec.ts',
  'src/composables/safe/__tests__/useSafeSdk.spec.ts',
  'src/composables/safe/__tests__/useSafeTransactionActions.spec.ts',
  'src/queries/__tests__/contract.queries.spec.ts',
  'src/queries/__tests__/weeklyClaim.queries.spec.ts',
  'src/router/__tests__/index.spec.ts',
  'src/stores/__tests__/teamStore.spec.ts',
  'src/utils/__tests__/web3Util.spec.ts',
  'src/views/team/[[]id[]]/__tests__/BankView.spec.ts',
  'src/views/team/[[]id[]]/__tests__/BodElectionView.spec.ts'
]

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

export default [
  {
    // TODO turn this rule into an error by march 2025
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]
      // 'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }]
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
      // TODO: remove @typescript-eslint/no-empty-object-type
      '@typescript-eslint/no-empty-object-type': 'off'
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
    name: 'app/test-fragility-bans-vm-legacy',
    files: vmCastLegacyFiles,
    rules: {
      // Allow wrapper.vm casts in these files only; Tailwind class assertions
      // and global-mock re-mock checks still apply.
      'no-restricted-syntax': [
        'error',
        tailwindClassAssertion,
        tailwindClassAssertionOptional,
        tailwindClassIncludes,
        ...globalMockReMockSelectors
      ]
    }
  },
  {
    name: 'app/test-fragility-bans-global-mock-legacy',
    files: globalMockLegacyFiles,
    rules: {
      // Allow local `vi.mock(...)` of globally-mocked paths in these files
      // only — they predate issue #2014. Tailwind / vm-cast bans still apply
      // (unless an entry also appears in `vmCastLegacyFiles`).
      'no-restricted-syntax': [
        'error',
        tailwindClassAssertion,
        tailwindClassAssertionOptional,
        tailwindClassIncludes,
        vmCast
      ]
    }
  },
  // Files in BOTH legacy lists: relax the vm-cast and global-mock checks,
  // keep Tailwind class assertions banned. Spread conditionally — ESLint
  // rejects empty `files` arrays, and the intersection drains as the
  // vm-cast list shrinks.
  ...(() => {
    const both = vmCastLegacyFiles.filter((f) => globalMockLegacyFiles.includes(f))
    return both.length === 0
      ? []
      : [
          {
            name: 'app/test-fragility-bans-both-legacy',
            files: both,
            rules: {
              'no-restricted-syntax': [
                'error',
                tailwindClassAssertion,
                tailwindClassAssertionOptional,
                tailwindClassIncludes
              ]
            }
          }
        ]
  })(),
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
  skipFormatting
]
