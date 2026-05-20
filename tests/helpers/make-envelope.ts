import type { AuditableEnvelope } from "../../src/types";

let counter = 0;

/** Build a minimal AuditableEnvelope for tests; override any field via partial. */
export function makeEnvelope(
  overrides: Partial<AuditableEnvelope> = {},
): AuditableEnvelope {
  counter += 1;
  const base: AuditableEnvelope = {
    v: 1,
    id: `audit-${counter}`,
    ts: "2026-05-20T08:00:00.000Z",
    tenant: "acme-corp",
    actor: {
      namespace: "ops",
      value: "agent-orion",
      did: "did:example:ops/agent-orion",
      display_name: "Agent Orion",
    },
    topic: "tenants/acme-corp/agents/attestations",
    type: "action",
    classification: "internal",
    payload: { kind: "rule_citation" },
    lifecycle: "anchored",
  };
  return { ...base, ...overrides };
}
