export function baseUrl() {
  // Vercel provides VERCEL_URL (usually without protocol); allow overriding with full URL in dev
  const v = process.env.VERCEL_URL;
  if (v) return v.startsWith('http') ? v : `https://${v}`;
  return 'http://localhost:3000';
}

export function verifyEnv() {
  const issues = [];
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CALENDAR_ID'];
  for (const k of required) {
    if (!process.env[k]) issues.push(`${k} is missing`);
  }
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID) {
    issues.push('Missing Google OAuth client id (GOOGLE_OAUTH_CLIENT_ID)');
  }
  if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET && !process.env.GOOGLE_CLIENT_SECRET) {
    issues.push('Missing Google OAuth client secret (GOOGLE_OAUTH_CLIENT_SECRET)');
  }
  if (process.env.GOOGLE_CLIENT_ID?.includes('gserviceaccount.com') || process.env.GOOGLE_OAUTH_CLIENT_ID?.includes('gserviceaccount.com')) {
    issues.push('Google OAuth client appears to be a Service Account; create OAuth Web credentials.');
  }
  if (!process.env.VERCEL_URL) {
    issues.push('Set VERCEL_URL (full URL in dev like http://localhost:3000, or hostname in Vercel prod).');
  }
  if (!process.env.OWNER_EMAIL) {
    issues.push('OWNER_EMAIL is not set; admin console will not be gated.');
  }
  if (issues.length) {
    // Log once on server startup
    console.warn('[ENV WARNING]', issues.join(' | '));
  }
}
