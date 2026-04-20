import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { fnPlaceHolder } from "@App/pages/store/AppContext";

type Props = {
  className?: string;
  diffCode?: string;
  editable?: boolean;
  id: string;
  code?: string;
  onValueChange?: (value: string) => void;
};

export type SimpleEditorAction = {
  id: string;
  label: string;
  keybindings?: string[];
  run: (editor: SimpleCodeEditorHandle) => void;
};

export type SimpleCodeEditorHandle = {
  addAction: (action: SimpleEditorAction) => void;
  dispose: () => void;
  focus: () => void;
  getValue: () => string;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => Promise<void>;
  uuid?: string;
};

fnPlaceHolder.setEditorTheme = () => {};

const normalizeHotkey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
  const keys: string[] = [];
  if (event.ctrlKey || event.metaKey) keys.push("Ctrl");
  if (event.shiftKey) keys.push("Shift");
  if (event.altKey) keys.push("Alt");

  let key = event.key;
  if (key.length === 1) {
    key = key.toUpperCase();
  } else if (key === "F5") {
    key = "F5";
  }
  return [...keys, key].join("+");
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  resize: "none",
  border: "1px solid var(--color-neutral-5)",
  borderRadius: 0,
  outline: "none",
  padding: "12px",
  boxSizing: "border-box",
  background: "var(--color-bg-2)",
  color: "var(--color-text-1)",
  fontFamily: "Consolas, Monaco, 'Courier New', monospace",
  fontSize: "13px",
  lineHeight: 1.5,
  tabSize: 2,
  whiteSpace: "pre",
};

const readonlyBlockStyle: React.CSSProperties = {
  ...textareaStyle,
  overflow: "auto",
};

const CodeEditor = React.forwardRef<{ editor: SimpleCodeEditorHandle }, Props>(
  ({ className, code = "", diffCode, editable = false, onValueChange }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const actionsRef = useRef<SimpleEditorAction[]>([]);
    const valueRef = useRef(code);
    const [value, setValue] = useState(code);

    useEffect(() => {
      valueRef.current = code;
      setValue(code);
    }, [code]);

    const replaceSelection = (nextText: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const nextValue = `${valueRef.current.slice(0, start)}${nextText}${valueRef.current.slice(end)}`;
      valueRef.current = nextValue;
      setValue(nextValue);
      onValueChange?.(nextValue);
      requestAnimationFrame(() => {
        const cursor = start + nextText.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    };

    const editorHandleRef = useRef<SimpleCodeEditorHandle>({
      addAction(action) {
        actionsRef.current = [...actionsRef.current.filter((item) => item.id !== action.id), action];
      },
      dispose() {
        actionsRef.current = [];
      },
      focus() {
        textareaRef.current?.focus();
      },
      getValue() {
        return textareaRef.current?.value ?? valueRef.current;
      },
      selectAll() {
        textareaRef.current?.select();
      },
      undo() {
        textareaRef.current?.focus();
        document.execCommand("undo");
      },
      redo() {
        textareaRef.current?.focus();
        document.execCommand("redo");
      },
      copy() {
        textareaRef.current?.focus();
        document.execCommand("copy");
      },
      cut() {
        textareaRef.current?.focus();
        document.execCommand("cut");
      },
      async paste() {
        textareaRef.current?.focus();
        try {
          const text = await navigator.clipboard.readText();
          replaceSelection(text);
        } catch {
          document.execCommand("paste");
        }
      },
    });

    const editorHandle = editorHandleRef.current;

    useImperativeHandle(ref, () => ({ editor: editorHandle }), [editorHandle]);

    useEffect(() => {
      return () => {
        editorHandle.dispose();
      };
    }, [editorHandle]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const hotkey = normalizeHotkey(event);
      const action = actionsRef.current.find((item) => item.keybindings?.includes(hotkey));
      if (!action) return;
      event.preventDefault();
      action.run(editorHandle);
    };

    if (diffCode !== undefined && diffCode !== "") {
      return (
        <div className={className} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: "100%" }}>
          <div style={readonlyBlockStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Original</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{diffCode}</pre>
          </div>
          <div style={readonlyBlockStyle}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Current</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</pre>
          </div>
        </div>
      );
    }

    if (!editable) {
      return (
        <div className={className} style={readonlyBlockStyle}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</pre>
        </div>
      );
    }

    return (
      <textarea
        ref={textareaRef}
        className={className}
        spellCheck={false}
        style={textareaStyle}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          valueRef.current = nextValue;
          setValue(nextValue);
          onValueChange?.(nextValue);
        }}
        onKeyDown={handleKeyDown}
      />
    );
  }
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
