# UC-003: Context Delivery, Promotion, and Provider Health

Status: Draft

## Primary flow

1. The context builder evaluates project scope, authority rank, temporal validity, provenance, exclusion policy, and per-session source history before ranking.
2. The provider receives a packet within the token budget.
3. Delivery is acknowledged; only then is the source marked delivered for the session.
4. Subsequent retrieval suppresses acknowledged sources, not merely generated packets.
5. Promotion requires recorded verification evidence; recalled content cannot verify itself.
6. Codex/Claude connectors merge only Agentmemory-owned configuration and hooks.
7. Health reports backend compatibility, backend build, viewer build, slots, project metrics, and sustained service behavior.

## Failure flows

- Disabled features return a typed error.
- Server-backed MCP fails closed when its required backend is unavailable.
- Hook-only repair is idempotent and does not force unrelated configuration.
- A healthy compatible backend never renders an `Unknown` viewer identity.
- An unacknowledged packet is eligible for retry without falsely suppressing its sources.
