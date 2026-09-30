# Contract Economic Safety Audit

**Audit ID:** `contract-economic-safety`

## Objective

Determine whether smart-contract behaviour preserves documented economic intent, actor permissions, value flows, generations, and lifecycle
states beyond what compiler, unit coverage, and static-analysis tools can establish.

## Required Inputs

- canonical contract-feature and linked product documentation;
- Solidity source, interfaces, inherited storage, deployment modules, version registry, and upgrade strategy;
- frontend and backend transaction construction and receipt handling;
- events consumed by Accounting, Ponder, The Graph, and user histories;
- unit, property, invariant, upgrade, gas, and integrated journey evidence;
- static-analysis findings as supporting leads.

## Audit Questions

- Do roles and ownership match the documented actor model at every state-changing entry point?
- Can value become locked, duplicated, misdirected, or claimable twice across normal and exceptional paths?
- Do rounding, caps, thresholds, fees, timing, and terminal states preserve the economic guarantee?
- Do emitted events contain enough authoritative information for consumers to reconstruct the outcome?
- Does a new generation preserve intended behaviour and migration invariants, not only storage compatibility?
- Can external calls, tokens, reentrancy, denial, or partial execution violate lifecycle assumptions?
- Do frontend and backend consumers call the correct generation with correct parameters and confirmation semantics?

## Valid Findings

- economic invariant violation;
- role or lifecycle contradiction;
- unobservable value movement or insufficient event evidence;
- behaviour regression between contract generations;
- unsafe partial execution or unrecoverable value state;
- consumer interaction that contradicts the contract guarantee.

## Remediation

The agent may add a reproducing test, property, invariant, or bounded draft fix. New economic policy, privileged-role changes, baseline
baking, deployment, upgrade, fund movement, and production configuration are `report-only` until explicitly approved. A clean Slither result
never closes this audit by itself.

## Completion Evidence

The report identifies actors, preconditions, value before and after, relevant state transition, event evidence, consumer impact, and
contract generation. High-severity findings require a minimal reproducer or explicit proof when a safe local environment exists.
