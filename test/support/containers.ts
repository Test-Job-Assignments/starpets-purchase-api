import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export function startPostgresContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'starpets_test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();
}

// Scenario 17 stops and restarts this container to simulate a broker outage.
// With a dynamically-assigned host port, Docker Desktop's port-forwarding
// proxy rebinds to a *different* host port on restart, so a fixed binding is
// required for the reconnect-to-the-same-address assertion to hold.
const RABBITMQ_HOST_PORT = 35672;

export function startRabbitMqContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('rabbitmq:3-management-alpine')
    .withEnvironment({
      RABBITMQ_DEFAULT_USER: 'guest',
      RABBITMQ_DEFAULT_PASS: 'guest',
    })
    .withExposedPorts({ container: 5672, host: RABBITMQ_HOST_PORT })
    .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
    .start();
}
