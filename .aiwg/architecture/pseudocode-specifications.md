# Pseudocode Specifications

Status: Draft

## Eligibility-first packet

```text
require project and session-project match
candidates = recall(project) + verified_lessons(project) + file_context(project)
eligible = candidates.filter(scope_matches)
                     .filter(not_excluded_or_secret)
                     .filter(valid_now)
                     .filter(provenance_resolves)
                     .filter(authority_and_verification_satisfy_context_class)
                     .filter(not_acknowledged_for_session)
ranked = relevance_rank(eligible)
packet = pack(ranked, hard_limit=2000_tokens)
return packet_id, sources, decisions, expires_at
```

## Delivery acknowledgement

```text
ack(project, session, packet_id, provider_receipt):
  require packet project/session match
  require packet not expired and receipt authentic
  idempotently mark packet and its sources acknowledged
  record delivery audit without content or secrets
```

## Promotion

```text
promote(candidate):
  require current project and valid provenance
  evidence = resolve_typed_evidence(candidate.evidence_refs)
  reject evidence derived only from Agentmemory recall
  require independent evidence policy for candidate kind
  if architecture: require accepted ADR and commit
  audit and persist idempotently
```

## Sustained health

```text
sample liveness, backend readiness, pressure, slots, compatibility, backend build, viewer build
healthy only after configured consecutive successes
degrade on pressure or partial dependency failure
fail required server-backed calls closed
never substitute process_alive for service_healthy
```
