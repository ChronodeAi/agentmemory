# Agentmemory Build-PoC Governance Wrapper

Status: **MANDATORY PROJECT INSTRUCTION**
Scope: Every AIWG `build-poc` use in this repository
Authority: Root `WORKSPACE.md` project context

## Precedence and purpose

Provider, system, organization, and explicit human instructions retain their
native authority. Within this repository, this wrapper is the mandatory
project-local instruction for `build-poc` and overrides conflicting generic
skill language.

The generic AIWG skill describes risk retirement, GO/NO-GO, architecture
choice, and deletion as possible outputs. Those outcomes are not delegated to
an Agentmemory PoC. The PoC answers a bounded technical question and produces
candidate evidence for later independent and human review.

## Admission gate

Do not invoke or execute `build-poc` unless all conditions are true:

1. The risk is P0 or P1 under the current owner-calibrated register.
2. A versioned case card exists in this directory.
3. The card state is exactly `READY-FOR-BOUNDED-EXECUTION`.
4. Source, fixtures, denominator, profiles, stop conditions, actor roles, and
   acceptance evidence are frozen.
5. The accountable human owner has admitted that exact bounded execution.

If any condition is false, return `BLOCKED-NOT-ADMITTED` without implementing
or running the PoC. Preparatory harness development must be labelled
`MECHANICS-ONLY` and cannot be represented as case-card execution.

## Mandatory invocation prefix

The orchestrator MUST place the following instruction after loading the
generic `build-poc` skill and before the case-specific assignment:

```text
PROJECT-LOCAL BUILD-POC OVERRIDE

Apply WORKSPACE.md and
.aiwg/risks/poc-cards/BUILD-POC-GOVERNANCE.md over every conflicting
generic build-poc field or success criterion.

Case card: <path>
Card version: <version>
Admission state: <state>

Produce candidate evidence only. Do not decide GO/NO-GO, select architecture,
accept an ADR or test plan, change a risk status, retire/mitigate/accept a risk,
pass ABM, authorize Construction, authorize deployment, or authorize rollout.
Set every such output to NOT DECIDED and preserve the before-state exactly.
Do not delete or clean up manifested artifacts.
```

The prompt must include the full card path and version. A model or tool route
label is configuration metadata only unless provider-observed telemetry is
included in the receipt.

## Required machine disposition

Every mechanics or admitted-run result must include:

```json
{
  "evidence_disposition": "candidate",
  "mechanics_only": true,
  "qualifying_evidence_admitted": false,
  "risk_status_before": "IDENTIFIED",
  "risk_status_after": "IDENTIFIED",
  "architecture_decision": "NOT DECIDED",
  "abm_decision": "NOT DECIDED",
  "construction_authorized": false,
  "deployment_authorized": false,
  "rollout_authorized": false
}
```

For a later human-admitted case-card execution, `mechanics_only` may become
`false`, but `qualifying_evidence_admitted` remains `false` until independent
review and the separate authority gate admit it. No agent may change the risk,
architecture, ABM, Construction, deployment, or rollout fields.

## Output mapping

| Generic `build-poc` output | Required Agentmemory output |
|---|---|
| `Decision: GO/NO-GO/ALTERNATIVE` | `Decision: NOT DECIDED - evidence submitted for owner review` |
| `Risks Retired` | `Risks Retired: none; status unchanged` |
| `RETIRED / MITIGATED / ACCEPTED` | `IDENTIFIED - no agent disposition authority` |
| Architecture recommendation | Candidate observation only; no selection |
| `KEEP / ARCHIVE / DELETE` | `RETAIN - manifested evidence; cleanup not authorized` |
| Success criterion requiring retirement | Not applicable; evidence completeness is the completion criterion |

## Completion validation

The orchestrator must reject the output if it:

- omits the case-card path/version or admission state;
- reports a route as provider-observed without telemetry;
- describes mechanics as independent qualification;
- changes a risk, ADR, SAD, MTP, ABM, Construction, deployment, or rollout
  state;
- omits source/fixture/denominator hashes;
- loses raw evidence or recommends deletion without a superseding signed
  retention receipt; or
- violates any case-card stop condition.

Closing an AIWG session records workflow completion only. It never closes a
risk or gate.

