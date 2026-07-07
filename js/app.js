/* ===== 学位英语离线学习系统 · 共享脚本 ===== */
'use strict';

/* ---------- 音频播放器 ---------- */
const player = new Audio();
player.preload = 'auto';
let _curBtn = null;

const AUDIO_HINT_TEXT = '如点击朗读无声音，请先确认手机音量已打开；微信内无法播放时，请点击右上角 ... 选择在浏览器打开。';
const WECHAT_AUDIO_HINT_TEXT = '当前可能为微信内置浏览器，如朗读无声音，请点击右上角 ... 在浏览器打开。';
const AUDIO_BROWSER_TIP = '当前浏览器限制音频播放，请点击右上角 ... 选择在浏览器打开。苹果建议 Safari，安卓建议 Chrome 或 Edge。';
const AUDIO_PLAY_FAILED = '播放失败：当前浏览器可能限制音频播放，请在浏览器中打开。';
const AUDIO_LOAD_FAILED = '音频加载失败，请刷新页面或换浏览器打开。';

function _clearBtn() {
  if (_curBtn) { _curBtn.classList.remove('playing'); _curBtn = null; }
}

function safeCancelSpeech() {
  if (!('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); } catch (_) {}
}

function stopPlayer() {
  try {
    player.pause();
    player.currentTime = 0;
  } catch (_) {
    try { player.pause(); } catch (_) {}
  }
}

function resetAudioEvents() {
  player.onloadstart = null;
  player.onwaiting = null;
  player.onplaying = null;
  player.onended = null;
  player.onerror = null;
}

function playAudio(src, btn = null, text = '') {
  const audioSrc = String(src || '').trim();

  stopPlayer();
  safeCancelSpeech();
  _clearBtn();
  resetAudioEvents();

  if (!audioSrc) {
    _fallback(text, btn);
    return Promise.reject(new Error('missing audio src'));
  }

  if (btn) {
    _curBtn = btn;
    btn.classList.add('playing');
  }

  player.preload = 'auto';
  player.onloadstart = () => showToast('音频加载中');
  player.onwaiting = () => showToast('音频加载中');
  player.onplaying = () => showToast('正在播放');
  player.onended = () => {
    showToast('播放完成');
    _clearBtn();
  };
  player.onerror = () => {
    showToast(AUDIO_LOAD_FAILED, 4600);
    _clearBtn();
  };

  player.src = audioSrc;
  showToast('音频加载中');

  const playTask = player.play();
  if (playTask && typeof playTask.catch === 'function') {
    return playTask.catch(err => {
      showToast(AUDIO_PLAY_FAILED, 5000);
      _clearBtn();
      throw err;
    });
  }
  return Promise.resolve();
}

function testSound() {
  playAudio('audio/w_001.mp3')
    .then(() => showToast('声音正常，可以开始学习。', 3600))
    .catch(() => showToast(AUDIO_BROWSER_TIP, 5600));
}

function initAudioHints() {
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent || '');
  document.querySelectorAll('[data-audio-hint]').forEach(el => {
    el.textContent = isWeChat ? WECHAT_AUDIO_HINT_TEXT : AUDIO_HINT_TEXT;
    el.classList.toggle('audio-hint-wechat', isWeChat);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAudioHints);
} else {
  initAudioHints();
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
    stopPlayer();
    safeCancelSpeech();
    _clearBtn();
    return;
  }

  playAudio(src, btn, text).catch(() => {});
}

function _fallback(text, btn) {
  if (!text) { _clearBtn(); return; }
  if (!('speechSynthesis' in window)) {
    _clearBtn();
    showToast('当前浏览器不支持文字朗读，请使用 Chrome、Edge 或 Safari。', 4800);
    return;
  }
  safeCancelSpeech();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.88;
  const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  if (vs.length) {
    u.voice = vs.find(v => /Jenny|Zira|Samantha|Female/i.test(v.name)) || vs[0];
  } else {
    showToast('当前浏览器未加载英文语音，请换浏览器打开。', 4600);
  }
  u.onend   = () => _clearBtn();
  u.onerror = () => {
    _clearBtn();
    showToast('朗读失败：当前浏览器可能限制文字朗读，请换浏览器打开。', 5000);
  };
  try {
    speechSynthesis.speak(u);
    showToast('本地音频不可用，已尝试使用浏览器语音');
  } catch (_) {
    _clearBtn();
    showToast('朗读失败：当前浏览器可能限制文字朗读，请换浏览器打开。', 5000);
  }
}

/* 预加载语音列表 */
if ('speechSynthesis' in window) {
  try {
    speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  } catch (_) {}
}

/* ---------- Toast ---------- */
function showToast(msg, duration = 3000) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), duration);
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
  if (!text) return;

  document.querySelectorAll('.sent-span.playing-sent').forEach(s => s.classList.remove('playing-sent'));
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    showToast('当前浏览器不支持文字朗读，请使用 Chrome、Edge 或 Safari。', 4800);
    return;
  }

  span.classList.add('playing-sent');
  stopPlayer();
  safeCancelSpeech();
  _clearBtn();

  let u;
  try {
    u = new SpeechSynthesisUtterance(text);
  } catch (_) {
    span.classList.remove('playing-sent');
    showToast('朗读失败：当前浏览器可能限制文字朗读，请换浏览器打开。', 5000);
    return;
  }

  u.lang='en-US'; u.rate=0.88;
  let vs = [];
  try {
    vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith('en'));
  } catch (_) {}

  if (vs.length) {
    u.voice = vs.find(v => /Jenny|Zira|Samantha|Female/i.test(v.name)) || vs[0];
  } else {
    showToast('当前浏览器未加载英文语音，请换浏览器打开。', 4600);
  }

  u.onstart = () => showToast('正在播放');
  u.onend = () => {
    span.classList.remove('playing-sent');
    showToast('播放完成');
  };
  u.onerror = () => {
    span.classList.remove('playing-sent');
    showToast('朗读失败：当前浏览器可能限制文字朗读，请换浏览器打开。', 5000);
  };

  try {
    speechSynthesis.speak(u);
  } catch (_) {
    span.classList.remove('playing-sent');
    showToast('朗读失败：当前浏览器可能限制文字朗读，请换浏览器打开。', 5000);
  }
}
