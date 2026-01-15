import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect, useState, useCallback } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  X,
  Strikethrough,
  Code,
  Quote,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'
import { marked } from 'marked'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

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

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  hasSelection: boolean
  isOnLink: boolean
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    hasSelection: false,
    isOnLink: false,
  })
  const [linkInput, setLinkInput] = useState<LinkInputState>({
    isOpen: false,
    x: 0,
    y: 0,
    selectionFrom: 0,
    selectionTo: 0,
  })
  const [linkUrl, setLinkUrl] = useState('')

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return

      // Check if there's selected text
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      const isOnLink = editor.isActive('link')

      // Show context menu if there's a selection OR cursor is on a link
      if (hasSelection || isOnLink) {
        e.preventDefault()
        setContextMenu({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          hasSelection,
          isOnLink,
        })
      }
    },
    [editor]
  )

  const applyFormatting = useCallback(
    (action: () => void) => {
      action()
      closeContextMenu()
    },
    [closeContextMenu]
  )

  return (
    <div className={className}>
      {showToolbar && <EditorToolbar editor={editor} />}
      <div onContextMenu={handleContextMenu}>
        <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none min-h-[100px] outline-none text-gray-900 dark:text-gray-100" />
      </div>

      {contextMenu.isOpen && editor && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu}>
          {contextMenu.hasSelection && (
            <>
              {/* Text formatting */}
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleBold().run())}
              >
                <span className="flex items-center gap-2">
                  <Bold size={14} /> Bold
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleItalic().run())}
              >
                <span className="flex items-center gap-2">
                  <Italic size={14} /> Italic
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleStrike().run())}
              >
                <span className="flex items-center gap-2">
                  <Strikethrough size={14} /> Strikethrough
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleCode().run())}
              >
                <span className="flex items-center gap-2">
                  <Code size={14} /> Inline Code
                </span>
              </ContextMenuItem>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {/* Headings */}
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
              >
                <span className="flex items-center gap-2">
                  <Heading1 size={14} /> Heading 1
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              >
                <span className="flex items-center gap-2">
                  <Heading2 size={14} /> Heading 2
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
              >
                <span className="flex items-center gap-2">
                  <Heading3 size={14} /> Heading 3
                </span>
              </ContextMenuItem>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {/* Lists */}
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleBulletList().run())}
              >
                <span className="flex items-center gap-2">
                  <List size={14} /> Bullet List
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleOrderedList().run())}
              >
                <span className="flex items-center gap-2">
                  <ListOrdered size={14} /> Numbered List
                </span>
              </ContextMenuItem>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {/* Blocks */}
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleBlockquote().run())}
              >
                <span className="flex items-center gap-2">
                  <Quote size={14} /> Blockquote
                </span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => applyFormatting(() => editor.chain().focus().toggleCodeBlock().run())}
              >
                <span className="flex items-center gap-2">
                  <FileCode size={14} /> Code Block
                </span>
              </ContextMenuItem>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {/* Links */}
              <ContextMenuItem
                onClick={() => {
                  if (editor.isActive('link')) {
                    applyFormatting(() => editor.chain().focus().unsetLink().run())
                  } else {
                    // Save selection and position, then show link input
                    const { from, to } = editor.state.selection
                    setLinkInput({
                      isOpen: true,
                      x: contextMenu.x,
                      y: contextMenu.y,
                      selectionFrom: from,
                      selectionTo: to,
                    })
                    closeContextMenu()
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <LinkIcon size={14} /> {editor.isActive('link') ? 'Remove Link' : 'Add Link'}
                </span>
              </ContextMenuItem>
            </>
          )}
          {!contextMenu.hasSelection && contextMenu.isOnLink && (
            <ContextMenuItem
              onClick={() => applyFormatting(() => editor.chain().focus().unsetLink().run())}
            >
              <span className="flex items-center gap-2">
                <LinkIcon size={14} /> Remove Link
              </span>
            </ContextMenuItem>
          )}
        </ContextMenu>
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
