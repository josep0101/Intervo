import { Button } from "@/components/ui/button";

export const ButtonGroup = ({ buttons }) => {
  return (
    <div className="flex gap-3">
      {buttons.map((button, index) => (
        <Button
          key={index}
          onClick={button.onClick}
          className="bg-white text-primary hover:text-white border border-border font-medium text-sm leading-6 font-sans h-10"
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
};
