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

function ToolbarButton({ active, onClick, children, title }) {
  return (
    <button
      className={`toolbar-button${active ? " active" : ""}`}
      type="button"
      onClick={onClick}
      title={title}
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
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <span className="underline">U</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <span className="strike">S</span>
      </ToolbarButton>

      <div className="toolbar-divider" />

      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      >
        Left
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
      >
        Center
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      >
        Right
      </ToolbarButton>

      <div className="toolbar-divider" />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        Bullets
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        Numbering
      </ToolbarButton>

      <ToolbarButton
        active={false}
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="Clear formatting"
      >
        Clear
      </ToolbarButton>
    </div>
  );
}
