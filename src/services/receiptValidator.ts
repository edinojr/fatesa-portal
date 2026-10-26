import { pdfjs } from 'react-pdf';

export interface ReceiptValidationResult {
  isValid: boolean;
  extractedRecipient: string | null;
  recipientMatches: boolean;
  extractedAmount: number | null;
  amountMatches: boolean;
  expectedAmount: number;
  extractedDate: string | null; // DD/MM/YYYY or YYYY-MM-DD
  dateValid: boolean;
  rawText: string;
  errors: string[];
  warnings: string[];
}

// Configuração padrão do recebedor oficial
export const OFFICIAL_RECEIVER = 'MARIA HELENA PIRANI CAVALLERO';
export const OFFICIAL_RECEIVER_PHONE = '11958259144';
export const OFFICIAL_BANK = 'Banco Santander';

/**
 * Normaliza strings para comparação imune a acentos, pontuação e caixa
 */
export function normalizeReceiptText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')   // Substitui pontuação por espaço
    .replace(/\s+/g, ' ')           // Agrupa múltiplos espaços
    .trim();
}

/**
 * Carrega a biblioteca Tesseract.js sob demanda via CDN para não onerar o bundle inicial
 */
let tesseractPromise: Promise<any> | null = null;
export async function getTesseract(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).Tesseract) return (window as any).Tesseract;
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise((resolve, reject) => {
    // Verifica se já existe a tag de script
    const existingScript = document.querySelector('script[src*="tesseract.min.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).Tesseract));
      existingScript.addEventListener('error', (e) => reject(new Error('Erro ao carregar OCR: ' + e)));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
      } else {
        reject(new Error('Tesseract carregado mas objeto global não encontrado.'));
      }
    };
    script.onerror = (e) => reject(new Error('Não foi possível carregar o motor de OCR Tesseract. ' + e));
    document.head.appendChild(script);
  });

  return tesseractPromise;
}

/**
 * Extrai texto completo de um arquivo PDF usando o pdfjs já integrado ao projeto
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (err: any) {
    console.error('Erro na extração de PDF via pdfjs:', err);
    throw new Error('Falha ao processar arquivo PDF: ' + (err.message || 'formato inválido'));
  }
}

/**
 * Extrai texto de imagem usando OCR (Tesseract.js)
 */
export async function extractTextFromImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  try {
    const Tesseract = await getTesseract();
    if (!Tesseract) {
      throw new Error('Motor de OCR indisponível.');
    }

    const worker = await Tesseract.createWorker('por+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress && typeof m.progress === 'number') {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const result = await worker.recognize(file);
    await worker.terminate();

    return result.data.text || '';
  } catch (err: any) {
    console.error('Erro na extração de Imagem via Tesseract:', err);
    throw new Error('Falha no reconhecimento óptico da imagem: ' + (err.message || 'erro desconhecido'));
  }
}

/**
 * Extrai texto de arquivo (PDF ou Imagem)
 */
export async function extractTextFromFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    onProgress?.(50);
    const text = await extractTextFromPdf(file);
    onProgress?.(100);
    return text;
  } else {
    return await extractTextFromImage(file, onProgress);
  }
}

/**
 * Analisa e valida os dados de um texto de comprovante PIX
 */
export function parseAndValidateReceipt(
  rawText: string,
  options: {
    expectedRecipient?: string;
    expectedAmount?: number;
    expectedPhone?: string;
    nucleoNome?: string;
  } = {}
): ReceiptValidationResult {
  const expectedRecipient = options.expectedRecipient || OFFICIAL_RECEIVER;
  const expectedPhone = (options.expectedPhone || OFFICIAL_RECEIVER_PHONE).replace(/\D/g, '');
  const expectedAmount = options.expectedAmount || 0;

  const normalized = normalizeReceiptText(rawText);
  const errors: string[] = [];
  const warnings: string[] = [];

  // ==========================================
  // 1. VALIDAÇÃO DO RECEBEDOR
  // ==========================================
  const normalizedExpected = normalizeReceiptText(expectedRecipient);
  
  // Verificação exata ou fuzzy:
  // "MARIA HELENA PIRANI CAVALLERO"
  const hasExactName = normalized.includes(normalizedExpected);
  
  // Variações comuns de OCR (ex: CAVALERO com 1 L, falta de sobrenome do meio, etc.)
  const hasMariaHelena = normalized.includes('MARIA HELENA');
  const hasCavallero = normalized.includes('CAVALLERO') || normalized.includes('CAVALERO');
  const hasPirani = normalized.includes('PIRANI');
  const hasPhone = expectedPhone && normalized.replace(/\s+/g, '').includes(expectedPhone);

  const recipientMatches = hasExactName || (hasMariaHelena && (hasCavallero || hasPirani)) || !!hasPhone;
  let extractedRecipient: string | null = null;

  if (recipientMatches) {
    extractedRecipient = expectedRecipient;
  } else {
    // Tenta encontrar o nome próximo de termos como "RECEBEDOR", "DESTINATARIO", "BENEFICIARIO", "NOME"
    const matchTarget = rawText.match(/(?:recebedor|destinat[aá]rio|benefici[aá]rio|para|nome)[:\s]+([^\n\r,]+)/i);
    if (matchTarget && matchTarget[1]) {
      extractedRecipient = matchTarget[1].trim();
    }
    errors.push(`Nome do favorecido não corresponde a ${expectedRecipient}.`);
  }

  // ==========================================
  // 2. VALIDAÇÃO DA DATA DE PAGAMENTO
  // ==========================================
  let extractedDate: string | null = null;
  let dateValid = false;

  // Padrão 1: DD/MM/AAAA ou DD/MM/AA
  const dateRegexSlash = /\b([0-3]?[0-9])[\/\.-]([0-1]?[0-9])[\/\.-](20\d{2}|\d{2})\b/g;
  const slashMatches = [...rawText.matchAll(dateRegexSlash)];

  // Padrão 2: "22 de novembro de 2026"
  const dateRegexExtenso = /\b([0-3]?[0-9])\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(20\d{2})\b/gi;
  const extensoMatches = [...rawText.matchAll(dateRegexExtenso)];

  const mesesMap: Record<string, string> = {
    'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'março': '03',
    'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
    'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
  };

  if (slashMatches.length > 0) {
    const first = slashMatches[0];
    const dia = first[1].padStart(2, '0');
    const mes = first[2].padStart(2, '0');
    let ano = first[3];
    if (ano.length === 2) ano = '20' + ano;
    extractedDate = `${dia}/${mes}/${ano}`;
    dateValid = true;
  } else if (extensoMatches.length > 0) {
    const first = extensoMatches[0];
    const dia = first[1].padStart(2, '0');
    const mesNome = first[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mes = mesesMap[mesNome] || '01';
    const ano = first[3];
    extractedDate = `${dia}/${mes}/${ano}`;
    dateValid = true;
  }

  if (!dateValid) {
    // Se não encontrou formato clássico, assume a data de hoje como fallback com alerta
    const today = new Date();
    const dia = String(today.getDate()).padStart(2, '0');
    const mes = String(today.getMonth() + 1).padStart(2, '0');
    const ano = today.getFullYear();
    extractedDate = `${dia}/${mes}/${ano}`;
    warnings.push('Data de pagamento não detectada explicitamente no comprovante.');
    dateValid = true; // Não bloqueia exclusivamente por falha de formatação da data
  }

  // ==========================================
  // 3. VALIDAÇÃO DO VALOR PAGO
  // ==========================================
  let extractedAmount: number | null = null;
  let amountMatches = false;

  // Busca valores em R$ ou após palavras-chave como "Valor", "Valor Pago", "Transferido"
  const amountRegex = /(?:valor(?:\s+pago|\s+da\s+transfer[eê]ncia)?|total|quantia|r\$)[:\s]*r?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2}))/gi;
  const amountMatchesList = [...rawText.matchAll(amountRegex)];

  const candidateAmounts: number[] = [];

  for (const match of amountMatchesList) {
    if (match[1]) {
      const cleanVal = match[1].replace(/\./g, '').replace(',', '.');
      const valNum = parseFloat(cleanVal);
      if (!isNaN(valNum) && valNum > 0) {
        candidateAmounts.push(valNum);
      }
    }
  }

  // Se a regex específica não pegou, procura qualquer "R$ XX,XX"
  if (candidateAmounts.length === 0) {
    const genericMoneyRegex = /r\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2}))/gi;
    const genericMatches = [...rawText.matchAll(genericMoneyRegex)];
    for (const match of genericMatches) {
      if (match[1]) {
        const cleanVal = match[1].replace(/\./g, '').replace(',', '.');
        const valNum = parseFloat(cleanVal);
        if (!isNaN(valNum) && valNum > 0) {
          candidateAmounts.push(valNum);
        }
      }
    }
  }

  if (candidateAmounts.length > 0) {
    // Se houver valor esperado para o núcleo, verifica se um dos valores encontrados é igual ou muito próximo
    if (expectedAmount > 0) {
      const matched = candidateAmounts.find(val => Math.abs(val - expectedAmount) <= 0.05 || val >= expectedAmount);
      if (matched !== undefined) {
        extractedAmount = matched;
        amountMatches = true;
      } else {
        extractedAmount = candidateAmounts[0];
        amountMatches = false;
        errors.push(`Valor encontrado (R$ ${extractedAmount.toFixed(2)}) difere da mensalidade do núcleo ${options.nucleoNome ? `(${options.nucleoNome})` : ''} de R$ ${expectedAmount.toFixed(2)}.`);
      }
    } else {
      // Nenhum valor específico configurado no núcleo ainda (qualquer valor positivo é válido)
      extractedAmount = candidateAmounts[0];
      amountMatches = true;
    }
  } else {
    if (expectedAmount > 0) {
      errors.push(`Valor pago não pôde ser identificado. Esperado: R$ ${expectedAmount.toFixed(2)}.`);
    } else {
      warnings.push('Valor monetário não identificado com clareza no texto.');
      amountMatches = true; // Se o núcleo é 0 ou aberto
    }
  }

  // ==========================================
  // 4. RESULTADO GERAL DA VALIDAÇÃO
  // ==========================================
  // Para ser válido:
  // - O recebedor deve corresponder (MARIA HELENA PIRANI CAVALLERO)
  // - A data deve ser reconhecida
  // - O valor deve ser compatível com o núcleo (ou positivo)
  const isValid = recipientMatches && dateValid && (expectedAmount > 0 ? amountMatches : (extractedAmount !== null && extractedAmount > 0));

  return {
    isValid,
    extractedRecipient,
    recipientMatches,
    extractedAmount,
    amountMatches,
    expectedAmount,
    extractedDate,
    dateValid,
    rawText,
    errors,
    warnings
  };
}
