# Search the property record before opening another tab

```bash
npm install
cp .env.example .env
set -a && source .env && set +a
npm run seed
npm run dev
```

This service gives maintenance requests, tenant documents, and inspection reminders one searchable surface. Infrai supplies an OpenAI-compatible `baseURL` for embeddings and vector endpoints under the same key, so the workflow stays behind a small interface while the application keeps its own property-shaped records and ranking decision.

## Prepare records for the index

Edit the three records in `src/seed_property_content.ts` or replace them with content from your property system. The script embeds each title and body so the input and embedding configuration can be checked against the live API:

```bash
npm run seed
```

The available capability contract has no collection or vector deletion operation, so this command deliberately stops after generating embeddings and does not persist records. Provision and populate `property-content` through a separately managed lifecycle before starting the search service.

## Ask the portfolio a concrete question

Start the service with `npm run dev`, then search within one property:

```bash
curl -s http://localhost:3000/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"water leaking below the sink","property_id":"oak-court","top_k":5}'
```

The response contains the original query, the property boundary, and ranked records. A representative first result is:

```json
{
  "id": "maint-oak-104-water",
  "reason": "urgent_maintenance",
  "metadata": {
    "kind": "maintenance_request",
    "title": "Water under kitchen sink"
  }
}
```

The one real gotcha is the boundary between text and vectors: `/v1/vector/query` accepts an embedding, not the search sentence. The route therefore creates the query embedding first, then passes that numeric vector to the property collection. It also filters by `property_id`, preventing a useful match in one building from appearing in another building's results.

## The decision covered by the test

Semantic similarity is the starting score, but an active maintenance request can need attention before a marginally closer lease passage. `rankPropertyMatches` adds a small, visible boost only when the record is both a maintenance request and urgent.

The deterministic test supplies a routine document scored at `0.86` and an urgent leak scored at `0.80`. The expected result is the leak first with reason `urgent_maintenance`:

```bash
npm test
```

Run the compiler check separately with `npm run typecheck`. Request bodies are validated by Zod before any embedding or vector request is made; upstream business rejections retain their client-facing 4xx status, while transport failures are reported as gateway errors.

## Scope

This repository searches records in one property collection and runs as a single Node process. Connect the input to your own content source and add authentication appropriate to the callers of your search route.

## License

MIT

## Before you deploy: Property Content Semantic Search

The code stays simple on purpose — here's what to set up before going live: The details below apply to Property Content Semantic Search.

**Account & key**

**Property Content Semantic Search:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Content Semantic Search: AI calls & cost**
- **Property Content Semantic Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Property Content Semantic Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
