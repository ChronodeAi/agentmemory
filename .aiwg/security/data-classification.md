# Data Classification

Status: Draft; requires Security Architect acceptance

| Class | Examples | Required handling |
|---|---|---|
| Public | Published documentation, public repository metadata | Project scope and provenance still required |
| Internal | Paths, session IDs, tool metadata, non-secret prompts | Local by default; bounded retention; project isolation |
| Confidential | Private source, diffs, uncommitted work, architecture decisions | Strict local processing; exclusion policy; access and audit |
| Restricted | Tokens, credentials, private keys, secret files, regulated personal data | Never persist plaintext; redact/drop before write; never externalize |

Authentication uses process environment or a secret-file path. Secret values must not appear in CLI output, hooks, logs, packets, provenance records, test snapshots, or viewer responses.
