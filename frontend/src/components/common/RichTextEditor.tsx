import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  label,
  required,
}: RichTextEditorProps) {
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
  ];

  return (
    <div className="rich-text-editor">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="bg-[#0f1015] border border-white/10 rounded-xl overflow-hidden shadow-sm transition-colors focus-within:border-primary/50 text-white">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="text-white"
        />
      </div>
      <style>{`
                .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.03);
                }
                .ql-container.ql-snow {
                    border: none;
                    font-size: 1rem;
                    min-height: 150px;
                }
                .ql-editor {
                    color: #e5e7eb;
                    min-height: 150px;
                }
                .ql-editor.ql-blank::before {
                    color: #6b7280;
                    font-style: normal;
                }
                .ql-snow .ql-stroke {
                    stroke: #9ca3af;
                }
                .ql-snow .ql-fill {
                    fill: #9ca3af;
                }
                .ql-snow .ql-picker {
                    color: #9ca3af;
                }
                .ql-snow .ql-picker-options {
                    background-color: #1a1b26;
                    border-color: rgba(255,255,255,0.1);
                    color: #e5e7eb;
                }
            `}</style>
    </div>
  );
}
