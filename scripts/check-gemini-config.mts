const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY is missing");
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(10000) });
const body = await response.text();
let parsed: any = null;
try { parsed = JSON.parse(body); } catch {}
const models = Array.isArray(parsed?.models) ? parsed.models.filter((model: any) => typeof model?.name === "string" && model.name.includes("gemini")).map((model: any) => ({ name: model.name, methods: model.supportedGenerationMethods ?? [] })) : [];
console.log(JSON.stringify({ status: response.status, ok: response.ok, models, error: parsed?.error ? { code: parsed.error.code, status: parsed.error.status, message: String(parsed.error.message ?? "").slice(0, 240) } : null }, null, 2));
