# Rollback Preparation Evidence Custody

Status: **BYTE-PRESERVED NONCONFORMING EVIDENCE - NOT A QUALIFIED RUNTIME**
Recorded: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Run ID:
`c2ccf1e0167850a6340117b298da6d870f340bf6665b863723d93ff1878097bb`

## Boundary

These files are exact byte-preserved copies from the authorized but stopped
official-upstream rollback-preparation run. Their content-addressed names bind
their SHA-256 values.

Copying these files into repository evidence custody does not repair or reuse
the stopped run, qualify an official-upstream runtime, pass Stage A, authorize
Stage B, authorize a supervisor handoff or service switch, retire a risk, pass
ABM, or authorize Construction.

## Inventory

| File | SHA-256 | Bytes | Classification |
|---|---|---:|---|
| `65886ad5c33e0af80e079dbfcec877279331f45493ef9b167fcca3f0ec666718-design.md` | `65886ad5c33e0af80e079dbfcec877279331f45493ef9b167fcca3f0ec666718` | 273984 | Authorized preparation design input |
| `2dfaec4c088c815ef585937f0d7ac612f5f2636727b575baa25f5d75da1c5caa-design-review.json` | `2dfaec4c088c815ef585937f0d7ac612f5f2636727b575baa25f5d75da1c5caa` | 9438 | Independent design-review input with recorded PASS disposition |
| `72219d374f7c05136dbb8d27120520effd52ff596171321fad178ab95d89335f-stage-a-start-receipt.json` | `72219d374f7c05136dbb8d27120520effd52ff596171321fad178ab95d89335f` | 505 | Preserved stopped-run receipt |
| `eb916f1fe5197a4bf77a14529b49eecec6e268a6fa7fbf89a8a64c5ee18136bd-stage-a-scope-v3.json` | `eb916f1fe5197a4bf77a14529b49eecec6e268a6fa7fbf89a8a64c5ee18136bd` | 1381 | Preserved stopped-run scope |
| `cbf9920afee997d38a7d0917c57dafa1c0b742d989302bcd94bf31d7cbc0ce33-stage-a-replay-matrix-v1.json` | `cbf9920afee997d38a7d0917c57dafa1c0b742d989302bcd94bf31d7cbc0ce33` | 23667 | Preserved stopped-run replay matrix |

## Source locations

- design:
  `/private/tmp/agentmemory-official-rollback-preparation-design-r16-2026-07-28.md`;
- design review:
  `/private/tmp/agentmemory-official-rollback-preparation-design-r16-review.json`;
- stopped-run root:
  `/private/tmp/chronode-agentmemory-preparation/c2ccf1e0167850a6340117b298da6d870f340bf6665b863723d93ff1878097bb`.

## Preserved disposition

```text
authorization-received
artifacts-materialized
strict-stage-a-conformance-failed
stage-b-authority-absent
run-stopped
evidence-preserved
no-risk-retirement
```

The run ID and original temporary root must not be reused or repaired.
