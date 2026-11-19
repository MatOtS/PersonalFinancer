import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False while the page is rendered on the server (and in the first render of
// the browser), true afterwards. Some libraries (the lists of Base UI, the
// charts) write inline `style` attributes while rendering; in the HTML of the
// server the strict policy of the app (`style-src` with a nonce) blocks them,
// but styles set from the browser are allowed. Those parts wait for this.
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
