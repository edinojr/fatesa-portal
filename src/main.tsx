import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { pdfjs } from 'react-pdf'

// Pre-configure PDF.js worker from a stable CDN
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
