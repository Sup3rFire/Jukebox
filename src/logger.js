module.exports = (name) => {
  const winston = require("winston");
  const { combine } = winston.format;

  const humanReadable = winston.format.printf(({ level, message }) => {
    return `${level} ${name || process.pid}: ${message}`;
  });

  const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: process.env.NODE_ENV != "production" ? "debug" : "error",
        handleExceptions: true,
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          humanReadable
        ),
        json: false,
        colorize: true,
      }),
      new winston.transports.File({
        filename: "logs/all.log",
        level: "info",
        format: combine(winston.format.errors({ stack: true }), humanReadable),
      }),
    ],
    exitOnError: false,
  });

  return logger;
};
