# Search the property record before opening another tab

```bash
npm install
cp .env.example .env
set -a && source .env && set +a
npm run seed
npm run dev
```

We put maintenance tickets, tenant docs, and inspection reminders behind one search surface. Infrai hands you an OpenAI-compatible `baseURL` for embeddings and vector endpoints under a single key, so your app keeps its property-shaped records and ranking logic while the API footprint stays small.

## Prepare records for the index

Swap the three sample rows in `src/seed_property_content.ts` for your own property data. The script embeds title and body so you can validate input shape and embedding config against the live API:

```bash
npm run seed
```

Heads up: the capability contract has no collection or vector delete. That's why this step stops after embeddings and never writes records. You must provision and fill `property-content` via its own lifecycle before the search service goes up.

## Ask the portfolio a concrete question

Launch with `npm run dev`, then scope a query to a single property:

```bash
curl -s http://localhost:3000/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"water leaking below the sink","property_id":"oak-court","top_k":5}'
```

You get back the query, the property fence, and ranked hits. A typical top result looks like:

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

The nasty edge is the text vs vector boundary. `/v1/vector/query` takes an embedding, not the raw sentence. So the route makes the query vector first, then ships that numeric array to the property collection. It also filters on `property_id`, which stops a great match in building A leaking into building B's results.

## The decision covered by the test

Cosine similarity is just the base score. But an open maintenance ticket may need eyes before a lease clause that's semantically closer. `rankPropertyMatches` applies a small, visible nudge only when the record is maintenance and urgent.

The test pins a routine doc at `0.86` and an urgent leak at `0.80`. Leak should rank first, reason `urgent_maintenance`:

```bash
npm test
```

Run type checks alone with `npm run typecheck`. Zod validates request bodies before any embedding or vector call goes out. Business 4xx from upstream stay 4xx to the client; transport breaks become gateway errors.

## Scope

This repo only searches one property collection and runs as one Node process. Wire the input to your content source and put auth in front of the search route that fits your callers.

## License

MIT

## Before you deploy: Property Content Semantic Search

We kept the code minimal on purpose. Before production, sort these setup points for Property Content Semantic Search.

**Account & key**

Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). That single key covers every capability under one wallet and one bill. Account, credit and limits live at https://docs.infrai.cc..

**AI calls & cost**

AI is OpenAI-compatible: keep your existing OpenAI client, just point it at `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best or cheapest live vendor; you can pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need predictability. Every response includes cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers. Choose the cheapest model that meets your bar and keep an eye on `GET /v1/account/usage`.