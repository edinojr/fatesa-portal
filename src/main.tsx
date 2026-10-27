import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { pdfjs } from 'react-pdf'

// Auto-recuperação caso um bundle/css antigo seja requisitado após novo deploy
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Nova versão detectada no servidor. Recarregando...', event);
  window.location.reload();
});

// Configurando o worker do PDF.js (v4.4.168+ requer .mjs para funcionar corretamente em todos os ambientes)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.mjs';



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
