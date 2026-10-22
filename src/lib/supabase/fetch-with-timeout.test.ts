import { describe, expect, it } from "vitest";
import { createFetchWithTimeout } from "./fetch-with-timeout";

// A fetch that never answers; it only ends when its signal is aborted.
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

describe("createFetchWithTimeout", () => {
  it("returns the answer when the request is fast enough", async () => {
    const fast: typeof fetch = async () => new Response("ok");
    const response = await createFetchWithTimeout(1000, fast)("http://test");
    expect(await response.text()).toBe("ok");
  });

  it("cancels a request that takes longer than the limit", async () => {
    await expect(
      createFetchWithTimeout(20, hangingFetch)("http://test"),
    ).rejects.toThrow();
  });

  it("still lets the caller cancel the request", async () => {
    const controller = new AbortController();
    const request = createFetchWithTimeout(10_000, hangingFetch)(
      "http://test",
      {
        signal: controller.signal,
      },
    );
    controller.abort(new Error("cancelled by the caller"));
    await expect(request).rejects.toThrow("cancelled by the caller");
  });
});
