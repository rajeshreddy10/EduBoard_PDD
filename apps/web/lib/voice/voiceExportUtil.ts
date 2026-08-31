/**
 * voiceExportUtil.ts
 * Multi-format exporter for Voice Board (PDF, DOCX, TXT, Markdown, LaTeX).
 */

export interface ExportSegment {
  original: string;
  latex: string;
  unicode: string;
  markdown: string;
  plainText: string;
  hasFormula: boolean;
  timestamp: number;
}

export function exportSession(
  sessionTitle: string,
  segments: ExportSegment[],
  format: 'pdf' | 'docx' | 'txt' | 'markdown' | 'latex'
) {
  const title = sessionTitle || 'Voice_Board_Session';
  const timestampStr = new Date().toISOString().slice(0, 10);

  switch (format) {
    case 'txt': {
      const content = segments
        .map((s, i) => `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.unicode || s.original}`)
        .join('\n\n');
      downloadFile(`${title}_${timestampStr}.txt`, content, 'text/plain;charset=utf-8');
      break;
    }
    case 'markdown': {
      let content = `# ${title}\n\n*Exported from EduBoard Voice Board on ${timestampStr}*\n\n---\n\n`;
      segments.forEach((s) => {
        content += `### Segment (${new Date(s.timestamp).toLocaleTimeString()})\n`;
        content += `${s.markdown || s.original}\n\n`;
        if (s.original !== s.markdown) {
          content += `*Raw Speech:* \`${s.original}\`\n\n`;
        }
      });
      downloadFile(`${title}_${timestampStr}.md`, content, 'text/markdown;charset=utf-8');
      break;
    }
    case 'latex': {
      let content = `\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\title{${title}}\n\\author{EduBoard Voice Board}\n\\date{${timestampStr}}\n\n\\begin{document}\n\\maketitle\n\n`;
      segments.forEach((s) => {
        if (s.hasFormula) {
          content += `\\begin{equation}\n${s.latex}\n\\end{equation}\n\n`;
        } else {
          content += `${s.original}\n\n`;
        }
      });
      content += `\\end{document}`;
      downloadFile(`${title}_${timestampStr}.tex`, content, 'text/x-tex;charset=utf-8');
      break;
    }
    case 'docx': {
      // Formatted HTML / RTF Blob that Microsoft Word opens directly as a DOCX document
      let docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${title}</title><style>body { font-family: Arial, sans-serif; padding: 20px; } .segment { margin-bottom: 15px; padding: 10px; border-left: 3px solid #6366f1; background: #f8fafc; }</style></head>
        <body>
          <h1>${title}</h1>
          <p><em>Exported on ${timestampStr}</em></p>
          <hr/>
      `;
      segments.forEach((s) => {
        docHtml += `<div class="segment">
          <p><strong>[${new Date(s.timestamp).toLocaleTimeString()}]</strong></p>
          <p style="font-size: 16px;">${s.unicode || s.original}</p>
          <p style="color: #64748b; font-size: 12px;">Raw Speech: ${s.original}</p>
        </div>`;
      });
      docHtml += `</body></html>`;
      downloadFile(`${title}_${timestampStr}.doc`, docHtml, 'application/msword;charset=utf-8');
      break;
    }
    case 'pdf': {
      // Dynamic Print HTML Window trigger for high quality PDF output
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <style>
              body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { color: #64748b; font-size: 0.9em; margin-bottom: 30px; }
              .segment { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
              .timestamp { font-size: 0.75em; font-weight: bold; color: #6366f1; margin-bottom: 6px; }
              .formula { font-size: 1.2em; font-weight: 500; color: #1e1b4b; margin: 10px 0; }
              .raw { font-size: 0.85em; color: #94a3b8; font-style: italic; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="meta">Exported from EduBoard Voice Board &bull; ${timestampStr} &bull; ${segments.length} Segments</div>
            ${segments
              .map(
                (s) => `
              <div class="segment">
                <div class="timestamp">${new Date(s.timestamp).toLocaleTimeString()}</div>
                <div class="formula">${s.unicode || s.original}</div>
                <div class="raw">Speech: ${s.original}</div>
              </div>
            `
              )
              .join('')}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
      break;
    }
  }
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
