import { useState } from "react";
import Showdown from "showdown";

export default function MarkdownEditor({ initialValue, onChange }) {
  const [markdown, setMarkdown] = useState(initialValue || "");
  const converter = new Showdown.Converter();

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setMarkdown(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="markdown-editor">
      <textarea
        value={markdown}
        onChange={handleInputChange}
        className="w-full h-40 p-2 border rounded"
        placeholder="Enter Markdown here..."
      />
      <div
        className="markdown-preview mt-4 p-2 border rounded"
        dangerouslySetInnerHTML={{ __html: converter.makeHtml(markdown) }}
      />
    </div>
  );
}
