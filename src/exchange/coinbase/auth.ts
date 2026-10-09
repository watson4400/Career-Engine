import { generateJwt } from "@coinbase/cdp-sdk/auth";

export interface CoinbaseCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

export function loadCoinbaseCredentials(): CoinbaseCredentials {
  const apiKeyId = (process.env.COINBASE_API_KEY_ID ?? process.env.COINBASE_KEY_NAME ?? "").trim();
  let apiKeySecret = (process.env.COINBASE_API_KEY_SECRET ?? process.env.COINBASE_PRIVATE_KEY ?? "").trim();
  // Support secrets pasted with literal \n
  apiKeySecret = apiKeySecret.replace(/\\n/g, "\n");
  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      "Missing Coinbase CDP credentials. Set COINBASE_API_KEY_ID and COINBASE_API_KEY_SECRET in .env",
    );
  }
  return { apiKeyId, apiKeySecret };
}

export async function coinbaseJwt(
  creds: CoinbaseCredentials,
  method: string,
  host: string,
  path: string,
): Promise<string> {
  return generateJwt({
    apiKeyId: creds.apiKeyId,
    apiKeySecret: creds.apiKeySecret,
    requestMethod: method.toUpperCase(),
    requestHost: host,
    requestPath: path,
    expiresIn: 120,
  });
}
