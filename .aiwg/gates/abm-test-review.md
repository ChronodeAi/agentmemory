# ABM Test Review

Date: 2026-07-25
Revision: `af13b0b139bf02211853808484d5d43026534b97`
Result: **BLOCKED**
Construction authorization: **NOT GRANTED**
Reviewer: independent AIWG Test Architect
Waivers: none

## Evidence assessment

- The Master Test Plan is Draft and has no Test Architect acceptance.
- The prior bounded, clean, single-worker run reports 137 files and 1,463 tests
  passing. It is implementation evidence, not an acceptance receipt: no raw
  log, exact environment manifest, peak RSS, worker count, or machine-readable
  result is committed.
- Canonical unconstrained `npm test` still exits 137. The kill source has not
  been independently established as OOM.
- There are 138 tracked test files. `npm test` excludes
  `test/integration.test.ts`, and CI invokes `npm test`, so the reported green
  count omits the integration suite.
- Authentication tests in `test/integration.test.ts` are conditional on
  `AGENTMEMORY_SECRET`; a run without that value can pass without exercising
  authenticated rejection behavior.
- `test/cross-project-isolation.test.ts` mocks KV, locking, audit, access
  tracking, configuration, and SDK behavior. It does not prove REST/MCP/viewer
  isolation against a real service.
- `npm run migrate` targets `dist/functions/migrate.js`, but the configured
  build entries do not emit that file.
- Existing load evidence is from an older revision and a smaller workload; no
  accepted soak duration, resource envelope, recovery window, or current-branch
  receipt exists.

## ABM conditions

1. Accept a revised Master Test Plan with canonical commands, test IDs, fixture
   manifests, environment setup/teardown, resource ceilings, raw-receipt
   format, and clear ABM/Construction/rollout boundaries.
2. Commit a bounded developer and CI test profile that makes the canonical
   command deterministic and includes the integration policy.
3. Require authenticated live-service test configuration to fail, not skip,
   when credentials are absent.
4. Define real-service cross-project isolation, secret-corpus, migration,
   restore, concurrency, failure-injection, and performance evidence plans.
5. Map suites and result receipts bidirectionally to atomic requirements and
   risks.

Full system execution, rollback rehearsal, performance/soak, and the Memetics
canary are later gates unless a bounded proof is selected to retire a critical
architecture risk during Elaboration.

**Test disposition: BLOCKED. The strategy is not accepted or reproducible.**
