import { LocalSlackProvider } from "./local";
import { SlackProvider } from "./slack";
import type { BaseSlackProvider } from "./types";

export function createSlackProvider(): BaseSlackProvider {
  const env = process.env.ENV || "local";
  const provider = ["prod", "dev"].includes(env) ? "slack" : "local";

  switch (provider) {
    case "slack":
      return new SlackProvider();
    case "local":
      return new LocalSlackProvider();
    default:
      throw new Error(`Unknown slack provider: ${provider}`);
  }
}

export type { BaseSlackProvider } from "./types";
