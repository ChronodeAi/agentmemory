# Risk Escalation Log

Status: Active
Date: 2026-07-25
Iteration: Elaboration iteration 1

## Active P0 Escalations

None. The working assessment contains no score from 21 through 25, so no
individual P0 decision brief was generated.

## P0 Watchlist

These risks have catastrophic impact and a score of 20. A one-point increase
in probability would require immediate P0 escalation:

| Risk | Current score | Accountable owner | Escalation trigger |
|---|---:|---|---|
| R-02 secret persistence/disclosure | 20 | Security Architect | Deployment scope or observed exposure makes probability Almost Certain |
| R-03 stale authority | 20 | Product Owner | Gate-critical injection is enabled with reproduced stale inclusion |
| R-04 false delivery | 20 | Software Architect | Provider dispatch loss is reproduced as unavoidable/systemic |
| R-14 fail-open authentication | 20 | Authentication Service Owner | An externally reachable service is found without a required secret |
| R-16 migration/restore integrity | 20 | State Migration and Recovery Owner | A required migration shows partial/mixed-state behavior |
| R-17 silent context success | 20 | Context Pipeline Owner | Required-source failure is reproduced in a gate-critical automatic packet |

## Escalation Rule

When any risk reaches P0:

1. Stop the affected evidence path and apply the card's containment boundary.
2. Preserve redacted evidence and notify Project Manager within the cycle.
3. Create `risk-escalation-{risk-id}.md` with options, cost/schedule/scope
   effects, owner recommendation, and decision deadline.
4. Record an executive decision or leave the risk pending.
5. Do not infer risk acceptance, ABM approval, or Construction authorization
   from an operational containment action.

## Resolved Escalations

None.
