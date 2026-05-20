# Contributing to `sm-attest-auditor`

Thanks for your interest. This document covers the basics — code style, how to propose changes, and what makes a good PR for this repository specifically.

## Scope

`sm-attest-auditor` is the reference React workbench for bidirectional audit drills over AAE envelope chains — the per-envelope evidence primitive aligned with the Attestation pillar of Project NANDA's four-pillar architecture. PRs that don't fit one of the categories below are still welcome, but the response will start with a scope-check conversation:

- **Working-draft alignment** — the auditor's behavior tracks the chain-walk and merkle-inclusion contracts documented in [`SPEC.md`](./SPEC.md) §5 and §6. Changes that bring the auditor into closer alignment with that documented behavior are welcome.
- **Bug fixes** — anything that fixes incorrect behavior, accessibility gaps, type-safety holes, or merkle-verification defects.
- **New fixtures** — additional chain-walk shape examples covering trajectories the existing fixtures don't (e.g., broken-link recovery, multi-checkpoint composition, very long chains).
- **Working-draft revisions** (changes to `SPEC.md`) — these go through a heavier review. See *Working-draft revisions* below.

Out of scope: building a substrate, implementing an envelope canonicalizer (consumer concern), adding a DID resolver to the verification path (out of scope for v0.1; deferred to v1.x), and taking a runtime dependency on any particular agent framework or cryptography library beyond Web Crypto.

## Development setup

```bash
git clone https://github.com/Sharathvc23/sm-attest-auditor.git
cd sm-attest-auditor
pnpm install   # or npm install
pnpm typecheck
pnpm test
```

Node 22+, pnpm 9+ recommended. The package targets ES2022. The merkle verifier uses Web Crypto, which is available in modern browsers and Node 20+.

## Tests

The pure functions in `src/audit-logic.ts` are the highest-coverage targets. If you change derivation logic (`buildChainWalk`, `verifyMerkleInclusion`), the PR must include tests demonstrating the new behavior — including any new failure modes added to `InclusionProofResult.reason`. Tests live under `tests/`.

```bash
pnpm test            # one shot
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

## Code style

- TypeScript strict mode is required.
- Pure functions in `audit-logic.ts`; no I/O, no React state.
- Components use `"use client"` directive where they hold state or render in a client environment.
- Tailwind utility classes via `cn()`. CSS variables (`--gem-*`) for theme-bound color tokens.
- No `any`. If you reach for `any`, reach for `unknown` and a type guard instead.

## Commit messages

Use imperative mood: "fix: defensive position-check in verifyMerkleInclusion," not "fixed position check." A `Conventional Commits` prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`) is encouraged but not required.

## DCO

Sign off commits with `-s` to attest to the [Developer Certificate of Origin](https://developercertificate.org/):

```bash
git commit -sm "fix: defensive position-check in verifyMerkleInclusion"
```

This package does **not** require a CLA. The DCO sign-off is sufficient.

## Working-draft revisions

Changes to `SPEC.md` go through a heavier review than code changes:

1. Open a GitHub Discussion (or issue with the `wire-format-change` label) describing the change and the rationale.
2. Wait for at least one substantive response before opening the PR.
3. The PR must update both `SPEC.md` and the relevant code/types so the documented behavior and the auditor stay aligned.
4. Adding or removing an `InclusionProofResult.reason` value is breaking; it requires a major version bump.

## Verifier invariants

The merkle inclusion verifier is the load-bearing cryptographic surface of this package. PRs that touch it MUST:

- Preserve the no-proprietary-dependency rule (Web Crypto SHA-256 only).
- Preserve the position-aware concatenation rule (`left` vs `right` siblings).
- Preserve the existing failure-mode reason codes (`"leaf-empty"`, `"expected-root-empty"`, `"computed-root-mismatch"`).
- Include round-trip tests against the RFC 6234 SHA-256 test vectors plus at least one multi-level merkle proof.

## NANDA alignment

This auditor is positioned as a NANDA Pillar 4 (Attestation) reference. Contributions that strengthen the integration with NANDA primitives — AgentFacts resolution, KYA 1.0 composition, ART registry lookup, ACAP authorization handoff — are explicitly welcome. The README and SPEC §2 are the source of truth on how envelope audit relates to other NANDA work.

## Reporting issues

Open an issue at https://github.com/Sharathvc23/sm-attest-auditor/issues with:

- What you expected to happen.
- What actually happened.
- A minimal reproduction (CodeSandbox link or a `tests/` test case is ideal).
- The version of `@sharathvc/sm-attest-auditor` you're using.

Security issues: please email rather than filing publicly. Contact details in the package metadata.
