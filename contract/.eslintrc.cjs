module.exports = {
  env: {
    es2021: true,
    node: true
  },
  ignorePatterns: ['artifacts/**', 'coverage/**', 'ignition/deployments/**', 'typechain-types/**'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  overrides: [
    {
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off'
      }
    }
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint']
}
