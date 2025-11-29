import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 sm:py-16 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-2xl mb-4 sm:mb-6">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto px-2">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}
