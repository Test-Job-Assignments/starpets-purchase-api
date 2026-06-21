import { Channel, ChannelModel, connect } from 'amqplib';

export interface RabbitMqTestClient {
  connection: ChannelModel;
  channel: Channel;
  queueName: string;
}

export async function bindTestQueue(
  rabbitmqUrl: string,
  exchange: string,
): Promise<RabbitMqTestClient> {
  const connection = await connect(rabbitmqUrl);
  const channel = await connection.createChannel();
  await channel.assertExchange(exchange, 'topic', { durable: true });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, exchange, '#');
  return { connection, channel, queueName: queue };
}

export async function closeTestQueue(
  client: RabbitMqTestClient,
): Promise<void> {
  await client.channel.close();
  await client.connection.close();
}

export interface ReceivedMessage {
  routingKey: string;
  payload: Record<string, unknown>;
}

// channel.get() is a one-shot, non-blocking poll — it returns `false`
// immediately if nothing is queued yet rather than waiting. Retry briefly
// to absorb the short delay between publish() and the message actually
// landing in this bound queue.
export async function waitForNextMessage(
  client: RabbitMqTestClient,
  timeoutMs = 5000,
): Promise<ReceivedMessage | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const message = await client.channel.get(client.queueName, {});
    if (message) {
      client.channel.ack(message);
      return {
        routingKey: message.fields.routingKey,
        payload: JSON.parse(message.content.toString('utf-8')),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}
