import { useState } from "react";
import { Copy } from "lucide-react";

const WidgetCodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <>
      <div className="bg-[#F1F5F9] text-slate-800 rounded-lg py-2.5 px-3 gap-2 relative overflow-hidden">
        <pre className="whitespace-pre-wrap font-inter">
          {code.split("\n").map((line, index) => (
            <div key={index} className="flex text-xs gap-2 leading-5">
              <span className="text-slate-500">{index + 1}</span>
              <span className="text-slate-800">{line}</span>
            </div>
          ))}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 bg-white flex items-center gap-1 text-primary py-1.5 px-2 rounded-md hover:bg-slate-100 border border-border focus:outline-none focus:ring-2 text-xs"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </>
  );
};

export default WidgetCodeBlock;
