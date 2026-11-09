export const AIO_MODELS = [
  { id: "aio-one", name: "AIO One", label: "Classic · relaxed pace", description: "The classic Auronix assistant, with a slower, easier-to-follow reply pace." },
  {
    id: "aio-2",
    name: "AIO 2",
    label: "Balanced",
    description: "For explanations, comparisons, and thoughtful guidance.",
  },
  {
    id: "aio-2-fast",
    name: "AIO 2 Fast",
    label: "Quick answers",
    description: "For navigation, short questions, and everyday support.",
  },
] as const;
export type AioModelId = (typeof AIO_MODELS)[number]["id"];
export function normalizeAioModelId(value: unknown): AioModelId {
  return value === "aio-one" ? "aio-one" : value === "aio-2-fast" ? "aio-2-fast" : "aio-2";
}
export function resolveAioModel(
  value: unknown,
  settings: Record<string, unknown>,
): string | undefined {
  const candidate =
    normalizeAioModelId(value) === "aio-one"
      ? settings.aioOneModel || "openai/gpt-oss-20b"
      : normalizeAioModelId(value) === "aio-2-fast"
      ? settings.aioFastModel || "openai/gpt-oss-20b"
      : settings.aioModel;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined;
}
