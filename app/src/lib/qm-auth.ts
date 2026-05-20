import crypto from 'crypto';

const BASE_URL = process.env.QM_BASE_URL!;
const COMPANY_KEY = process.env.QM_COMPANY_KEY!;
const SECRET_KEY = process.env.QM_SECRET_KEY!;

interface AccessTokenResponse {
  Response: {
    Role: string;
    UserId: number;
    AccessToken: {
      Token: string;
      ExpiresInUtc: string;
      ExpiresUtcTimestamp: number;
    };
    Messages: Array<{ MessageCode: number; Message: string }>;
    RefreshToken: {
      Token: string;
      ExpiresInUtc: string;
      ExpiresUtcTimestamp: number;
    };
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(userOAuthToken: string): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const timestamp = Date.now();
  const hashInput = COMPANY_KEY + userOAuthToken + SECRET_KEY + timestamp;
  const hashKey = crypto.createHash('sha256').update(hashInput).digest('hex');

  const res = await fetch(`${BASE_URL}/api/TPU/Authorize/GetAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyKey: COMPANY_KEY,
      UserOAuthToken: userOAuthToken,
      HashKey: hashKey,
      Timestamp: timestamp,
    }),
  });

  const data: AccessTokenResponse = await res.json();

  if (!data.Response?.AccessToken?.Token) {
    throw new Error('Failed to get QM access token');
  }

  cachedToken = {
    token: data.Response.AccessToken.Token,
    expiresAt: data.Response.AccessToken.ExpiresUtcTimestamp,
  };

  return cachedToken.token;
}

export function getOAuthUrl(redirectUrl: string): Promise<string> {
  return fetch(
    `${BASE_URL}/api/ThirdCompany/OAuth?key=${COMPANY_KEY}&redirectUrl=${encodeURIComponent(redirectUrl)}`,
    { method: 'POST' }
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.Response?.MessageCode === 200) {
        return data.Response.ExtValue;
      }
      throw new Error('Failed to get OAuth URL');
    });
}
