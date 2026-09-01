'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, Upload, FileText, X, Move, Pen } from 'lucide-react';
import { DocumentViewer } from './DocumentViewer';
import { fileImportService, ImportedFileData } from '@/lib/file-import/FileImportService';

interface ReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: ImportedFileData | null;
  onDocumentChange: (doc: ImportedFileData | null) => void;
  className?: string;
}

export const ReferenceDrawer: React.FC<ReferenceDrawerProps> = ({
  isOpen,
  onClose,
  document: doc,
  onDocumentChange,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await fileImportService.importFile(file);
      if (!imported.error) {
        onDocumentChange(imported);
      }
    } catch (err) {
      console.error('Failed to import file into Reference Drawer:', err);
    }
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`w-[30vw] min-w-[320px] max-w-[500px] h-full bg-slate-900 border-r border-white/10 flex flex-col z-40 relative shadow-2xl ${className}`}
        >
          {/* Drawer Header */}
          <div className="h-14 px-4 bg-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white uppercase tracking-wider">Reference Drawer</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Split Screen 30/70</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open File</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Close Reference Drawer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-hidden relative bg-slate-950/50 p-3">
            {doc ? (
              <DocumentViewer
                document={doc}
                docMode="scroll"
                allowWriteToggle={false}
                onClose={() => onDocumentChange(null)}
                className="h-full max-h-none rounded-2xl border-white/10 shadow-none"
              />
            ) : (
              <div className="h-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-900/30">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No Reference File Loaded</h4>
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    Upload a PDF, Question Paper, or Diagram to keep it visible on the left while solving on the whiteboard on the right.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Document
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={fileImportService.getAllAcceptedTypes()}
            onChange={handleFileChange}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
