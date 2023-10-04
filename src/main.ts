import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WinstonModule } from "nest-winston";
import { format, transports } from "winston";
import "winston-daily-rotate-file";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new transports.DailyRotateFile({
          filename: `logs/%DATE%-error.log`,
          level: "error",
          format: format.combine(format.timestamp(), format.json()),
          datePattern: "YYYY-MM-DD",
          zippedArchive: false, // don't want to zip our logs
          maxFiles: "30d" // will keep log until they are older than 30 days
        }),
        new transports.DailyRotateFile({
          level: "debug",
          filename: `logs/%DATE%-combined.log`,
          format: format.combine(format.timestamp(), format.json()),
          datePattern: "YYYY-MM-DD",
          zippedArchive: false,
          maxFiles: "30d"
        }),
        new transports.Console({
          level: "silly",
          format: format.combine(
            format.cli(),
            format.splat(),
            format.timestamp(),
            format.printf((info) => {
              return `${info.timestamp} ${info.level} [${info?.context ?? "-"}]: ${info.message}`;
            })
          )
        })
      ]
    })
  });
  await app.listen(process.env.PORT);
}

bootstrap();
