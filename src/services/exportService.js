const fs = require('fs');
const path = require('path');

let createCanvas, loadImage, PDFDocument;
try { const c = require('canvas'); createCanvas = c.createCanvas; loadImage = c.loadImage; } catch {}
try { PDFDocument = require('pdfkit'); } catch {}

const EXPORT_DIR = path.join(__dirname, '..', '..', 'exports');

async function exportWhiteboard(whiteboard, shapes, format, options, filePath) {
  switch (format) {
    case 'png': return exportPNG(whiteboard, shapes, options, filePath);
    case 'svg': return exportSVG(whiteboard, shapes, options, filePath);
    case 'pdf': return exportPDF(whiteboard, shapes, options, filePath);
    case 'json': return exportJSON(whiteboard, shapes, filePath);
    case 'html': return exportHTML(whiteboard, shapes, options, filePath);
    case 'markdown': return exportMarkdown(whiteboard, shapes, filePath);
    default: throw new Error(`Unsupported format: ${format}`);
  }
}

async function exportPNG(whiteboard, shapes, options, filePath) {
  const width = options?.width || whiteboard.width || 1920;
  const height = options?.height || whiteboard.height || 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = whiteboard.background_color || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const sortedShapes = [...shapes].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  for (const shape of sortedShapes) {
    await renderShape(ctx, shape);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
}

async function exportSVG(whiteboard, shapes, options, filePath) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${whiteboard.width || 1920}" height="${whiteboard.height || 1080}" viewBox="0 0 ${whiteboard.width || 1920} ${whiteboard.height || 1080}">`;
  svg += `<rect width="100%" height="100%" fill="${whiteboard.background_color || '#ffffff'}" />`;

  const sortedShapes = [...shapes].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  for (const shape of sortedShapes) {
    svg += renderShapeSVG(shape);
  }
  svg += '</svg>';
  fs.writeFileSync(filePath, svg);
}

async function exportPDF(whiteboard, shapes, options, filePath) {
  const doc = new PDFDocument({ size: [whiteboard.width || 1920, whiteboard.height || 1080] });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const width = options?.width || whiteboard.width || 1920;
  const height = options?.height || whiteboard.height || 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = whiteboard.background_color || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const sortedShapes = [...shapes].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  for (const shape of sortedShapes) {
    await renderShape(ctx, shape);
  }

  const imgBuffer = canvas.toBuffer('image/png');
  doc.image(imgBuffer, 0, 0, { width: width, height: height });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function exportJSON(whiteboard, shapes, filePath) {
  const data = {
    version: '2.0',
    whiteboard: {
      title: whiteboard.title,
      description: whiteboard.description,
      background_color: whiteboard.background_color,
      width: whiteboard.width,
      height: whiteboard.height,
      created_at: whiteboard.created_at
    },
    shapes: shapes.map(s => ({
      id: s.id, type: s.type, data: s.data, style: s.style,
      z_index: s.z_index, opacity: s.opacity, rotation: s.rotation
    })),
    exported_at: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function exportHTML(whiteboard, shapes, options, filePath) {
  const sortedShapes = [...shapes].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  let shapesHtml = '';
  for (const s of sortedShapes) {
    const style = s.style || {};
    const data = s.data || {};
    const pos = `left:${data.x || 0}px;top:${data.y || 0}px;`;
    const dim = data.width ? `width:${data.width}px;height:${data.height || 100}px;` : '';
    const bg = style.fillColor ? `background:${style.fillColor};` : '';
    const border = style.strokeColor ? `border:${style.strokeWidth || 2}px solid ${style.strokeColor};` : '';
    const color = style.fontColor || style.fillColor ? `color:${style.fontColor || '#000'};` : '';
    const font = style.fontSize ? `font-size:${style.fontSize}px;` : '';
    const transform = s.rotation ? `transform:rotate(${s.rotation}deg);` : '';
    const opacity = s.opacity !== undefined ? `opacity:${s.opacity};` : '';

    if (s.type === 'text') {
      shapesHtml += `<div style="position:absolute;${pos}${color}${font}${transform}${opacity}">${data.text || ''}</div>`;
    } else if (s.type === 'image') {
      shapesHtml += `<img src="${data.src || ''}" style="position:absolute;${pos}${dim}${transform}${opacity}object-fit:contain" />`;
    } else if (s.type === 'sticky_note') {
      shapesHtml += `<div style="position:absolute;${pos}${dim}background:#fff3cd;border:1px solid #ffeeba;padding:8px;border-radius:4px;${transform}${opacity}">${data.text || ''}</div>`;
    } else {
      shapesHtml += `<div style="position:absolute;${pos}${dim}${bg}${border}${transform}${opacity}border-radius:${s.type === 'circle' || s.type === 'ellipse' ? '50%' : '0'}"></div>`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${whiteboard.title || 'EduBoard Export'}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:${whiteboard.background_color || '#fff'}}
.board{position:relative;width:${whiteboard.width || 1920}px;height:${whiteboard.height || 1080}px;overflow:hidden}</style></head>
<body><div class="board">${shapesHtml}</div></body></html>`;
  fs.writeFileSync(filePath, html);
}

function exportMarkdown(whiteboard, shapes, filePath) {
  let md = `# ${whiteboard.title || 'Untitled Board'}\n\n`;
  if (whiteboard.description) md += `${whiteboard.description}\n\n`;
  md += `> Exported from EduBoard on ${new Date().toISOString().split('T')[0]}\n\n`;

  const textShapes = shapes.filter(s => s.type === 'text' || s.type === 'sticky_note');
  for (const s of textShapes) {
    const text = s.data?.text || '';
    if (s.type === 'sticky_note') md += `> **Note:** ${text}\n\n`;
    else md += `${text}\n\n`;
  }

  const shapesByType = {};
  for (const s of shapes) {
    shapesByType[s.type] = (shapesByType[s.type] || 0) + 1;
  }
  if (Object.keys(shapesByType).length > 0) {
    md += '## Shapes\n\n| Type | Count |\n|------|-------|\n';
    for (const [type, count] of Object.entries(shapesByType)) {
      md += `| ${type} | ${count} |\n`;
    }
  }
  fs.writeFileSync(filePath, md);
}

async function renderShape(ctx, shape) {
  const data = typeof shape.data === 'string' ? JSON.parse(shape.data) : shape.data;
  const style = typeof shape.style === 'string' ? JSON.parse(shape.style) : shape.style || {};

  ctx.save();
  if (shape.opacity !== undefined) ctx.globalAlpha = shape.opacity;
  if (shape.rotation && data.x && data.y) {
    ctx.translate(data.x + (data.width || 100) / 2, data.y + (data.height || 100) / 2);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-(data.x + (data.width || 100) / 2), -(data.y + (data.height || 100) / 2));
  }

  const fillColor = style.fillColor || 'transparent';
  const strokeColor = style.strokeColor || '#000000';
  const strokeWidth = style.strokeWidth || 2;
  const x = data.x || 0;
  const y = data.y || 0;
  const w = data.width || 100;
  const h = data.height || 100;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  switch (shape.type) {
    case 'rectangle':
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(x + w / 2, y + w / 2, w / 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    case 'line':
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.stroke();
      if (shape.type === 'arrow') {
        const angle = Math.atan2(y + h - y, x + w - x);
        ctx.beginPath();
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - 15, y + h - 10);
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - 10, y + h - 15);
        ctx.stroke();
      }
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'text':
      ctx.fillStyle = style.fontColor || '#000000';
      ctx.font = `${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
      const lines = (data.text || '').split('\n');
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * (style.fontSize || 24) * 1.2));
      break;
    case 'image':
      try {
        const img = await loadImage(data.src || data.url || '');
        ctx.drawImage(img, x, y, w, h);
      } catch {}
      break;
    case 'freehand':
      if (data.points && data.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(data.points[0].x, data.points[0].y);
        for (let i = 1; i < data.points.length; i++) {
          ctx.lineTo(data.points[i].x, data.points[i].y);
        }
        ctx.strokeStyle = style.strokeColor || '#000';
        ctx.lineWidth = style.strokeWidth || 3;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
      }
      break;
    default:
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

function renderShapeSVG(shape) {
  const data = typeof shape.data === 'string' ? JSON.parse(shape.data) : shape.data;
  const style = typeof shape.style === 'string' ? JSON.parse(shape.style) : shape.style || {};
  const fill = style.fillColor || 'none';
  const stroke = style.strokeColor || '#000';
  const sw = style.strokeWidth || 2;
  const opacity = shape.opacity !== undefined ? `opacity="${shape.opacity}"` : '';
  const transform = shape.rotation ? `transform="rotate(${shape.rotation} ${(data.x || 0) + (data.width || 100) / 2} ${(data.y || 0) + (data.height || 100) / 2})"` : '';

  switch (shape.type) {
    case 'rectangle':
      return `<rect x="${data.x || 0}" y="${data.y || 0}" width="${data.width || 100}" height="${data.height || 100}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
    case 'circle':
      const r = (data.width || 100) / 2;
      return `<circle cx="${(data.x || 0) + r}" cy="${(data.y || 0) + r}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
    case 'ellipse':
      return `<ellipse cx="${(data.x || 0) + (data.width || 100) / 2}" cy="${(data.y || 0) + (data.height || 100) / 2}" rx="${(data.width || 100) / 2}" ry="${(data.height || 100) / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
    case 'triangle':
      const tx = data.x || 0, ty = data.y || 0, tw = data.width || 100, th = data.height || 100;
      return `<polygon points="${tx + tw / 2},${ty} ${tx + tw},${ty + th} ${tx},${ty + th}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
    case 'line':
    case 'arrow':
      let line = `<line x1="${data.x || 0}" y1="${data.y || 0}" x2="${(data.x || 0) + (data.width || 100)}" y2="${(data.y || 0) + (data.height || 100)}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
      if (shape.type === 'arrow') {
        const angle = Math.atan2((data.height || 100), (data.width || 100));
        const ex = (data.x || 0) + (data.width || 100), ey = (data.y || 0) + (data.height || 100);
        line += `<polygon points="${ex},${ey} ${ex - 15 * Math.cos(angle - 0.5)},${ey - 15 * Math.sin(angle - 0.5)} ${ex - 15 * Math.cos(angle + 0.5)},${ey - 15 * Math.sin(angle + 0.5)}" fill="${stroke}"/>`;
      }
      return line;
    case 'text':
      return `<text x="${data.x || 0}" y="${(data.y || 0) + (style.fontSize || 24)}" font-family="${style.fontFamily || 'Arial'}" font-size="${style.fontSize || 24}" fill="${style.fontColor || '#000'}" ${opacity} ${transform}>${escapeXml((data.text || ''))}</text>`;
    case 'sticky_note':
      return `<rect x="${data.x || 0}" y="${data.y || 0}" width="${data.width || 150}" height="${data.height || 150}" fill="#fff3cd" stroke="#ffeeba" stroke-width="1" rx="4" ${opacity} ${transform}/><text x="${(data.x || 0) + 8}" y="${(data.y || 0) + 20}" font-size="14" fill="#856404" ${opacity}>${escapeXml((data.text || '').slice(0, 100))}</text>`;
    case 'diamond':
      const dx = data.x || 0, dy = data.y || 0, dw = data.width || 100, dh = data.height || 100;
      return `<polygon points="${dx + dw / 2},${dy} ${dx + dw},${dy + dh / 2} ${dx + dw / 2},${dy + dh} ${dx},${dy + dh / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
    case 'freehand':
      if (data.points && data.points.length > 1) {
        let d = `M ${data.points[0].x} ${data.points[0].y}`;
        for (let i = 1; i < data.points.length; i++) d += ` L ${data.points[i].x} ${data.points[i].y}`;
        return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw || 3}" stroke-linecap="round" stroke-linejoin="round" ${opacity} ${transform}/>`;
      }
      return '';
    default:
      return `<rect x="${data.x || 0}" y="${data.y || 0}" width="${data.width || 100}" height="${data.height || 100}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${opacity} ${transform}/>`;
  }
}

function escapeXml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

module.exports = { export: exportWhiteboard, EXPORT_DIR };
