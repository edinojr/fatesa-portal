/**
 * FATESA - Sistema de Exercícios Pedagógicos de Fixação
 * Garante que os gabaritos e explicações bíblicas sejam exibidos
 * APENAS após a tentativa do aluno, com caráter exclusivamente pedagógico.
 */
(function() {
  function initExercicios() {
    const container = document.querySelector(".exercicios-section");
    if (!container) return;

    // 1. Interação Verdadeiro / Falso (V / F)
    container.querySelectorAll(".tf-item").forEach(function(item) {
      const btns = item.querySelectorAll(".btn-tf");
      btns.forEach(function(btn) {
        btn.addEventListener("click", function() {
          btns.forEach(b => b.classList.remove("selected"));
          this.classList.add("selected");
          // Esconde feedback anterior se usuário mudar escolha
          const fb = item.querySelector(".feedback-box");
          if (fb) fb.classList.remove("visible", "correct", "review");
        });
      });
    });

    // 2. Interação Múltipla Escolha
    container.querySelectorAll(".mc-item").forEach(function(item) {
      const opts = item.querySelectorAll(".mc-option");
      opts.forEach(function(opt) {
        opt.addEventListener("click", function() {
          opts.forEach(o => o.classList.remove("selected"));
          this.classList.add("selected");
          const fb = item.querySelector(".feedback-box");
          if (fb) fb.classList.remove("visible", "correct", "review");
        });
      });
    });

    // 3. Botão Conferir Respostas (Efeito Pedagógico)
    const btnConferir = document.getElementById("btnConferirExercicios");
    const btnRefazer = document.getElementById("btnRefazerExercicios");
    const resumoPedagogico = document.getElementById("resumoPedagogico");

    if (btnConferir) {
      btnConferir.addEventListener("click", function() {
        let totalPerguntas = 0;
        let respondidas = 0;

        // Conferir V / F
        container.querySelectorAll(".tf-item").forEach(function(item) {
          totalPerguntas++;
          const selectedBtn = item.querySelector(".btn-tf.selected");
          const feedbackBox = item.querySelector(".feedback-box");
          const gabarito = item.getAttribute("data-answer") || "V";
          const justificativa = item.getAttribute("data-justification") || "";

          if (feedbackBox) {
            feedbackBox.classList.remove("correct", "review");
            feedbackBox.classList.add("visible");

            if (selectedBtn) {
              respondidas++;
              const userVal = selectedBtn.getAttribute("data-val");
              if (userVal === gabarito) {
                feedbackBox.classList.add("correct");
                feedbackBox.innerHTML = `
                  <div class="feedback-header">✅ Resposta Correta (${gabarito === 'V' ? 'Verdadeiro' : 'Falso'})</div>
                  <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
                `;
              } else {
                feedbackBox.classList.add("review");
                feedbackBox.innerHTML = `
                  <div class="feedback-header">ℹ️ Ponto de Atenção (O correto é: ${gabarito === 'V' ? 'Verdadeiro' : 'Falso'})</div>
                  <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
                `;
              }
            } else {
              feedbackBox.classList.add("review");
              feedbackBox.innerHTML = `
                <div class="feedback-header">ℹ️ Questão não assinalada (O correto é: ${gabarito === 'V' ? 'Verdadeiro' : 'Falso'})</div>
                <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
              `;
            }
          }
        });

        // Conferir Citar / Reflexões
        container.querySelectorAll(".cite-item").forEach(function(item) {
          const feedbackBox = item.querySelector(".feedback-box");
          const respostaModelo = item.getAttribute("data-model-answer") || "";
          if (feedbackBox) {
            feedbackBox.classList.add("visible", "correct");
            feedbackBox.innerHTML = `
              <div class="feedback-header">📖 Comentário Teológico & Resposta Sugerida:</div>
              <div class="feedback-justification">${respostaModelo}</div>
            `;
          }
        });

        // Conferir Múltipla Escolha
        container.querySelectorAll(".mc-item").forEach(function(item) {
          totalPerguntas++;
          const selectedOpt = item.querySelector(".mc-option.selected");
          const feedbackBox = item.querySelector(".feedback-box");
          const gabarito = (item.getAttribute("data-answer") || "a").toLowerCase();
          const justificativa = item.getAttribute("data-justification") || "";

          if (feedbackBox) {
            feedbackBox.classList.remove("correct", "review");
            feedbackBox.classList.add("visible");

            if (selectedOpt) {
              respondidas++;
              const userLetter = selectedOpt.getAttribute("data-letter");
              if (userLetter === gabarito) {
                feedbackBox.classList.add("correct");
                feedbackBox.innerHTML = `
                  <div class="feedback-header">✅ Alternativa Correta (${gabarito.toUpperCase()})</div>
                  <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
                `;
              } else {
                feedbackBox.classList.add("review");
                feedbackBox.innerHTML = `
                  <div class="feedback-header">ℹ️ A alternativa bíblica correta é a (${gabarito.toUpperCase()})</div>
                  <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
                `;
              }
            } else {
              feedbackBox.classList.add("review");
              feedbackBox.innerHTML = `
                <div class="feedback-header">ℹ️ Questão não assinalada (Alternativa correta: ${gabarito.toUpperCase()})</div>
                <div class="feedback-justification">💡 <strong>Fundamentação Bíblica:</strong> ${justificativa}</div>
              `;
            }
          }
        });

        // Conferir Associação de Colunas
        container.querySelectorAll(".col-b-item").forEach(function(item) {
          const select = item.querySelector(".matching-select");
          const feedbackBox = item.querySelector(".feedback-box");
          const gabarito = item.getAttribute("data-answer") || "1";
          const explicacao = item.getAttribute("data-justification") || "";

          if (feedbackBox) {
            feedbackBox.classList.add("visible");
            feedbackBox.classList.remove("correct", "review");
            if (select && select.value === gabarito) {
              feedbackBox.classList.add("correct");
              feedbackBox.innerHTML = `✅ Correto! Associação com o Item ${gabarito}. ${explicacao}`;
            } else {
              feedbackBox.classList.add("review");
              feedbackBox.innerHTML = `ℹ️ Correspondência correta: Item ${gabarito}. ${explicacao}`;
            }
          }
        });

        // Exibir Resumo Pedagógico
        if (resumoPedagogico) {
          resumoPedagogico.classList.add("visible");
          resumoPedagogico.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }

    // 4. Botão Refazer Exercício
    if (btnRefazer) {
      btnRefazer.addEventListener("click", function() {
        container.querySelectorAll(".btn-tf").forEach(b => b.classList.remove("selected"));
        container.querySelectorAll(".mc-option").forEach(o => o.classList.remove("selected"));
        container.querySelectorAll(".cite-textarea").forEach(t => t.value = "");
        container.querySelectorAll(".matching-select").forEach(s => s.value = "");
        container.querySelectorAll(".feedback-box").forEach(fb => fb.classList.remove("visible", "correct", "review"));
        if (resumoPedagogico) resumoPedagogico.classList.remove("visible");

        container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExercicios);
  } else {
    initExercicios();
  }
})();
