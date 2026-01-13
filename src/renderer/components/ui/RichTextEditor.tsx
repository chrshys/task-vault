import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className="flex gap-1 p-1 border-b border-gray-700 mb-2">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        type="button"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded text-sm ${editor.isActive('italic') ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        type="button"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        type="button"
      >
        &bull;
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        type="button"
      >
        1.
      </button>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  return (
    <div className={`border border-gray-700 rounded-md ${className}`}>
      <EditorToolbar editor={editor} />
      <div className="p-2">
        <EditorContent editor={editor} className="prose prose-sm prose-invert max-w-none min-h-[100px] outline-none" />
      </div>
    </div>
  )
}
