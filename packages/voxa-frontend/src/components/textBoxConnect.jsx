"use client";
import { LuCopy } from "react-icons/lu";

function TextBox({ title, text, desc }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="leading-[21px] text-sm font-semibold text-black">{title}</label>
      <div className="flex items-center border rounded-md shadow-sm bg-white max-h-9 pr-2">
        <input
          type="text"
          value={text}
          readOnly
          className="flex-1 text-sm max-h-9 border-none bg-transparent focus:outline-none truncate text-secondaryText"
        />
        <button onClick={handleCopy}>
          <LuCopy />
        </button>
      </div>
      <p className="text-xs leading-5 text-secondaryText">{desc}</p>
    </div>
  );
}

export default TextBox;
