import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseFlexibleDate } from '../services/academicService';

// Definição da interface autoTable no jsPDF para evitar erros de typescript
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

/**
 * Função utilitária para converter uma imagem local (na pasta public) em Data URL (base64)
 * Usa fetch direto + FileReader primariamente para evitar problemas de CORS/Tainted Canvas,
 * com fallback para Image + Canvas caso necessário.
 */
const getBase64ImageFromURL = async (url: string): Promise<string> => {
  const targetUrl = (typeof window !== 'undefined' && url.startsWith('/') && !url.startsWith('//'))
    ? `${window.location.origin}${url}`
    : url;

  // 1. Tenta carregar o arquivo diretamente como Blob e converter via FileReader
  try {
    const response = await fetch(targetUrl);
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Falha ao converter imagem para base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn(`Fetch da imagem (${targetUrl}) falhou, tentando fallback:`, err);
  }

  // 2. Fallback via Image / Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Só usa crossOrigin para URLs externas de outros domínios
    if (typeof window !== 'undefined' && targetUrl.startsWith('http') && !targetUrl.startsWith(window.location.origin)) {
      img.setAttribute("crossOrigin", "anonymous");
    }
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = error => reject(error);
    img.src = targetUrl;
  });
};

/**
 * Gera o Histórico em PDF no formato exato solicitado.
 */
export const generateHistoricoPDF = async (
  alunoData: { nome: string; nucleo: string; matricula?: string; dataMatricula?: string; status?: string },
  materias: { nome: string; media: number | string }[],
  cursoNome: string = 'Básico'
) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // 1. Tentar adicionar o logo
  try {
    const logoData = await getBase64ImageFromURL('/logo.png');
    doc.addImage(logoData, 'PNG', 20, 10, 30, 20); // x, y, width, height
  } catch (e) {
    console.warn("Logo not found or couldn't be loaded.");
  }

  // 2. Cabeçalho Principal
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FATESA - CASA DO SABER', 105, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('CURSOS DE TEOLOGIA', 105, 23, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Igreja Evangélica Assembleia de Deus de Santo André', 105, 28, { align: 'center' });

  // 3. Título e Data
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Histórico - Curso ${cursoNome}`, 105, 45, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Santo André, ${dateStr}`, 190, 52, { align: 'right' });

  // 4. Informações do Aluno
  const startY = 65;
  const lineSpacing = 7;
  doc.setFontSize(12);
  
  doc.setFont('helvetica', 'italic');
  doc.text('Núcleo:', 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 200);
  doc.text(alunoData.nucleo || 'SEDE', 45, startY);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'italic');
  doc.text('Nome do aluno (a):', 20, startY + lineSpacing);
  doc.setFont('helvetica', 'normal');
  doc.text(alunoData.nome, 65, startY + lineSpacing);

  doc.setFont('helvetica', 'italic');
  doc.text('Registro de Matrícula:', 20, startY + 2 * lineSpacing);
  doc.setFont('helvetica', 'normal');
  doc.text(alunoData.matricula || '__________________', 70, startY + 2 * lineSpacing);

  doc.setFont('helvetica', 'italic');
  doc.text('Data matricula:', 20, startY + 3 * lineSpacing);
  doc.setFont('helvetica', 'normal');
  doc.text(alunoData.dataMatricula || '____/____/______', 55, startY + 3 * lineSpacing);
  
  doc.setFont('helvetica', 'italic');
  doc.text('Status:', 90, startY + 3 * lineSpacing);
  doc.setFont('helvetica', 'normal');
  doc.text(alunoData.status || 'Ativo', 110, startY + 3 * lineSpacing);

  // 5. Tabela de Matérias (Dividida em duas colunas, exatamente como o modelo)
  // Preparar os dados dividindo o array ao meio
  const midPoint = Math.ceil(materias.length / 2) || 14; 
  const tableData1 = [];
  const tableData2 = [];
  
  for(let i = 0; i < materias.length; i++){
      const row = [
          (i + 1).toString(),
          materias[i].nome,
          materias[i].media
      ];
      if(i < midPoint){
          tableData1.push(row);
      } else {
          tableData2.push(row);
      }
  }

  while(tableData2.length < tableData1.length) {
      tableData2.push(['', '', '']);
  }

  // Prevenir que jspdf-autotable falhe com arrays vazios
  if (tableData1.length === 0) tableData1.push(['', 'Nenhuma matéria', '']);
  if (tableData2.length === 0) tableData2.push(['', '', '']);

  const tableStyles = {
    theme: 'grid' as const,
    headStyles: { fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const, halign: 'center' as const, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.5 },
    bodyStyles: { textColor: [0, 0, 0] as [number, number, number], lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.5 },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 15 },
      1: { cellWidth: 50 },
      2: { halign: 'center' as const, cellWidth: 15, textColor: [0, 0, 200] as [number, number, number], fontStyle: 'bold' as const } // Nota azul e em negrito como no modelo
    }
  };

  const startYTable = startY + 3 * lineSpacing + 15;

  // Renderizar primeira metade
  autoTable(doc, {
    startY: startYTable,
    margin: { left: 20 },
    tableWidth: 80,
    head: [['Nº', 'Matéria', 'Média']],
    body: tableData1,
    ...tableStyles
  });

  // Renderizar segunda metade ao lado
  autoTable(doc, {
    startY: startYTable,
    margin: { left: 110 },
    tableWidth: 80,
    head: [['Nº', 'Matéria', 'Média']],
    body: tableData2,
    ...tableStyles
  });

  // 6. Rodapé (Total de horas e Assinatura)
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const horasPorMateria = 10;
  const totalHoras = materias.length * horasPorMateria;
  
  doc.text(`TOTAL HORAS POR MATÉRIA = ${horasPorMateria}`, 20, finalY);
  doc.text(`TOTAL DE HORAS DO CURSO = ${totalHoras}`, 110, finalY);

  // Assinatura
  try {
    const assinaturaData = await getBase64ImageFromURL('/assinatura.png');
    // Adiciona a assinatura centralizada e com a proporção correta (+50% tamanho)
    // Largura: 36, Altura: 42. Posição X centralizada: 105 - (36/2) = 87
    // Descendo 20 unidades (2cm) -> finalY + 8
    doc.addImage(assinaturaData, 'PNG', 87, finalY + 8, 36, 42);
  } catch (e) {
    console.warn("Imagem de assinatura não encontrada.");
  }
  
  doc.line(70, finalY + 50, 140, finalY + 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria - Aparecida Panisso', 105, finalY + 55, { align: 'center' });

  // Baixar o arquivo
  doc.save(`Historico_${alunoData.nome.replace(/\s+/g, '_')}.pdf`);
};

let cachedCormorantRegularBase64: string | null = null;
let cachedCormorantBoldBase64: string | null = null;
let cachedCormorantItalicBase64: string | null = null;

/**
 * Utilitário para converter arquivos binários (ex: fontes TrueType) em base64 puro
 */
const getBinaryBase64FromURL = async (url: string): Promise<string> => {
  const targetUrl = (typeof window !== 'undefined' && url.startsWith('/') && !url.startsWith('//'))
    ? `${window.location.origin}${url}`
    : url;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao carregar ${targetUrl}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.includes(',') ? reader.result.split(',')[1] : reader.result;
        resolve(base64);
      } else {
        reject(new Error('Falha ao converter binário para base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Registra e assegura o carregamento da família Cormorant Garamond no jsPDF
 */
const ensureCormorantFonts = async (doc: jsPDF): Promise<boolean> => {
  try {
    if (!cachedCormorantRegularBase64) {
      cachedCormorantRegularBase64 = await getBinaryBase64FromURL('/fonts/CormorantGaramond-Regular.ttf');
    }
    if (cachedCormorantRegularBase64) {
      doc.addFileToVFS('CormorantGaramond-Regular.ttf', cachedCormorantRegularBase64);
      doc.addFont('CormorantGaramond-Regular.ttf', 'CormorantGaramond', 'normal');
    }

    if (!cachedCormorantBoldBase64) {
      try {
        cachedCormorantBoldBase64 = await getBinaryBase64FromURL('/fonts/CormorantGaramond-Bold.ttf');
      } catch {}
    }
    if (cachedCormorantBoldBase64) {
      doc.addFileToVFS('CormorantGaramond-Bold.ttf', cachedCormorantBoldBase64);
      doc.addFont('CormorantGaramond-Bold.ttf', 'CormorantGaramond', 'bold');
    }

    if (!cachedCormorantItalicBase64) {
      try {
        cachedCormorantItalicBase64 = await getBinaryBase64FromURL('/fonts/CormorantGaramond-Italic.ttf');
      } catch {}
    }
    if (cachedCormorantItalicBase64) {
      doc.addFileToVFS('CormorantGaramond-Italic.ttf', cachedCormorantItalicBase64);
      doc.addFont('CormorantGaramond-Italic.ttf', 'CormorantGaramond', 'italic');
    }

    return !!cachedCormorantRegularBase64;
  } catch (err) {
    console.warn('[pdfGenerator] Falha ao registrar fonte Cormorant Garamond no jsPDF:', err);
    return false;
  }
};

/**
 * Formata a data de conclusão para o rodapé do certificado no padrão oficial de Santo André
 */
export const formatDataConclusaoCertificado = (dateInput?: string | Date | null): string => {
  if (!dateInput) {
    const today = new Date();
    const str = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Santo André, ${str}`;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.toLowerCase().startsWith('santo andré') || trimmed.toLowerCase().startsWith('santo andre')) {
      return trimmed;
    }
  }

  const parsed = parseFlexibleDate(dateInput);
  if (parsed && !isNaN(parsed.getTime())) {
    const str = parsed.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Santo André, ${str}`;
  }

  return `Santo André, ${String(dateInput)}`;
};

/**
 * Gera o Certificado em PDF usando a imagem de fundo oficial e fontes tipográficas clássicas
 */
export const generateCertificadoPDF = async (
  alunoNome: string,
  cursoNivel: 'basico' | 'medio' = 'basico',
  dataConclusao?: string | Date | null
) => {
  // A4 Landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Carrega a fonte oficial Cormorant Garamond
  const hasCormorant = await ensureCormorantFonts(doc);
  const fontName = hasCormorant ? 'CormorantGaramond' : 'times';

  try {
    // Carrega a imagem de fundo correta baseada no nível do curso
    const imgPath = cursoNivel === 'medio' ? '/certificado_medio.png' : '/certificado_basico.png';
    const bgData = await getBase64ImageFromURL(imgPath);
    
    // Adiciona a imagem cobrindo toda a página A4 Paisagem
    doc.addImage(bgData, 'PNG', 0, 0, width, height);
  } catch (e) {
    console.warn("Background image not found. The certificate might be blank.");
  }

  // Ajuste fino para alinhar ao centro da área visual útil (considerando a faixa lateral direita)
  const centerX = width / 2 - 20; 

  // 1. Título "CERTIFICADO"
  doc.setTextColor(24, 38, 86); // Azul escuro
  doc.setFontSize(40);
  doc.setFont('times', 'bold');
  doc.text('C E R T I F I C A D O', centerX, 45, { align: 'center' });

  // 2. Nível do Curso
  const cursoTexto = cursoNivel === 'medio' ? 'TEOLOGIA MÉDIO' : 'TEOLOGIA BÁSICO';
  doc.setTextColor(184, 134, 11); // Dourado
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.text(cursoTexto, centerX, 65, { align: 'center' });

  // 3. Subtítulo "CERTIFICADO DE CONCLUSÃO"
  doc.setTextColor(80, 80, 80); // Cinza escuro
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.text('CERTIFICADO DE CONCLUSÃO', centerX, 80, { align: 'center' });

  // 4. Nome do Aluno
  // Especificação: Deve estar entre aspas e utilizar a fonte Cormorant Garamond 25 como padrão Sempre.
  const nomeLimpo = (alunoNome || '').replace(/^["']|["']$/g, '').trim();
  const nomeTexto = `"${nomeLimpo}"`;

  // Fonte Cormorant Garamond em negrito/bold com tamanho 25 padrão Sempre
  const baseFontSize = 25;
  let fontSize = baseFontSize;
  doc.setFont(fontName, 'bold');
  doc.setFontSize(fontSize);

  // Margem de segurança para nomes excepcionalmente longos, garantindo que nunca
  // ultrapassem a largura central útil (~160mm) e se mantenham perfeitamente centralizados
  const maxLarguraPermitida = 160;
  const larguraAtual = doc.getTextWidth(nomeTexto);
  if (larguraAtual > maxLarguraPermitida) {
    fontSize = Math.floor((fontSize * maxLarguraPermitida) / larguraAtual);
    doc.setFontSize(fontSize);
  }

  doc.setTextColor(24, 38, 86); // Azul escuro
  doc.text(nomeTexto, centerX, 100, { align: 'center' });

  // 5. Parágrafo de texto
  doc.setTextColor(80, 80, 80); // Cinza escuro
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text('PELO CONHECIMENTO ADQUIRIDO, CONSISTÊNCIA,', centerX, 120, { align: 'center' });
  doc.text('DEDICAÇÃO, RESPEITO AOS PRECEITOS E', centerX, 128, { align: 'center' });
  doc.text('DIRETRIZES DA PALAVRA DE DEUS.', centerX, 136, { align: 'center' });

  // 6. Data de Conclusão ao centro próximo ao rodapé
  // Emite com a data da última prova realizada pelo aluno ou data do pedido
  const textoData = formatDataConclusaoCertificado(dataConclusao);
  doc.setTextColor(80, 80, 80); // Cinza escuro elegante
  doc.setFont(fontName, 'normal');
  doc.setFontSize(26); // Aumentado em 2x (13pt -> 26pt) conforme especificação
  doc.text(textoData, centerX, 194, { align: 'center' });

  // Baixar com nome de arquivo sanitizado
  const safeFileName = (alunoNome || 'Aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
  doc.save(`Certificado_${cursoNivel}_${safeFileName}.pdf`);
};
