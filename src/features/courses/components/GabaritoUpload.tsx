import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface GabaritoUploadProps {
  selectedBook: any;
  fetchLessons: () => void;
  showToast: (msg: string) => void;
}

function cleanText(text: string) {
  return text.replace(/^\d+\.\s*\d+\.\s*/, '').replace(/^\d+\.\s*/, '').trim();
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseGabaritoHtml(html: string) {
  const questions: any[] = [];

  // V/F: look for questions with checked radio buttons
  const questionBlocks = html.split(/<div class="question">/g).slice(1);
  for (const block of questionBlocks) {
    const qTextMatch = block.match(/<div class="q-text">([\s\S]*?)<\/div>/);
    if (!qTextMatch) continue;
    const text = cleanText(stripHtml(qTextMatch[1]));

    // Check if this is a V/F question (has radio buttons with name starting with "tf-")
    const isTF = block.includes('name="tf-');
    if (isTF) {
      const checkedMatch = block.match(/<input[^>]*checked[^>]*value="([VF])"[^>]*>/i) ||
                          block.match(/<input[^>]*value="([VF])"[^>]*checked[^>]*>/i);
      if (checkedMatch && text) {
        questions.push({ type: 'true_false', text, isTrue: checkedMatch[1] === 'V' });
      }
      continue;
    }

    // Check if this is a Multiple Choice question (has radio buttons with name starting with "lesson-")
    const isMC = block.includes('name="lesson-');
    if (isMC) {
      const optionMatches = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
      const options: string[] = [];
      let correctIdx = 0;
      for (let i = 0; i < optionMatches.length; i++) {
        const optHtml = optionMatches[i][1];
        const spanMatch = optHtml.match(/<span>([\s\S]*?)<\/span>/);
        const optText = cleanText(stripHtml(spanMatch ? spanMatch[1] : optHtml));
        if (optText) {
          options.push(optText);
          if (optHtml.includes('checked')) correctIdx = options.length - 1;
        }
      }
      if (text && options.length >= 2) {
        questions.push({ type: 'multiple_choice', text, options, correct: correctIdx });
      }
    }
  }

  // Matching
  const matchingSectionRegex = /<h3[^>]*>.*?(Enumere|coluna|relacione).*?<\/h3>([\s\S]*?)(?=<h3|$)/gi;
  const matchingSection = matchingSectionRegex.exec(html);
  if (matchingSection) {
    const sectionHtml = matchingSection[2];
    const colunaAMatch = sectionHtml.match(/Coluna A<\/h4>([\s\S]*?)(?=Coluna B)/i);
    const colunaBMatch = sectionHtml.match(/Coluna B<\/h4>([\s\S]*?)$/i);
    if (colunaAMatch && colunaBMatch) {
      const colunaA: Record<number, string> = {};
      const aItems = [...colunaAMatch[1].matchAll(/<strong>(\d+)-<\/strong>\s*([\s\S]*?)(?=<\/li>|<div)/g)];
      for (const item of aItems) {
        const num = parseInt(item[1]);
        const text = cleanText(stripHtml(item[2]));
        if (num > 0 && text) colunaA[num] = text;
      }

    // Parse Coluna B: extract the text and the selected option value for each item
    const bLiRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const bParsed: { selectedA: number; text: string }[] = [];
    let bMatch;
    while ((bMatch = bLiRegex.exec(colunaBMatch[1])) !== null) {
      const liHtml = bMatch[1];
      const selectMatch = liHtml.match(/<select[\s\S]*?>([\s\S]*?)<\/select>/i);
      if (!selectMatch) continue;
      const optionsHtml = selectMatch[1];
      const selectedMatch = optionsHtml.match(/<option[^>]*value="(\d+)"[^>]*selected[^>]*>/i) ||
                            optionsHtml.match(/<option[^>]*selected[^>]*value="(\d+)"[^>]*>/i);
      if (!selectedMatch) continue;
      const aNum = parseInt(selectedMatch[1]);
      
      // Find the label: it's usually in a div after the select's parent div
      // Or just the remaining text in the li that isn't the select
      const labelHtml = liHtml.replace(/<div[^>]*>.*?<\/select>.*?<\/div>/i, '').trim();
      const rightText = cleanText(stripHtml(labelHtml));
      if (rightText) bParsed.push({ selectedA: aNum, text: rightText });
    }


      // Build pairs in Coluna A order: for each A item, find the B item that matches it
      const pairs: { left: string; right: string }[] = [];
      const sortedANums = Object.keys(colunaA).map(Number).sort((a, b) => a - b);
      for (const aNum of sortedANums) {
        const bItem = bParsed.find(b => b.selectedA === aNum);
        if (bItem) {
          pairs.push({ left: colunaA[aNum], right: bItem.text });
        }
      }

      if (pairs.length > 0) {
        questions.push({ type: 'matching', text: 'Relacione as colunas abaixo:', matchingPairs: pairs });
      }
    }
  }

  return questions;
}

export default function GabaritoUpload({ selectedBook, fetchLessons, showToast }: GabaritoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadedCount(0);

    try {
      // Fetch exercises for this module
      const { data: exercicios, error: fetchErr } = await supabase
        .from('aulas')
        .select('id, titulo, ordem')
        .eq('livro_id', selectedBook.id)
        .eq('tipo', 'atividade')
        .order('ordem');

      if (fetchErr || !exercicios) {
        showToast('Erro ao buscar exercícios: ' + (fetchErr?.message || 'unknown'));
        setUploading(false);
        return;
      }

      let updated = 0;
      let errors = 0;

      for (const file of Array.from(files)) {
        // Extract lesson number from filename (e.g., "01_licao_01.html" or "licao_01.html")
        const lessonMatch = file.name.match(/(?:(\d+)_)?li[çc][aã]o[_\s]*(\d+)\.html/i) || 
                            file.name.match(/(?:(\d+)_)?licao[_\s]*(\d+)\.html/i);
        if (!lessonMatch) {
          errors++;
          continue;
        }

        const lessonNum = parseInt(lessonMatch[lessonMatch.length - 1]);

        // Find matching exercise - try multiple title patterns
        const exercise = exercicios.find(ex => {
          const titulo = (ex.titulo || '').toLowerCase();
          // Pattern 1: "licao_01", "licao 01", "lição 01", "licão 01"
          const lMatch = titulo.match(/li[çc][aã]o[_\s]*(\d+)/i) || titulo.match(/licao[_\s]*(\d+)/i);
          if (lMatch && parseInt(lMatch[1]) === lessonNum) return true;
          // Pattern 2: "atividade_01", "atividade 01", "exercicio 01", etc.
          const aMatch = titulo.match(/(?:atividade|exerc[íi]cio)[_\s]*(\d+)/i);
          if (aMatch && parseInt(aMatch[1]) === lessonNum) return true;
          // Pattern 3: exercise ordem matches lesson number
          if (ex.ordem === lessonNum) return true;
          return false;
        });


        if (!exercise) {
          errors++;
          continue;
        }

        // Read file
        const html = await file.text();
        const questions = parseGabaritoHtml(html);

        if (questions.length === 0) {
          errors++;
          continue;
        }

        // Update exercise
        const { error: updateErr } = await supabase
          .from('aulas')
          .update({ questionario: questions })
          .eq('id', exercise.id);

        if (updateErr) {
          errors++;
        } else {
          updated++;
          setUploadedCount(updated);
        }
      }

      showToast(`Gabaritos: ${updated} atualizados, ${errors} erros`);
      fetchLessons();
    } catch (err: any) {
      showToast('Erro ao processar gabaritos: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <label
      className="btn btn-outline"
      style={{
        width: 'auto',
        cursor: 'pointer',
        fontSize: '0.75rem',
        padding: '0.4rem 0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: '#3b82f6'
      }}
      title="Envia múltiplos HTMLs de gabarito (com respostas marcadas) e atualiza automaticamente os exercícios."
    >
      {uploading ? (
        <Loader2 size={14} className="spinner" />
      ) : uploadedCount > 0 ? (
        <CheckCircle size={14} />
      ) : (
        <FileText size={14} />
      )}
      {uploading ? `Processando...` : `Upload Gabaritos (${uploadedCount})`}
      <input
        type="file"
        hidden
        accept=".html,.htm"
        multiple
        onChange={handleUpload}
        disabled={uploading}
      />
    </label>
  );
}
