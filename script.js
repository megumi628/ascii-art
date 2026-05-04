const upload   = document.getElementById('upload');
const uploadZone = document.getElementById('uploadZone');
const cameraBtn = document.getElementById('cameraBtn');
const widthSlider = document.getElementById('width');
const widthDisplay = document.getElementById('widthDisplay');
const charsetInput = document.getElementById('charset');
const colorCheck = document.getElementById('color');
const invertCheck = document.getElementById('invert');
const output   = document.getElementById('output');
const outputMeta = document.getElementById('outputMeta');
const placeholder = document.getElementById('placeholder');
const toast    = document.getElementById('toast');
const video    = document.getElementById('video');
const canvas   = document.getElementById('canvas');
const ctx      = canvas.getContext('2d');

let lastSource = null;
let cameraInterval = null;
let stream = null;

widthSlider.addEventListener('input', () => {
  widthDisplay.textContent = widthSlider.value;
  if (lastSource) render(lastSource);
});

[charsetInput, colorCheck, invertCheck].forEach(el => {
  el.addEventListener('change', () => { if (lastSource) render(lastSource); });
});

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    charsetInput.value = btn.dataset.set;
    if (lastSource) render(lastSource);
  });
});

upload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  stopCamera();
  const img = new Image();
  img.onload = () => { lastSource = img; render(img); };
  img.src = URL.createObjectURL(file);
});

uploadZone.addEventListener('dragover', e => e.preventDefault());
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    stopCamera();
    const img = new Image();
    img.onload = () => { lastSource = img; render(img); };
    img.src = URL.createObjectURL(file);
  }
});

cameraBtn.addEventListener('click', () => {
  if (stream) { stopCamera(); return; }
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = s;
      video.style.display = 'block';
      cameraBtn.textContent = '◉ Stop Camera';
      cameraBtn.classList.add('active');
      video.addEventListener('loadedmetadata', () => {
        lastSource = video;
        cameraInterval = setInterval(() => render(video), 150);
      }, { once: true });
    })
    .catch(() => showToast('Camera access denied'));
});

function stopCamera() {
  if (!stream) return;
  clearInterval(cameraInterval);
  stream.getTracks().forEach(t => t.stop());
  stream = null;
  video.style.display = 'none';
  cameraBtn.textContent = '◉ Use Camera';
  cameraBtn.classList.remove('active');
}

function render(source) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return;

  const cols = parseInt(widthSlider.value);
  const rows = Math.floor(cols * (h / w) * 0.6); 

  canvas.width = cols;
  canvas.height = rows;
  ctx.drawImage(source, 0, 0, cols, rows);

  const pixels = ctx.getImageData(0, 0, cols, rows).data;
  const chars  = charsetInput.value || '@#. ';
  const useColor = colorCheck.checked;
  const invert   = invertCheck.checked;

  let plainText = '';
  let html = '';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let i = (y * cols + x) * 4;
      let r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      if (invert) { r = 255-r; g = 255-g; b = 255-b; }

      const brightness = (r + g + b) / 3;
      const char = chars[Math.floor(brightness / 255 * (chars.length - 1))];

      plainText += char;
      html += useColor ? `<span style="color:rgb(${r},${g},${b})">${char}</span>` : char;
    }
    plainText += '\n';
    html += '\n';
  }

  output.innerHTML = html;
  output._plain = plainText;
  placeholder.classList.add('hidden');
  outputMeta.textContent = `${cols} × ${rows} chars`;
}

document.getElementById('copyBtn').addEventListener('click', () => {
  const text = output._plain || output.innerText;
  if (!text.trim()) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied ✓'));
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = output._plain || output.innerText;
  if (!text.trim()) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = 'ascii-art.txt';
  a.click();
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
