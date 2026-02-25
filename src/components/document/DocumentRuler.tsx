'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { SC_PAPER_PIXELS } from '@/lib/documentFormats/scPaperRule'

interface DocumentRulerProps {
  zoom: number
  leftIndent: number
  firstLineIndent: number
  onLeftIndentChange: (px: number) => void
  onFirstLineIndentChange: (px: number) => void
}

export default function DocumentRuler({
  zoom,
  leftIndent,
  firstLineIndent,
  onLeftIndentChange,
  onFirstLineIndentChange
}: DocumentRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'left' | 'firstLine' | null>(null)

  const pageWidth = SC_PAPER_PIXELS.width
  const marginLeft = SC_PAPER_PIXELS.marginLeft
  const marginRight = SC_PAPER_PIXELS.marginRight
  const contentWidth = pageWidth - marginLeft - marginRight

  // Inches for ruler ticks
  const totalInches = pageWidth / 96

  const handleMouseDown = useCallback((type: 'left' | 'firstLine') => {
    setDragging(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !rulerRef.current) return

    const rect = rulerRef.current.getBoundingClientRect()
    const scale = zoom / 100
    const x = (e.clientX - rect.left) / scale - marginLeft

    const clamped = Math.max(0, Math.min(x, contentWidth))

    if (dragging === 'left') {
      onLeftIndentChange(clamped)
    } else if (dragging === 'firstLine') {
      onFirstLineIndentChange(clamped)
    }
  }, [dragging, zoom, marginLeft, contentWidth, onLeftIndentChange, onFirstLineIndentChange])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const ticks = []
  for (let i = 0; i <= totalInches; i += 0.25) {
    const x = i * 96
    const isInch = i === Math.floor(i)
    const isHalf = (i * 2) === Math.floor(i * 2) && !isInch
    ticks.push(
      <div
        key={i}
        className="absolute"
        style={{ left: `${x}px` }}
      >
        <div
          className={`w-px bg-gray-400 dark:bg-white/40 ${
            isInch ? 'h-3' : isHalf ? 'h-2' : 'h-1'
          }`}
        />
        {isInch && i > 0 && (
          <span className="absolute top-3 -translate-x-1/2 text-[8px] text-gray-500 dark:text-white/50 select-none">
            {i}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex justify-center mb-1">
      <div
        ref={rulerRef}
        className="relative bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded overflow-visible"
        style={{
          width: `${pageWidth}px`,
          height: '24px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center'
        }}
      >
        {/* Left margin shade */}
        <div
          className="absolute top-0 bottom-0 bg-gray-200/60 dark:bg-white/10"
          style={{ left: 0, width: `${marginLeft}px` }}
        />

        {/* Right margin shade */}
        <div
          className="absolute top-0 bottom-0 bg-gray-200/60 dark:bg-white/10"
          style={{ right: 0, width: `${marginRight}px` }}
        />

        {/* Ticks */}
        <div className="absolute top-0 left-0 h-full">
          {ticks}
        </div>

        {/* Left Indent Marker */}
        <div
          className={`absolute top-4 cursor-ew-resize z-10 ${
            dragging === 'left' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ left: `${marginLeft + leftIndent}px` }}
          onMouseDown={() => handleMouseDown('left')}
          title="Left Indent"
        >
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-blue-500 -translate-x-1/2" />
        </div>

        {/* First Line Indent Marker */}
        <div
          className={`absolute top-0 cursor-ew-resize z-10 ${
            dragging === 'firstLine' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ left: `${marginLeft + firstLineIndent}px` }}
          onMouseDown={() => handleMouseDown('firstLine')}
          title="First Line Indent"
        >
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-green-500 -translate-x-1/2" />
        </div>
      </div>
    </div>
  )
}
