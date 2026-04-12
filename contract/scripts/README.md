# validate-upgrade

Script that checks whether upgradeable contracts can be safely upgraded in place
on a given network, or whether a redeployment is required.

## How it works

```mermaid
flowchart TD
    Start([npm run validate-upgrade:polygon]) --> ResolveNet{--network flag?}
    ResolveNet -- "missing (defaults to hardhat)" --> Reject[Reject with error]
    ResolveNet -- "polygon / localhost / ..." --> Compile[npx hardhat compile]

    Compile --> Loop["For each upgradeable contract<br/>(Bank, Officer, InvestorV1, ...)"]

    Loop --> OZ["OZ validateImplementation<br/>(beacon mode)"]
    OZ --> OZPass{Passes?}
    OZPass -- No --> AddError["Add error:<br/>constructor state, selfdestruct,<br/>immutable without annotation, ..."]
    OZPass -- Yes --> CheckBaseline

    AddError --> CheckBaseline{Baseline exists?<br/>storage-baselines/polygon/X.json}

    CheckBaseline -- No --> Skip["SKIP<br/>(suggest BAKE=1 command)"]
    CheckBaseline -- Yes --> ReadBaseline["Read baseline JSON"]

    ReadBaseline --> GetLayout["Extract current storage layout<br/>from solc build artifacts"]
    GetLayout --> Compare["Compare slot by slot"]

    Compare --> SlotCheck{For each baseline slot}
    SlotCheck --> Removed["Slot removed? → ERROR"]
    SlotCheck --> Moved["Slot/offset changed? → ERROR"]
    SlotCheck --> TypeChanged["Type changed? → ERROR"]
    SlotCheck --> Renamed["Label renamed? → WARNING"]
    SlotCheck --> Appended["New slots at end? → WARNING<br/>(compatible append)"]

    Removed --> Result
    Moved --> Result
    TypeChanged --> Result
    Renamed --> Result
    Appended --> Result
    Skip --> Result

    Result{Any errors?}
    Result -- "No errors" --> OK["OK — safe to upgrade in place"]
    Result -- "Has errors" --> FAIL["FAIL — do NOT upgrade this proxy"]

    OK --> Next["Next contract"]
    FAIL --> Next
    Next --> Loop

    Next --> Summary["Print summary:<br/>N ok, N skipped, N failed"]
    Summary --> Exit{Failed > 0?}
    Exit -- Yes --> ExitCode1["exit(1)"]
    Exit -- No --> ExitCode0["exit(0)"]
```

## Bake mode

When `BAKE=1` is set, the script skips validation and instead **writes** the
current storage layout as the new baseline for that network.

```mermaid
flowchart TD
    Start([BAKE=1 npm run validate-upgrade:polygon]) --> Compile[npx hardhat compile]
    Compile --> Loop["For each contract"]
    Loop --> Extract["Extract storage layout<br/>from solc build artifacts"]
    Extract --> Write["Write to<br/>storage-baselines/polygon/X.json"]
    Write --> Next["Next contract"]
    Next --> Loop
    Next --> Done([Done — commit the baselines])
```

## Storage layout comparison detail

The slot-by-slot comparison catches the most common upgrade-breaking changes:

```mermaid
flowchart LR
    subgraph "Baseline (on-chain)"
        B0["slot 0: owner (address)"]
        B1["slot 1: balance (uint256)"]
        B2["slot 2: __gap (uint256 x 50)"]
    end

    subgraph "Current code"
        C0["slot 0: owner (address)"]
        C1["slot 1: balance (uint256)"]
        C2["slot 2: name (string)"]
        C3["slot 3: __gap (uint256 x 49)"]
    end

    B0 -. "same slot, same type → OK" .-> C0
    B1 -. "same slot, same type → OK" .-> C1
    B2 -. "type changed → ERROR" .-> C2
```

In this example, inserting `name` at slot 2 pushed `__gap` down — the script
catches the type change at slot 2 and reports `FAIL`. The safe version would
consume one `__gap` slot and append `name` at the end.

## Commands

| Command                                              | Description                                      |
| ---------------------------------------------------- | ------------------------------------------------ |
| `npm run validate-upgrade:polygon`                   | Validate all contracts against polygon baselines |
| `npm run validate-upgrade:local`                     | Validate against localhost baselines             |
| `CONTRACT=X npm run validate-upgrade:polygon`        | Validate a single contract                       |
| `BAKE=1 npm run validate-upgrade:polygon`            | Bake all baselines for polygon                   |
| `BAKE=1 CONTRACT=X npm run validate-upgrade:polygon` | Bake one baseline                                |

## File structure

```
storage-baselines/
  polygon/
    Bank.json
    Officer.json
    InvestorV1.json
    ...
  localhost/
    Bank.json
    ...
```

Each JSON file contains the raw solc `storageLayout` output: the `storage` array
(list of slots with label, type, offset) and the `types` map. These files are
committed to git and serve as the source of truth for what is deployed on that
network.
