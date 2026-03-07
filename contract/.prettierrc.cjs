module.exports = {
  semi: false,
  tabWidth: 2,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'none',
  plugins: ['prettier-plugin-solidity'],
  overrides: [
    {
      files: '*.sol',
      options: {
        parser: 'solidity-parse',
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        singleQuote: true,
        bracketSpacing: false
      }
    }
  ]
}
