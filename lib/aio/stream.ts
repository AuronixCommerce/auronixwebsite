import type { AioStreamEvent } from "./types";
/** Parse SSE across arbitrary UTF-8 chunks, CRLF boundaries, and an unterminated final frame. */
export async function* readAioStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AioStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const decode = (frame: string): AioStreamEvent | null => {
    const lines = frame.split("\n").filter((l) => l.startsWith("data:"));
    if (!lines.length) return null;
    const data = lines.map((l) => l.slice(5).replace(/^ /, "")).join("\n");
    if (data === "[DONE]") return null;
    let event: any;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error("The reply stream was interrupted. Please retry.");
    }
    if (!event || typeof event.type !== "string")
      throw new Error("Invalid reply stream. Please retry.");
    return event as AioStreamEvent;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = decode(frame);
        if (event) yield event;
      }
      if (done) {
        if (buffer.trim()) {
          const event = decode(buffer);
          if (event) yield event;
        }
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
