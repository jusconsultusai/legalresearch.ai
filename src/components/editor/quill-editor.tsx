"use client";

import { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function QuillEditor({ value, onChange, placeholder, className }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const init = async () => {
      const Quill = (await import("quill")).default;

      const toolbarOptions = [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        ["blockquote", "code-block"],
        [{ color: [] }, { background: [] }],
        ["link"],
        ["clean"],
      ];

      const quill = new Quill(containerRef.current!, {
        theme: "snow",
        placeholder: placeholder || "Start writing...",
        modules: {
          toolbar: toolbarOptions,
        },
      });

      quill.on("text-change", () => {
        const html = containerRef.current?.querySelector(".ql-editor")?.innerHTML || "";
        onChangeRef.current(html);
      });

      // Set initial content
      if (value) {
        quill.root.innerHTML = value;
      }

      quillRef.current = quill;
      isInitialMount.current = false;
    };

    init();

    return () => {
      quillRef.current = null;
    };
  }, []);

  // Update content when value changes externally (e.g., from AI generation)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (quillRef.current) {
      const currentContent = containerRef.current?.querySelector(".ql-editor")?.innerHTML || "";
      if (currentContent !== value) {
        quillRef.current.root.innerHTML = value || "";
      }
    }
  }, [value]);

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
