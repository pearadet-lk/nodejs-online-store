import Fastify, { type FastifyInstance } from 'fastify';

export function createServiceApp(serviceName: string): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    service: serviceName,
    status: 'ok'
  }));

  return app;
}

export async function startService(
  app: FastifyInstance,
  serviceName: string,
  port: number,
  host = '0.0.0.0'
): Promise<void> {
  await app.listen({ port, host });
  app.log.info(`${serviceName} listening on ${host}:${port}`);
}
