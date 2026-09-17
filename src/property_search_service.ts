import express from "express";
import { z } from "zod";
import { InfraiError, InfraiPropertyIndex } from "./infrai_property_index.ts";
import { rankPropertyMatches } from "./search_decision.ts";

const searchBody = z.object({
  query: z.string().trim().min(3).max(500),
  property_id: z.string().trim().min(1),
  kinds: z.array(z.enum([
    "maintenance_request",
    "tenant_document",
    "inspection_reminder",
  ])).min(1).optional(),
  top_k: z.number().int().min(1).max(20).default(8),
});

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const index = new InfraiPropertyIndex(apiKey);
const service = express();
service.use(express.json({ limit: "32kb" }));

service.post("/search", async (request, response) => {
  const parsed = searchBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid search body", issues: parsed.error.issues });
    return;
  }

  try {
    const [embedding] = await index.embed([parsed.data.query]);
    const filter: Record<string, unknown> = { property_id: parsed.data.property_id };
    if (parsed.data.kinds) filter.kind = { $in: parsed.data.kinds };
    const matches = await index.query(embedding, parsed.data.top_k, filter);
    response.json({
      query: parsed.data.query,
      property_id: parsed.data.property_id,
      results: rankPropertyMatches(matches),
    });
  } catch (error) {
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.message, details: error.details });
      return;
    }
    response.status(500).json({ error: "Search could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
service.listen(port, () => console.log(`Property search listening on http://localhost:${port}`));
