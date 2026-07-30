import { defineConfig } from '@wagmi/cli'
import { hardhat } from '@wagmi/cli/plugins'

/**
 * Generates typed ABIs for the frontend from the compiled Hardhat artifacts.
 *
 * Run `npm run generate-abi` in `contract/` after changing a contract. The output
 * (`app/src/artifacts/abi/generated.ts`) is committed: `contract/artifacts` is
 * gitignored, so `app/` cannot type-check in CI without a checked-in copy.
 *
 * Why generate instead of hand-writing wrappers: an `import … from './Foo.json'`
 * is widened by TypeScript (`string`, not `'function'`), so `as Abi` is the only
 * way to make it compile — and abitype can then derive nothing from it. The
 * generated `as const` literals let viem resolve `args` tuples on writes and
 * return types on reads. See app/src/composables/contracts/README.md.
 */
export default defineConfig({
  out: '../app/src/artifacts/abi/generated.ts',
  plugins: [
    hardhat({
      project: '.',
      artifacts: 'artifacts/contracts',
      // Hardhat 3 renamed `compile` to `build`.
      commands: {
        clean: 'npx hardhat clean',
        build: 'npx hardhat build',
        rebuild: 'npx hardhat build'
      },
      // Only the contracts the frontend consumes. Without this the plugin also
      // emits every interface (I*), mock and test util — 40 ABIs, 8.7k lines.
      include: [
        'AdCampaignManager.sol/AdCampaignManager.json',
        'Bank.sol/Bank.json',
        'BoardOfDirectors.sol/BoardOfDirectors.json',
        'CashRemunerationEIP712.sol/CashRemunerationEIP712.json',
        'Elections/Elections.sol/Elections.json',
        'expense-account/ExpenseAccountEIP712.sol/ExpenseAccountEIP712.json',
        'beacons/FactoryBeacon.sol/FactoryBeacon.json',
        'FixedReturn.sol/FixedReturn.json',
        'Investor/Investor.sol/Investor.json',
        'Officer.sol/Officer.json',
        'Proposals/Proposals.sol/Proposals.json',
        'SafeDepositRouter.sol/SafeDepositRouter.json',
        'Vesting.sol/Vesting.json'
      ]
    })
  ]
})
