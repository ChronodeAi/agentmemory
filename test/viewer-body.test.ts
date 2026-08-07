import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readBody } from "../src/viewer/server.js";

describe("viewer request body decoding", () => {
  it("decodes a multibyte character split across transport chunks", async () => {
    const body = JSON.stringify({ text: "memory cafe \u{1f9e0}" });
    const bytes = Buffer.from(body, "utf8");
    const emoji = Buffer.from("\u{1f9e0}", "utf8");
    const split = bytes.indexOf(emoji) + 2;
    const request = Readable.from([
      bytes.subarray(0, split),
      bytes.subarray(split),
    ]) as unknown as IncomingMessage;

    expect(await readBody(request)).toBe(body);
  });
});
