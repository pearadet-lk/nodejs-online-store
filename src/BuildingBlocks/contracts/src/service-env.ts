export function servicePort(defaultPort: number): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') {
    return defaultPort;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultPort;
}

export function serviceUrl(envKey: string, localDefault: string): string {
  const value = process.env[envKey]?.trim();
  return value && value.length > 0 ? value : localDefault;
}
