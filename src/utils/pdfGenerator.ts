import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Definição da interface autoTable no jsPDF para evitar erros de typescript
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

/**
 * Função utilitária para converter uma imagem local (na pasta public) em Data URL (base64)
 */
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      var canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      var dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
    img.src = url;
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
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' as const, lineColor: [0, 0, 0], lineWidth: 0.5 },
    bodyStyles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 15 },
      1: { cellWidth: 50 },
      2: { halign: 'center' as const, cellWidth: 15, textColor: [0, 0, 200], fontStyle: 'bold' } // Nota azul e em negrito como no modelo
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
  doc.line(70, finalY + 30, 140, finalY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria - Aparecida Panisso', 105, finalY + 35, { align: 'center' });

  // Baixar o arquivo
  doc.save(`Historico_${alunoData.nome.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Gera o Certificado em PDF usando a imagem de fundo enviada pelo usuário
 */
export const generateCertificadoPDF = async (
  alunoNome: string,
  cursoNivel: 'basico' | 'medio' = 'basico'
) => {
  // A4 Landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  try {
    // Carrega a imagem de fundo correta baseada no nível do curso
    const imgPath = cursoNivel === 'medio' ? '/certificado_medio.png' : '/certificado_basico.png';
    const bgData = await getBase64ImageFromURL(imgPath);
    
    // Adiciona a imagem cobrindo toda a página A4 Paisagem
    doc.addImage(bgData, 'PNG', 0, 0, width, height);
  } catch (e) {
    console.warn("Background image not found. The certificate might be blank.");
  }

  // Apenas o nome do aluno é dinâmico agora
  const centerX = width / 2 - 20; // Ajuste fino para alinhar ao centro da área visual (considerando a faixa lateral)
  
  doc.setTextColor(40, 50, 100); // Azul escuro
  doc.setFontSize(36); // Tamanho grande para o nome
  doc.setFont('times', 'italic');
  
  // Imprime o nome do aluno exatamente na posição onde ficava "José Barbosa"
  doc.text(alunoNome, centerX, 115, { align: 'center' });

  // Baixar
  doc.save(`Certificado_${cursoNivel}_${alunoNome.replace(/\s+/g, '_')}.pdf`);
};
