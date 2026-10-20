import { notFound } from "next/navigation";

// Any address inside the app that no page handles ends here. Without this
// catch-all, Next would render the root 404, which has no sidebar (FR-14).
export default function MissingPage() {
  notFound();
}
