import winston from "winston";

declare global {
  type Logger = winston.Logger;
  const logger: Logger;

  const name: string;
}