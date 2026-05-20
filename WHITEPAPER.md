# sm-attest-auditor: Bidirectional Audit for Attested Agent Envelope Chains

*Personal research contribution by [Stellarminds.ai](https://stellarminds.ai), aligned with [Project NANDA](https://projectnanda.org) standards.*

---

## Abstract

The Attested Action Envelope (AAE) lets an autonomous agent's actions be witnessed forward in time — each envelope carries a predecessor pointer so chains form naturally. But forward chains alone do not solve forensic audit, because an auditor often arrives *after* an incident: starting from a known checkpoint commitment and needing to prove that a specific envelope was covered by it, in O(log N) sibling-path verification. The forward-from-genesis and reverse-from-checkpoint drills are the two halves of bidirectional auditability.

This whitepaper makes the case that bidirectional envelope audit is a primitive in its own right, separable from the chronological viewer and the HITL inspector, and that a substrate-neutral, cryptographically-grounded, in-browser-verifiable auditor is the right shape for that primitive. The chain-walk algorithm, merkle inclusion verification contract, and rendering rules used by the reference implementation are documented in [`SPEC.md`](./SPEC.md) as a working draft. This document covers motivation, design choices, and composition with the rest of the portfolio.

---

## 1. Problem

Three failure modes converge on the audit interface:

1. **Forensic reconstruction.** Something went wrong; an investigator needs to walk back from a known-bad outcome to the action that produced it. This is the forward-chain-walk case: start at envelope X, follow `predecessor_hash` back to genesis.

2. **Inclusion verification.** A regulator presents a checkpoint commitment ("at time T, this merkle root anchored the tenant's complete action history") and asks "prove that envelope Y was covered." This is the reverse-merkle-drill case: given a leaf, a sibling path, and a root, verify in O(log N).

3. **Chain integrity.** Even when no specific incident has occurred, an auditor needs to verify that the chain has not been tampered with — that no envelope was silently dropped, that no `predecessor_hash` was rewritten, that what claims to be the history actually is.

A chronological timeline (`sm-attest-viewer`) answers "what has been attested?" An HITL workbench (`sm-decision-inspector`) answers "what does this operator need to decide right now?" Neither serves the audit failure modes above. That is the case for a separable primitive.

---

## 2. The Audit Primitive

The auditor binds together five facts about each audit drill:

| Fact | Surface |
|---|---|
| **What chain** is being audited | Chain view (ordered `ChainStep[]`) |
| **Which direction** | AuditDirectionToggle |
| **Where the commitment lives** | CheckpointSummary (merkle root + scope + as_of_ts) |
| **Whether a specific envelope is covered** | InclusionProofVerifier (RFC 6962 walk) |
| **Whether the chain is intact** | Per-node `linkIntact` indicator on each chain step |

At v0.1, the wire envelope (per [`SPEC.md`](./SPEC.md) §3) carries these facts in their natural locations. The auditor's job is to surface them in a way where the auditor's verification gesture corresponds to actual cryptographic work — not a "trust this service" stub.

---

## 3. Design Axioms

`sm-attest-auditor` is built on five axioms.

### 3.1 The auditor is presentation-only — for everything except merkle verification

The auditor never opens connections, fetches DIDs, polls endpoints, or queries a substrate. Envelopes arrive as props. The single exception: merkle inclusion verification runs in the browser via Web Crypto SHA-256. This is the only computational work the auditor performs, and it is deliberate: pushing merkle verification to a remote service would put a proprietary verifier on the audit path, which defeats the purpose.

### 3.2 No proprietary verifier on the verification path

The merkle inclusion verifier uses only `crypto.subtle.digest("SHA-256", ...)` — Web Crypto, available in every modern browser and Node.js 20+. There is no dependency on a paid library, no API call to an external service, no policy engine in the loop. An auditor sitting in an air-gapped environment can verify inclusion using only the auditor package and the inputs (leaf, siblings, root).

### 3.3 Chain integrity is derived, never asserted

The `linkIntact` flag on each `ChainStep` is computed by comparing the assembled sequence: the previous envelope's `envelope_hash` MUST equal the current envelope's `predecessor_hash`. There is no "trust this chain" flag in the wire envelope; integrity is recomputed on every render. This makes tampering with `linkIntact` impossible — the only way to change it is to change the underlying hash equality, which means producing two envelopes that hash collide under SHA-256.

### 3.4 The auditor is substrate-neutral

The auditor accepts envelopes as plain `props`. It works with AG-UI streams, MCP tool outputs, A2A messages, websocket feeds, JSONL replay, archive snapshots, or mocked arrays. This is the same load-bearing rule that lets the sibling viewer and inspector work with any AAE source.

### 3.5 Bidirectionality is a single surface, not two surfaces

A naive design would ship two packages — a forward-chain-walk viewer and a reverse-merkle-drill verifier. The auditor combines both behind a `direction` toggle because audits frequently switch directions mid-investigation ("we have the chain back to envelope X; now does the checkpoint cover X?"). One surface, two modes; consistent visual language across both.

---

## 4. Composition with the Portfolio

```
  ┌────────────────────────────────────────────────────────────────────┐
  │              HUMAN-IN-THE-LOOP VERIFICATION STACK                  │
  │                                                                    │
  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
  │   │ sm-attest-      │  │ sm-decision-    │  │ sm-attest-      │    │
  │   │ viewer          │  │ inspector       │  │ auditor         │    │
  │   │ (chronological  │  │ (HITL workbench)│  │ (bidirectional  │    │
  │   │  timeline)      │  │                 │  │  audit drill)   │    │
  │   └─────────────────┘  └─────────────────┘  └─────────────────┘    │
  │           ▲                    ▲                    ▲              │
  │           │                    │                    │              │
  │           └───── AAE envelopes (action/decision/belief/checkpoint) │
  └────────────────────────────┬─────────────────────────────────────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  │     PRODUCER LAYER             │
                  │                                │
                  │  sm-locp  →  sm-airlock  →     │
                  │              sm-enclave        │
                  └────────────────────────────────┘
```

The auditor is the third operator-facing surface in the portfolio. The viewer answers "what?" The inspector answers "should I approve?" The auditor answers "is this true?"

### 4.1 Where audit replays come from

An audit replay set is typically assembled by:

1. The auditor's operator picks a target envelope ID and an audit direction.
2. The surrounding stack queries an archive (transparency log, evidence store, or substrate replay endpoint) for the envelope and its predecessor chain.
3. (For reverse drills) The stack also fetches the relevant checkpoint envelope and an inclusion proof for the target leaf.
4. The result is passed to the auditor as props.

This package owns step 4 — surfacing the chain and the inclusion proof to the auditor. Steps 1–3 are the substrate's responsibility.

### 4.2 Verification path

The audit verifier is independently verifiable using only:

- The envelopes themselves.
- The checkpoint envelope and its inclusion proof.
- A SHA-256 implementation (the browser's Web Crypto or Node's).

There is no DID resolver on the merkle verification path. There is no signature verification at v0.1 (that lands in v1.x per [`SPEC.md`](./SPEC.md) §7.1). The auditor's job at v0.1 is structural: prove the chain is intact and the leaf is committed under the claimed root. Signature verification is the next layer up.

---

## 5. What This Whitepaper Is Not

This whitepaper does not argue that bidirectional audit solves AI agent governance. It does not. The auditor is one part of a stack that also includes:

- **DID resolution and signature verification.** v0.1 of the auditor does not verify `payload.proof` signatures. The surrounding stack must run a W3C VC verifier alongside the auditor for full forensic coverage.
- **Canonicalization of envelopes.** The auditor uses `envelope_hash` from the wire. The substrate is responsible for canonicalizing envelopes consistently before hashing.
- **Archive / transparency log integration.** The auditor does not fetch from logs. The surrounding stack does.
- **Audit logging of the audit itself.** What the auditor's operator inspects and when SHOULD be logged. The auditor does not implement this.

Bidirectional envelope audit is a *necessary* but not *sufficient* property of a trustworthy AI agent governance stack. The argument of this document is that it is a separable primitive worth building well, not that it is the whole stack.

---

## 6. Status

`sm-attest-auditor` v0.1 is a working draft of the audit primitive. The chain-walk and merkle verification contracts are documented in [`SPEC.md`](./SPEC.md). The reference implementation is in this repository under [MIT License](./LICENSE).

Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues at [github.com/Sharathvc23/sm-attest-auditor/issues](https://github.com/Sharathvc23/sm-attest-auditor/issues).

---

*First published: 2026-05-20.*

*Aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
