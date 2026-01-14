import { ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

interface LogMetadataViewerProps {
  data: any;
  label?: string;
  initiallyExpanded?: boolean;
}

export function LogMetadataViewer({
  data,
  label = "Részletek",
  initiallyExpanded = false,
}: LogMetadataViewerProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  if (data === null || data === undefined)
    return <span className="text-gray-600 italic">null</span>;

  // Handle large strings (likely images or truncated data)
  if (typeof data === "string") {
    if (data.startsWith("data:image")) {
      return (
        <div className="mt-2">
          <span className="text-xs text-gray-400 block mb-1">
            Kép előnézet:
          </span>
          <img
            src={data}
            alt="Metadata Preview"
            className="max-w-[200px] rounded-lg border border-white/10"
          />
        </div>
      );
    }
    return <span className="text-green-300 break-all font-mono">"{data}"</span>;
  }

  if (typeof data !== "object") {
    return <span className="text-blue-300 font-mono">{String(data)}</span>;
  }

  // Array Handling
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-500">[]</span>;

    return (
      <div className="ml-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Array({data.length})
        </button>

        {expanded && (
          <div className="border-l border-white/10 pl-4 mt-1 space-y-1">
            {data.map((item, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-gray-600 text-xs font-mono select-none">
                  {index}:
                </span>
                <LogMetadataViewer data={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Object Handling
  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-gray-500">{"{}"}</span>;

  // Check if it's a diff object (old/new)
  const isDiff =
    keys.includes("old") && keys.includes("new") && keys.length === 2;

  if (isDiff) {
    return (
      <div className="bg-black/20 rounded-lg p-2 border border-white/10 mt-1 grid grid-cols-2 gap-4">
        <div className="bg-red-500/5 p-2 rounded border border-red-500/10">
          <div className="text-[10px] uppercase text-red-500 font-bold mb-1">
            Régi érték
          </div>
          <LogMetadataViewer data={data.old} initiallyExpanded={true} />
        </div>
        <div className="bg-green-500/5 p-2 rounded border border-green-500/10">
          <div className="text-[10px] uppercase text-green-500 font-bold mb-1">
            Új érték
          </div>
          <LogMetadataViewer data={data.new} initiallyExpanded={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="ml-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label === "Részletek" ? "Object" : label}{" "}
        <span className="text-gray-600">{keys.length} keys</span>
      </button>

      {expanded && (
        <div className="border-l border-white/10 pl-4 mt-1 space-y-1">
          {keys.map((key) => (
            <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="text-purple-300 text-xs font-mono select-none flex-shrink-0">
                {key}:
              </span>
              <LogMetadataViewer data={data[key]} label={key} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
