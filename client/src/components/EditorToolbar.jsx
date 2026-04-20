import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline
} from "lucide-react";

const fonts = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Menlo", value: "Menlo, monospace" },
  { label: "Times", value: '"Times New Roman", serif' },
  { label: "Arial", value: "Arial, sans-serif" }
];

function ToolbarButton({ active, title, onClick, children }) {
  return (
    <button
      className={`toolbar-action${active ? " active" : ""}`}
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

  const currentFont =
    editor.getAttributes("textStyle").fontFamily || fonts[0].value;

  return (
    <div className="toolbar-shell">
      <div className="toolbar toolbar-rich">
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

        <div className="toolbar-separator" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="toolbar-icon" />
        </ToolbarButton>

        <div className="toolbar-separator" />

        <ToolbarButton
          active={editor.isActive("bold")}
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="toolbar-icon" />
        </ToolbarButton>

        <div className="toolbar-separator" />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          title="Align right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="toolbar-icon" />
        </ToolbarButton>

        <div className="toolbar-separator" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="toolbar-icon" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="toolbar-icon" />
        </ToolbarButton>
      </div>
    </div>
  );
}
