import { LocalTwitterProvider } from "./local";
import { TwitterProvider } from "./twitter";
import type { BaseTwitterProvider } from "./types";

export function createTwitterProvider(): BaseTwitterProvider {
  const env = process.env.ENV || "local";
  const provider = ["prod", "dev"].includes(env) ? "twitter" : "local";

  switch (provider) {
    case "twitter":
      return new TwitterProvider();
    case "local":
      return new LocalTwitterProvider();
    default:
      throw new Error(`Unknown twitter provider: ${provider}`);
  }
}
