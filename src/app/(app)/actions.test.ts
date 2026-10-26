import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "@/data/auth";
import { redirect } from "next/navigation";
import { signOutAction } from "./actions";

// FR-20, FR-21: signing out ends the session and then shows the sign-in page.
// The data layer and Next's redirect are replaced, so only the action's own
// behaviour is tested here (data/sign-out.test.ts tests the cookie removal).
vi.mock("@/data/auth", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

beforeEach(() => {
  vi.mocked(signOut).mockReset();
  vi.mocked(redirect).mockReset();
});

describe("signOutAction", () => {
  it("ends the session and redirects to the sign-in page", async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("does not redirect until the session has ended", async () => {
    let finishSignOut: () => void = () => {};
    vi.mocked(signOut).mockReturnValue(
      new Promise<void>((resolve) => {
        finishSignOut = resolve;
      }),
    );
    const pending = signOutAction();
    expect(redirect).not.toHaveBeenCalled();
    finishSignOut();
    await pending;
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
