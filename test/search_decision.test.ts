import assert from "node:assert/strict";
import test from "node:test";
import { rankPropertyMatches } from "../src/search_decision.ts";

test("an urgent maintenance request outranks a slightly closer document", () => {
  const ranked = rankPropertyMatches([
    {
      id: "lease-note",
      score: 0.86,
      metadata: {
        id: "lease-note",
        property_id: "oak-court",
        kind: "tenant_document",
        title: "Plumbing access clause",
        text: "Notice requirements for entering a unit to inspect plumbing.",
        priority: "routine",
      },
    },
    {
      id: "active-leak",
      score: 0.8,
      metadata: {
        id: "active-leak",
        property_id: "oak-court",
        kind: "maintenance_request",
        title: "Active kitchen leak",
        text: "Water is collecting beneath the kitchen sink.",
        priority: "urgent",
      },
    },
  ]);

  assert.equal(ranked[0].id, "active-leak");
  assert.equal(ranked[0].reason, "urgent_maintenance");
});
