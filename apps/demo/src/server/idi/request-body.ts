import 'server-only';

const maxRequestBytes = 128 * 1024;
const maxJsonDepth = 40;

type DemoChatBody = { body: unknown } | { status: 400 | 413 };

function hasSupportedDepth(value: unknown, depth = 0): boolean {
  if (typeof value !== 'object' || value === null) return true;
  return (
    depth < maxJsonDepth &&
    Object.values(value).every((child: unknown) =>
      hasSupportedDepth(child, depth + 1)
    )
  );
}

export async function readDemoChatBody(
  request: Request
): Promise<DemoChatBody> {
  if (Number(request.headers.get('content-length')) > maxRequestBytes)
    return { status: 413 };
  if (!request.body) return { status: 400 };

  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxRequestBytes);
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.byteLength > maxRequestBytes) {
        void reader.cancel().catch(() => {});
        return { status: 413 };
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    const body: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, length)
      )
    );
    return hasSupportedDepth(body) ? { body } : { status: 400 };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}
