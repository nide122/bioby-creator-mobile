/** Google UserInfo（需 `openid`/`profile`/`email` 等 scope）。文档：OAuth 2.0 to Access Google APIs。 */
export async function fetchGooglePrimaryEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`google_userinfo_${res.status}`);
  }
  const json = (await res.json()) as { email?: string };
  if (!json.email) throw new Error('google_email_missing');
  return json.email;
}

/** Microsoft Graph `/me`（需 `openid` + Graph Mail/User.Read 视场景而定）。文档：Microsoft identity platform auth code + PKCE。 */
export async function fetchMicrosoftPrimaryEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`graph_me_${res.status}`);
  }
  const json = (await res.json()) as { mail?: string | null; userPrincipalName?: string };
  const email = json.mail || json.userPrincipalName;
  if (!email) throw new Error('microsoft_email_missing');
  return email;
}
