import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./index";

describe("server environment", () => {
  it("uses safe local defaults", () => {
    const environment = parseServerEnv({});

    expect(environment.APP_ENV).toBe("local");
    expect(environment.APP_URL).toBe("http://localhost:3000");
    expect(environment.LOG_LEVEL).toBe("info");
  });

  it("rejects invalid public URLs", () => {
    expect(() => parseServerEnv({ APP_URL: "motionly" })).toThrow(
      "Invalid server environment",
    );
  });
});
