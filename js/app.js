/* ===== 学位英语离线学习系统 · 共享脚本 ===== */
'use strict';

/* ---------- 音频播放器 ---------- */
const player = new Audio();
let _curBtn = null;

player.addEventListener('ended',  () => _clearBtn());
player.addEventListener('error',  () => { _clearBtn(); });

function _clearBtn() {
  if (_curBtn) { _curBtn.classList.remove('playing'); _curBtn = null; }
}

/**
 * speak(btn)
 * btn.dataset.audio  → 本地mp3路径（优先）
 * btn.dataset.text   → 文本（speechSynthesis兜底）
 */
function speak(btn) {
  const src  = btn.dataset.audio || '';
  const text = btn.dataset.text  || '';

  // 点击正在播放的按钮 → 暂停
  if (_curBtn === btn) {
    player.pause();
    speechSynthesis.cancel();
    _clearBtn();
    return;
  }

  // 停止上一个
  player.pause();
  speechSynthesis.cancel();
  _clearBtn();

  _curBtn = btn;
  btn.classList.add('playing');

  if (src) {
    player.src = src;
    const p = player.play();
    if (p) p.catch(() => _fallback(text, btn));
    player.onerror = () => _fallback(text, btn);
  } else {
    _fallback(text, btn);
  }
}

function _fallback(text, btn) {
  if (!text) { _clearBtn(); return; }
  if (!('speechSynthesis' in window)) { _clearBtn(); _gtts(text); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.88;
  const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (vs.length) {
    u.voice = vs.find(v => /Jenny|Zira|Samantha|Female/i.test(v.name)) || vs[0];
  }
  u.onend   = () => _clearBtn();
  u.onerror = () => { _clearBtn(); _gtts(text); };
  speechSynthesis.speak(u);
  showToast('本地音频不可用，已用浏览器语音');
}

function _gtts(text) {
  window.open('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q='
    + encodeURIComponent(text.slice(0, 190)), '_blank');
  showToast('已打开Google TTS在线朗读');
}

/* 预加载语音列表 */
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

/* ---------- Toast ---------- */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- 工具 ---------- */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function btnHtml(text, audio, label, cls) {
  return `<button class="btn ${cls}" data-text="${esc(text)}" data-audio="${esc(audio||'')}"
    onclick="speak(this)">🔊 ${label}</button>`;
}

/* ---------- 阅读题目状态 ---------- */
const _quiz = {};   // articleNo → { answers:{qno:letter}, done:bool }

function chooseOpt(el, artNo, qNo, letter, correct) {
  const key = `${artNo}-${qNo}`;
  if (_quiz[key] && _quiz[key].done) return;
  _quiz[key] = { done: true, letter };

  // 标记所有选项
  el.closest('.q-opts').querySelectorAll('.q-opt').forEach(o => {
    const l = o.dataset.letter;
    if (l === correct) o.classList.add('correct');
    else if (l === letter && letter !== correct) o.classList.add('wrong');
    else o.classList.add('revealed');
  });

  // 更新得分显示
  const rb = document.getElementById(`result-${artNo}`);
  if (rb) {
    const qs = document.querySelectorAll(`[data-art="${artNo}"] .q-block`);
    let ok = 0;
    qs.forEach(q => {
      const qno = q.dataset.qno;
      const k2 = `${artNo}-${qno}`;
      const ans = q.dataset.correct;
      if (_quiz[k2] && _quiz[k2].letter === ans) ok++;
    });
    rb.textContent = `得分：${ok} / ${qs.length}`;
    rb.style.color = ok === qs.length ? '#059669' : ok >= qs.length/2 ? '#d97706' : '#dc2626';
  }
}

function resetArticle(artNo) {
  document.querySelectorAll(`[data-art="${artNo}"] .q-opt`).forEach(o => {
    o.classList.remove('correct','wrong','revealed');
  });
  document.querySelectorAll(`[data-art="${artNo}"] .q-block`).forEach(q => {
    const k = `${artNo}-${q.dataset.qno}`;
    delete _quiz[k];
  });
  const rb = document.getElementById(`result-${artNo}`);
  if (rb) { rb.textContent = ''; }
}

/* ---------- 句子点击朗读（阅读正文） ---------- */
function speakSent(span) {
  const text = span.textContent.trim();
  document.querySelectorAll('.sent-span.playing-sent').forEach(s => s.classList.remove('playing-sent'));
  span.classList.add('playing-sent');
  player.pause(); speechSynthesis.cancel(); _clearBtn();
  if (!('speechSynthesis' in window)) { _gtts(text); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang='en-US'; u.rate=0.88;
  const vs = speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en'));
  if(vs.length) u.voice = vs.find(v=>/Jenny|Zira|Samantha/i.test(v.name))||vs[0];
  u.onend = () => span.classList.remove('playing-sent');
  speechSynthesis.speak(u);
}
