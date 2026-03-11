import "dotenv/config";

let accessToken = null;
let expiresAt = 0;

const CLIENT_ID = process.env.AVITO_CLIENT_ID;
const CLIENT_SECRET = process.env.AVITO_CLIENT_SECRET;

export async function refreshToken() {
  accessToken = null;
  expiresAt = 0;
  return getToken();
}

export async function getToken() {
  if (accessToken && Date.now() < expiresAt - 5 * 60 * 1000) {
    return accessToken;
  }

  const res = await fetch("https://api.avito.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Avito auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000;

  console.log(`[auth] Token refreshed, expires in ${data.expires_in}s`);
  return accessToken;
}
