import { beforeEach, describe, expect, test } from "bun:test";
import { createSlackProvider } from "../lib/slack";
import { LocalSlackProvider } from "../lib/slack/local";
import { SlackProvider } from "../lib/slack/slack";

describe("createSlackProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test.each([
    ["dev", "SlackProvider"],
    ["prod", "SlackProvider"],
    ["local", "LocalSlackProvider"],
    ["test", "LocalSlackProvider"],
  ])("ENVが%sの場合、%sが使用されること", (env, providerType) => {
    process.env.ENV = env;

    if (env === "dev" || env === "prod") {
      process.env.SLACK_BOT_TOKEN = "test-token";
      process.env.SLACK_SIGNING_SECRET = "test-secret";
      process.env.SLACK_CHANNEL_ID = "test-channel";
    }

    const want =
      providerType === "SlackProvider" ? SlackProvider : LocalSlackProvider;

    const provider = createSlackProvider();
    expect(provider).toBeInstanceOf(want);
  });
});
