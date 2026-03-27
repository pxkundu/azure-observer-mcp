import pino from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    transport: {
      target: "pino/file",
      options: { destination: 2 }, // stderr — keeps stdout clean for MCP stdio
    },
  });
}

export type Logger = pino.Logger;
