# sm-attest-auditor

**The audited bidirectional drill surface for attested agent envelope chains.**

When something looks wrong in an autonomous agent's history — a decision that should not have committed, a belief update that diverged from the action it described, a checkpoint anchor whose merkle root no longer matches — the auditor walks back through the evidence and proves what happened. Bidirectionally: from any envelope forward to genesis via `predecessor_hash` chains, and from any checkpoint envelope backward to its committed predecessors via RFC 6962 merkle inclusion proofs.

`sm-attest-auditor` is the React / TypeScript renderer for **forensic audit drills** over AAE envelope chains — the four-kind envelope family (`action`, `decision`, `belief`, `checkpoint`) defined in the [Attested Action Envelope (AAE)](https://github.com/Sharathvc23/sm-attest-viewer/blob/main/SPEC.md#13-envelope-kinds-v02-normative) specification, aligned with [Project NANDA](https://projectnanda.org)'s Attestation pillar. It surfaces the forward chain-walk, the checkpoint's merkle commitment, and the interactive inclusion-proof verifier as a forensic, audited workbench — so an auditor sees exactly what the substrate emitted, with no opportunity for hostile content to execute and no proprietary service on the verification path.

It is **one layer of a human-in-the-loop verification stack** — the trustworthy *audit step*. Operator authentication, hardware-attested endpoints, DID resolution, and audit logging are responsibilities of the surrounding stack, not this package.

The third operator-facing surface in an otherwise Python-first portfolio of [Stellarminds.ai](https://stellarminds.ai) primitives aligned with Project NANDA standards. Companion to [`sm-attest-viewer`](https://github.com/Sharathvc23/sm-attest-viewer) (chronological forensic timeline) and [`sm-decision-inspector`](https://github.com/Sharathvc23/sm-decision-inspector) (HITL workbench).

## What this package secures (v0.1)

- **No content escape.** Every user-supplied field reaches the DOM through React's default text-escaping path — no `dangerouslySetInnerHTML`, no string interpolation into HTML.
- **Hardened object lookups.** Internal kind, tone, and status maps are accessed via `Object.hasOwn` guards so a hostile envelope kind or status string cannot resolve to a prototype method.
- **Defensive parsing.** Malformed timestamps, missing payload fields, and non-string runtime values render gracefully rather than crash.
- **Cryptographic merkle verification.** Inclusion proofs are verified with the Web Crypto SHA-256 implementation in-browser — no remote verification service, no proprietary library on the verification path.
- **Cycle-safe chain walks.** The forward chain-walk detects and breaks cycles in `predecessor_hash` pointers; missing predecessors halt the walk gracefully rather than crash.
- **Adversarially tested.** Cycle detection, broken-link surfacing, wrong-root rejection, and unknown envelope kinds are explicitly covered in the test suite.

## What this package does not (yet) do

- **Resolve DIDs or fetch envelopes from a substrate.** The auditor takes a pre-fetched `AuditableEnvelope[]` array as a prop. Consumers wire their own AG-UI / MCP / archive fetcher.
- **Verify proof signatures.** `payload.proof` blocks are treated as opaque shape; cryptographic signature verification is a v1.x property — see [`SPEC.md`](./SPEC.md) §7.
- **Canonicalize envelopes for hashing.** The chain-walk uses the `envelope_hash` field supplied by the substrate. When that field is absent, the consumer is responsible for canonicalize + SHA-256 prior to passing envelopes to the auditor.

## Features

- **Substrate-neutral** — accepts envelopes as a `props` array; connect to AG-UI, MCP, A2A, websockets, or JSONL replay.
- **Domain-neutral** — no hardcoded taxonomy for envelope kinds or scope identifiers.
- **Bidirectional drill** — forward chain-walk from any envelope back to genesis; reverse drill from any checkpoint back to its committed predecessors via merkle inclusion.
- **Cryptographic merkle verification** — RFC 6962 SHA-256 inclusion proof verification runs in-browser via Web Crypto, no remote dependencies.
- **Two reference fixtures** — a 3-envelope chain (action → decision → belief) and a tenant-scope checkpoint envelope under RFC 6962 SHA-256.
- **Tested behavior** — pure derivation functions (chain-walk, merkle verification, hash formatting) exported and exhaustively unit-tested against the rules in [`SPEC.md`](./SPEC.md) §5 and §6.

## Installation

### From source (current)

The package is not yet published to npm. To use the v0.1 working draft today, install directly from the repository:

```bash
git clone https://github.com/Sharathvc23/sm-attest-auditor.git
cd sm-attest-auditor
pnpm install
pnpm test
```

### From npm (planned)

Once v0.1 stabilizes, the package will be published as `@sharathvc/sm-attest-auditor`:

```bash
npm install @sharathvc/sm-attest-auditor
# or
pnpm add @sharathvc/sm-attest-auditor
```

Peer dependencies: `react >= 19.0.0`, `react-dom >= 19.0.0`.

## Quick Start

```tsx
import {
  AttestAuditor,
  type AuditableEnvelope,
  type CheckpointEnvelope,
  type MerkleInclusionProof,
} from "@sharathvc/sm-attest-auditor";

export function MyAuditPage({
  envelopes,
  startHash,
  checkpoint,
  proof,
}: {
  envelopes: AuditableEnvelope[];
  startHash: string;
  checkpoint?: CheckpointEnvelope;
  proof?: MerkleInclusionProof;
}) {
  return (
    <AttestAuditor
      envelopes={envelopes}
      startHash={startHash}
      checkpoint={checkpoint}
      inclusionProof={proof}
      status="open"
    />
  );
}
```

Wire `envelopes` to wherever your audit feed comes from — an archive snapshot, an AG-UI replay, an evidence store. The auditor never opens connections itself.

## Reference fixtures

```tsx
import { auditFixtures } from "@sharathvc/sm-attest-auditor/fixtures";

auditFixtures.chainThree;     // 3-envelope chain: action → decision → belief
auditFixtures.checkpointOne;  // tenant-scope checkpoint, RFC 6962 SHA-256
```

Fixture hashes use placeholder bytes — they do not verify against real canonicalization. Treat them as shape examples.

## Consumer Responsibilities

The auditor uses Tailwind CSS utility classes and the same trust-state CSS tokens as the sibling viewer / inspector. Consumers must:

1. Have Tailwind CSS configured (any v3 or v4 release).
2. Define `--gem-verified`, `--gem-warning`, `--gem-failed`, `--gem-pending` CSS variables in their root scope.
3. Wire `<TooltipProvider>` once at the app root if any consumed primitives use tooltips.
4. Supply envelope hashes (either via the `envelope_hash` field on the wire, or via a pre-walk canonicalize + SHA-256 step). Without hashes, chain-walk has nothing to traverse.

## Specification

The audit semantics, chain-walk rules, and merkle inclusion contract used by the reference implementation are documented in [`SPEC.md`](./SPEC.md) as a working draft. The design rationale and the role of bidirectional audit as a separable primitive live in [`WHITEPAPER.md`](./WHITEPAPER.md).

## Related Packages

### Operator surfaces (peers)

| Package | Role |
|---|---|
| [`sm-attest-viewer`](https://github.com/Sharathvc23/sm-attest-viewer) | Chronological forensic timeline for AAE streams. Renders all four envelope kinds inline. |
| [`sm-decision-inspector`](https://github.com/Sharathvc23/sm-decision-inspector) | HITL workbench for `type: "decision"` envelopes — approve/deny gestures and M-of-N quorum. |

### Behavioral Trust (produces / stages AAEs)

| Package | Role |
|---|---|
| [`sm-locp`](https://github.com/Sharathvc23/sm-locp) | Open Compliance Protocol — defeasible-logic engine + W3C VC issuance. **Produces AAEs.** |
| [`sm-enclave`](https://github.com/Sharathvc23/sm-enclave) | Speculative execution sandbox; stages side effects before envelope commit. |

### Federation

| Package | Role |
|---|---|
| [`sm-bridge`](https://github.com/Sharathvc23/sm-bridge) | NANDA-compatible registry endpoints + Quilt-style delta sync. |

### Model Trust

| Package | Role |
|---|---|
| [`sm-model-provenance`](https://github.com/Sharathvc23/sm-model-provenance) | Zero-dependency model identity dataclass. |
| [`sm-model-card`](https://github.com/Sharathvc23/sm-model-card) | Unified model card schema. |
| [`sm-model-integrity-layer`](https://github.com/Sharathvc23/sm-model-integrity-layer) | Offline integrity verification. |
| [`sm-model-governance`](https://github.com/Sharathvc23/sm-model-governance) | Three-plane ML governance — training → approval → serving. |

## License

[MIT](./LICENSE)

---

*First published: 2026-05-20 | Last modified: 2026-05-20*

*Personal research contributions aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
