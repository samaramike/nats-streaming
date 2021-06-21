import { StanOptions } from "node-nats-streaming"

export class NatsStreamingPublisherOptions {
  public readonly clusterID: string
  public readonly clientID: string
  public readonly stanOptions: StanOptions
}
