import type { Editor } from '@tiptap/react';
import type { TextBox } from './types';

const FONT_SIZES = [10, 12, 14, 16, 18, 24, 32, 48];

const divider = <div style={{ width: 1, height: 16, background: '#4b5563', flexShrink: 0 }} />;

const baseBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #4b5563',
  borderRadius: 3,
  color: '#f9fafb',
  fontSize: 12,
  padding: '1px 5px',
  cursor: 'pointer',
  lineHeight: 1,
  fontFamily: 'inherit',
};

const activeBtnStyle: React.CSSProperties = {
  ...baseBtn,
  backgroundColor: '#4f46e5',
  borderColor: '#6366f1',
};

interface TextBoxFormatToolbarProps {
  editor: Editor | null;
  box: TextBox;
  onChange: (patch: Partial<TextBox>) => void;
  onDelete: () => void;
}

export function TextBoxFormatToolbar({ editor, box, onChange, onDelete }: TextBoxFormatToolbarProps) {
  const currentFontSize = editor?.getAttributes('textStyle').fontSize ?? '14px';
  const currentColor = editor?.getAttributes('textStyle').color ?? '#000000';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 6px',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        zIndex: 60,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Font size */}
      <select
        value={currentFontSize}
        onChange={(e) => editor?.chain().focus().setFontSize(e.target.value).run()}
        onMouseDown={(e) => e.preventDefault()}
        title="Font size"
        style={{
          background: '#374151',
          color: '#f9fafb',
          border: '1px solid #4b5563',
          borderRadius: 3,
          fontSize: 11,
          padding: '1px 2px',
          cursor: 'pointer',
        }}
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={`${s}px`}>{s}px</option>
        ))}
      </select>

      {/* Bold */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        title="Bold"
        style={editor?.isActive('bold') ? activeBtnStyle : baseBtn}
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        title="Italic"
        style={editor?.isActive('italic') ? activeBtnStyle : baseBtn}
      >
        <em>I</em>
      </button>

      {/* Underline */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        title="Underline"
        style={editor?.isActive('underline') ? { ...activeBtnStyle, textDecoration: 'underline' } : { ...baseBtn, textDecoration: 'underline' }}
      >
        U
      </button>

      {divider}

      {/* Text color */}
      <label title="Text color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
        <span style={{ color: '#f9fafb', fontSize: 11 }}>A</span>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
          onMouseDown={(e) => e.preventDefault()}
          style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
        />
      </label>

      {/* Bullet list */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        title="Bullet list"
        style={editor?.isActive('bulletList') ? activeBtnStyle : baseBtn}
      >
        •≡
      </button>

      {/* Ordered list */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
        style={editor?.isActive('orderedList') ? activeBtnStyle : baseBtn}
      >
        1≡
      </button>

      {divider}

      {/* Background color */}
      <label title="Background color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>bg</span>
        <input
          type="color"
          value={box.bgColor ?? '#ffffff'}
          onChange={(e) => onChange({ bgColor: e.target.value })}
          style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
        />
      </label>

      {/* Clear background */}
      <button
        onClick={() => onChange({ bgColor: undefined })}
        title="Remove background"
        style={{
          ...baseBtn,
          color: '#9ca3af',
        }}
      >
        ✕bg
      </button>

      {divider}

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete text box"
        style={{
          ...baseBtn,
          border: '1px solid #ef4444',
          color: '#ef4444',
        }}
      >
        🗑
      </button>
    </div>
  );
}
