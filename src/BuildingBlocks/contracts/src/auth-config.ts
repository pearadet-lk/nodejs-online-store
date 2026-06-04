export type AuthConfig = {
  jwtIssuer: string;
  jwtAudience: string;
  jwtSigningKey: string;
  accessTokenMinutes: number;
  refreshTokenDays: number;
};

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return {
    jwtIssuer: env.AUTH_JWT_ISSUER ?? 'online-store',
    jwtAudience: env.AUTH_JWT_AUDIENCE ?? 'online-store-clients',
    jwtSigningKey: env.AUTH_JWT_SIGNING_KEY ?? 'dev-super-secret-signing-key-min-32-chars',
    accessTokenMinutes: Math.min(120, Math.max(1, Number(env.AUTH_ACCESS_TOKEN_MINUTES ?? 15))),
    refreshTokenDays: Math.min(90, Math.max(1, Number(env.AUTH_REFRESH_TOKEN_DAYS ?? 7)))
  };
}
