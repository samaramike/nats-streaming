import { Injectable } from "@nestjs/common"
import { CONNECT_EVENT, ERROR_EVENT } from "@nestjs/microservices/constants"
import { CustomTransportStrategy } from "@nestjs/microservices/interfaces"
import { Server } from "@nestjs/microservices/server"
import { connect, Stan, Subscription } from "node-nats-streaming"
import { Observable } from "rxjs"

import { NatsStreamingSubscriberConstant } from "./nats-streaming-subscriber.constant"
import { NatsStreamingSubscriberOptions } from "./nats-streaming-subscriber.options"
import { NatsStreamingContext } from "./nats-streaming.context"
import { LogTypeEnum } from "../nats-streaming.types";

@Injectable()
export class NatsStreamingSubscriberServer extends Server
  implements CustomTransportStrategy {
  private readonly url: string
  private natsStreamingClient: Stan = null

  constructor(
    private readonly options: NatsStreamingSubscriberOptions,
  ) {
    super()
    this.url = this.options.url

    this.initializeSerializer(options)
    this.initializeDeserializer(options)
  }

  public listen(callback: () => void) {
    this.natsStreamingClient = this.createNatsStreamingClient()
    this.handleError(this.natsStreamingClient)
    this.start(callback)
  }

  public start(callback?: () => void) {
    this.natsStreamingClient.on(CONNECT_EVENT, () => {
      this.bindEvents()
      callback()
    })
  }

  public bindEvents() {
    const registeredPatterns = [...this.messageHandlers.keys()]
    registeredPatterns.forEach((channel) => {
      const handler = this.messageHandlers.get(channel)
      if (handler) {
        const subscription = this.getSubscriptionByPattern(channel)
        if (subscription) {
          subscription.on("message", async (msg) => {
            this.handleMessage(channel, msg)
          })
        }
      }
    })
  }

  public getSubscriptionByPattern(pattern: string): Subscription {
    let parsedPattern
    let subject
    let subscription

    try {
      parsedPattern = JSON.parse(pattern)
      if (
        parsedPattern?.transport !== NatsStreamingSubscriberConstant.TRANSPORT
      ) {
        return null
      }
      subject = parsedPattern.topic + "-" + parsedPattern.cmd
    } catch {
      return null
    }

    const opts = this.natsStreamingClient
      .subscriptionOptions()
      .setManualAckMode(true)

    if (parsedPattern.topic) {
      opts.setDurableName(parsedPattern.topic)
    }

    const maxInFlight = +parsedPattern?.opts?.maxInFlight
    if (maxInFlight > 0) {
      opts.setMaxInFlight(maxInFlight)
    }

    if (parsedPattern?.opts?.broadcast === true) {
      subscription = this.natsStreamingClient.subscribe(subject, opts)
    } else {
      subscription = this.natsStreamingClient.subscribe(
        subject,
        `qGroup-${subject}`,
        opts,
      )
    }

    return subscription
  }

  public close() {
    this.natsStreamingClient.close()
  }

  public createNatsStreamingClient(): Stan {
    return connect(this.options.clusterID, this.options.clientID, {
      url: this.options.url,
    })
  }

  public async handleMessage(channel: string, rawMessage: any) {
    const sequence = rawMessage.getSequence()
    const natsStreamingCtx = new NatsStreamingContext([channel])
    let message = rawMessage.getData().toString()
    let ctx = null

    try {
      message = JSON.parse(message)
      ctx = {
        requestUuid: message?.requestUuid,
        systemUserId: message?.systemUserId,
      }
      this.logger.log(
        {
          logType: LogTypeEnum.NATS_STREAMING_MESSAGE_RCV,
          sequence,
        },
        ctx,
      )

      const handler = this.getHandlerByPattern(channel)
      const response = await (this.transformToObservable(
        await handler(message, natsStreamingCtx),
      ) as Observable<any>).toPromise()

      rawMessage.ack()
      this.logger.log(
        {
          logType: LogTypeEnum.NATS_STREAMING_MESSAGE_ACK,
          sequence,
          response,
        },
        ctx,
      )
    } catch (e) {
      const needRedelivery =
        e.error?.response?.error ===
        NatsStreamingSubscriberConstant.SEND_TO_REDELIVERY_ERROR
      if (!needRedelivery) {
        rawMessage.ack()
      }
      this.logger.error(
        {
          logType: LogTypeEnum.MICROSERVICE_EXCEPTION,
          sequence,
          error: e.error?.response?.message,
          redelivery: needRedelivery,
        },
        '',
        ctx,
      )
    }
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err))
  }
}
