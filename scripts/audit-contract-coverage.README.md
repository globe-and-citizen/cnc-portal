# Contract Coverage Audit

Script qui audite, pour chaque contrat Solidity du projet, si toutes ses fonctions ABI ont bien :

- un **composable** dédié (`reads.ts` / `writes.ts`)
- un **mock** dans `tests/mocks/contract.mock.ts`
- une entrée dans le **setup** Vitest (`tests/setup/<slug>.setup.ts`)
- un **test du composable** (dans `composables/<slug>/__tests__`)
- et pour chaque composant qui consomme le composable : est‑il testé ou non ?

## Lancer

```bash
# Depuis la racine du repo
node scripts/audit-contract-coverage.mjs                    # tous les contrats
node scripts/audit-contract-coverage.mjs --contract=bank    # un seul
node scripts/audit-contract-coverage.mjs --verbose          # détail fonction par fonction en console
```

## Sorties

| Fichier                                | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| `scripts/out/contract-coverage.json`   | Rapport complet en JSON (pour CI, intégrations)              |
| `scripts/audit-contract-coverage.html` | Page HTML autonome (JSON embarqué) — ouvrable en double‑clic |

La page HTML offre : filtre par contrat, filtre par statut (`ok` / `partial` / `missing` / `not-ok`), recherche par nom de fonction, et un détail dépliable des orphelins et des usages.

## Fonctionnement

1. **Auto‑découverte** des slugs : chaque sous‑dossier de `app/src/composables/` contenant `reads.ts` ou `writes.ts`.
2. **Extraction de l'ABI** via les JSON sous `app/src/artifacts/abi/json/*.json`, typée avec `abitype` et formatée en signatures lisibles via `formatAbiItem`.
3. **Parsing des composables** : regex sur `export (function|const) useXxx` puis recherche de `functionName: '...'` ou `functionName: CONST.KEY` (les objets `as const` sont résolus).
4. **Mocks** : parse de `contract.mock.ts`, récupère les clés de `mockXxxReads` / `mockXxxWrites` par contrat ; alias tolérés (`depositToken` ↔ `deposit`).
5. **Setup** : parse des blocs `vi.mock('@/composables/<slug>/...', ...)` dans `<slug>.setup.ts`.
6. **Tests composable** : grep de `useXxx(` dans les fichiers `.spec.ts` / `.test.ts` sous `composables/<slug>/__tests__`.
7. **Consommateurs** : walk de `app/src/` (hors `composables/` et dossiers de tests) ; pour chaque fichier qui appelle `useXxx(`, recherche d'un spec adjacent + détection de `describe.skip` / `it.skip`.

## Statut par fonction

- `ok` — composable présent + mock + setup + test du composable + (si consommateurs) au moins un consommateur testé et non‑skippé
- `partial` — au moins un artefact manque
- `missing` — aucun composable

## Configuration

Deux manifestes en tête du script, à mettre à jour si les conventions de nommage changent :

- `ABI_JSON_MAP` — slug → nom du fichier JSON ABI (ex. `bank → 'Bank'`, `investor → 'InvestorV1'`)
- `MOCK_NAMESPACE_MAP` — slug → namespace des mocks (ex. `bank → 'Bank'` donnant `mockBankReads` / `mockBankWrites`, `bod → 'BOD'`)

## Dépendance

`abitype` est résolu dynamiquement depuis `app/node_modules/abitype/dist/esm/exports/index.js`. Si absent, un formateur de signature inline prend le relais (sans abitype).

## Orphelins détectés

Le rapport liste trois catégories d'orphelins par contrat :

- **composablesWithoutFunction** — composables qui pointent vers une fonction ABI qui n'existe pas (ex. sur Bank : `useBankSupportedTokens` → `supportedTokens`, qui n'est plus dans l'ABI)
- **mocksWithoutComposable** — clés de mock sans fonction ABI correspondante
- **setupEntriesWithoutComposable** — entrées du setup qui ne correspondent à aucun composable exporté
