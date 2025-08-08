import { LuUser2 } from "react-icons/lu";

const AgentTypeCard = ({ text, htmlFor, icon, description }) => {
  return (
    <label
      htmlFor={htmlFor ? htmlFor : text}
      className="flex flex-col items-center justify-center cursor-pointer gap-2"
    >
      {icon ? icon : <LuUser2 className="w-6 h-6" />}
      <span className="max-w-[130px] font-sans text-sm leading-5 font-medium text-center">
        {text}
      </span>
      {description && (
        <span className="text-xs text-neutral-500 text-center max-w-[130px] truncate">
          {description}
        </span>
      )}
    </label>
  );
};

export default AgentTypeCard;
