const demoApiPath = `${process.env.NEXT_PUBLIC_DEMO_BASE_PATH}/api`;

export const idiApiUrl = `${demoApiPath}/idi`;
export const shipmentsApiUrl = `${demoApiPath}/shipments`;

/** GET an API URL that includes the demo's base path. */
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
