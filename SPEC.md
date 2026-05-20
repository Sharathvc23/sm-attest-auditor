# Bidirectional Envelope Audit — Working Draft

*Specification for the chain-walk + merkle inclusion drill, as consumed by `sm-attest-auditor` v0.1.*

This document is a **working draft**. It describes the chain-walk semantics, the merkle inclusion-proof contract, and the rendering rules used by the reference implementation. It MUST be read alongside the AAE specification ([sm-attest-viewer/SPEC.md](https://github.com/Sharathvc23/sm-attest-viewer/blob/main/SPEC.md)) — particularly §3 (base envelope), §5 (anchoring), and §13 (envelope kinds, including `type: "checkpoint"`).

---

## 1. Scope and Non-Goals

### 1.1 Scope

This specification defines:

- The minimal envelope shape the auditor consumes (`AuditableEnvelope`).
- The shape of a `type: "checkpoint"` envelope including its `merkle_root` and `merkle_inclusion_proof_method` fields.
- The forward chain-walk algorithm: how `predecessor_hash` pointers are traversed.
- The reverse merkle inclusion verification algorithm: how a leaf hash, a sibling path, and an expected root combine into a verification result.
- The rendering contract for the reference auditor (`sm-attest-auditor`).

### 1.2 Non-Goals

This specification does **not** define:

- The wire encoding of envelopes (covered by upstream AAE §4).
- The canonicalization rule used to compute `envelope_hash` (the consumer's responsibility; typically W3C URDNA2015 RDF Canonicalization per upstream AAE §4.1).
- The cryptographic verification of `payload.proof` signatures (deferred to v1.x).

### 1.3 Audiences

- **Substrate authors** producing checkpoint envelopes and `envelope_hash`-bearing chains.
- **Audit-tool implementers** consuming this package or building parallel verifiers.

---

## 2. Relationship to the AAE Specification

The auditor consumes the base AAE envelope shape (upstream §3) with two additions:

- `envelope_hash` (optional string) — the canonical hash of this envelope. When omitted, the consumer is responsible for computing it before invoking chain-walk.
- `predecessor_hash` (optional string) — pointer to the prior envelope in a chain. Already present in upstream AAE §3.2 as a convention; this document elevates it to a normative chain-walk field.

For checkpoint envelopes (`type: "checkpoint"`), the payload carries normative additions defined in §3.

---

## 3. Checkpoint Envelope Payload (Normative)

When `type = "checkpoint"`, the `payload` field MUST conform to:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `subject` | object | no | Issuer of the checkpoint — same `{namespace, value, did}` shape as upstream §3.4. Typically a checkpoint-scheduler service. |
| `checkpoint_subject` | object (see §3.1) | yes | Identifies the slice of envelopes this checkpoint commits to. |
| `merkle_root` | hex SHA-256 | yes | The root of the merkle tree over predecessor envelope hashes in scope. |
| `merkle_inclusion_proof_method` | string | yes | Identifier of the inclusion-proof scheme. v0.1 supports `"rfc6962-sha256"`. |
| `predecessor_hashes` | array of hex | no | Leaf hashes — the envelopes committed to. Omitted when the count exceeds a per-deployment threshold; consumers fetch leaves via a separate channel in that case. |

### 3.1 `checkpoint_subject`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `scope` | string | yes | One of `"tenant"`, `"entity"`, `"agent"`, `"decision_chain"`, or a deployment-specific identifier. |
| `scope_key` | string | yes | The identifier within the scope (tenant ID, entity DID, etc.). |
| `as_of_ts` | RFC 3339 datetime | yes | When the snapshot was taken. |
| `covered_envelopes_count` | integer | yes | Number of envelopes covered by the commitment. Renderers SHOULD display this prominently. |

---

## 4. Chain-of-Checkpoints (Normative)

A checkpoint envelope MAY itself carry a `predecessor_hash` at envelope root pointing at the prior checkpoint of the same scope. This forms a chain-of-checkpoints — each new checkpoint anchors the previous one in addition to its own scope of envelopes.

Verifiers MAY use the chain-of-checkpoints to verify long histories in O(log N) per envelope: walk forward from a known-good genesis checkpoint, verify each subsequent checkpoint's commitment, then verify the target envelope's inclusion in the most recent containing checkpoint.

---

## 5. Forward Chain-Walk (Normative)

Given a set of envelopes `E` and a starting hash `h`, the forward chain-walk produces an ordered sequence of `ChainStep` entries.

### 5.1 Algorithm

```
walk(E, h):
  byHash = index of envelopes in E by envelope_hash
  collected = []
  seen = set()
  cursor = h
  while cursor is set AND cursor not in seen:
    seen.add(cursor)
    env = byHash[cursor]
    if env is undefined: break
    collected.append(env)
    cursor = env.predecessor_hash (or null when absent/blank)
  return reverse(collected)  # genesis-first
```

### 5.2 Properties

- **Cycle-safe.** If `cursor` is observed twice, the walk halts. A cycle is malformed; the returned sequence reflects what could be safely assembled.
- **Gap-tolerant.** If `byHash[cursor]` is undefined (the predecessor is not in the supplied envelope set), the walk halts gracefully. The returned sequence ends at the last known envelope.
- **Link-integrity flag.** Each `ChainStep` carries `linkIntact: boolean`:
  - For the genesis step (no `predecessor_hash`): always `true`.
  - For all other steps: `true` iff the predecessor in the assembled sequence has `envelope_hash` equal to this step's `predecessor_hash`. A `false` flag signals a broken link — the upstream history is not verifiable from this point.

### 5.3 Direction

The walk returns its result in chronological (genesis-first) order. Consumers wanting a reverse-from-newest display SHOULD reverse the returned array; the reference auditor does this when its `direction` toggle is set to `"reverse"`.

---

## 6. Reverse Merkle Inclusion (Normative)

Given a leaf hash `L`, a sibling path `P = [(h_i, position_i)]`, and an expected root `R`, the inclusion verifier produces an `InclusionProofResult`.

### 6.1 Algorithm

```
verify(L, P, R):
  if L is blank: return ok=false, reason="leaf-empty"
  if R is blank: return ok=false, reason="expected-root-empty"
  running = L (lowercased hex)
  for each (h_i, position_i) in P:
    sibling = h_i (lowercased hex)
    if position_i == "left":
      running = SHA-256(sibling || running)
    else:
      running = SHA-256(running || sibling)
  if running == R (lowercased hex):
    return ok=true, computedRoot=running, steps=|P|
  return ok=false, reason="computed-root-mismatch", computedRoot=running, steps=|P|
```

### 6.2 Hashing

All hashes are SHA-256 over the raw byte concatenation of the inputs. The library expects hex-encoded inputs and produces hex-encoded outputs. Position-aware concatenation handles RFC 6962's left/right sibling distinction; the leaf hash is treated as already pre-hashed (the RFC 6962 leaf-prefix treatment, if needed, is the consumer's responsibility).

### 6.3 Leaf-only proofs

A proof with an empty sibling path is valid when `L == R` — this corresponds to a single-leaf merkle tree (the root IS the leaf). The verifier handles this case directly: zero iterations of the loop, then the final equality check.

### 6.4 Failure modes

`InclusionProofResult.reason` is one of:

- `"leaf-empty"` — the supplied leaf hash was missing or blank.
- `"expected-root-empty"` — the supplied expected root was missing or blank.
- `"computed-root-mismatch"` — the proof was structurally valid but the computed root did not match the expected root.

Future versions MAY add additional reasons (e.g., `"invalid-hex"`, `"sibling-out-of-bounds"`). Implementations MUST NOT remove existing reason codes without a version bump.

---

## 7. Trust State for Audited Envelopes (Informative)

The auditor renders each `ChainStep` with a colored left border:

- **Green** (`emerald-500`) — `linkIntact === true`. The envelope's predecessor link verifies against the assembled chain.
- **Amber** (`amber-500`) — `linkIntact === false`. The chain is broken at this node; upstream history is not verifiable.

This is a derived visual indicator, NOT the AAE §11.2 trust-state mapping. The two concerns are independent: an envelope can be lifecycle-anchored (verified by §11.2) but sit at a broken chain link (audit-broken). The reference auditor surfaces both signals.

### 7.1 Renderer-side proof verification (planned)

A future version of this document will define how the auditor composes with a W3C VC signature verifier so each `ChainStep` carries an independent crypto-verified flag in addition to the chain-link integrity flag.

---

## 8. Rendering Rules (Normative for the reference auditor)

The reference auditor (`sm-attest-auditor` v0.1) enforces the following rules:

### 8.1 No content escape

Every user-supplied field — including envelope kind labels, hash strings, scope identifiers — MUST reach the DOM through React's default text-escaping path. `dangerouslySetInnerHTML` is forbidden.

### 8.2 Hardened object lookups

Internal kind, tone, and status maps MUST be accessed via `Object.hasOwn` guards. A hostile envelope kind string MUST NOT resolve to a prototype method.

### 8.3 Defensive parsing

Malformed hashes, missing payload fields, and non-string runtime values MUST render gracefully (em-dash for missing hashes, neutral tone for unknown kinds).

### 8.4 Substrate-neutrality

The auditor MUST NOT open connections, poll endpoints, fetch DIDs, or make network calls of any kind. The consumer is the sole authority on data ingestion. The merkle verification path uses only the browser's Web Crypto API and the inputs passed to the verifier.

### 8.5 No proprietary verifier on the path

The merkle inclusion verification SHOULD use only Web Crypto SHA-256 (or an equivalent reference implementation). Implementations MUST NOT take a dependency on any closed-source or service-bound verifier.

---

## 9. Open Questions for v1.0

1. **Renderer-side signature verification.** §7.1 sketches the composition with a VC verifier. v1.0 would describe the reference implementation.
2. **Canonicalization invariant.** Whether the auditor SHOULD compute `envelope_hash` on the fly from the wire envelope (and what canonicalization to use) versus requiring the substrate to supply it.
3. **Chain-of-checkpoints merge.** Whether two parallel chains of checkpoints from the same tenant can merge, and what semantics that has.
4. **Pruning strategies.** How long an audit replay set SHOULD retain envelopes once anchored by N successive checkpoints.
5. **Proof composability.** Whether a proof that envelope X is committed by checkpoint A AND checkpoint A is committed by checkpoint B can be composed into a single inclusion proof against B's root.

---

*Working draft last modified: 2026-05-20.*

*Aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
