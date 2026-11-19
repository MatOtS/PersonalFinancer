"use client";

import { CSPProvider } from "@base-ui/react/csp-provider";

// Some Base UI components (the lists, for one) add a <style> element when they
// open, to hide the scrollbar. The strict policy of the app
// (`src/lib/security-headers.ts`) only allows styles that carry the nonce of
// the request, and with the nonce alone the browser still blocked that element
// in the production build, so Base UI is told not to create it: the list shows
// its scrollbar. Put it once around the pages that use Base UI (ADR-20).
export const BaseUiProvider = ({
  nonce,
  children,
}: {
  nonce: string | undefined;
  children: React.ReactNode;
}) => {
  return (
    <CSPProvider nonce={nonce} disableStyleElements>
      {children}
    </CSPProvider>
  );
};
