/** GET an app-relative API URL; SWR keys already include /api. */
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }
  return response.json();
};

/** POST request with JSON body */
export const poster = async <T = unknown>(
  url: string,
  body: unknown
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    throw new Error(
      error !== null &&
        typeof error === 'object' &&
        'error' in error &&
        typeof error.error === 'string'
        ? error.error
        : `Request failed: ${response.status}`
    );
  }
  return response.json();
};
