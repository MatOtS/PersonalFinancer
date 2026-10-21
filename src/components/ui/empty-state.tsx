type EmptyStateProps = {
  text: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
};

export const EmptyState = ({ text, icon, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center gap-3 text-center px-4 py-8">
      <div className="size-9 rounded-md bg-accent-soft text-accent grid place-items-center">
        {icon}
      </div>
      <p className="text-small text-text-muted">{text}</p>
      {action}
    </div>
  );
};
