import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
// import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    // TODO turn this rule into an error by march 2025
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }]
    }
  },
  {
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
      '**/.cache-synpress/**'
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
  skipFormatting
]
