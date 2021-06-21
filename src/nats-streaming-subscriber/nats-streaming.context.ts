import { BaseRpcContext } from "@nestjs/microservices/ctx-host/base-rpc.context"

type NatsStreamingContextArgs = [string]

export class NatsStreamingContext extends BaseRpcContext<
  NatsStreamingContextArgs
> {
  constructor(args: NatsStreamingContextArgs) {
    super(args)
  }
}
