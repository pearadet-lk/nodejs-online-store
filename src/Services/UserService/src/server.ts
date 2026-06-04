import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import {
  createServiceApp,
  DEMO_EMAIL,
  DEMO_FULL_NAME,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  loadAuthConfig,
  startService,
  type LoginResponse,
  type UserProfileDto
} from '@online-store/contracts';

const PORT = 5121;
const auth = loadAuthConfig();

type UserAccount = { profile: UserProfileDto; passwordHash: string };
type RefreshRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

const usersByEmail = new Map<string, UserAccount>();
const usersById = new Map<string, UserAccount>();
const refreshTokens = new Map<string, RefreshRecord>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toProfile(userId: string, email: string, fullName: string): UserProfileDto {
  return { userId, email, fullName, createdAt: new Date().toISOString() };
}

function seedDemoUser(): void {
  const profile = toProfile(DEMO_USER_ID, DEMO_EMAIL, DEMO_FULL_NAME);
  const account: UserAccount = { profile, passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10) };
  usersByEmail.set(DEMO_EMAIL, account);
  usersById.set(DEMO_USER_ID, account);
}

seedDemoUser();

function createTokenPair(profile: UserProfileDto): {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
} {
  const accessTokenExpiresAt = new Date(Date.now() + auth.accessTokenMinutes * 60_000);
  const accessToken = jwt.sign(
    { sub: profile.userId, email: profile.email, name: profile.fullName },
    auth.jwtSigningKey,
    {
      issuer: auth.jwtIssuer,
      audience: auth.jwtAudience,
      expiresIn: `${auth.accessTokenMinutes}m`
    }
  );
  const refreshToken = randomUUID() + randomUUID();
  return { accessToken, refreshToken, accessTokenExpiresAt: accessTokenExpiresAt.toISOString() };
}

const app = createServiceApp('user-service');

app.post<{ Body: { email: string; password: string; fullName: string } }>(
  '/users/register',
  async (req, reply) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const fullName = req.body.fullName?.trim() ?? '';
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required.' });
    }
    if (usersByEmail.has(email)) {
      return reply.status(409).send({ error: 'Email already exists.' });
    }
    const profile = toProfile(randomUUID(), email, fullName);
    const account: UserAccount = { profile, passwordHash: bcrypt.hashSync(password, 10) };
    usersByEmail.set(email, account);
    usersById.set(profile.userId, account);
    return reply.status(201).send(profile);
  }
);

app.post<{ Body: { email: string; password: string } }>('/users/login', async (req, reply) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  if (!email || !password) {
    return reply.status(401).send();
  }
  const account = usersByEmail.get(email);
  if (!account || !bcrypt.compareSync(password, account.passwordHash)) {
    return reply.status(401).send();
  }
  const tokens = createTokenPair(account.profile);
  const refreshHash = hashToken(tokens.refreshToken);
  refreshTokens.set(refreshHash, {
    userId: account.profile.userId,
    tokenHash: refreshHash,
    expiresAt: new Date(Date.now() + auth.refreshTokenDays * 86_400_000),
    revokedAt: null
  });
  const body: LoginResponse = { ...tokens, user: account.profile };
  return reply.send(body);
});

app.post<{ Body: { refreshToken: string } }>('/users/refresh', async (req, reply) => {
  const raw = req.body.refreshToken?.trim();
  if (!raw) {
    return reply.status(401).send();
  }
  const stored = refreshTokens.get(hashToken(raw));
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return reply.status(401).send();
  }
  const account = usersById.get(stored.userId);
  if (!account) {
    return reply.status(401).send();
  }
  stored.revokedAt = new Date();
  const tokens = createTokenPair(account.profile);
  const refreshHash = hashToken(tokens.refreshToken);
  refreshTokens.set(refreshHash, {
    userId: account.profile.userId,
    tokenHash: refreshHash,
    expiresAt: new Date(Date.now() + auth.refreshTokenDays * 86_400_000),
    revokedAt: null
  });
  const body: LoginResponse = { ...tokens, user: account.profile };
  return reply.send(body);
});

app.post<{ Body: { refreshToken: string } }>('/users/logout', async (req, reply) => {
  const raw = req.body.refreshToken?.trim();
  if (raw) {
    const hash = hashToken(raw);
    const stored = refreshTokens.get(hash);
    if (stored) {
      stored.revokedAt = new Date();
    }
  }
  return reply.status(204).send();
});

app.get<{ Params: { userId: string } }>('/users/:userId', async (req, reply) => {
  const account = usersById.get(req.params.userId);
  if (!account) {
    return reply.status(404).send();
  }
  return reply.send(account.profile);
});

await startService(app, 'user-service', PORT);
