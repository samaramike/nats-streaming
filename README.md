## Description

Custom microservice strategy based on Nats-streaming for Nest.js v6.x.x

## Installation
Add to dependencies in `package.json` this line:
```
"nats-streaming": "https://github.com/samaramike/nats-streaming.git"
```
and run
```bash
$ npm install
```

## Example for publisher

In `app.module.ts` file
```
@Module({
  imports: [
    ...
    NatsStreamingPublisherModule.forRoot({
      clusterID: "nats-streaming",
      clientID: "nats-streaming-gateway-" + process.pid,
      stanOptions: {
        url: process.env.NATS_STREAMING_URL || "nats://nats-streaming:4222",
      },
    }),
    ...
  ],
  controllers: [ ... ],
  providers: [ ... ],
})
export class AppModule {}
```

In service:
```
  ...

  constructor(
    private readonly natsStreamingPublisherService: NatsStreamingPublisherService,
  ) {}
  
  ...

  const pattern = { topic: "some-topic", cmd: "some-method" };
  this.natsStreamingPublisherService.send(pattern, {
    foo: "bar",
    some: "data",
  });
```

## Example for subscriber

In `main.ts` file:

```
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const natsStreamingOptions = {
    url: process.env.NATS_STREAMING_URL || "nats://nats-streaming:4222",
    clusterID: "nats-streaming",
    clientID: "some-worker-" + process.pid,
  };
  app.connectMicroservice({
    strategy: new NatsStreamingSubscriberServer(natsStreamingOptions),
  });

  app.startAllMicroservices(() =>
    // tslint:disable-next-line:no-console
    console.log("Microservice email-worker started!"),
  );
}

bootstrap();
```

In controller:

```
@Controller("email-provider")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern({
    transport: NatsStreamingSubscriberConstant.TRANSPORT,
    topic: "some-topic",
    cmd: "some-method",
    opts: {
      maxInFlight: 10,
    },
  })
  public async sendEmail(
    @Payload() sendEmailRequestDTO: SendEmailRequestDTO,
    @RequestContext() ctx,
  ): Promise<any> {
    return this.emailProviderService.send(sendEmailRequestDTO, ctx);
  }
```
