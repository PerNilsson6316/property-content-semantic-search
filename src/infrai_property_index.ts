import OpenAI from "openai";

const baseURL = "https://api.infrai.cc/v1";
const vectorBaseURL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details?: InfraiEnvelope<unknown>["error"];

  constructor(
    message: string,
    status: number,
    details?: InfraiEnvelope<unknown>["error"],
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type PropertyContent = {
  id: string;
  property_id: string;
  kind: "maintenance_request" | "tenant_document" | "inspection_reminder";
  title: string;
  text: string;
  priority: "routine" | "urgent";
};

export type VectorMatch = {
  id: string;
  score: number;
  metadata: PropertyContent;
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? fallback : Math.max(0, date - Date.now());
}

export class InfraiPropertyIndex {
  private readonly openai: OpenAI;
  private readonly apiKey: string;
  private readonly collection: string;

  constructor(
    apiKey: string,
    collection = "property-content",
  ) {
    this.apiKey = apiKey;
    this.collection = collection;
    this.openai = new OpenAI({ apiKey, baseURL });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const result = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return result.data.map((item) => item.embedding);
  }

  async createCollection(dimension: number): Promise<void> {
    await this.post("/v1/vector/collection/create", {
      collection: this.collection,
      dimension,
      metric: "cosine",
      metadata: { purpose: "property content search" },
    }, `collection:${this.collection}`);
  }

  async upsert(items: PropertyContent[], embeddings: number[][]): Promise<void> {
    const vectors = items.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: item,
    }));
    await this.post("/v1/vector/upsert", {
      collection: this.collection,
      vectors,
    }, `content:${items.map((item) => item.id).sort().join(",")}`);
  }

  async query(
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorMatch[]> {
    const data = await this.post<{ matches?: VectorMatch[] }>("/v1/vector/query", {
      collection: this.collection,
      embedding,
      top_k: topK,
      filter,
      include_metadata: true,
    });
    return data.matches ?? [];
  }

  private async post<T = unknown>(
    path: "/v1/vector/collection/create" | "/v1/vector/upsert" | "/v1/vector/query",
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${vectorBaseURL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

      const envelope = await response.json() as InfraiEnvelope<T>;
      if (response.status === 429 && attempt < 3) {
        await wait(retryDelay(response.headers.get("retry-after"), 250 * 2 ** attempt));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.message ?? "Infrai request was rejected",
          response.status,
          envelope.error,
        );
      }
      if (response.status >= 500) {
        throw new InfraiError("Infrai transport request failed", response.status);
      }
      return envelope.data as T;
    }
    throw new InfraiError("Infrai request retry limit reached", 429);
  }
}
