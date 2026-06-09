/**
 * Answer Key (Gabarito) Parser
 * Extracts and manages answer keys from exam HTML content
 */

export interface AnswerKey {
  questionIndex: number;
  questionType: 'true_false' | 'multiple_choice' | 'matching' | 'discursive';
  correctAnswer: any;
  points: number;
}

/**
 * Extract answer key from HTML content
 * Looks for:
 * 1. <div class="gabarito"> or <section class="gabarito">
 * 2. <h2>GABARITO</h2> or <h3>RESPOSTAS</h3>
 * 3. data-correct attributes on elements
 * 4. <mark> or <span class="correct"> elements
 */
export function extractAnswerKey(html: string): { cleanedHtml: string; answerKey: AnswerKey[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  if (!body) return { cleanedHtml: html, answerKey: [] };

  const answerKey: AnswerKey[] = [];
  let gabaritoFound = false;

  // Strategy 1: Look for <div class="gabarito"> or <section class="gabarito">
  const gabaritoDiv = body.querySelector('.gabarito, [class*="gabarito"], #gabarito');
  if (gabaritoDiv) {
    gabaritoFound = true;
    // Extract answers from the gabarito section
    const items = gabaritoDiv.querySelectorAll('li, p, tr, .answer, [data-answer]');
    items.forEach((item, idx) => {
      const text = (item.textContent || '').trim();
      const dataAnswer = item.getAttribute('data-answer') || item.getAttribute('data-correct');
      
      // Try to parse answer from text (e.g., "1. V" or "Questão 1: A")
      const match = text.match(/(\d+)\s*[.:)]\s*([VFVA-D]|VERDADEIRO|FALSO|\d+)/i);
      if (match) {
        const qNum = parseInt(match[1]) - 1;
        const ans = match[2].toUpperCase();
        answerKey.push({
          questionIndex: qNum,
          questionType: ans === 'V' || ans === 'VERDADEIRO' || ans === 'F' || ans === 'FALSO' ? 'true_false' : 'multiple_choice',
          correctAnswer: ans === 'V' || ans === 'VERDADEIRO' ? true : ans === 'F' || ans === 'FALSO' ? false : ans.charCodeAt(0) - 65,
          points: 0.5
        });
      } else if (dataAnswer) {
        answerKey.push({
          questionIndex: idx,
          questionType: 'multiple_choice',
          correctAnswer: dataAnswer,
          points: 0.5
        });
      }
    });
    gabaritoDiv.remove();
  }

  // Strategy 2: Look for GABARITO header
  if (!gabaritoFound) {
    const headings = body.querySelectorAll('h1, h2, h3, h4, h5');
    for (const h of headings) {
      const text = (h.textContent || '').trim().toLowerCase();
      if (text.includes('gabarito') || text.includes('respostas') || text.includes('answer key')) {
        gabaritoFound = true;
        // Remove everything from this heading to the next heading or end
        let el: Element | null = h;
        while (el) {
          const next: Element | null = el.nextElementSibling;
          el.remove();
          el = next;
          if (el && /^H[1-6]$/.test(el.tagName)) break;
        }
        break;
      }
    }
  }

  // Strategy 3: Look for data-correct attributes
  if (!gabaritoFound) {
    const correctElements = body.querySelectorAll('[data-correct], [data-answer], mark.correct, .correct-answer');
    if (correctElements.length > 0) {
      correctElements.forEach((el, idx) => {
        const answer = el.getAttribute('data-correct') || el.getAttribute('data-answer') || el.textContent;
        answerKey.push({
          questionIndex: idx,
          questionType: 'multiple_choice',
          correctAnswer: answer,
          points: 0.5
        });
      });
    }
  }

  return {
    cleanedHtml: body.innerHTML,
    answerKey
  };
}

/**
 * Check if user can see answer key
 */
export function canViewAnswerKey(profile: any): boolean {
  if (!profile) return false;
  const role = profile.tipo || profile.profile_tipo;
  const roles = (profile.caminhos_acesso as string[]) || [];
  return role === 'admin' || role === 'suporte' || role === 'professor' || 
         roles.includes('admin') || roles.includes('professor') || roles.includes('suporte');
}

/**
 * Generate answer key HTML for professors/admins
 */
export function renderAnswerKeyHtml(answerKey: AnswerKey[]): string {
  if (answerKey.length === 0) return '';
  
  let html = '<div class="gabarito-panel" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 1.5rem; margin-top: 1rem;">';
  html += '<h4 style="color: #22c55e; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">✓ Gabarito Oficial</h4>';
  html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;">';
  
  answerKey.forEach((item, idx) => {
    let display = '';
    if (item.questionType === 'true_false') {
      display = item.correctAnswer === true ? 'V' : 'F';
    } else if (item.questionType === 'multiple_choice') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      display = typeof item.correctAnswer === 'number' ? letters[item.correctAnswer] : String(item.correctAnswer);
    } else {
      display = String(item.correctAnswer);
    }
    
    html += `<div style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px; text-align: center;">
      <span style="color: var(--text-muted); font-size: 0.75rem;">Q${idx + 1}</span>
      <span style="display: block; font-weight: 700; color: #22c55e; font-size: 1.1rem;">${display}</span>
    </div>`;
  });
  
  html += '</div></div>';
  return html;
}
