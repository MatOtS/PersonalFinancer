import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getSignedInUser, signIn } from "@/data/auth";
import { ensureDefaultCategories } from "@/data/categories";
import { signInAction, type SignInState } from "./actions";

// The data layer and Next's redirect are replaced, so only what the action
// does around the sign-in is tested here.
vi.mock("@/data/auth", () => ({ getSignedInUser: vi.fn(), signIn: vi.fn() }));
vi.mock("@/data/categories", () => ({ ensureDefaultCategories: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const EMPTY: SignInState = { email: "", errors: {}, message: null };

const credentials = () => {
  const data = new FormData();
  data.set("email", "a@example.test");
  data.set("password", "secret");
  return data;
};

beforeEach(() => {
  vi.mocked(getSignedInUser).mockReset().mockResolvedValue(null);
  vi.mocked(signIn).mockReset();
  vi.mocked(ensureDefaultCategories).mockReset();
  vi.mocked(redirect).mockReset();
});

describe("signInAction and the default categories", () => {
  it("gives the default categories after a successful sign-in, before the redirect", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });
    await signInAction(EMPTY, credentials());
    expect(ensureDefaultCategories).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(ensureDefaultCategories).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(redirect).mock.invocationCallOrder[0] ?? 0);
  });

  it("signs in anyway and logs the error when giving the default categories fails", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });
    vi.mocked(ensureDefaultCategories).mockRejectedValue(new Error("boom"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await signInAction(EMPTY, credentials());
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it("does not give them when the sign-in fails", async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      failure: "invalid_credentials",
    });
    await signInAction(EMPTY, credentials());
    expect(ensureDefaultCategories).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
