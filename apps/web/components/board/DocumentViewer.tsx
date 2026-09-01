'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FileText, ChevronLeft, ChevronRight, X, Presentation, Image as ImageIcon, Layers, Move, Pen, Maximize, Minimize } from 'lucide-react';
import { ImportedFileData } from '@/lib/file-import/FileImportService';

interface DocumentViewerProps {
  document: ImportedFileData;
  onClose?: () => void;
  className?: string;
  docMode?: 'write' | 'scroll';
  onDocModeChange?: (mode: 'write' | 'scroll') => void;
  allowWriteToggle?: boolean;
  onScroll?: (scrollTop: number) => void;
  children?: React.ReactNode;
}

export const DocumentViewer = React.forwardRef<HTMLDivElement, DocumentViewerProps>(function DocumentViewer({
  document: doc,
  onClose,
  className = '',
  docMode = 'write',
  onDocModeChange,
  allowWriteToggle = true,
  onScroll,
  children
}: DocumentViewerProps, ref) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const internalScrollRef = useRef<HTMLDivElement>(null);

  // Connect external ref if provided, otherwise use internal
  const scrollContainerRef = (ref as React.RefObject<HTMLDivElement | null>) || internalScrollRef;

  const slides = doc.pages && doc.pages.length > 0
    ? doc.pages
    : doc.textContent
    ? doc.textContent.split('\n\n---\n\n')
    : [];

  const totalSlides = slides.length || 1;
  const activeSlideText = slides[currentSlideIndex] || doc.textContent || '';

  const isPresentation = doc.type === 'ppt' || doc.name.endsWith('.pptx') || doc.name.endsWith('.ppt');
  const isImage = doc.type === 'image' || doc.mimeType?.startsWith('image/');
  const isPdf = doc.type === 'pdf' || doc.mimeType?.includes('pdf');

  const pdfUrlNoPrint = isPdf && doc.dataUrl
    ? (doc.dataUrl.includes('#') ? doc.dataUrl : `${doc.dataUrl}#toolbar=0&navpanes=0&scrollbar=1`)
    : '';

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  };

  // Switch to scroll mode automatically if the content is long
  useEffect(() => {
    if (docMode === 'write' && scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight > clientHeight + 100 && onDocModeChange) {
        // We don't force it, but we could notify or provide a visual cue
      }
    }
  }, [doc, docMode, onDocModeChange, scrollContainerRef]);

  return (
    <div className={`
      ${isFullScreen ? 'fixed inset-0 z-[100] max-w-none max-h-none rounded-none' : 'max-w-5xl max-h-[85vh] w-full rounded-3xl'}
      bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 ${className}
    `}>
      {/* Top Header Bar */}
      <div className="h-14 bg-slate-100 dark:bg-slate-950 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-30 relative">
        <div className="flex items-center gap-3 truncate">
          {isPresentation ? (
            <Presentation className="w-5 h-5 text-amber-500 shrink-0" />
          ) : isImage ? (
            <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
          )}
          <div className="flex flex-col truncate">
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate uppercase tracking-wider">{doc.name}</span>
            <span className="text-[9px] text-slate-400 font-mono uppercase font-bold">
              {doc.type} • {(doc.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>

        {/* Mode Toggles & Controls */}
        <div className="flex items-center gap-3">
          {/* Scroll vs Write Mode Toggle */}
          {onDocModeChange && allowWriteToggle && (
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl gap-1 mr-2 shadow-inner">
              <button
                onClick={() => onDocModeChange('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  docMode === 'write'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
                title="Write directly on top of document"
              >
                <Pen className="w-3 h-3" />
                <span>Write</span>
              </button>
              <button
                onClick={() => onDocModeChange('scroll')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  docMode === 'scroll'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
                title="Scroll document content"
              >
                <Move className="w-3 h-3" />
                <span>Scroll</span>
              </button>
            </div>
          )}

          {/* Slide / Page Controls */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mr-2">
              <button
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                disabled={currentSlideIndex <= 0}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black font-mono text-slate-700 dark:text-slate-200 min-w-[80px] text-center">
                {currentSlideIndex + 1} / {totalSlides}
              </span>
              <button
                onClick={() => setCurrentSlideIndex(prev => Math.min(totalSlides - 1, prev + 1))}
                disabled={currentSlideIndex >= totalSlides - 1}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors cursor-pointer"
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        {/* The Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`h-full overflow-y-auto scrollbar-thin p-8 ${docMode === 'write' ? 'overflow-x-hidden' : ''}`}
        >
          {/* Document Content */}
          <div className="relative mx-auto max-w-4xl min-h-[70vh] shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className={`w-full h-full ${docMode === 'write' ? 'pointer-events-none select-none' : 'pointer-events-auto'}`}>
              {isImage && doc.dataUrl ? (
                <Image
                  src={doc.dataUrl}
                  alt={doc.name}
                  width={1200}
                  height={800}
                  className="w-full h-auto block select-none"
                  unoptimized
                />
              ) : isPdf && doc.dataUrl ? (
                <iframe
                  src={pdfUrlNoPrint}
                  title={doc.name}
                  className={`w-full h-[75vh] min-h-[500px] border-0 rounded-xl transition-all ${
                    docMode === 'write' ? 'pointer-events-none select-none' : 'pointer-events-auto'
                  }`}
                />
              ) : isPresentation ? (
                <div className="p-10 min-h-[500px] flex flex-col justify-between select-none">
                  <div>
                    <div className="flex items-center justify-between mb-8 opacity-50">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">{doc.name}</span>
                      <span className="text-[10px] font-mono">Slide {currentSlideIndex + 1}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-lg text-slate-800 dark:text-slate-100 leading-relaxed">
                      {activeSlideText}
                    </pre>
                  </div>
                  <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    EduBoard Presentation Engine
                  </div>
                </div>
              ) : (
                <div className="p-10 min-h-[500px] select-none">
                  <pre className="whitespace-pre-wrap font-sans text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                    {doc.textContent || '[Document Loaded Successfully]'}
                  </pre>
                </div>
              )}
            </div>

            {/* The Drawing Overlay (Canvas should be inserted here) */}
            <div className={`absolute inset-0 z-20 ${docMode === 'write' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DocumentViewer.displayName = 'DocumentViewer';
