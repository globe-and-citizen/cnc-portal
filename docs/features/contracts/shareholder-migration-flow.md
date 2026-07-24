# Shareholder migration flow

Ce document décrit le flow cible d'un propriétaire d'équipe qui possède des
shareholders et migre vers une nouvelle génération de contrats.

## Flow UML complet

```mermaid
sequenceDiagram
    autonumber

    actor Owner as Team owner / admin
    actor Holder as Shareholder
    participant FE as Frontend
    participant API as Backend API
    participant OldOfficer as Old Officer
    participant OldInvestor as Old Investor
    participant NewOfficer as New Officer
    participant NewInvestor as New Investor

    Note over Owner,OldInvestor: 1. Initial state
    Owner->>FE: Open Share Token page
    FE->>OldInvestor: getShareholders()
    OldInvestor-->>FE: Existing shareholders and amounts
    FE->>OldInvestor: totalSupply()
    OldInvestor-->>FE: Total supply

    Note over Owner,NewOfficer: 2. Deploy new contract generation
    Owner->>FE: Confirm Officer redeploy
    FE->>NewOfficer: Deploy new Officer and sub-contracts
    NewOfficer-->>FE: New Officer address
    FE->>API: POST /contract/officer
    API->>API: Link new Officer to previous Officer
    API-->>FE: previousOfficer + contracts

    Note over FE,NewOfficer: 3. Locate old and new Investors
    FE->>OldOfficer: getTeam()
    OldOfficer-->>FE: Old Investor address
    FE->>NewOfficer: getTeam()
    NewOfficer-->>FE: New Investor address

    Note over FE,API: 4. Generate Merkle snapshot
    FE->>API: POST /investor-migration/generate
    API->>OldInvestor: getShareholders()
    OldInvestor-->>API: Shareholders and amounts
    API->>OldInvestor: totalSupply()
    OldInvestor-->>API: Total supply
    API->>API: Validate sum equals totalSupply
    API->>API: Build Merkle tree
    API->>API: Generate root and proofs
    API-->>FE: root, shareholders, proofs, blockNumber

    Note over Owner,NewInvestor: 5. Commit migration root
    Owner->>FE: Confirm migration transaction
    FE->>NewInvestor: setMigrationRoot(root)
    NewInvestor-->>FE: MigrationRootSet event

    Note over FE,API: 6. Persist immutable migration snapshot
    FE->>API: POST /investor-migration
    API->>NewInvestor: owner()
    NewInvestor-->>API: Contract owner
    API->>API: Verify caller is contract owner
    API->>API: Persist root and shareholders
    API-->>FE: Migration persisted

    FE->>NewInvestor: getMigrationRoot()
    NewInvestor-->>FE: Non-zero migration root
    FE-->>Owner: Display claim section

    Note over Holder,NewInvestor: 7. Self-claim by each shareholder
    Holder->>FE: Open Share Token page
    FE->>API: GET /investor-migration?teamId=...
    API->>API: Recompute proof from persisted shareholders
    API-->>FE: Holder amount and Merkle proof
    FE-->>Holder: Display snapshot amount and proof
    Holder->>FE: Confirm claim
    FE->>NewInvestor: claim(amount, proof)
    NewInvestor->>NewInvestor: Verify Merkle proof
    NewInvestor->>NewInvestor: Mint migrated tokens
    NewInvestor-->>Holder: MigrationClaimed event
    FE-->>Holder: Display new token balance

    Note over Owner,NewInvestor: 8. Owner sweep for remaining holders
    Owner->>FE: Click Dispatch remaining claims
    FE->>NewInvestor: bulkClaim(holders, amounts, proofs)
    NewInvestor->>NewInvestor: Verify each Merkle proof
    NewInvestor->>NewInvestor: Mint unclaimed holders
    NewInvestor-->>FE: MigrationClaimed events

    Owner->>FE: Click Complete migration
    FE->>NewInvestor: completeMigration()
    NewInvestor-->>FE: MigrationCompleted event
    FE-->>Owner: Migration completed
```

## Branches de claim

```mermaid
flowchart TD
    A[Migration root committed] --> B{Shareholder claims individually?}

    B -->|Yes| C[Frontend retrieves amount and proof]
    C --> D[claim(amount, proof)]
    D --> E[New Investor mints tokens]

    B -->|No| F[Owner starts sweep]
    F --> G[Frontend sends holders, amounts and proofs]
    G --> H[bulkClaim(...)]
    H --> I[New Investor mints all unclaimed holders]
    I --> J[Owner calls completeMigration()]
    J --> K[Migration closed and dividends unfrozen]
```

## Notes d'implémentation

Le snapshot persiste les shareholders et la root. Les preuves Merkle sont
recalculées à la lecture à partir de cette liste déterministe, afin de ne pas
dupliquer les données dans la base. Le frontend affiche directement le montant
du snapshot au shareholder et l'envoie avec sa preuve. Le owner peut d'abord
dispatcher les claims via `bulkClaim()` — les claims déjà effectués sont ignorés
— puis appeler séparément `completeMigration()` pour fermer la migration et
dégeler les dividendes.

Fichiers principaux :

- `app/src/composables/contracts/useOfficerRedeploy.ts`
- `app/src/composables/investor/useShareholderMigration.ts`
- `app/src/composables/investor/useSweepMigration.ts`
- `app/src/components/sections/SherTokenView/MerkleClaimForm.vue`
- `backend/src/controllers/investorMigrationController.ts`
- `contract/contracts/Investor/Investor.sol`
