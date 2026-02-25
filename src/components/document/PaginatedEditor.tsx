'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { SC_PAPER_RULE, SC_PAPER_PIXELS } from '@/lib/documentFormats/scPaperRule'

interface Footnote {
  id: number
  content: string
  marker: string
}

interface PaginatedEditorProps {
  content: string
  setContent: (content: string) => void
  footnotes?: Footnote[]
  setFootnotes?: React.Dispatch<React.SetStateAction<Footnote[]>>
  fontSize: number
  fontFamily: string
  zoom: number
  className?: string
  leftIndent?: number
  firstLineIndent?: number
  hangingIndent?: number
}

export interface PaginatedEditorRef {
  getEditor: () => HTMLDivElement | null
  insertFootnote: () => void
  insertPageBreak: () => void
  insertTable: (rows: number, cols: number) => void
  insertText: (text: string) => void
  focusEditor: () => void
  getContent: () => string
  getPages: () => HTMLDivElement[]
}

const PaginatedEditor = forwardRef<PaginatedEditorRef, PaginatedEditorProps>(({
  content,
  setContent,
  footnotes = [],
  setFootnotes,
  fontSize,
  fontFamily,
  zoom,
  className = '',
  leftIndent = 0,
  firstLineIndent = 0,
  hangingIndent = 0,
}, ref) => {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<HTMLDivElement[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editorContent, setEditorContent] = useState(content)

  const pageWidth = SC_PAPER_PIXELS.width
  const pageHeight = SC_PAPER_PIXELS.height
  const marginTop = SC_PAPER_PIXELS.marginTop
  const marginBottom = SC_PAPER_PIXELS.marginBottom
  const marginLeft = SC_PAPER_PIXELS.marginLeft
  const marginRight = SC_PAPER_PIXELS.marginRight
  const contentWidth = pageWidth - marginLeft - marginRight
  const contentHeight = pageHeight - marginTop - marginBottom

  const footnoteLineHeight = 16
  const maxFootnotesPerPage = 5
  const footnoteSectionHeight = footnotes.length > 0
    ? Math.min(footnotes.length, maxFootnotesPerPage) * footnoteLineHeight + 20
    : 0

  const calculatePages = useCallback(() => {
    if (!editorContainerRef.current) return
    const editors = editorContainerRef.current.querySelectorAll('.page-editor')
    const newPages: HTMLDivElement[] = []
    editors.forEach((editor) => newPages.push(editor as HTMLDivElement))
    setPages(newPages)
    setTotalPages(newPages.length || 1)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) document.execCommand('outdent', false)
      else document.execCommand('indent', false)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      document.execCommand('insertParagraph', false)
      e.preventDefault()
      return
    }
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.execCommand('bold', false); return }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.execCommand('italic', false); return }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); document.execCommand('underline', false); return }
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); document.execCommand('undo', false); return }
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); document.execCommand('redo', false); return }
  }, [])

  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setEditorContent(target.innerHTML)
    setContent(target.innerHTML)
    calculatePages()
  }, [setContent, calculatePages])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const clipboardData = e.clipboardData
    let html = clipboardData.getData('text/html')
    if (html) {
      const div = document.createElement('div')
      div.innerHTML = html
      div.querySelectorAll('script').forEach(s => s.remove())
      html = div.innerHTML
      document.execCommand('insertHTML', false, html)
    } else {
      const text = clipboardData.getData('text/plain')
      if (text) document.execCommand('insertHTML', false, text.replace(/\n/g, '<br>'))
    }
    const target = e.currentTarget
    setEditorContent(target.innerHTML)
    setContent(target.innerHTML)
  }, [setContent])

  const insertFootnote = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const footnoteNumber = footnotes.length + 1
    const marker = document.createElement('sup')
    marker.className = 'footnote-marker text-primary-600 dark:text-primary-400 cursor-pointer hover:underline'
    marker.textContent = `[${footnoteNumber}]`
    marker.setAttribute('data-footnote-id', footnoteNumber.toString())
    marker.id = `footnote-ref-${footnoteNumber}`
    range.deleteContents()
    range.insertNode(marker)
    range.setStartAfter(marker)
    range.setEndAfter(marker)
    selection.removeAllRanges()
    selection.addRange(range)
    setFootnotes?.(prev => [...prev, { id: footnoteNumber, content: '', marker: `[${footnoteNumber}]` }])
    setTimeout(() => document.getElementById(`footnote-input-${footnoteNumber}`)?.focus(), 100)
  }, [footnotes.length, setFootnotes])

  const insertPageBreak = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const pageBreak = document.createElement('div')
    pageBreak.className = 'page-break w-full border-t-2 border-dashed border-gray-400 dark:border-white/30 my-4 relative'
    pageBreak.setAttribute('contenteditable', 'false')
    pageBreak.innerHTML = '<span class="absolute left-1/2 -translate-x-1/2 -top-3 bg-white dark:bg-slate-800 px-2 text-xs text-gray-500">Page Break</span>'
    range.deleteContents()
    range.insertNode(pageBreak)
    range.setStartAfter(pageBreak)
    range.setEndAfter(pageBreak)
    selection.removeAllRanges()
    selection.addRange(range)
    calculatePages()
  }, [calculatePages])

  const insertTable = useCallback((rows = 3, cols = 3) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const table = document.createElement('table')
    table.className = 'w-full border-collapse border border-gray-400 dark:border-white/30 my-2'
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('tr')
      for (let j = 0; j < cols; j++) {
        const cell = document.createElement('td')
        cell.className = 'border border-gray-400 dark:border-white/30 p-2 min-w-[50px]'
        cell.innerHTML = '&nbsp;'
        row.appendChild(cell)
      }
      table.appendChild(row)
    }
    range.deleteContents()
    range.insertNode(table)
    range.setStartAfter(table)
    range.setEndAfter(table)
    selection.removeAllRanges()
    selection.addRange(range)
  }, [])

  const insertText = useCallback((text: string) => {
    document.execCommand('insertHTML', false, text)
  }, [])

  const getEditor = useCallback(() => {
    if (!editorContainerRef.current) return null
    const editors = editorContainerRef.current.querySelectorAll('.page-editor')
    if (editors.length === 0) return null
    const index = Math.max(0, Math.min(editors.length - 1, currentPage - 1))
    return editors[index] as HTMLDivElement | null
  }, [currentPage])

  const focusEditor = useCallback(() => {
    const editor = getEditor()
    if (editor) {
      editor.focus()
      const sel = window.getSelection()
      if (sel && sel.rangeCount === 0) {
        const range = document.createRange()
        range.selectNodeContents(editor)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }, [getEditor])

  const getContent = useCallback(() => editorContent, [editorContent])
  const getPages = useCallback(() => pages, [pages])

  useImperativeHandle(ref, () => ({
    getEditor, insertFootnote, insertPageBreak, insertTable, insertText, focusEditor, getContent, getPages
  }), [getEditor, insertFootnote, insertPageBreak, insertTable, insertText, focusEditor, getContent, getPages])

  const updateFootnoteContent = (id: number, newContent: string) => {
    setFootnotes?.(prev => prev.map(fn => fn.id === id ? { ...fn, content: newContent } : fn))
  }

  const deleteFootnote = (id: number) => {
    document.getElementById(`footnote-ref-${id}`)?.remove()
    setFootnotes?.(prev => {
      const filtered = prev.filter(fn => fn.id !== id)
      return filtered.map((fn, idx) => ({ ...fn, id: idx + 1, marker: `[${idx + 1}]` }))
    })
  }

  const pageStyles: React.CSSProperties = {
    width: `${pageWidth}px`,
    minHeight: `${pageHeight}px`,
    paddingTop: `${marginTop}px`,
    paddingBottom: `${marginBottom}px`,
    paddingLeft: `${marginLeft}px`,
    paddingRight: `${marginRight}px`,
    fontFamily,
    fontSize: `${fontSize}pt`,
    lineHeight: SC_PAPER_RULE.typography.lineHeight,
    textAlign: 'left',
    backgroundColor: 'white',
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    direction: 'ltr',
    writingMode: 'horizontal-tb',
  }

  useEffect(() => {
    if (content && editorContent !== content) setEditorContent(content)
  }, [content])

  useEffect(() => { calculatePages() }, [editorContent, calculatePages])

  return (
    <div dir="ltr" className={`paginated-editor-container flex flex-col items-center ${className}`} style={{ width: '100%', overflowX: 'auto', direction: 'ltr' }}>
      <div ref={editorContainerRef} className="pages-container flex flex-col gap-8 items-center pb-16" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="page-wrapper relative">
          <div className="absolute -top-6 right-0 text-xs text-gray-500 dark:text-white/50" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top right' }}>
            Page {currentPage} of {totalPages}
          </div>

          <div className="page bg-white dark:bg-white text-black rounded shadow-lg relative" dir="ltr" style={{ ...pageStyles, direction: 'ltr', unicodeBidi: 'embed' }}>
            <div
              className="page-editor outline-none prose prose-sm max-w-none"
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              spellCheck
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              dangerouslySetInnerHTML={{ __html: editorContent }}
              style={{
                minHeight: `${contentHeight - footnoteSectionHeight - 40}px`,
                fontSize: `${fontSize}pt`,
                fontFamily,
                lineHeight: SC_PAPER_RULE.typography.lineHeight,
                color: 'black',
                direction: 'ltr',
                unicodeBidi: 'embed',
                textAlign: 'left',
                writingMode: 'horizontal-tb',
                paddingLeft: `${leftIndent}px`,
                textIndent: hangingIndent > 0 ? `-${hangingIndent}px` : `${firstLineIndent}px`
              }}
            />

            {/* Footnotes Section */}
            {footnotes.length > 0 && (
              <div className="footnotes-section border-t border-gray-300 mt-4 pt-2" style={{ minHeight: `${footnoteSectionHeight}px`, fontSize: '10pt', lineHeight: '1.2' }}>
                {footnotes.map((footnote) => (
                  <div key={footnote.id} className="footnote-entry flex gap-1 text-xs mb-1" id={`footnote-${footnote.id}`}>
                    <sup className="text-primary-600 font-medium">{footnote.marker}</sup>
                    <input
                      id={`footnote-input-${footnote.id}`}
                      type="text"
                      value={footnote.content}
                      onChange={(e) => updateFootnoteContent(footnote.id, e.target.value)}
                      placeholder="Enter footnote text..."
                      className="flex-1 bg-transparent border-b border-gray-200 focus:border-primary-400 outline-none text-gray-700 text-xs"
                    />
                    <button onClick={() => deleteFootnote(footnote.id)} className="text-red-500 hover:text-red-700 text-xs px-1">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Page Footer */}
            <div className="absolute left-0 right-0 text-center text-xs text-gray-500" style={{ bottom: `${marginBottom / 2}px` }}>
              - {currentPage} -
            </div>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full shadow-lg px-4 py-2 border border-gray-200 dark:border-white/10">
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="px-3 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50">
            ← Prev
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-white/70">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50">
            Next →
          </button>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .page-break { page-break-after: always; border: none !important; }
          .page-break span { display: none; }
          .footnotes-section { position: absolute; bottom: ${marginBottom}px; left: ${marginLeft}px; right: ${marginRight}px; }
        }
        .page-editor:focus { outline: none; }
        .page-editor .footnote-marker:hover { cursor: pointer; text-decoration: underline; }
        .page-editor p { margin: 0 0 10pt 0; line-height: 1.5; }
        .page-editor br { display: block; margin: 5pt 0; content: ""; }
        .page-editor > div { margin-bottom: 10pt; direction: ltr !important; }
        .page-editor table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        .page-editor table td, .page-editor table th { border: 1px solid #ccc; padding: 8px; min-width: 50px; text-align: left !important; }
        .page-editor blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #666; }
        .page-editor ul, .page-editor ol { margin: 0 0 10pt 0; padding-left: 40px; }
        .page-editor li { margin-bottom: 5pt; }
        .page-editor h1, .page-editor h2, .page-editor h3 { margin: 10pt 0; font-weight: bold; }
        .page-editor h1 { font-size: 18pt; }
        .page-editor h2 { font-size: 16pt; }
        .page-editor h3 { font-size: 14pt; }
        .page-editor::selection { background: #b4d5fe; }
        .page-editor { cursor: text; }
      `}</style>
    </div>
  )
})

PaginatedEditor.displayName = 'PaginatedEditor'
export default PaginatedEditor
