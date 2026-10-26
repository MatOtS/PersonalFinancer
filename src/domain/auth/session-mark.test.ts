import { describe, expect, it } from "vitest";
import {
  clearSessionMark,
  consumeSessionMark,
  markSession,
  type MarkStorage,
} from "./session-mark";

const memoryStorage = (): MarkStorage & { size: () => number } => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    size: () => items.size,
  };
};

// Storage that refuses everything, like a browser with site data blocked.
const blockedStorage: MarkStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

// FR-10 and FR-18: a tab remembers that it showed a protected page, so the
// sign-in page can tell "the session ended under this tab" (message) from
// "this tab never had one, or the user signed out" (no message).
describe("session mark", () => {
  it("is not there in a tab that never showed a protected page", () => {
    expect(consumeSessionMark(memoryStorage())).toBe(false);
  });

  it("is there after a protected page was shown, and consuming it removes it", () => {
    const storage = memoryStorage();
    markSession(storage);
    expect(consumeSessionMark(storage)).toBe(true);
    expect(consumeSessionMark(storage)).toBe(false);
  });

  it("is removed when the user signs out on purpose", () => {
    const storage = memoryStorage();
    markSession(storage);
    clearSessionMark(storage);
    expect(storage.size()).toBe(0);
    expect(consumeSessionMark(storage)).toBe(false);
  });

  // Edge case: storage unavailable. Nothing fails; there is just no message.
  it("does not fail when the browser blocks storage", () => {
    expect(() => markSession(blockedStorage)).not.toThrow();
    expect(() => clearSessionMark(blockedStorage)).not.toThrow();
    expect(consumeSessionMark(blockedStorage)).toBe(false);
  });
});
