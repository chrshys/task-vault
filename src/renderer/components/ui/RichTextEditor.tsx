import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useState } from 'react'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, X } from 'lucide-react'
import { marked } from 'marked'

// Check if text looks like markdown
function looksLikeMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s+\S/m,           // Headings: # Heading
    /\*\*[^*]+\*\*/,           // Bold: **text**
    /\*[^*]+\*/,               // Italic: *text*
    /__[^_]+__/,               // Bold: __text__
    /_[^_]+_/,                 // Italic: _text_
    /\[.+?\]\(.+?\)/,          // Links: [text](url)
    /^[-*+]\s+\S/m,            // Unordered lists: - item
    /^\d+\.\s+\S/m,            // Ordered lists: 1. item
    /^>\s+\S/m,                // Blockquotes: > text
    /`[^`]+`/,                 // Inline code: `code`
    /^```/m,                   // Code blocks: ```
    /^\|.+\|$/m,               // Tables: | col | col |
  ]

  // Must match at least one markdown pattern
  return markdownPatterns.some(pattern => pattern.test(text))
}

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
      type="button"
      title={title}
    >
      {children}
    </button>
  )
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  if (!editor) return null

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    }
    setLinkUrl('')
    setShowLinkInput(false)
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={16} strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={16} strokeWidth={2.5} />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List size={16} strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered size={16} strokeWidth={2.5} />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
            } else {
              setShowLinkInput(true)
            }
          }}
          isActive={editor.isActive('link')}
          title={editor.isActive('link') ? 'Remove link' : 'Add link'}
        >
          <LinkIcon size={16} strokeWidth={2.5} />
        </ToolbarButton>
      </div>

      {showLinkInput && (
        <div className="flex gap-2 items-center">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLinkSubmit()
              } else if (e.key === 'Escape') {
                setLinkUrl('')
                setShowLinkInput(false)
              }
            }}
            placeholder="https://..."
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleLinkSubmit}
            className="px-3 py-1 text-sm font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            type="button"
          >
            Add
          </button>
          <button
            onClick={() => {
              setLinkUrl('')
              setShowLinkInput(false)
            }}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            type="button"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}
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
    editorProps: {
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        // Prefer text/html if available
        const html = clipboardData.getData('text/html')
        if (html) {
          // Clean up the HTML - remove meta tags, comments, and unnecessary wrappers
          const parser = new DOMParser()
          const doc = parser.parseFromString(html, 'text/html')
          const cleanHtml = doc.body.innerHTML

          // Use Tiptap's built-in HTML parsing
          editor?.commands.insertContent(cleanHtml, {
            parseOptions: { preserveWhitespace: false },
          })

          return true
        }

        const text = clipboardData.getData('text/plain')
        if (!text) return false

        // Check if plain text looks like HTML
        if (/<[a-z][\s\S]*>/i.test(text)) {
          editor?.commands.insertContent(text, {
            parseOptions: { preserveWhitespace: false },
          })
          return true
        }

        // Check if plain text looks like markdown
        if (looksLikeMarkdown(text)) {
          const html = marked.parse(text, { async: false }) as string
          editor?.commands.insertContent(html, {
            parseOptions: { preserveWhitespace: false },
          })
          return true
        }

        // Let Tiptap handle other paste cases
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  return (
    <div className={`border border-gray-300 dark:border-gray-700 rounded-md ${className}`}>
      <EditorToolbar editor={editor} />
      <div className="p-2">
        <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none min-h-[100px] outline-none text-gray-900 dark:text-gray-100" />
      </div>
    </div>
  )
}
