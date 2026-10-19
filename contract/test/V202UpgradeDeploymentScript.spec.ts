import { expect } from 'chai'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const script = path.resolve(import.meta.dirname, '../deploy-upgrade-v2.0.2.sh')
describe('Expense Account 2.0.2 release guards', () => {
  it('rejects missing confirmation and non-target networks', () => {
    const env = { ...process.env }
    delete env.CNC_CONFIRM_POLYGON_V202_UPGRADE
    expect(spawnSync('bash', [script], { env, encoding: 'utf8' }).stderr).to.include(
      'Refusing upgrade'
    )
    expect(spawnSync('bash', [script, 'localhost'], { env, encoding: 'utf8' }).stderr).to.include(
      'Usage:'
    )
    expect(spawnSync('bash', ['-n', script]).status).to.equal(0)
  })
  it('stops before the live process if static validation fails', () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'expense-v202-'))
    const log = path.join(temp, 'commands.log')
    try {
      writeFileSync(path.join(temp, 'git'), '#!/usr/bin/env bash\nexit 0\n')
      writeFileSync(
        path.join(temp, 'npx'),
        `#!/usr/bin/env bash
printf '%s|expected=%s|contracts=%s|secret=%s\\n' "$*" "$CNC_EXPECTED_IMPLEMENTATION_VERSION" "$CONTRACTS" "\${PRIVATE_KEY-unset}" >> "$CNC_COMMAND_LOG"
exit 7
`
      )
      for (const name of ['git', 'npx']) chmodSync(path.join(temp, name), 0o755)
      const result = spawnSync('bash', [script], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${temp}:${process.env.PATH}`,
          CNC_COMMAND_LOG: log,
          CNC_CONFIRM_POLYGON_V202_UPGRADE: 'upgrade-polygon-v2.0.2',
          PRIVATE_KEY: 'must-not-be-read'
        }
      })
      expect(result.status).to.equal(7)
      expect(readFileSync(log, 'utf8').trim()).to.equal(
        'hardhat run scripts/validate-upgrade.ts --network hardhat|expected=2.0.2|contracts=ExpenseAccountEIP712|secret=unset'
      )
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })
})
