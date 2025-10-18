const $ = (sel) => document.querySelector(sel);
const previewEl = $('#preview');
const messagesEl = $('#messages');
let currentObjectUrl = null;

function clearPreview() {
  previewEl.innerHTML = '';
  messagesEl.textContent = '';
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function extFromName(name = '') {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function inferTypeFromExtension(name) {
  const ext = extFromName(name);
  const map = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    txt: 'text/plain', md: 'text/markdown', json: 'application/json',
    html: 'text/html', css: 'text/css', js: 'text/javascript'
  };
  return map[ext] || '';
}

function setMessage(msg) {
  messagesEl.textContent = msg || '';
}

function renderText(text, lang = '') {
  const pre = document.createElement('pre');
  if (lang) pre.setAttribute('data-lang', lang);
  pre.textContent = text;
  previewEl.appendChild(pre);
}

function renderMedia(tag, src, attrs = {}) {
  const el = document.createElement(tag);
  el.src = src;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  previewEl.appendChild(el);
}

async function previewBlob(blob, filename = 'file') {
  clearPreview();
  const type = blob.type || inferTypeFromExtension(filename);

  if (!type) {
    // Try sniffing first bytes for text
    const head = await blob.slice(0, 2048).text().catch(() => '');
    const looksText = /[\x09\x0A\x0D\x20-\x7E]/.test(head);
    if (looksText) {
      const text = head + (blob.size > 2048 ? await blob.slice(2048).text().catch(() => '') : '');
      renderText(text);
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  currentObjectUrl = url;

  try {
    if (type.startsWith('image/')) {
      renderMedia('img', url, { alt: filename });
    } else if (type === 'application/pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = filename;
      iframe.style.height = '70vh';
      previewEl.appendChild(iframe);
    } else if (type.startsWith('video/')) {
      renderMedia('video', url, { controls: 'true' });
    } else if (type.startsWith('audio/')) {
      renderMedia('audio', url, { controls: 'true' });
    } else if (type.startsWith('text/') || ['application/json'].includes(type)) {
      const text = await blob.text();
      renderText(text, type.split('/')[1]);
    } else {
      // Fallback: offer download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.textContent = `Download ${filename}`;
      previewEl.appendChild(a);
      setMessage('Preview not supported for this file type. Provided a direct download instead.');
    }
  } catch (err) {
    console.error(err);
    setMessage('Failed to render preview.');
  }
}

$('#urlForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = $('#fileUrl').value.trim();
  if (!url) return;
  clearPreview();
  setMessage('Fetching...');
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const filename = url.split('/').pop()?.split('?')[0] || 'download';
    await previewBlob(blob, filename);
    setMessage('');
  } catch (err) {
    console.error(err);
    setMessage('Unable to fetch due to CORS or network error. Try downloading the file and using local upload.');
  }
});

$('#fileInput').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await previewBlob(file, file.name);
});

$('#downloadPdf').addEventListener('click', async () => {
  const text = $('#textInput').value || '';
  const name = ($('#pdfFilename').value || 'text').replace(/\s+/g, '_');
  if (!text.trim()) { setMessage('Please enter some text first.'); return; }
  setMessage('Generating PDF...');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40; // pts
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 16;

    const lines = doc.splitTextToSize(text, maxWidth);
    let y = margin;
    lines.forEach((line, i) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`${name}.pdf`);
    setMessage('PDF downloaded.');
  } catch (err) {
    console.error(err);
    setMessage('Failed to generate PDF.');
  }
});
