import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
// import pluginVitest from '@vitest/eslint-plugin'
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

// Legacy offenders. Each list grants an opt-out for ONE pattern only — the
// other pattern is still enforced. Files in `bothLegacyFiles` are exempted
// from both. Refactor and remove from these lists; once empty, drop the
// override blocks entirely.
const tailwindLegacyFiles = [
  'src/components/__tests__/BodAlert.spec.ts',
  'src/components/__tests__/OverviewCard.spec.ts',
  'src/components/__tests__/RateDotList.spec.ts',
  'src/components/__tests__/SelectComponent.advanced.spec.ts',
  'src/components/__tests__/SelectComponent.spec.ts',
  'src/components/__tests__/UserAvatarComponent.spec.ts',
  'src/components/__tests__/UserComponent.spec.ts',
  'src/components/forms/__tests__/ProfileImageUpload.spec.ts',
  'src/components/sections/AdministrationView/__tests__/ElectionStatus.spec.ts',
  'src/components/sections/DashboardView/__tests__/SetMemberWageStandardStep.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeIncomingTransactions.spec.ts',
  'src/components/sections/SherTokenView/__tests__/ActionButton.spec.ts',
  'src/components/utils/__tests__/SelectContractResults.spec.ts',
  'src/components/utils/__tests__/SelectMemberContractsInput.spec.ts',
  'src/components/utils/__tests__/SelectMemberInput.spec.ts',
  'src/components/utils/__tests__/SelectMemberResults.spec.ts',
  'src/views/team/__tests__/ListIndex.spec.ts'
]

const vmCastLegacyFiles = [
  'src/components/__tests__/MonthSelector.spec.ts',
  'src/components/forms/__tests__/AddTeamForm.spec.ts',
  'src/components/forms/__tests__/ApproveUsersEIP712Form.spec.ts',
  'src/components/forms/__tests__/DepositBankForm.spec.ts',
  'src/components/forms/__tests__/DepositSafeForm.spec.ts',
  'src/components/forms/__tests__/EditUserForm.spec.ts',
  'src/components/forms/__tests__/SafeDepositRouterForm.spec.ts',
  'src/components/forms/__tests__/TransferForm.spec.ts',
  'src/components/forms/__tests__/TransferModal.spec.ts',
  'src/components/sections/AdministrationView/__tests__/CurrentBoDElectionSection.spec.ts',
  'src/components/sections/AdministrationView/__tests__/CurrentBoDSection.spec.ts',
  'src/components/sections/AdministrationView/forms/__tests__/CreateELectionForm.spec.ts',
  'src/components/sections/BankView/__tests__/BankTransactions.spec.ts',
  'src/components/sections/CashRemunerationView/Form/__tests__/ClaimForm.spec.ts',
  'src/components/sections/CashRemunerationView/Form/__tests__/ExpandableFileGallery.spec.ts',
  'src/components/sections/CashRemunerationView/__tests__/CashRemunerationTransactions.spec.ts',
  'src/components/sections/CashRemunerationView/__tests__/SubmitClaims.spec.ts',
  'src/components/sections/ClaimHistoryView/__tests__/ClaimHistoryActionAlerts.spec.ts',
  'src/components/sections/ClaimHistoryView/__tests__/ClaimHistoryDailyBreakdown.spec.ts',
  'src/components/sections/ClaimHistoryView/__tests__/ClaimHistoryWeekNavigator.spec.ts',
  'src/components/sections/ContractManagementView/forms/__tests__/CreateAddCampaign.spec.ts',
  'src/components/sections/DashboardView/__tests__/SetMemberWageModal.spec.ts',
  'src/components/sections/DashboardView/__tests__/TeamMetaSection.spec.ts',
  'src/components/sections/DashboardView/forms/__tests__/AddMemberForm.spec.ts',
  'src/components/sections/ExpenseAccountView/__tests__/ExpenseTransactions.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeBalanceSection.rendering.spec.ts',
  'src/components/sections/SafeView/__tests__/SafeBalanceSection.transfer.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/InvestInSafeAction.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/PayDividendsAction.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/SetCompensationMultiplierAction.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/ToggleSherCompensationAction.spec.ts',
  'src/components/sections/SherTokenView/__tests__/InvestorsTransaction.advanced.spec.ts',
  'src/components/sections/SherTokenView/__tests__/InvestorsTransaction.spec.ts',
  'src/components/sections/SherTokenView/__tests__/ShareholderList.spec.ts',
  'src/components/sections/SherTokenView/forms/__tests__/DistributeMintForm.spec.ts',
  'src/components/sections/SherTokenView/forms/__tests__/MintForm.spec.ts',
  'src/components/sections/VestingView/__tests__/VestingStats.spec.ts',
  'src/components/sections/VestingView/forms/__tests__/CreateVestingInitial.spec.ts',
  'src/components/sections/VestingView/forms/__tests__/CreateVestingSubmission.spec.ts',
  'src/components/ui/__tests__/SidebarLayout.spec.ts'
]

const bothLegacyFiles = [
  'src/components/sections/CashRemunerationView/Form/__tests__/UploadFileDB.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/DistributeMintAction.spec.ts',
  'src/components/sections/SherTokenView/InvestorActions/__tests__/MintTokenAction.spec.ts'
]

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
    files: [
      'src/artifacts/**/*.{ts,mts,tsx,vue}',
      'src/components/GenericTransactionHistory.vue',
      'src/components/sections/VestingView/forms/CreateVesting.vue',
      'src/components/TableComponent.vue',
      'src/components/sections/DashboardView/forms/ApproveUsersEIP712Form.vue',
      'src/components/forms/SafeDepositRouterForm.vue'
    ],
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
  // {
  //   ...pluginVitest.configs.recommended,
  //   files: ['src/**/__tests__/*']
  // },
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
    rules: {
      'no-restricted-syntax': [
        'error',
        tailwindClassAssertion,
        tailwindClassAssertionOptional,
        tailwindClassIncludes,
        vmCast
      ]
    }
  },
  {
    name: 'app/test-fragility-bans-tailwind-legacy',
    files: tailwindLegacyFiles,
    rules: {
      // Allow Tailwind class assertions in these files only; vm casts still error.
      'no-restricted-syntax': ['error', vmCast]
    }
  },
  {
    name: 'app/test-fragility-bans-vm-legacy',
    files: vmCastLegacyFiles,
    rules: {
      // Allow wrapper.vm casts in these files only; Tailwind class assertions still error.
      'no-restricted-syntax': [
        'error',
        tailwindClassAssertion,
        tailwindClassAssertionOptional,
        tailwindClassIncludes
      ]
    }
  },
  {
    name: 'app/test-fragility-bans-both-legacy',
    files: bothLegacyFiles,
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  skipFormatting
]
