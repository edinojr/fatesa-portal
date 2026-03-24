import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { pdfjs } from 'react-pdf'

// Pre-configure PDF.js worker using Vite's URL pattern (compatible with Vercel/Production)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
