import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

const baseRef = process.env.BASE_SHA || 'origin/develop'
const mergeBase = git(['merge-base', baseRef, 'HEAD']).trim()
const changedFiles = [
  git(['diff', '--name-only', '-z', '--diff-filter=ACMR', mergeBase]),
  git(['ls-files', '--others', '--exclude-standard', '-z']),
]
const markdownFiles = [
  ...new Set(changedFiles.flatMap((files) => files.split('\0').filter((file) => file.endsWith('.md')))),
]

if (markdownFiles.length === 0) {
  console.log('No added or modified Markdown files to format-check.')
  process.exit(0)
}

const prettier = fileURLToPath(new URL('../node_modules/prettier/bin/prettier.cjs', import.meta.url))
const result = spawnSync(
  process.execPath,
  [prettier, '--config', '.prettier-markdown.json', '--check', ...markdownFiles],
  { stdio: 'inherit' },
)

process.exit(result.status ?? 1)
