export interface SsePayload {
  type: string;
  data: unknown;
}

export async function readSse(
  response: Response,
  onEvent: (event: SsePayload) => void,
) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let index;
    while ((index = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 2);
      if (!raw) continue;

      const lines = raw.split("\n");
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));

      if (dataLines.length === 0) continue;
      const json = dataLines.join("\n");
      try {
        const payload = JSON.parse(json) as SsePayload;
        onEvent(payload);
      } catch {
        // ignore malformed event
      }
    }
  }
}
