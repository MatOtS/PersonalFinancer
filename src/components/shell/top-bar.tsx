import { NewMovementButton } from "@/components/movements/new-movement-button";

// The top of every page: the primary action of the app on the right, so a
// movement can be added from any screen. Each page keeps its own title.
export const TopBar = () => {
  return (
    <header className="flex justify-end pb-4">
      <NewMovementButton />
    </header>
  );
};
