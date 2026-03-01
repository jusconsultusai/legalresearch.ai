'use client'

import { useState } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent, Undo, Redo, Superscript, Subscript, Type,
  Minus, ChevronDown, ChevronUp, Plus, Highlighter, Link2, Image as ImageIcon, Table2,
  SeparatorHorizontal, FileText, Printer, Save, Copy, Scissors, ClipboardPaste,
  ZoomIn, ZoomOut, Maximize2, Bookmark, Hash, Quote, LayoutGrid,
  Sparkles, Brain, BookOpen, Wand2, FileScan, FileSearch
} from 'lucide-react'
import type { PaginatedEditorRef } from '@/components/document/PaginatedEditor'

interface WordToolbarProps {
  editorRef: React.RefObject<PaginatedEditorRef | null>
  onInsertFootnote: () => void
  onInsertCitation: () => void
  onInsertImage: () => void
  onInsertPageBreak: () => void
  onInsertTable: () => void
  onSave: () => void
  onPrint: () => void
  fontSize: number
  setFontSize: (size: number) => void
  fontFamily: string
  setFontFamily: (family: string) => void
  zoom: number
  setZoom: (zoom: number) => void
  pageCount?: number
  currentPage?: number
  onAddPage?: () => void
  onNextPage?: () => void
  onPreviousPage?: () => void
  onGoToPage?: (page: number) => void
  onOpenAIDrafting?: () => void
  onOpenDocumentAnalysis?: () => void
  onAIImprove?: () => void
  onAIResearch?: () => void
  onLegalForms?: () => void
  onSmartSearch?: () => void
  onAIAssistant?: () => void
  onAIGenerate?: () => void
  onAIReview?: () => void
  isAIAssistantOpen?: boolean
}

const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Book Antiqua', label: 'Book Antiqua' },
]

const HEADING_STYLES = [
  { value: 'p', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
]

const LINE_SPACING_OPTIONS = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3.0' },
]

export default function WordToolbar({
  editorRef,
  onInsertFootnote, onInsertCitation, onInsertImage,
  onInsertPageBreak, onInsertTable, onSave, onPrint,
  fontSize, setFontSize, fontFamily, setFontFamily,
  zoom, setZoom,
  pageCount, currentPage, onAddPage, onNextPage, onPreviousPage, onGoToPage,
  onOpenAIDrafting, onOpenDocumentAnalysis, onAIImprove, onAIResearch,
  onLegalForms, onSmartSearch, onAIAssistant, onAIReview,
  isAIAssistantOpen
}: WordToolbarProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout' | 'references' | 'view' | 'ai'>('home')
  const [showFontColorPicker, setShowFontColorPicker] = useState(false)
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false)
  const [lineSpacing, setLineSpacing] = useState('1')
  const [currentHeading, setCurrentHeading] = useState('p')

  const ensureEditorFocus = () => {
    const focusFn = (editorRef?.current as PaginatedEditorRef | null)?.focusEditor
    if (typeof focusFn === 'function') { focusFn(); return }
    const editor = editorRef?.current?.getEditor()
    if (editor && !editor.contains(document.activeElement)) editor.focus()
  }

  const execCmd = (command: string, value?: string) => {
    ensureEditorFocus()
    switch (command) {
      case 'bold': document.execCommand('bold', false); break
      case 'italic': document.execCommand('italic', false); break
      case 'underline': document.execCommand('underline', false); break
      case 'strike': document.execCommand('strikeThrough', false); break
      case 'align':
        if (value === 'left') document.execCommand('justifyLeft', false)
        else if (value === 'center') document.execCommand('justifyCenter', false)
        else if (value === 'right') document.execCommand('justifyRight', false)
        else if (value === 'justify') document.execCommand('justifyFull', false)
        break
      case 'list':
        if (value === 'ordered') document.execCommand('insertOrderedList', false)
        else if (value === 'bullet') document.execCommand('insertUnorderedList', false)
        break
      case 'indent':
        if (value === '+1') document.execCommand('indent', false)
        else if (value === '-1') document.execCommand('outdent', false)
        break
      case 'script':
        if (value === 'super') document.execCommand('superscript', false)
        else if (value === 'sub') document.execCommand('subscript', false)
        break
      case 'font':
        if (value) { document.execCommand('fontName', false, value); setFontFamily(value) }
        break
      case 'color':
        if (value) document.execCommand('foreColor', false, value)
        break
      case 'background':
        if (value) document.execCommand('backColor', false, value)
        break
      case 'header':
        document.execCommand('formatBlock', false, value ? `h${value}` : 'p')
        break
      case 'blockquote': document.execCommand('formatBlock', false, 'blockquote'); break
      case 'link': {
        const sel = window.getSelection()
        const selectedText = sel?.toString() || ''
        const url = prompt('Enter URL:', selectedText.startsWith('http') ? selectedText : 'https://')
        if (url) {
          if (sel && sel.rangeCount > 0 && sel.toString().length > 0) document.execCommand('createLink', false, url)
          else document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`)
        }
        break
      }
      case 'clean': document.execCommand('removeFormat', false); break
      case 'undo': document.execCommand('undo', false); break
      case 'redo': document.execCommand('redo', false); break
      case 'cut': document.execCommand('cut', false); break
      case 'copy': document.execCommand('copy', false); break
      case 'paste':
        navigator.clipboard?.readText().then((text) => {
          if (text) document.execCommand('insertText', false, text)
        }).catch(() => document.execCommand('paste', false))
        break
    }
  }

  const formatBlock = (tag: string) => {
    ensureEditorFocus()
    document.execCommand('formatBlock', false, tag === 'p' ? 'p' : tag)
    setCurrentHeading(tag)
  }

  const applyLineSpacing = (spacing: string) => {
    const editor = editorRef?.current?.getEditor()
    if (editor) editor.style.lineHeight = spacing
    setLineSpacing(spacing)
  }

  const insertHorizontalLine = () => {
    ensureEditorFocus()
    document.execCommand('insertHTML', false, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 16px 0;">')
  }

  const insertSymbol = (symbol: string) => {
    ensureEditorFocus()
    document.execCommand('insertText', false, symbol)
  }

  const Btn = ({ onClick, icon: Icon, title, active = false, disabled = false, className = '' }: {
    onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string
    active?: boolean; disabled?: boolean; className?: string
  }) => (
    <button onClick={onClick} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-gray-700 dark:text-white/80'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`} title={title}>
      <Icon className="w-4 h-4" />
    </button>
  )

  const Dropdown = ({ value, options, onChange, title, width = 'w-24' }: {
    value: string | number; options: { value: string | number; label: string }[]; onChange: (v: string) => void; title: string; width?: string
  }) => (
    <select id={title.toLowerCase().replace(/\s+/g, '-')} name={title.toLowerCase().replace(/\s+/g, '-')} value={value} onChange={(e) => onChange(e.target.value)}
      className={`${width} px-2 py-1 text-xs rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`} title={title}>
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  )

  const Sep = () => <div className="w-px h-6 bg-gray-300 dark:bg-white/20 mx-1" />

  const ColorPicker = ({ onSelect, onClose }: { onSelect: (c: string) => void; onClose: () => void }) => {
    const colors = ['#000000','#434343','#666666','#999999','#cccccc','#ffffff','#ff0000','#ff6600','#ffcc00','#00ff00','#00ffff','#0000ff','#9900ff','#ff00ff','#ff6699','#996633','#003366','#339966','#800000','#808000','#008000','#008080','#000080','#800080']
    return (
      <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-white/10 z-50">
        <div className="grid grid-cols-6 gap-1">
          {colors.map((color) => (
            <button key={color} onClick={() => { onSelect(color); onClose() }} className="w-6 h-6 rounded border border-gray-300 dark:border-white/20 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-white/10 px-2">
        <div className="flex items-center gap-2 mr-4">
          <button onClick={onSave} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-white/70" title="Save (Ctrl+S)">
            <Save className="w-4 h-4" />
          </button>
          <Btn onClick={() => execCmd('undo')} icon={Undo} title="Undo (Ctrl+Z)" />
          <Btn onClick={() => execCmd('redo')} icon={Redo} title="Redo (Ctrl+Y)" />
        </div>

        {pageCount !== undefined && currentPage !== undefined && (
          <>
            <Sep />
            <div className="flex items-center gap-2 mr-4">
              {onAddPage && (
                <button onClick={onAddPage} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors" title="Add New Page">
                  <Plus className="w-3.5 h-3.5" /> New Page
                </button>
              )}
              {pageCount > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-white/10">
                  <button onClick={onPreviousPage} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 disabled:opacity-30 transition-colors" title="Previous Page">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <select id="page-navigation" name="page-navigation" value={currentPage} onChange={(e) => onGoToPage?.(Number(e.target.value))} className="px-2 py-0.5 text-xs font-medium border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-600 dark:text-white/70" title="Jump to Page">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => <option key={page} value={page}>{page} / {pageCount}</option>)}
                  </select>
                  <button onClick={onNextPage} disabled={currentPage === pageCount} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 disabled:opacity-30 transition-colors" title="Next Page">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <Sep />

        {(['home', 'insert', 'layout', 'references', 'view', 'ai'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? tab === 'ai' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500' : 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            {tab === 'ai' ? <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Tools</span> : tab}
          </button>
        ))}
      </div>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <Btn onClick={() => execCmd('paste')} icon={ClipboardPaste} title="Paste (Ctrl+V)" />
            <Btn onClick={() => execCmd('cut')} icon={Scissors} title="Cut (Ctrl+X)" />
            <Btn onClick={() => execCmd('copy')} icon={Copy} title="Copy (Ctrl+C)" />
          </div>
          <div className="flex items-center gap-1 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <Dropdown value={fontFamily} options={FONT_FAMILIES} onChange={(val) => execCmd('font', val)} title="Font Family" width="w-32" />
            <div className="relative">
              <select id="font-size" name="font-size" value="14" disabled className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 cursor-not-allowed" title="Font Size (Fixed at 14pt - SC Paper Rule)">
                <option value="14">14 pt</option>
              </select>
            </div>
            <Sep />
            <Btn onClick={() => execCmd('bold')} icon={Bold} title="Bold (Ctrl+B)" />
            <Btn onClick={() => execCmd('italic')} icon={Italic} title="Italic (Ctrl+I)" />
            <Btn onClick={() => execCmd('underline')} icon={Underline} title="Underline (Ctrl+U)" />
            <Btn onClick={() => execCmd('strike')} icon={Strikethrough} title="Strikethrough" />
            <Btn onClick={() => execCmd('script', 'sub')} icon={Subscript} title="Subscript" />
            <Btn onClick={() => execCmd('script', 'super')} icon={Superscript} title="Superscript" />
            <div className="relative">
              <button onClick={() => setShowFontColorPicker(!showFontColorPicker)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/80 flex items-center" title="Font Color">
                <Type className="w-4 h-4" />
                <div className="w-4 h-1 bg-red-500 absolute bottom-1 left-1/2 -translate-x-1/2" />
              </button>
              {showFontColorPicker && <ColorPicker onSelect={(c) => execCmd('color', c)} onClose={() => setShowFontColorPicker(false)} />}
            </div>
            <div className="relative">
              <button onClick={() => setShowHighlightColorPicker(!showHighlightColorPicker)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Highlight Color">
                <Highlighter className="w-4 h-4" />
              </button>
              {showHighlightColorPicker && <ColorPicker onSelect={(c) => execCmd('background', c)} onClose={() => setShowHighlightColorPicker(false)} />}
            </div>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <Btn onClick={() => execCmd('list', 'bullet')} icon={List} title="Bullet List" />
            <Btn onClick={() => execCmd('list', 'ordered')} icon={ListOrdered} title="Numbered List" />
            <Btn onClick={() => execCmd('indent', '-1')} icon={Outdent} title="Decrease Indent" />
            <Btn onClick={() => execCmd('indent', '+1')} icon={Indent} title="Increase Indent" />
            <Sep />
            <Btn onClick={() => execCmd('align', 'left')} icon={AlignLeft} title="Align Left" />
            <Btn onClick={() => execCmd('align', 'center')} icon={AlignCenter} title="Center" />
            <Btn onClick={() => execCmd('align', 'right')} icon={AlignRight} title="Align Right" />
            <Btn onClick={() => execCmd('align', 'justify')} icon={AlignJustify} title="Justify" />
            <Sep />
            <Dropdown value={lineSpacing} options={LINE_SPACING_OPTIONS} onChange={applyLineSpacing} title="Line Spacing" width="w-14" />
          </div>
          <div className="flex items-center gap-1 px-2 py-1">
            <Dropdown value={currentHeading} options={HEADING_STYLES} onChange={formatBlock} title="Styles" width="w-28" />
          </div>
        </div>
      )}

      {/* Insert Tab */}
      {activeTab === 'insert' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onInsertPageBreak} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Page Break">
              <SeparatorHorizontal className="w-5 h-5" /><span className="text-[10px]">Page Break</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onInsertTable} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Table">
              <Table2 className="w-5 h-5" /><span className="text-[10px]">Table</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onInsertImage} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Image">
              <ImageIcon className="w-5 h-5" /><span className="text-[10px]">Picture</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={() => execCmd('link')} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Link">
              <Link2 className="w-5 h-5" /><span className="text-[10px]">Link</span>
            </button>
            <button onClick={() => { const name = prompt('Enter bookmark name:'); if (name) { ensureEditorFocus(); document.execCommand('insertHTML', false, `<span style="color:#0066cc;font-weight:bold;">[${name}]</span>`) } }} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Bookmark">
              <Bookmark className="w-5 h-5" /><span className="text-[10px]">Bookmark</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1">
            <button onClick={insertHorizontalLine} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Horizontal Line">
              <Minus className="w-5 h-5" /><span className="text-[10px]">Line</span>
            </button>
            <button onClick={() => insertSymbol('§')} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Section Symbol">
              <Hash className="w-5 h-5" /><span className="text-[10px]">§ Symbol</span>
            </button>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <div className="flex items-center gap-2 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <div className="flex flex-col items-center gap-0.5"><span className="text-[10px] text-gray-500 dark:text-white/50">Paper Size</span><span className="text-xs font-medium text-gray-700 dark:text-white/80">8.5&quot; × 13&quot; (Legal)</span></div>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <div className="flex flex-col items-center gap-0.5"><span className="text-[10px] text-gray-500 dark:text-white/50">Margins</span><span className="text-xs font-medium text-gray-700 dark:text-white/80">L:1.5&quot; T:1.2&quot; R:1&quot; B:1&quot;</span></div>
          </div>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex flex-col items-center gap-0.5"><span className="text-[10px] text-gray-500 dark:text-white/50">SC Paper Rule</span><span className="text-xs font-medium text-green-600 dark:text-green-400">A.M. No. 11-9-4-SC ✓</span></div>
          </div>
        </div>
      )}

      {/* References Tab */}
      {activeTab === 'references' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onInsertFootnote} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Footnote">
              <Superscript className="w-5 h-5" /><span className="text-[10px]">Footnote</span>
            </button>
            <button onClick={() => { ensureEditorFocus(); document.execCommand('insertHTML', false, '<sup style="color:#cc6600;">†</sup>') }} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Endnote">
              <FileText className="w-5 h-5" /><span className="text-[10px]">Endnote</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onInsertCitation} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Citation">
              <Quote className="w-5 h-5" /><span className="text-[10px]">Citation</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1">
            <button onClick={() => {
              const editor = editorRef?.current?.getEditor()
              if (!editor) return
              const headings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6')
              const tocLines: string[] = ['<h2 style="text-align: center;">TABLE OF CONTENTS</h2>', '<p>&nbsp;</p>']
              if (headings.length === 0) { tocLines.push('<p>(No headings found. Use heading styles to generate TOC.)</p>') }
              else {
                let pageEstimate = 1; let lineCount = 0
                headings.forEach((heading: Element) => {
                  const level = parseInt(heading.tagName.charAt(1))
                  const text = heading.textContent?.trim() || ''
                  if (text) { tocLines.push(`<p>${'&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(Math.max(0, level - 1))}${text} .......... ${pageEstimate}</p>`) }
                  lineCount += 2; pageEstimate = Math.max(1, Math.ceil(lineCount / 50))
                })
              }
              tocLines.push('<p>&nbsp;</p>')
              ensureEditorFocus()
              document.execCommand('insertHTML', false, tocLines.join('\n'))
            }} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Insert Table of Contents">
              <LayoutGrid className="w-5 h-5" /><span className="text-[10px]">Table of Contents</span>
            </button>
          </div>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <Btn onClick={() => setZoom(Math.max(50, zoom - 10))} icon={ZoomOut} title="Zoom Out" />
            <span className="text-xs font-medium text-gray-700 dark:text-white/80 w-12 text-center">{zoom}%</span>
            <Btn onClick={() => setZoom(Math.min(200, zoom + 10))} icon={ZoomIn} title="Zoom In" />
            <Btn onClick={() => setZoom(100)} icon={Maximize2} title="Reset Zoom" />
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1">
            <button onClick={onPrint} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white/80" title="Print Preview">
              <Printer className="w-5 h-5" /><span className="text-[10px]">Print</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {activeTab === 'ai' && (
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onAIAssistant} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isAIAssistantOpen ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300' : 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`} title="Toggle AI Assistant Panel">
              <Sparkles className="w-6 h-6" /><span className="text-[10px] font-medium">AI Assistant</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onAIImprove} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors" title="Improve Document with AI">
              <Brain className="w-6 h-6" /><span className="text-[10px] font-medium">Improve</span>
            </button>
            <button onClick={onAIReview} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors" title="Review Document with AI">
              <BookOpen className="w-6 h-6" /><span className="text-[10px] font-medium">Review</span>
            </button>
            <button onClick={onOpenAIDrafting} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors" title="AI Document Drafting with Templates">
              <Wand2 className="w-6 h-6" /><span className="text-[10px] font-medium">AI Draft</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1 border-r border-gray-200 dark:border-white/10">
            <button onClick={onOpenDocumentAnalysis} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 transition-colors" title="Upload & Analyze Document with AI">
              <FileScan className="w-6 h-6" /><span className="text-[10px] font-medium">Analyze</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 py-1">
            <button onClick={onLegalForms || onAIResearch} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors" title="Access Legal Forms and Templates">
              <BookOpen className="w-6 h-6" /><span className="text-[10px] font-medium">Legal Forms</span>
            </button>
            <button onClick={onSmartSearch || onAIResearch} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors" title="Smart Search">
              <FileSearch className="w-6 h-6" /><span className="text-[10px] font-medium">Smart Search</span>
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Powered</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
