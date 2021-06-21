import { DynamicModule, Global, Module, Provider } from "@nestjs/common"

import { NATS_STREAMING_PUBLISHER_OPTIONS } from "./nats-streaming-publisher.constant"
import { NatsStreamingPublisherOptions } from "./nats-streaming-publisher.options"
import { NatsStreamingPublisherService } from "./nats-streaming-publisher.service"

@Global()
@Module({})
export class NatsStreamingPublisherModule {
  public static forRoot(options: NatsStreamingPublisherOptions): DynamicModule {
    const NatsStreamingPublisherOptionsProvider: Provider = {
      name: NATS_STREAMING_PUBLISHER_OPTIONS,
      provide: NATS_STREAMING_PUBLISHER_OPTIONS,
      useValue: options,
    }

    return {
      module: NatsStreamingPublisherModule,
      providers: [
        /** Options **/
        NatsStreamingPublisherOptionsProvider,
        /** Services **/
        NatsStreamingPublisherService,
      ],
      exports: [
        /** Services **/
        NatsStreamingPublisherService,
      ],
    }
  }
}
