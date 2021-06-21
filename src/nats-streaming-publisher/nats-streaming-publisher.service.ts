import { Inject, Injectable } from "@nestjs/common"
import { AckHandlerCallback, connect, Stan } from "node-nats-streaming"

import { MessagePatternInterface } from "./message-pattern.interface"
import { NATS_STREAMING_PUBLISHER_OPTIONS } from "./nats-streaming-publisher.constant"
import { NatsStreamingPublisherOptions } from "./nats-streaming-publisher.options"

@Injectable()
export class NatsStreamingPublisherService {
  private readonly natsStreamingClient: Stan

  constructor(
    @Inject(NATS_STREAMING_PUBLISHER_OPTIONS)
    private readonly options: NatsStreamingPublisherOptions,
  ) {
    this.natsStreamingClient = connect(
      options.clusterID,
      options.clientID,
      options.stanOptions,
    )

    this.natsStreamingClient.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log(
        `Connected clientID "${options.clientID}" o Nats streaming server to clusterID "${options.clusterID}"`,
      )
    })
  }

  public send(
    pattern: string | MessagePatternInterface,
    data?: Uint8Array | string | object | Buffer,
    callback?: AckHandlerCallback,
  ): any {
    return this.natsStreamingClient.publish(
      this.getSubjectName(pattern),
      JSON.stringify(data),
      callback
        ? callback
        : (err, guid) => {
            if (err) {
              // eslint-disable-next-line no-console
              console.log("Error publishing: " + guid + " - " + err)
            } else {
              // eslint-disable-next-line no-console
              console.log("published message with guid: " + guid)
            }
          },
    )
  }

  private getSubjectName(pattern: string | MessagePatternInterface): string {
    if (typeof pattern === "string") {
      return pattern
    }
    return `${pattern.topic}-${pattern.cmd}`
  }
}
