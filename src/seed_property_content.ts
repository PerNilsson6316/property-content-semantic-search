import { InfraiPropertyIndex, type PropertyContent } from "./infrai_property_index.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before seeding content");

const content: PropertyContent[] = [
  {
    id: "maint-oak-104-water",
    property_id: "oak-court",
    kind: "maintenance_request",
    title: "Water under kitchen sink",
    text: "Tenant in unit 104 reports an active leak below the kitchen sink cabinet.",
    priority: "urgent",
  },
  {
    id: "doc-oak-pet-policy",
    property_id: "oak-court",
    kind: "tenant_document",
    title: "Pet policy acknowledgement",
    text: "Signed tenant acknowledgement covering registered pets and common-area rules.",
    priority: "routine",
  },
  {
    id: "inspect-oak-smoke-alarms",
    property_id: "oak-court",
    kind: "inspection_reminder",
    title: "Quarterly smoke alarm inspection",
    text: "Inspect smoke alarms in every unit and record battery replacement dates.",
    priority: "routine",
  },
];

const index = new InfraiPropertyIndex(apiKey);
const embeddings = await index.embed(content.map((item) => `${item.title}\n${item.text}`));
console.log(
  `Prepared ${content.length} property records with ${embeddings[0].length}-dimension embeddings; ` +
    "no vectors were persisted because the available API has no deletion capability",
);
