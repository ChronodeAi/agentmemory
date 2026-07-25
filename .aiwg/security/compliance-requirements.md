# Security and Compliance Requirements

Status: Draft

1. Data minimization: store only lifecycle evidence required by the declared capture profile.
2. Purpose limitation: coding memory is not a general cross-project user profile.
3. Isolation: project scope is the default security boundary; global scope is explicit and audited.
4. Confidentiality: restricted content is rejected or redacted before persistence.
5. Integrity: provenance, validity interval, authority rank, verification evidence, and commit/uncommitted state are retained.
6. Availability: hooks are bounded; backend-dependent operations fail truthfully; sustained health is distinct from a process being alive.
7. Auditability: state changes record an audit entry without secret values.
8. User control: native-memory synchronization, rollout, and gate-critical injection require explicit authorization.
9. Authentication: the runtime accepts a secret file with process-environment precedence and secure failure behavior.
10. Evidence: release requires the security fixture suite, load/soak evidence, rollback rehearsal, and named-owner acceptance.
