import 'server-only';
import { Buffer } from 'node:buffer';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;
const localOidcToken = process.env.VERCEL_OIDC_TOKEN;
const vercelRequestContext = Symbol.for('@vercel/request-context');
const runtimeGlobal: typeof globalThis & {
  [vercelRequestContext]?: {
    get?: () => { headers?: Record<string, string | undefined> } | undefined;
  };
} = globalThis;

export function isDemoAIAvailable() {
  if (gatewayApiKey) return gatewayApiKey.trim().length > 0;

  // Mirror the Gateway SDK's OIDC sources without probing the network or reading client headers.
  const token =
    runtimeGlobal[vercelRequestContext]?.get?.()?.headers?.[
      'x-vercel-oidc-token'
    ] ?? localOidcToken;
  if (!token) return false;
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra !== undefined) return false;

  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );
    return (
      typeof claims === 'object' &&
      claims !== null &&
      'exp' in claims &&
      typeof claims.exp === 'number' &&
      claims.exp * 1_000 > Date.now() + 60_000
    );
  } catch {
    return false;
  }
}
