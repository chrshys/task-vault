import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  X,
  Strikethrough,
  MoreHorizontal,
} from 'lucide-react'
import { marked } from 'marked'
import { ContextMenu } from './ContextMenu'

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
  showToolbar?: boolean
  onEditorReady?: (editor: Editor) => void
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

interface BubbleToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
  title: string
}

function BubbleToolbarButton({ icon: Icon, isActive, onClick, title }: BubbleToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

interface FormatOption {
  label: string
  action: () => void
  isActive: boolean
  type?: never
}

interface FormatSeparator {
  type: 'separator'
  label?: never
  action?: never
  isActive?: never
}

function FormatDropdown({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const options: (FormatOption | FormatSeparator)[] = [
    { label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    { type: 'separator' },
    { label: 'Blockquote', action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote') },
    { label: 'Code Block', action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive('codeBlock') },
  ]

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="More formatting"
        className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
          {options.map((opt, i) =>
            opt.type === 'separator' ? (
              <div key={i} className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => {
                  opt.action()
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  opt.isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  if (!editor) return null

  const handleLinkSubmit = () => {
    if (linkUrl) {
      let url = linkUrl.trim()
      if (url && !/^https?:\/\//i.test(url)) {
        url = `https://${url}`
      }
      editor.chain().focus().setLink({ href: url }).run()
    }
    setLinkUrl('')
    setShowLinkInput(false)
  }

  return (
    <div className="flex flex-col gap-2">
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

interface LinkInputState {
  isOpen: boolean
  x: number
  y: number
  selectionFrom: number
  selectionTo: number
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  className = '',
  showToolbar = true,
  onEditorReady,
}: RichTextEditorProps) {
  const [linkInput, setLinkInput] = useState<LinkInputState>({
    isOpen: false,
    x: 0,
    y: 0,
    selectionFrom: 0,
    selectionTo: 0,
  })
  const [linkUrl, setLinkUrl] = useState('')
  const isContextMenuOpenRef = useRef(false)

  // Hide bubble menu when context menu opens
  useEffect(() => {
    const handleContextMenu = () => {
      isContextMenuOpenRef.current = true
    }
    const handleClick = () => {
      isContextMenuOpenRef.current = false
    }
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
    }
  }, [])

  const closeLinkInput = useCallback(() => {
    setLinkInput((prev) => ({ ...prev, isOpen: false }))
    setLinkUrl('')
  }, [])

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
    onCreate: ({ editor }) => {
      onEditorReady?.(editor)
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

  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor)
    }
  }, [editor, onEditorReady])

  const handleLinkClick = useCallback(() => {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const { from, to } = editor.state.selection
      setLinkInput({
        isOpen: true,
        x: 0,
        y: 0,
        selectionFrom: from,
        selectionTo: to,
      })
    }
  }, [editor])

  return (
    <div className={className}>
      {showToolbar && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none min-h-[100px] outline-none text-gray-900 dark:text-gray-100" />

      {editor && (
        <BubbleMenu
          editor={editor}
          updateDelay={100}
          shouldShow={({ editor: e, view, state, from, to }) => {
            // Hide when native context menu is open
            if (isContextMenuOpenRef.current) return false

            // Default BubbleMenu logic
            const { doc, selection } = state
            const isEmptyTextBlock = !doc.textBetween(from, to).length && selection.empty
            const hasEditorFocus = view.hasFocus()

            if (!hasEditorFocus || isEmptyTextBlock || !e.isEditable) {
              return false
            }

            return true
          }}
          className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1"
        >
          <BubbleToolbarButton
            icon={Bold}
            isActive={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          />
          <BubbleToolbarButton
            icon={Italic}
            isActive={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          />
          <BubbleToolbarButton
            icon={Strikethrough}
            isActive={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <BubbleToolbarButton
            icon={List}
            isActive={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          />
          <BubbleToolbarButton
            icon={ListOrdered}
            isActive={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <BubbleToolbarButton
            icon={LinkIcon}
            isActive={editor.isActive('link')}
            onClick={handleLinkClick}
            title={editor.isActive('link') ? 'Remove link' : 'Add link'}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <FormatDropdown editor={editor} />
        </BubbleMenu>
      )}

      {linkInput.isOpen && editor && (
        <ContextMenu x={linkInput.x} y={linkInput.y} onClose={closeLinkInput}>
          <div className="px-2 py-1.5">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (linkUrl) {
                    let finalUrl = linkUrl.trim()
                    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
                      finalUrl = `https://${finalUrl}`
                    }
                    editor
                      .chain()
                      .focus()
                      .setTextSelection({ from: linkInput.selectionFrom, to: linkInput.selectionTo })
                      .setLink({ href: finalUrl })
                      .run()
                  }
                  closeLinkInput()
                } else if (e.key === 'Escape') {
                  closeLinkInput()
                }
              }}
              placeholder="https://..."
              className="w-48 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </ContextMenu>
      )}
    </div>
  )
}
