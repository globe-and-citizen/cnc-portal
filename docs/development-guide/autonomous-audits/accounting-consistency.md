# Accounting Consistency Audit

**Audit ID:** `accounting-consistency`

## Objective

Determine whether economic activity is completely and correctly attributed from authoritative source evidence through `JournalEntry` and all
user-visible accounting projections.

## Required Inputs

- Accounting feature documentation and journal-entry use-case catalogue;
- Accounting read-model capability documentation;
- source events, backend records, contract generations, timestamps, rates, fees, and account assignments;
- journal assembly, classifications, reports, filters, drill-downs, PDFs, and spreadsheets;
- invariant, completeness, precision, and non-regression tests.

## Audit Questions

- Does each economic event produce exactly the intended journal entries?
- Are debit, credit, account identity, entity, generation, category, and counterparty economically correct?
- Can missing or ambiguous evidence be silently assigned to a plausible but wrong account?
- Are fees attached once to the correct operation and generation?
- Is exact monetary precision preserved until presentation and export boundaries?
- Do ledger, trial balance, statements, filters, drill-downs, PDF, and spreadsheet agree?
- Do partial data and unavailable rates remain visible rather than becoming false certainty?
- Can replay, refresh, or multi-generation ingestion duplicate or lose activity?

## Valid Findings

- balanced but economically misclassified entry;
- wrong entity, account, counterparty, or contract generation;
- duplicate, missing, or orphan source activity;
- inconsistent accounting projections or exports;
- precision or valuation drift;
- false completeness when source evidence is unresolved.

## Remediation

The agent may autonomously correct a technical mapping when the use-case catalogue and source evidence are explicit, with invariant and
non-regression tests. A change to accounting policy, account taxonomy, economic interpretation, or historical production data uses
`assisted-pr` or `report-only`.

## Completion Evidence

The report follows at least one concrete source transaction or record through ingestion, `JournalEntry`, statements, filters, details, and
exports. Totals alone are insufficient when attribution can still be wrong.
