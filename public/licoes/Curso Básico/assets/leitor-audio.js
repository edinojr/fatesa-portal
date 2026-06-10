(function () {
  'use strict';

  var synth = window.speechSynthesis;
  var utterance = null;
  var isPlaying = false;
  var isPaused = false;
  var currentSentenceIndex = 0;
  var sentences = [];
  var sentenceElements = [];

  function getTextContent() {
    var body = document.body;
    var clone = body.cloneNode(true);

    var selectorsToRemove = [
      '.leitor-panel', '.leitor-btn-flutuante',
      '.exercicios-btn-flutuante', '.exercicios-overlay',
      'script', 'style', 'nav', 'header', 'footer',
      '.bible-popup', '.bible-popup-overlay',
    ];
    for (var s = 0; s < selectorsToRemove.length; s++) {
      var els = clone.querySelectorAll(selectorsToRemove[s]);
      for (var i = els.length - 1; i >= 0; i--) {
        els[i].parentNode.removeChild(els[i]);
      }
    }

    var text = clone.body ? clone.body.textContent || '' : '';
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  function splitSentences(text) {
    var raw = text.match(/[^.!?]+[.!?]+/g) || [text];
    var result = [];
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i].trim();
      if (s) result.push(s);
    }
    if (result.length === 0 && text.trim()) result.push(text.trim());
    return result;
  }

  function findSentenceElements() {
    sentenceElements = [];
    var allEl = document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th');
    for (var i = 0; i < allEl.length; i++) {
      var el = allEl[i];
      if (el.closest('.leitor-panel') || el.closest('.leitor-btn-flutuante') ||
          el.closest('.exercicios-btn-flutuante') || el.closest('.exercicios-overlay') ||
          el.closest('script') || el.closest('style') || el.closest('nav') ||
          el.closest('header') || el.closest('footer')) continue;
      var text = (el.textContent || '').trim();
      if (text) sentenceElements.push({ el: el, text: text });
    }
  }

  function clearHighlight() {
    for (var i = 0; i < sentenceElements.length; i++) {
      sentenceElements[i].el.classList.remove('leitor-highlight');
    }
  }

  function highlightSentence(index) {
    clearHighlight();
    if (index >= 0 && index < sentenceElements.length) {
      sentenceElements[index].el.classList.add('leitor-highlight');
      sentenceElements[index].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function updateStatus(msg) {
    var statusEl = document.querySelector('.leitor-status');
    if (statusEl) statusEl.textContent = msg;
  }

  function stopReading() {
    if (synth) {
      synth.cancel();
    }
    isPlaying = false;
    isPaused = false;
    utterance = null;
    currentSentenceIndex = 0;
    clearHighlight();
    updateStatus('Parado');
    var playBtn = document.querySelector('.play-btn');
    if (playBtn) playBtn.textContent = '▶';
  }

  function readNextSentence() {
    if (currentSentenceIndex >= sentences.length) {
      stopReading();
      updateStatus('Leitura concluída ✓');
      return;
    }

    var text = sentences[currentSentenceIndex];
    if (!text.trim()) {
      currentSentenceIndex++;
      readNextSentence();
      return;
    }

    updateStatus('Lendo… (' + (currentSentenceIndex + 1) + '/' + sentences.length + ')');
    highlightSentence(currentSentenceIndex);

    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = parseFloat(document.getElementById('leitor-speed-range').value);
    utterance.pitch = 1;

    var voiceSelect = document.getElementById('leitor-voice-select');
    var selectedVoice = voiceSelect ? voiceSelect.value : '';
    if (selectedVoice) {
      var voices = synth.getVoices();
      for (var v = 0; v < voices.length; v++) {
        if (voices[v].name === selectedVoice) {
          utterance.voice = voices[v];
          break;
        }
      }
    }

    utterance.onend = function () {
      currentSentenceIndex++;
      if (currentSentenceIndex < sentences.length) {
        readNextSentence();
      } else {
        stopReading();
        updateStatus('Leitura concluída ✓');
      }
    };

    utterance.onerror = function () {
      stopReading();
      updateStatus('Erro na leitura');
    };

    isPlaying = true;
    isPaused = false;
    synth.speak(utterance);

    var playBtn = document.querySelector('.play-btn');
    if (playBtn) playBtn.textContent = '⏸';
  }

  function togglePlay() {
    if (!synth) return;

    if (isPlaying && !isPaused) {
      synth.pause();
      isPaused = true;
      updateStatus('Pausado');
      document.querySelector('.play-btn').textContent = '▶';
      return;
    }

    if (isPaused) {
      synth.resume();
      isPaused = false;
      updateStatus('Lendo… (' + (currentSentenceIndex + 1) + '/' + sentences.length + ')');
      document.querySelector('.play-btn').textContent = '⏸';
      return;
    }

    var text = getTextContent();
    if (!text) {
      updateStatus('Nenhum texto encontrado');
      return;
    }

    sentences = splitSentences(text);
    findSentenceElements();
    currentSentenceIndex = 0;
    readNextSentence();
  }

  function populateVoices() {
    var select = document.getElementById('leitor-voice-select');
    if (!select) return;
    var voices = synth.getVoices();
    var ptVoices = voices.filter(function (v) {
      return v.lang && v.lang.startsWith('pt');
    });
    var allVoices = ptVoices.length > 0 ? ptVoices : voices;

    select.innerHTML = '';
    for (var v = 0; v < allVoices.length; v++) {
      var opt = document.createElement('option');
      opt.value = allVoices[v].name;
      opt.textContent = allVoices[v].name + ' (' + allVoices[v].lang + ')';
      select.appendChild(opt);
    }
  }

  function init() {
    if (window.__leitorAudioInited) return;
    window.__leitorAudioInited = true;

    var btn = document.createElement('button');
    btn.className = 'leitor-btn-flutuante';
    btn.innerHTML = '🔊 Ouvir Lição';
    btn.setAttribute('aria-label', 'Abrir leitor de áudio');
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'leitor-panel';
    panel.innerHTML =
      '<div class="leitor-header">' +
        '<h3>🔊 Leitor de Áudio</h3>' +
        '<button class="leitor-fechar" aria-label="Fechar">&times;</button>' +
      '</div>' +
      '<div class="leitor-status">Pronto para ler</div>' +
      '<div class="leitor-controls">' +
        '<button class="stop-btn" title="Parar" disabled>⏹</button>' +
        '<button class="play-btn" title="Ouvir">▶</button>' +
        '<button class="reiniciar-btn" title="Reiniciar" disabled>⟳</button>' +
      '</div>' +
      '<div class="leitor-speed">' +
        '<span>🐢</span>' +
        '<input type="range" id="leitor-speed-range" min="0.5" max="2" step="0.1" value="1">' +
        '<span>🐇</span>' +
        '<span class="speed-label" id="leitor-speed-label">1.0x</span>' +
      '</div>' +
      '<div class="leitor-voice">' +
        '<span>🗣</span>' +
        '<select id="leitor-voice-select"></select>' +
      '</div>';
    document.body.appendChild(panel);

    var speedRange = document.getElementById('leitor-speed-range');
    var speedLabel = document.getElementById('leitor-speed-label');
    speedRange.addEventListener('input', function () {
      speedLabel.textContent = parseFloat(this.value).toFixed(1) + 'x';
      if (utterance) utterance.rate = parseFloat(this.value);
    });

    document.querySelector('.leitor-fechar').addEventListener('click', function () {
      if (isPlaying) stopReading();
      panel.classList.remove('active');
    });

    btn.addEventListener('click', function () {
      panel.classList.toggle('active');
      if (panel.classList.contains('active') && synth) {
        populateVoices();
      }
    });

    document.querySelector('.play-btn').addEventListener('click', togglePlay);

    document.querySelector('.stop-btn').addEventListener('click', function () {
      stopReading();
      document.querySelector('.stop-btn').disabled = true;
      document.querySelector('.reiniciar-btn').disabled = true;
      document.querySelector('.play-btn').textContent = '▶';
    });

    document.querySelector('.reiniciar-btn').addEventListener('click', function () {
      stopReading();
      document.querySelector('.play-btn').textContent = '▶';
      currentSentenceIndex = 0;
    });

    if (synth) {
      if (synth.getVoices().length > 0) {
        populateVoices();
      } else {
        synth.onvoiceschanged = populateVoices;
      }
    }

    synth.addEventListener('start', function () {
      document.querySelector('.stop-btn').disabled = false;
      document.querySelector('.reiniciar-btn').disabled = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
