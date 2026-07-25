# Privacy Impact Assessment

Status: Conditional draft
Decision owner: Security Architect/Privacy Owner

## Processing

Agentmemory observes prompts, tool activity, paths, source excerpts, session metadata, test evidence, and commit relationships. This may include confidential source and accidental secrets. Strict privacy therefore means local processing only, with `external_processing=false` enforced rather than advisory.

## Required controls

- project scope on every new record and every read;
- explicit global scope;
- pre-persistence exclusion and redaction;
- secret-file authentication with no value disclosure;
- bounded capture and retention/compaction;
- provenance and audit for state-changing operations;
- explicit-only synchronization to any provider-native memory;
- deletion/rollback paths that preserve audit truth without retaining secret content;
- negative testing with representative credential and sensitive-data fixtures.

## Residual conditions

Regex redaction and current fixtures are not sufficient evidence of zero leakage. Security acceptance requires a labelled secret corpus, structural/private-tag coverage, failure-path inspection, local-processing verification, and rollback rehearsal.
