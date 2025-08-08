import React from "react";

const WidgetButton = ({ text, Icon, onClick, active, disabled }) => {
  return (
    <button
      className={`flex flex-col items-center text-sm leading-5 ${
        disabled
          ? "text-muted-foreground cursor-not-allowed"
          : "text-foreground cursor-pointer"
      } font-medium font-sans justify-center py-3 gap-2 rounded-md border-[2px] ${
        active && "border-primary"
      } ${disabled && "opacity-70"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon}
      {text}
    </button>
  );
};

export default WidgetButton;
