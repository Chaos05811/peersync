const fonts = [
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Verdana", value: "Verdana" },
  { label: "Courier New", value: "Courier New" }
];

const blockOptions = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" }
];

function ToolbarButton({ active, title, onClick, children }) {
  return (
    <button
      className={`toolbar-button${active ? " active" : ""}`}
      type="button"
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }) {
  if (!editor) {
    return null;
  }

  const currentFont = editor.getAttributes("textStyle").fontFamily || "Arial";
  const currentBlock = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : "paragraph";

  return (
    <div className="toolbar-shell">
      <div className="toolbar">
        <select
          className="toolbar-select"
          value={currentBlock}
          onChange={(event) => {
            const value = event.target.value;
            const chain = editor.chain().focus();

            if (value === "paragraph") {
              chain.setParagraph().run();
              return;
            }

            chain.toggleHeading({ level: value === "h1" ? 1 : 2 }).run();
          }}
        >
          {blockOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="toolbar-select"
          value={currentFont}
          onChange={(event) => {
            editor.chain().focus().setFontFamily(event.target.value).run();
          }}
        >
          {fonts.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <div className="toolbar-divider" />

        <ToolbarButton
          active={editor.isActive("bold")}
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("italic")}
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("underline")}
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("strike")}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="strike">S</span>
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          Left
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          Center
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          title="Align right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          Right
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          title="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("orderedList")}
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbering
        </ToolbarButton>

        <ToolbarButton
          active={false}
          title="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          Clear
        </ToolbarButton>
      </div>
    </div>
  );
}
