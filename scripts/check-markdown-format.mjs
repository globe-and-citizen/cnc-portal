import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

const markdownFiles = git(['ls-files', '-z'])
  .split('\0')
  .filter((file) => file.endsWith('.md'))

if (markdownFiles.length === 0) {
  console.log('No tracked Markdown files to format-check.')
  process.exit(0)
}

const prettier = fileURLToPath(new URL('../node_modules/prettier/bin/prettier.cjs', import.meta.url))
const result = spawnSync(
  process.execPath,
  [prettier, '--config', '.prettier-markdown.json', '--check', ...markdownFiles],
  { stdio: 'inherit' },
)

process.exit(result.status ?? 1)
