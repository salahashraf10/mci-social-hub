/* =========================================================
   MCI Social Hub — App Logic
   ========================================================= */

/* ============ Firebase ============ */
const firebaseConfig = {
  apiKey: "AIzaSyABaXzMUDHKgCmme8EC71Dc-qRTACFucVE",
  authDomain: "mci-social-hub.firebaseapp.com",
  projectId: "mci-social-hub",
  storageBucket: "mci-social-hub.firebasestorage.app",
  messagingSenderId: "1010863229747",
  appId: "1:1010863229747:web:8fb672bfcca3cf61670c46"
};

let db = null, firebaseReady = false;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
  }
} catch (e) { console.warn('Firebase init failed', e); }

/* ============ APP DATA ============ */
const APP_DATA = {
  branches: {
    MIS: { name: 'نظم معلومات (MIS)', exams: [
      { name: 'محاسبة', datetime: '2026-11-19T13:30:00' },
      { name: 'قانون تجاري', datetime: '2026-11-19T14:15:00' },
      { name: 'اقتصاد', datetime: '2026-11-23T13:30:00' },
      { name: 'لوجستيات', datetime: '2026-11-23T14:15:00' },
      { name: 'تسويق', datetime: '2026-11-26T13:30:00' }
    ]},
    Marketing: { name: 'تسويق (Marketing)', exams: [
      { name: 'محاسبة', datetime: '2026-11-21T13:30:00' },
      { name: 'قانون تجاري', datetime: '2026-11-21T14:15:00' },
      { name: 'لوجستيات', datetime: '2026-11-25T13:30:00' },
      { name: 'اقتصاد', datetime: '2026-11-25T14:15:00' },
      { name: 'تسويق', datetime: '2026-11-26T09:00:00' }
    ]},
    Accounting: { name: 'محاسبة (Accounting)', exams: [
      { name: 'محاسبة', datetime: '2026-11-21T13:30:00' },
      { name: 'قانون تجاري', datetime: '2026-11-21T14:00:00' },
      { name: 'لوجستيات', datetime: '2026-11-25T13:30:00' },
      { name: 'اقتصاد', datetime: '2026-11-25T14:00:00' },
      { name: 'تسويق', datetime: '2026-11-26T09:00:00' }
    ]}
  },
  subjects: {
    accounting: { name: 'محاسبة', icon: 'مح', description: 'أساسيات المحاسبة المالية والتكاليف' },
    law: { name: 'قانون تجاري', icon: 'قن', description: 'القانون التجاري والشركات' },
    economics: { name: 'اقتصاد', icon: 'قص', description: 'مبادئ الاقتصاد الكلي والجزئي' },
    logistics: { name: 'لوجستيات', icon: 'لج', description: 'إدارة اللوجستيات وسلاسل الإمداد' },
    marketing: { name: 'تسويق', icon: 'تس', description: 'أساسيات التسويق والإدارة التسويقية' }
  },
  comingSoon: [
    { id: 'weakness', title: 'بنك التركات الذكي الشامل', desc: 'رادار نقاط الضعف', enabled: false },
    { id: 'ai', title: 'مساعد المذاكرة SAI', desc: 'مساعد ذكاء اصطناعي شخصي', enabled: false },
    { id: 'video', title: 'شروحات الفيديو المكثفة', desc: 'فيديوهات مراجعة', enabled: false },
    { id: 'qa', title: 'ساحة نقاش الدفعة', desc: 'Q&A Wall', enabled: false }
  ],
  motivations: [
    'كل خطوة صغيرة بتفرق.. ابدأ بخطوة النهاردة.',
    'المذاكرة مش عبء، دي استثمار في مستقبلك.',
    'النجاح رحلة، مش محطة.. كمّل.',
    'متقارنش نفسك بحد، قارن نفسك بنفسك امبارح.',
    'التعب دلوقتي = راحة بعدين.',
    'إنت أقوى من اللي بتفتكره.. جرب وشوف.',
    'كل سؤال بتحله = خطوة أقرب للحلم.',
    'اللي بيتعب دلوقتي، بيرتاح بكرة.',
    'متخافش من الغلط، خاف من إنك متجربش.',
    'الدرجات بتيجي بالصبر والتكرار.',
    'خد بريك، بس متسيبش.',
    'الفرق بين الناجح والفاشل = 5 دقايق إضافية.',
    'إنت مش لوحدك، الدفعة كلها معاك.',
    'كل امتحان فرصة تثبت لنفسك إنك تقدر.',
    'النجاح مش صدفة، هو نتيجة تعب ومجهود.'
  ]
};

/* ============ Local Storage ============ */
const Store = (() => {
  const P = 'mcis_';
  return {
    get(k, f) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem(P + k); } catch {} }
  };
})();

/* ============ Cloud Layer ============ */
const Cloud = (() => {
  let online = firebaseReady;
  const cache = { questions: {}, notes: {}, flashcards: {}, ztona: {} };

  function setOnline(v) {
    online = v;
    const dot = document.getElementById('syncDot');
    const txt = document.getElementById('syncText');
    if (dot && txt) {
      dot.className = 'sync-dot ' + (v ? 'online' : 'offline');
      txt.textContent = v ? 'متصل بالسحابة' : 'وضع محلي';
    }
  }

  async function getQuestions(sid) {
    if (cache.questions[sid]) return cache.questions[sid];
    const local = Store.get('questions_' + sid, []);
    if (!firebaseReady) { cache.questions[sid] = local; return local; }
    try {
      const snap = await db.collection('questions').doc(sid).get();
      if (snap.exists) {
        const arr = snap.data().list || [];
        Store.set('questions_' + sid, arr);
        cache.questions[sid] = arr;
        setOnline(true);
        return arr;
      }
      cache.questions[sid] = local;
      setOnline(true);
      return local;
    } catch (e) { setOnline(false); cache.questions[sid] = local; return local; }
  }
  async function saveQuestions(sid, arr) {
    Store.set('questions_' + sid, arr);
    cache.questions[sid] = arr;
    if (!firebaseReady) return;
    try { await db.collection('questions').doc(sid).set({ list: arr, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getNotes(sid) {
    if (cache.notes[sid]) return cache.notes[sid];
    const local = Store.get('notes_' + sid, []);
    if (!firebaseReady) { cache.notes[sid] = local; return local; }
    try {
      const snap = await db.collection('notes').doc(sid).get();
      if (snap.exists) { const arr = snap.data().list || []; Store.set('notes_' + sid, arr); cache.notes[sid] = arr; setOnline(true); return arr; }
      cache.notes[sid] = local; setOnline(true); return local;
    } catch (e) { setOnline(false); cache.notes[sid] = local; return local; }
  }
  async function saveNotes(sid, arr) {
    Store.set('notes_' + sid, arr); cache.notes[sid] = arr;
    if (!firebaseReady) return;
    try { await db.collection('notes').doc(sid).set({ list: arr, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getFlashcards(sid) {
    if (cache.flashcards[sid]) return cache.flashcards[sid];
    const local = Store.get('flashcards_' + sid, []);
    if (!firebaseReady) { cache.flashcards[sid] = local; return local; }
    try {
      const snap = await db.collection('flashcards').doc(sid).get();
      if (snap.exists) { const arr = snap.data().list || []; Store.set('flashcards_' + sid, arr); cache.flashcards[sid] = arr; setOnline(true); return arr; }
      cache.flashcards[sid] = local; setOnline(true); return local;
    } catch (e) { setOnline(false); cache.flashcards[sid] = local; return local; }
  }
  async function saveFlashcards(sid, arr) {
    Store.set('flashcards_' + sid, arr); cache.flashcards[sid] = arr;
    if (!firebaseReady) return;
    try { await db.collection('flashcards').doc(sid).set({ list: arr, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  
  // Ztona
  async function getZtona(sid) {
    if (cache.ztona[sid]) return cache.ztona[sid];
    const local = Store.get('ztona_' + sid, []);
    if (!firebaseReady) { cache.ztona[sid] = local; return local; }
    try {
      const snap = await db.collection('ztona').doc(sid).get();
      if (snap.exists) { const arr = snap.data().list || []; Store.set('ztona_' + sid, arr); cache.ztona[sid] = arr; setOnline(true); return arr; }
      cache.ztona[sid] = local; setOnline(true); return local;
    } catch (e) { setOnline(false); cache.ztona[sid] = local; return local; }
  }
  async function saveZtona(sid, arr) {
    Store.set('ztona_' + sid, arr); cache.ztona[sid] = arr;
    if (!firebaseReady) return;
    try { await db.collection('ztona').doc(sid).set({ list: arr, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }

  async function getUsers() {
    const local = Store.get('users', []);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('users').get();
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Store.set('users', arr); setOnline(true); return arr;
    } catch (e) { setOnline(false); return local; }
  }
  async function saveUser(user) {
    const users = Store.get('users', []);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
    Store.set('users', users);
    if (!firebaseReady) return;
    try { await db.collection('users').doc(user.id).set(user, { merge: true }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function deleteUser(id) {
    const users = Store.get('users', []).filter(u => u.id !== id);
    Store.set('users', users);
    if (!firebaseReady) return;
    try { await db.collection('users').doc(id).delete(); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getTicker() {
    const local = Store.get('ticker', ['مرحباً بكم في MCI Social Hub — الفرقة الثانية']);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('config').doc('ticker').get();
      if (snap.exists) { const arr = snap.data().list || local; Store.set('ticker', arr); setOnline(true); return arr; }
      setOnline(true); return local;
    } catch (e) { setOnline(false); return local; }
  }
  async function saveTicker(arr) {
    Store.set('ticker', arr);
    if (!firebaseReady) return;
    try { await db.collection('config').doc('ticker').set({ list: arr, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getScores() {
    const local = Store.get('scores', []);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('scores').orderBy('date', 'desc').limit(300).get();
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Store.set('scores', arr); setOnline(true); return arr;
    } catch (e) { setOnline(false); return local; }
  }
  async function saveScore(score) {
    const local = Store.get('scores', []);
    local.push(score); Store.set('scores', local);
    if (!firebaseReady) return;
    try { await db.collection('scores').add({ ...score, createdAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getNotifications() {
    const local = Store.get('notifications', []);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(30).get();
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Store.set('notifications', arr); setOnline(true); return arr;
    } catch (e) { setOnline(false); return local; }
  }
  async function pushNotification(msg) {
    const local = Store.get('notifications', []);
    const notif = { msg, date: new Date().toISOString(), createdAt: Date.now(), read: false };
    local.unshift(notif); Store.set('notifications', local.slice(0, 50));
    if (!firebaseReady) return;
    try { await db.collection('notifications').add(notif); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getConfig(key, fallback) {
    const local = Store.get('config_' + key, fallback);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('config').doc(key).get();
      if (snap.exists) { const v = snap.data().value; Store.set('config_' + key, v); setOnline(true); return v; }
      setOnline(true); return local;
    } catch (e) { setOnline(false); return local; }
  }
  async function saveConfig(key, value) {
    Store.set('config_' + key, value);
    if (!firebaseReady) return;
    try { await db.collection('config').doc(key).set({ value, updatedAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function deleteConfig(key) {
    Store.remove('config_' + key);
    if (!firebaseReady) return;
    try { await db.collection('config').doc(key).delete(); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getReports() {
    const local = Store.get('reports', []);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('reports').orderBy('createdAt', 'desc').limit(50).get();
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      Store.set('reports', arr); setOnline(true); return arr;
    } catch (e) { setOnline(false); return local; }
  }
  async function saveReport(report) {
    const local = Store.get('reports', []);
    local.unshift(report); Store.set('reports', local);
    if (!firebaseReady) return;
    try { await db.collection('reports').add({ ...report, createdAt: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function resolveReport(id) {
    const local = Store.get('reports', []);
    const r = local.find(x => x.id === id);
    if (r) r.resolved = true;
    Store.set('reports', local);
    if (!firebaseReady) return;
    try { await db.collection('reports').doc(id).update({ resolved: true }); setOnline(true); }
    catch (e) { setOnline(false); }
  }

  /* Duels */
  async function createDuel(duel) {
    Store.set('duel_' + duel.code, duel);
    if (!firebaseReady) return;
    try { await db.collection('duels').doc(duel.code).set(duel); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getDuel(code) {
    const local = Store.get('duel_' + code, null);
    if (!firebaseReady) return local;
    try {
      const snap = await db.collection('duels').doc(code).get();
      if (snap.exists) { const d = snap.data(); Store.set('duel_' + code, d); setOnline(true); return d; }
      setOnline(true); return null;
    } catch (e) { setOnline(false); return local; }
  }
  async function updateDuel(code, data) {
    const local = Store.get('duel_' + code, null);
    if (local) Store.set('duel_' + code, { ...local, ...data });
    if (!firebaseReady) return;
    try { await db.collection('duels').doc(code).set(data, { merge: true }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  function watchDuel(code, callback) {
    if (!firebaseReady) {
      const iv = setInterval(async () => {
        const d = await getDuel(code);
        if (d) callback(d);
      }, 3000);
      return () => clearInterval(iv);
    }
    try {
      return db.collection('duels').doc(code).onSnapshot(doc => {
        if (doc.exists) callback(doc.data());
        setOnline(true);
      }, () => setOnline(false));
    } catch (e) { return () => {}; }
  }

  async function sendHeartbeat(userId) {
    if (!firebaseReady) return;
    try { await db.collection('heartbeats').doc(userId).set({ lastSeen: Date.now() }); setOnline(true); }
    catch (e) { setOnline(false); }
  }
  async function getActiveStudentsCount() {
    if (!firebaseReady) return Math.floor(Math.random() * 30) + 15;
    try {
      const cutoff = Date.now() - 5 * 60 * 1000;
      const snap = await db.collection('heartbeats').where('lastSeen', '>', cutoff).get();
      setOnline(true); return snap.size;
    } catch (e) { setOnline(false); return 0; }
  }

  function watchQuestions(cb) {
    if (!firebaseReady) return;
    try {
      db.collection('questions').onSnapshot(snap => {
        snap.docs.forEach(d => {
          const arr = d.data().list || [];
          Store.set('questions_' + d.id, arr);
          cache.questions[d.id] = arr;
        });
        cb(); setOnline(true);
      }, () => setOnline(false));
    } catch (e) {}
  }
  function watchTicker(cb) {
    if (!firebaseReady) return;
    try {
      db.collection('config').doc('ticker').onSnapshot(doc => {
        if (doc.exists) { const arr = doc.data().list || []; Store.set('ticker', arr); cb(arr); }
        setOnline(true);
      }, () => setOnline(false));
    } catch (e) {}
  }
  function watchNotifications(cb) {
    if (!firebaseReady) return;
    try {
      db.collection('notifications').orderBy('createdAt', 'desc').limit(20).onSnapshot(snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.set('notifications', arr); cb(arr); setOnline(true);
      }, () => setOnline(false));
    } catch (e) {}
  }

  setOnline(online);
  return {
    getQuestions, saveQuestions, getNotes, saveNotes, getFlashcards, saveFlashcards, getZtona, saveZtona,
    getUsers, saveUser, deleteUser, getTicker, saveTicker,
    getScores, saveScore, getNotifications, pushNotification,
    getConfig, saveConfig, deleteConfig, getReports, saveReport, resolveReport,
    createDuel, getDuel, updateDuel, watchDuel,
    sendHeartbeat, getActiveStudentsCount,
    watchQuestions, watchTicker, watchNotifications
  };
})();

/* ============ State ============ */
const AppState = {
  user: null,
  currentPage: 'home',
  currentSubject: null,
  theme: 'light',
  activeExam: null,
  activeDuel: null,
  duelUnsubscribe: null
};

/* ============ Utils ============ */
function $(s, c=document) { return c.querySelector(s); }
function $$(s, c=document) { return Array.from(c.querySelectorAll(s)); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pad2(n) { return String(n).padStart(2,'0'); }
function uid() { return 'id_' + Math.random().toString(36).slice(2,10); }
function shuffle(a) { a = a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function formatDateTime(iso) { return new Date(iso).toLocaleString('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function showToast(msg, type='info', duration=4000) {
  const cont = $('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="toast-icon">•</span><span>${escapeHtml(msg)}</span>`;
  cont.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(-10px)'; setTimeout(()=>el.remove(),250); }, duration);
}
function openModal(id) { $('#'+id).classList.add('active'); }
function closeModal(id) { $('#'+id).classList.remove('active'); }
function emptyState(title, msg) {
  return `<div class="empty-state"><div class="empty-icon">...</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p></div>`;
}

/* ============ Theme ============ */
function initTheme() {
  const saved = Store.get('theme', null);
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  AppState.theme = theme;
  applyTheme(theme);
  $('#themeToggle').onclick = toggleTheme;
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#themeToggle').textContent = t === 'dark' ? 'نهاري' : 'ليلي';
}
function toggleTheme() {
  const n = AppState.theme === 'dark' ? 'light' : 'dark';
  AppState.theme = n; Store.set('theme', n); applyTheme(n);
}

/* ============ Auth ============ */
async function registerUserWithLoading(name, branch, pin, text) {
  const overlay = $('#loadingOverlay');
  const prog = $('#loadingProgress');
  $('#loadingText').textContent = text || 'جاري إنشاء الحساب الخاص بك...';
  overlay.classList.add('active');
  prog.style.width = '0%';
  const start = Date.now();
  const duration = 5000;
  const timer = setInterval(() => {
    const pct = Math.min(99, ((Date.now() - start) / duration) * 100);
    prog.style.width = pct + '%';
  }, 100);
  await new Promise(r => setTimeout(r, duration));
  clearInterval(timer);
  prog.style.width = '100%';
  await new Promise(r => setTimeout(r, 300));
  overlay.classList.remove('active');

  if (!name) return { ok: true }; // Used just for loading screen

  const users = await Cloud.getUsers();
  if (users.some(u => u.pin === pin)) return { ok: false, error: 'هذا الكود مستخدم بالفعل' };
  const user = { id: uid(), name: name.trim(), branch, pin, role: 'student', createdAt: Date.now(), xp: 0, wrongQuestions: [] };
  await Cloud.saveUser(user);
  return { ok: true, user };
}

async function registerUser(name, branch, pin) {
  if (!name.trim() || name.trim().split(/\s+/).length < 2) return { ok:false, error:'يرجى إدخال الاسم الثلاثي' };
  if (!/^\d{4,6}$/.test(pin)) return { ok:false, error:'الكود 4-6 أرقام' };
  return await registerUserWithLoading(name, branch, pin);
}

async function loginUserByPin(pin) {
  const users = await Cloud.getUsers();
  return users.find(u => u.pin === pin) || null;
}

function setSession(user) {
  AppState.user = user;
  Store.set('session', user);
  afterLogin();
}

function loginGuest(branch) {
  AppState.user = { id: 'guest_' + uid(), name:'زائر', branch, pin:null, role:'guest', xp:0, wrongQuestions: [] };
  Store.set('session', AppState.user);
  afterLogin();
}

function logout() {
  AppState.user = null; Store.remove('session'); location.reload();
}

function restoreSession() {
  const s = Store.get('session', null);
  if (s) { AppState.user = s; return true; }
  return false;
}

/* ============ After Login ============ */
async function afterLogin() {
  $('#welcomeScreen').style.display = 'none';
  $('#mainApp').style.display = 'block';
  $('#mainFooter').style.display = 'block';
  
  renderUserChip();
  renderSidebarUser();
  renderSubjects();
  renderStudySubjects();
  renderExamSubjects();
  renderComingSoon();
  renderSubjectDropdowns();
  startCountdown();
  applyGuestRestrictions();
  navigateTo('home');
  checkResumeBanner();
  loadTicker();
  updateReadiness();
  updateBranchBattle();
  renderPoll();
  setRandomMotivation();
  checkNotifications();
  startHeartbeat();
  updateLiveStudentsCount();

  Cloud.watchQuestions(() => {
    renderSubjects();
    renderStudySubjects();
    renderExamSubjects();
  });
  Cloud.watchTicker(arr => renderTicker(arr));
  Cloud.watchNotifications(arr => updateNotifBadge());

  const savedMsg = await Cloud.getConfig('leaderMessage', null);
  if (savedMsg) {
    $('#leaderMessageContent').innerHTML = savedMsg.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
  } else {
    $('#leaderMessageContent').innerHTML = `<p>أهلاً بكم في <strong>MCI Social Hub</strong>،</p><p>هذه المنصة بيتنا الرقمي الذي نجتمع فيه لنذاكر معاً.</p><p>بالتوفيق للجميع.</p>`;
  }
}

/* ============ UI Rendering ============ */
function renderUserChip() {
  if (!AppState.user) return;
  const isGuest = AppState.user.role === 'guest';
  $('#userAvatar').textContent = isGuest ? 'ز' : (AppState.user.name.trim().charAt(0) || 'ط');
  $('#userNameDisplay').textContent = isGuest ? 'زائر' : AppState.user.name.split(/\s+/)[0];
  if (!isGuest) {
    $('#xpBadge').textContent = (AppState.user.xp || 0) + ' XP';
    $('#xpBadge').classList.remove('hidden');
  }
  $('#userChip').onclick = () => { if (isGuest) openModal('registerModal'); else if (confirm('تسجيل الخروج؟')) logout(); };
}

function renderSidebarUser() {
  if (!AppState.user) return;
  const isGuest = AppState.user.role === 'guest';
  $('#sidebarAvatar').textContent = isGuest ? 'ز' : (AppState.user.name.trim().charAt(0) || 'ط');
  $('#sidebarName').textContent = AppState.user.name;
  $('#sidebarBranch').textContent = APP_DATA.branches[AppState.user.branch]?.name || '';
}

function applyGuestRestrictions() {
  const isGuest = AppState.user?.role === 'guest';
  if (isGuest) {
    $('#examSubjectGrid').style.display = 'none';
    $('#guestLockExams').classList.remove('hidden');
    $('#leaderboardContent').innerHTML = '';
    $('#guestLockLeaderboard').classList.remove('hidden');
    $('#duelCreateBtn').disabled = true;
    $('#duelJoinBtn').disabled = true;
    $('#askSalahBtn').disabled = true;
    $('#sidebarWrongs').style.display = 'none';
    $('#sidebarZtona').style.display = 'none';
  } else {
    $('#examSubjectGrid').style.display = 'grid';
    $('#guestLockExams').classList.add('hidden');
    $('#guestLockLeaderboard').classList.add('hidden');
    $('#sidebarWrongs').style.display = 'block';
    $('#sidebarZtona').style.display = 'block';
    renderLeaderboard();
  }
}

/* ============ Subjects ============ */
async function renderSubjects() {
  const grid = $('#subjectGrid');
  let html = '';
  for (const [key, subj] of Object.entries(APP_DATA.subjects)) {
    const qs = await Cloud.getQuestions(key);
    html += `
      <div class="card subject-card" data-sid="${key}" data-action="open">
        <div class="subject-icon">${subj.icon}</div>
        <h3>${subj.name}</h3>
        <p>${subj.description}</p>
        <div class="subject-meta">
          <span class="badge ${qs.length > 0 ? 'badge-success' : 'badge-warning'}">${qs.length > 0 ? qs.length + ' سؤال' : 'جاري التعبئة'}</span>
          <span class="text-muted text-xs">اضغط للتفاصيل</span>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
  $$('.subject-card[data-action="open"]', grid).forEach(c => c.onclick = () => openSubjectPage(c.dataset.sid));
}

async function renderStudySubjects() {
  const grid = $('#studySubjectGrid');
  let html = '';
  for (const [key, subj] of Object.entries(APP_DATA.subjects)) {
    const notes = await Cloud.getNotes(key);
    const cards = await Cloud.getFlashcards(key);
    html += `
      <div class="card subject-card" data-sid="${key}">
        <div class="subject-icon">${subj.icon}</div>
        <h3>${subj.name}</h3>
        <p>${subj.description}</p>
        <div class="subject-meta">
          <span class="badge badge-primary">${notes.length} ملخص</span>
          <span class="badge badge-primary">${cards.length} بطاقة</span>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
  $$('.subject-card[data-sid]', grid).forEach(c => c.onclick = () => openSubjectPage(c.dataset.sid));
}

async function renderExamSubjects() {
  const grid = $('#examSubjectGrid');
  let html = '';
  for (const [key, subj] of Object.entries(APP_DATA.subjects)) {
    const qs = await Cloud.getQuestions(key);
    html += `
      <div class="card subject-card" data-sid="${key}" data-exam="1">
        <div class="subject-icon">${subj.icon}</div>
        <h3>${subj.name}</h3>
        <p>${subj.description}</p>
        <div class="subject-meta">
          <span class="badge ${qs.length > 0 ? 'badge-success' : 'badge-warning'}">${qs.length > 0 ? qs.length + ' سؤال' : 'جاري التعبئة'}</span>
          <button class="btn btn-primary btn-sm" ${qs.length === 0 ? 'disabled' : ''}>${qs.length === 0 ? 'قريباً' : 'بدء'}</button>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
  $$('.subject-card[data-exam]', grid).forEach(card => {
    const sid = card.dataset.sid;
    const btn = card.querySelector('button');
    if (btn && !btn.disabled) {
      btn.onclick = (e) => { e.stopPropagation(); openExamSetup(sid); };
      card.onclick = () => openExamSetup(sid);
    } else {
      card.onclick = () => showToast('جاري تعبئة الأسئلة.. ترقبوا النشر قريباً', 'info');
    }
  });
}

/* ============ Subject Page (SPA) ============ */
async function openSubjectPage(sid) {
  AppState.currentSubject = sid;
  const subj = APP_DATA.subjects[sid];
  $('#detailSubjectTitle').textContent = subj.name;
  $('#detailSubjectDesc').textContent = subj.description;
  
  const notes = await Cloud.getNotes(sid);
  const cards = await Cloud.getFlashcards(sid);
  
  if (notes.length === 0) {
    $('#detailNotesPanel').innerHTML = emptyState('لا توجد ملخصات بعد','جاري تعبئة المحتوى.. ترقبوا النشر قريباً');
  } else {
    $('#detailNotesPanel').innerHTML = notes.map((n,i) => `
      <div class="accordion-item" data-idx="${i}">
        <div class="accordion-header"><span>${escapeHtml(n.title)}</span><span class="chevron">v</span></div>
        <div class="accordion-body">${escapeHtml(n.content).replace(/\n/g,'<br>')}</div>
      </div>
    `).join('');
    $$('#detailNotesPanel .accordion-header').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
  }
  
  if (cards.length === 0) {
    $('#detailFlashcardsPanel').innerHTML = emptyState('لا توجد بطاقات بعد','جاري تجهيز البطاقات.. ترقبوا النشر قريباً');
  } else {
    $('#detailFlashcardsPanel').innerHTML = `
      <div class="flashcard-grid">
        ${cards.map(c => `
          <div class="flashcard"><div class="flashcard-inner">
            <div class="flashcard-front"><h4>${escapeHtml(c.term)}</h4><small>اضغط لرؤية الإجابة</small></div>
            <div class="flashcard-back"><p>${escapeHtml(c.answer)}</p></div>
          </div></div>
        `).join('')}
      </div>
    `;
    $$('#detailFlashcardsPanel .flashcard').forEach(f => f.onclick = () => f.classList.toggle('flipped'));
  }

  // Set active tab to notes
  $$('#detailTabs .tab').forEach(t => t.classList.remove('active'));
  $('#detailTabs .tab[data-dtab="notes"]').classList.add('active');
  $('#detailNotesPanel').style.display = 'block';
  $('#detailFlashcardsPanel').style.display = 'none';

  // Set exam button
  const qs = await Cloud.getQuestions(sid);
  const examBtn = $('#detailExamBtn');
  if (qs.length > 0) {
    examBtn.disabled = false;
    examBtn.onclick = () => openExamSetup(sid);
  } else {
    examBtn.disabled = true;
    examBtn.textContent = 'الامتحان قريباً';
  }

  $('#backFromSubject').onclick = () => navigateTo('study');
  navigateTo('subject-detail');
}

/* ============ Navigation ============ */
function navigateTo(page) {
  AppState.currentPage = page;
  ['home','study','exams','duel','leaderboard','coming','profile','wrongs','ztona','subject-detail'].forEach(p => {
    const el = $('#page-' + p);
    if (el) el.style.display = p === page ? 'block' : 'none';
  });
  
  if (!page.startsWith('subject')) {
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  }

  if (page === 'leaderboard' && AppState.user?.role !== 'guest') renderLeaderboard();
  if (page === 'study') renderStudySubjects();
  if (page === 'exams') renderExamSubjects();
  if (page === 'profile') renderProfile();
  if (page === 'wrongs') renderWrongsPage();
  if (page === 'ztona') renderZtonaPage();
  
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

function initNav() {
  $$('.nav-link').forEach(l => l.onclick = (e) => { e.preventDefault(); navigateTo(l.dataset.page); });
  $$('.sidebar-link[data-page]').forEach(l => l.onclick = (e) => { e.preventDefault(); navigateTo(l.dataset.page); });
  $('#brandHome').onclick = () => navigateTo('home');
  
  $('#sidebarProfile').onclick = () => navigateTo('profile');
  $('#sidebarWrongs').onclick = () => navigateTo('wrongs');
  $('#sidebarZtona').onclick = () => navigateTo('ztona');

  // Detail tabs
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('#detailTabs .tab');
    if (!tab) return;
    $$('#detailTabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $('#detailNotesPanel').style.display = tab.dataset.dtab === 'notes' ? 'block' : 'none';
    $('#detailFlashcardsPanel').style.display = tab.dataset.dtab === 'flashcards' ? 'block' : 'none';
  });
}

/* ============ Sidebar ============ */
function openSidebar() { $('#sidebar').classList.add('active'); $('#sidebarBackdrop').classList.add('active'); }
function closeSidebar() { $('#sidebar').classList.remove('active'); $('#sidebarBackdrop').classList.remove('active'); }
function initSidebar() {
  $('#hamburgerBtn').onclick = openSidebar;
  $('#closeSidebarBtn').onclick = closeSidebar;
  $('#sidebarBackdrop').onclick = closeSidebar;
}

/* ============ Profile ============ */
async function renderProfile() {
  if (!AppState.user || AppState.user.role === 'guest') return;
  const scores = (await Cloud.getScores()).filter(s => s.userName === AppState.user.name);
  const totalExams = scores.length;
  const avg = totalExams > 0 ? Math.round(scores.reduce((a,b)=>a+b.pct,0)/totalExams) : 0;
  const wrongCount = (AppState.user.wrongQuestions || []).length;
  
  $('#profileCard').innerHTML = `
    <div class="profile-avatar">${AppState.user.name.charAt(0)}</div>
    <h2 class="profile-name">${escapeHtml(AppState.user.name)}</h2>
    <span class="profile-branch">${APP_DATA.branches[AppState.user.branch]?.name || ''}</span>
    <div class="profile-xp">${AppState.user.xp || 0}</div>
    <div class="profile-xp-label">نقطة خبرة (XP)</div>
  `;
  
  $('#profileStats').innerHTML = `
    <div class="card text-center"><h3 class="text-muted text-sm">الامتحانات</h3><p style="font-size:2rem;font-weight:700;color:var(--primary)">${totalExams}</p></div>
    <div class="card text-center"><h3 class="text-muted text-sm">متوسط الدرجات</h3><p style="font-size:2rem;font-weight:700;color:var(--success)">${avg}%</p></div>
    <div class="card text-center"><h3 class="text-muted text-sm">أخطائي السابقة</h3><p style="font-size:2rem;font-weight:700;color:var(--danger)">${wrongCount}</p></div>
  `;
}

/* ============ Wrong Questions Bank ============ */
async function renderWrongsPage() {
  const grid = $('#wrongsSubjectGrid');
  const wrongQs = AppState.user.wrongQuestions || [];
  let html = '';
  for (const [sid, subj] of Object.entries(APP_DATA.subjects)) {
    const count = wrongQs.filter(w => w.subjectId === sid).length;
    if (count > 0) {
      html += `
        <div class="card subject-card" data-sid="${sid}">
          <div class="subject-icon" style="background:var(--danger-soft);color:var(--danger)">${subj.icon}</div>
          <h3>${subj.name}</h3>
          <p>عندك ${count} سؤال غلط محتاج مراجعة</p>
          <button class="btn btn-danger btn-block mt-2">امتحن أخطائي</button>
        </div>
      `;
    }
  }
  if (!html) html = emptyState('لا توجد أخطاء', 'مبروك! مفيش أسئلة غلط في بنك أخطائك لحد دلوقتي.');
  grid.innerHTML = html;
  
  $$('.subject-card[data-sid]', grid).forEach(c => {
    c.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      startWrongExam(c.dataset.sid);
    };
  });
}

async function startWrongExam(sid) {
  const wrongQs = (AppState.user.wrongQuestions || []).filter(w => w.subjectId === sid);
  if (!wrongQs.length) return showToast('لا توجد أسئلة', 'warning');
  
  const allQs = await Cloud.getQuestions(sid);
  const questions = wrongQs.map(w => allQs.find(q => q.id === w.questionId)).filter(Boolean);
  
  if (!questions.length) return showToast('الأسئلة لم تعد موجودة', 'warning');
  
  const session = {
    id: uid(), subjectId: sid, mode: 'wrongs',
    questions: questions.map(q => ({
      ...q,
      options: q.options ? shuffle(q.options) : q.options,
      _origOptions: q.options,
      _userAnswer: null, _flagged: false
    })),
    currentIdx: 0, startTime: Date.now(), durationMs: Math.max(5, questions.length) * 60000, tabSwitches: 0
  };
  
  session.questions.forEach(q => {
    if (q.type !== 'tf' && q.options && q._origOptions) {
      q.correct = q.options.indexOf(q._origOptions[q.correct]);
    }
  });
  
  AppState.activeExam = session;
  Store.set('activeExam', session);
  launchExamRunner();
}

/* ============ Ztona Page ============ */
async function renderZtonaPage() {
  const grid = $('#ztonaSubjectGrid');
  let html = '';
  for (const [sid, subj] of Object.entries(APP_DATA.subjects)) {
    const ztona = await Cloud.getZtona(sid);
    html += `
      <div class="card subject-card" data-sid="${sid}">
        <div class="subject-icon" style="background:var(--gold-soft);color:#CA8A04">${subj.icon}</div>
        <h3>${subj.name}</h3>
        <p>${ztona.length} نقطة متوقعة</p>
        <button class="btn btn-gold btn-block mt-2" ${ztona.length===0?'disabled':''}>${ztona.length===0 ? 'قريباً' : 'افتح الزتونة'}</button>
      </div>
    `;
  }
  grid.innerHTML = html;
  $$('.subject-card[data-sid]', grid).forEach(c => {
    const btn = c.querySelector('button');
    if (!btn.disabled) btn.onclick = () => showZtonaModal(c.dataset.sid);
  });
}

async function showZtonaModal(sid) {
  const subj = APP_DATA.subjects[sid];
  const ztona = await Cloud.getZtona(sid);
  let html = `<h4 class="mb-2" style="color:var(--gold)">${subj.name} — التوقعات</h4>`;
  ztona.forEach(z => {
    html += `
      <div class="ztona-item ${z.important ? 'important' : ''}">
        ${z.important ? '<span class="ztona-badge">مهم جداً - بيتكرر في الفاينل</span>' : ''}
        <div class="ztona-q">${escapeHtml(z.text)}</div>
      </div>
    `;
  });
  
  // Reuse a generic modal by injecting into shareCardModal
  $('#shareCardBody').innerHTML = html;
  openModal('shareCardModal');
}

/* ============ Exam Engine ============ */
async function openExamSetup(sid) {
  const subj = APP_DATA.subjects[sid];
  const qs = await Cloud.getQuestions(sid);
  if (qs.length === 0) return showToast('جاري تعبئة الأسئلة.. ترقبوا النشر قريباً', 'info');
  const tricks = qs.filter(q => q.is_trick).length;
  $('#examSetupBody').innerHTML = `
    <p class="text-muted mb-2">اختر نمط الامتحان لمادة <strong>${subj.name}</strong></p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn btn-primary btn-block" data-mode="official">امتحان الميدتيرم الشامل (30 دقيقة)</button>
      <button class="btn btn-ghost btn-block" data-mode="quick">الكبسولة السريعة (15 سؤال / 10 دقائق)</button>
      <button class="btn btn-ghost btn-block" data-mode="hardcore" ${tricks===0?'disabled':''}>وضع التركات (${tricks} سؤال)</button>
      <button class="btn btn-ghost btn-block" data-mode="custom">امتحان مخصص</button>
    </div>
  `;
  $$('#examSetupBody button[data-mode]').forEach(b => {
    if (b.disabled) return;
    b.onclick = () => {
      const m = b.dataset.mode;
      if (m === 'custom') openCustomExamSetup(sid);
      else startExam(sid, m);
    };
  });
  openModal('examSetupModal');
}

function openCustomExamSetup(sid) {
  const subj = APP_DATA.subjects[sid];
  $('#examSetupBody').innerHTML = `
    <h4 class="mb-2">امتحان مخصص — ${subj.name}</h4>
    <div class="form-group"><label>عدد الأسئلة</label><input type="number" class="form-control" id="customCount" value="10" min="1" max="50" /></div>
    <div class="form-group"><label>النوع</label>
      <select class="form-control" id="customType">
        <option value="mixed">مختلط</option>
        <option value="mcq">اختيار من متعدد</option>
        <option value="tf">صح وخطأ</option>
      </select>
    </div>
    <button class="btn btn-primary btn-block" id="customStartBtn">ابدأ</button>
  `;
  $('#customStartBtn').onclick = () => {
    startExam(sid, 'custom', { count: parseInt($('#customCount').value)||10, type: $('#customType').value });
  };
}

async function startExam(sid, mode, opts={}) {
  closeModal('examSetupModal');
  const all = await Cloud.getQuestions(sid);
  let pool = all.slice();
  if (mode === 'hardcore') pool = pool.filter(q => q.is_trick);
  else if (mode === 'quick') pool = shuffle(pool).slice(0,15);
  else if (mode === 'custom') {
    if (opts.type === 'mcq') pool = pool.filter(q => q.type !== 'tf');
    else if (opts.type === 'tf') pool = pool.filter(q => q.type === 'tf');
    pool = shuffle(pool).slice(0, opts.count||10);
  } else if (mode === 'official') pool = pool.slice(0,40);
  if (!pool.length) return showToast('لا توجد أسئلة متاحة', 'warning');
  const dur = mode === 'quick' ? 10 : (mode === 'official' ? 30 : Math.max(5, Math.ceil(pool.length*0.8)));
  const session = {
    id: uid(), subjectId: sid, mode,
    questions: pool.map(q => ({
      ...q,
      options: q.options ? shuffle(q.options) : q.options,
      _origOptions: q.options,
      _userAnswer: null, _flagged: false
    })),
    currentIdx: 0, startTime: Date.now(), durationMs: dur*60000, tabSwitches: 0
  };
  session.questions.forEach(q => {
    if (q.type !== 'tf' && q.options && q._origOptions) {
      q.correct = q.options.indexOf(q._origOptions[q.correct]);
    }
  });
  AppState.activeExam = session;
  Store.set('activeExam', session);
  launchExamRunner();
}

function launchExamRunner() {
  const s = AppState.activeExam;
  if (!s) return;
  $('#examRunnerTitle').textContent = APP_DATA.subjects[s.subjectId].name + ' — ' + getModeLabel(s.mode);
  renderExamRunner();
  openModal('examRunnerModal');
  startExamTimer();
  setupAntiCheat();
}
function getModeLabel(m) { return {official:'شامل',quick:'كبسولة',hardcore:'تركات',custom:'مخصص',wrongs:'أخطائي'}[m]||m; }

function renderExamRunner() {
  const s = AppState.activeExam; if (!s) return;
  const q = s.questions[s.currentIdx]; if (!q) return;
  const total = s.questions.length;
  const elapsed = Date.now() - s.startTime;
  const remaining = Math.max(0, s.durationMs - elapsed);
  const pct = (remaining / s.durationMs) * 100;
  const answered = s.questions.filter(x => x._userAnswer !== null).length;
  let timerClass = '';
  if (remaining <= 60000) timerClass = 'danger';
  else if (remaining <= 180000) timerClass = 'warning';
  const mins = Math.floor(remaining/60000), secs = Math.floor((remaining%60000)/1000);

  $('#examRunnerBody').innerHTML = `
    <div class="exam-timer-text"><span>${pad2(mins)}:${pad2(secs)}</span><span>${answered}/${total} محلول</span></div>
    <div class="exam-timer-bar"><div class="exam-timer-fill ${timerClass}" style="width:${pct}%"></div></div>
    <div class="exam-layout">
      <div>
        <div class="question-card">
          <span class="question-num">سؤال ${s.currentIdx+1} من ${total}</span>
          <div class="question-text">${escapeHtml(q.question)}</div>
          <div class="options-list" id="optionsList">
            ${(q.options||[]).map((o,i) => `
              <div class="option ${q._userAnswer===i?'selected':''}" data-optidx="${i}">
                <span class="option-marker">${['أ','ب','ج','د','هـ'][i]||i+1}</span>
                <span>${escapeHtml(o)}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex between center mt-3" style="flex-wrap:wrap;gap:8px;">
            <div class="flex gap-1">
              <button class="btn btn-ghost btn-sm" id="prevBtn" ${s.currentIdx===0?'disabled':''}>السابق</button>
              <button class="btn btn-ghost btn-sm" id="flagBtn">${q._flagged?'إزالة التعليم':'علّم للمراجعة'}</button>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-ghost btn-sm" id="nextBtn" ${s.currentIdx===total-1?'disabled':''}>التالي</button>
              <button class="btn btn-secondary btn-sm" id="submitExamBtn">تسليم</button>
            </div>
          </div>
        </div>
      </div>
      <div class="exam-nav-panel">
        <h4>خريطة الأسئلة</h4>
        <div class="nav-grid" id="navGrid">
          ${s.questions.map((qq,i) => {
            let c = 'nav-cell';
            if (i===s.currentIdx) c+=' current';
            if (qq._userAnswer!==null) c+=' answered';
            if (qq._flagged) c+=' flagged';
            return `<div class="${c}" data-idx="${i}">${i+1}</div>`;
          }).join('')}
        </div>
        <div class="nav-legend">
          <div><span class="nav-dot green"></span> محلول</div>
          <div><span class="nav-dot white"></span> لم يُحل</div>
          <div><span class="nav-dot yellow"></span> معلّم</div>
        </div>
        <div class="text-xs text-muted mt-2">تنبيهات الخروج: ${s.tabSwitches}</div>
      </div>
    </div>
  `;
  $$('#optionsList .option').forEach(o => o.onclick = () => {
    s.questions[s.currentIdx]._userAnswer = parseInt(o.dataset.optidx);
    Store.set('activeExam', s);
    renderExamRunner();
  });
  $$('#navGrid .nav-cell').forEach(c => c.onclick = () => { s.currentIdx = parseInt(c.dataset.idx); Store.set('activeExam', s); renderExamRunner(); });
  $('#prevBtn')?.addEventListener('click', () => { if (s.currentIdx>0) { s.currentIdx--; Store.set('activeExam',s); renderExamRunner(); }});
  $('#nextBtn')?.addEventListener('click', () => { if (s.currentIdx<total-1) { s.currentIdx++; Store.set('activeExam',s); renderExamRunner(); }});
  $('#flagBtn')?.addEventListener('click', () => { s.questions[s.currentIdx]._flagged = !s.questions[s.currentIdx]._flagged; Store.set('activeExam',s); renderExamRunner(); });
  $('#submitExamBtn')?.addEventListener('click', () => {
    const un = s.questions.filter(x => x._userAnswer === null).length;
    if (un > 0 && !confirm(`لديك ${un} سؤال غير محلول. تسليم؟`)) return;
    submitExam();
  });
}

let examTimerInterval = null;
function startExamTimer() {
  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = setInterval(() => {
    const s = AppState.activeExam; if (!s) return;
    const remaining = Math.max(0, s.durationMs - (Date.now() - s.startTime));
    const bar = $('#examRunnerBody .exam-timer-fill');
    const text = $('#examRunnerBody .exam-timer-text');
    if (bar && text) {
      const pct = (remaining / s.durationMs) * 100;
      const mins = Math.floor(remaining/60000), secs = Math.floor((remaining%60000)/1000);
      bar.style.width = pct+'%';
      bar.className = 'exam-timer-fill';
      if (remaining <= 60000) bar.classList.add('danger');
      else if (remaining <= 180000) bar.classList.add('warning');
      text.innerHTML = `<span>${pad2(mins)}:${pad2(secs)}</span><span>${s.questions.filter(q=>q._userAnswer!==null).length}/${s.questions.length} محلول</span>`;
    }
    if (remaining <= 0) { clearInterval(examTimerInterval); showToast('انتهى الوقت! جاري التسليم...', 'warning'); submitExam(true); }
  }, 1000);
}
function setupAntiCheat() {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
}
function onVisibilityChange() {
  if (document.hidden && AppState.activeExam) {
    AppState.activeExam.tabSwitches = (AppState.activeExam.tabSwitches||0) + 1;
    Store.set('activeExam', AppState.activeExam);
    showToast('خليك في لجنتك.. اعتمد على نفسك!', 'warning');
  }
}

async function submitExam(auto=false) {
  const s = AppState.activeExam; if (!s) return;
  clearInterval(examTimerInterval);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  
  const total = s.questions.length;
  let correct = 0;
  const wrongThisSession = [];
  
  s.questions.forEach(q => { 
    if (q._userAnswer !== null && q._userAnswer === q.correct) {
      correct++; 
      // Remove from wrong bank if answered correctly
      if (AppState.user && AppState.user.role === 'student') {
        AppState.user.wrongQuestions = (AppState.user.wrongQuestions || []).filter(w => w.questionId !== q.id);
      }
    } else {
      // Add to wrong bank
      if (AppState.user && AppState.user.role === 'student' && q._userAnswer !== null) {
        const wrongList = AppState.user.wrongQuestions || [];
        if (!wrongList.find(w => w.questionId === q.id)) {
          wrongList.push({ subjectId: s.subjectId, questionId: q.id });
          AppState.user.wrongQuestions = wrongList;
        }
      }
    }
  });
  
  if (AppState.user && AppState.user.role === 'student') {
    Store.set('session', AppState.user);
    Cloud.saveUser(AppState.user);
  }

  const pct = total > 0 ? Math.round((correct/total)*100) : 0;
  const elapsed = Math.min(s.durationMs, Date.now() - s.startTime);
  const elapsedMin = Math.floor(elapsed/60000), elapsedSec = Math.floor((elapsed%60000)/1000);
  let grade = 'ضعيف';
  if (pct>=85) grade='ممتاز'; else if (pct>=75) grade='جيد جداً'; else if (pct>=65) grade='جيد'; else if (pct>=50) grade='مقبول';
  
  const result = { subjectId: s.subjectId, subjectName: APP_DATA.subjects[s.subjectId].name, total, correct, pct, grade, elapsedMin, elapsedSec, tabSwitches: s.tabSwitches||0, questions: s.questions, date: new Date().toISOString() };
  
  if (AppState.user?.role === 'student') {
    await Cloud.saveScore({ userName: AppState.user.name, branch: AppState.user.branch, subjectId: s.subjectId, pct, grade, date: result.date });
    addXP(Math.round(pct/2) + 10);
  }
  Store.remove('activeExam');
  AppState.activeExam = null;
  closeModal('examRunnerModal');
  showExamResult(result, auto);
  updateReadiness();
  updateBranchBattle();
}

function addXP(amount) {
  if (!AppState.user || AppState.user.role === 'guest') return;
  AppState.user.xp = (AppState.user.xp || 0) + amount;
  Store.set('session', AppState.user);
  Cloud.saveUser(AppState.user);
  renderUserChip();
  showToast(`+${amount} XP`, 'success');
}

function showExamResult(r, auto) {
  const cmpPct = Math.min(99, Math.round(r.pct*0.9 + Math.random()*10));
  
  let certHtml = '';
  if (r.pct >= 90 && AppState.user.role === 'student') {
    certHtml = `
      <div class="certificate-card mt-3" id="certificateCard">
        <div class="cert-logo">MCI Social Hub</div>
        <div class="cert-title">شهادة تقدير</div>
        <div class="text-sm text-muted mb-2">تُمنح هذه الشهادة إلى</div>
        <div class="cert-name">${escapeHtml(AppState.user.name)}</div>
        <div class="cert-score">لتحقيقه درجة <strong>${r.pct}%</strong> في مادة ${escapeHtml(r.subjectName)}</div>
        <div class="cert-seal">MCI Social Hub — بإشراف الليدر صلاح أشرف</div>
      </div>
      <div class="flex gap-1 mt-2">
        <button class="btn btn-primary btn-block" onclick="window.print()">طباعة / حفظ PDF</button>
      </div>
    `;
  }

  $('#examResultBody').innerHTML = `
    ${auto ? '<div class="badge badge-warning mb-2">تم التسليم تلقائياً</div>' : ''}
    <div class="result-hero">
      <div class="score-num">${r.correct}/${r.total}</div>
      <div class="score-pct">${r.pct}%</div>
      <div class="grade">التقدير: ${r.grade}</div>
      <div class="result-stats">
        <div class="result-stat"><div class="rs-num">${r.elapsedMin}د ${r.elapsedSec}ث</div><div class="rs-lbl">الوقت</div></div>
        <div class="result-stat"><div class="rs-num">${r.tabSwitches}</div><div class="rs-lbl">خروج</div></div>
        <div class="result-stat"><div class="rs-num">${cmpPct}%</div><div class="rs-lbl">متفوق على</div></div>
      </div>
    </div>
    
    ${certHtml}
    
    <p class="text-center text-sm text-muted mb-3">أنت متفوق على ${cmpPct}% من طلاب الدفعة في هذه المادة</p>
    <div class="flex gap-1 wrap mb-3">
      <button class="btn btn-primary btn-sm" id="retryWrongBtn">إعادة أخطائي فقط</button>
      <button class="btn btn-secondary btn-sm" id="shareResultBtn">مشاركة النتيجة</button>
    </div>
    <h4 class="mb-2">كشف الإجابات النموذجية</h4>
    ${r.questions.map((q,i) => renderAnswerReview(q,i)).join('')}
  `;
  
  $('#retryWrongBtn').onclick = () => retryWrong(r);
  $('#shareResultBtn').onclick = () => {
    $('#shareCardBody').innerHTML = `
      <div class="share-card">
        <div class="sc-logo">MCI Social Hub</div>
        <div class="sc-sub">بطاقة نتيجة معتمدة</div>
        <div class="sc-score">${r.pct}%</div>
        <div class="sc-detail">${escapeHtml(r.subjectName)} — ${r.correct}/${r.total}</div>
        <div class="sc-detail">التقدير: ${escapeHtml(r.grade)}</div>
        <div class="sc-seal">معتمد من منصة الدفعة التعليمية — بإشراف الليدر صلاح أشرف</div>
      </div>
      <button class="btn btn-ghost btn-block mt-2" onclick="navigator.clipboard.writeText('MCI Social Hub — ${r.pct}% في ${escapeHtml(r.subjectName)}').then(()=>showToast('تم النسخ','success'))">نسخ النص</button>
    `;
    openModal('shareCardModal');
  };
  openModal('examResultModal');
}

function renderAnswerReview(q, i) {
  const opts = q.options || [];
  return `
    <div class="answer-review">
      <div class="ar-q">${i+1}. ${escapeHtml(q.question)}</div>
      ${opts.map((o,j) => {
        let c = 'ar-opt';
        if (j === q.correct) c += ' correct';
        else if (j === q._userAnswer) c += ' wrong';
        return `<div class="${c}">${j === q.correct ? 'صح: ' : (j === q._userAnswer ? 'خطأ: ' : '')}${escapeHtml(o)}</div>`;
      }).join('')}
      ${q.explanation ? `<div class="ar-explain">${escapeHtml(q.explanation)}</div>` : ''}
    </div>
  `;
}

function retryWrong(r) {
  const wrong = r.questions.filter(q => q._userAnswer !== q.correct);
  if (!wrong.length) return showToast('لا توجد أخطاء!', 'success');
  const s = {
    id: uid(), subjectId: r.subjectId, mode: 'custom',
    questions: wrong.map(q => ({ ...q, options: q.options ? shuffle(q.options) : q.options, _origOptions: q.options, _userAnswer: null, _flagged: false })),
    currentIdx: 0, startTime: Date.now(), durationMs: Math.max(5, wrong.length)*60000, tabSwitches: 0
  };
  s.questions.forEach(q => { if (q.type !== 'tf' && q.options && q._origOptions) q.correct = q.options.indexOf(q._origOptions[q.correct]); });
  AppState.activeExam = s;
  Store.set('activeExam', s);
  closeModal('examResultModal');
  launchExamRunner();
}

/* ============ Countdown ============ */
let cdTimer = null;
function startCountdown() {
  if (cdTimer) clearInterval(cdTimer);
  updateCountdown();
  cdTimer = setInterval(updateCountdown, 1000);
}
function updateCountdown() {
  if (!AppState.user) return;
  const exams = APP_DATA.branches[AppState.user.branch]?.exams || [];
  const now = Date.now();
  const upcoming = exams.map(e => ({...e, ts: new Date(e.datetime).getTime()})).filter(e => e.ts > now).sort((a,b) => a.ts - b.ts);
  if (upcoming.length === 0) {
    $('#cdGrid').classList.add('hidden');
    $('#cdExamName').textContent = '';
    $('#cdExamDate').textContent = '';
    const d = $('#cdDone'); d.classList.remove('hidden');
    d.textContent = 'انتهت امتحانات الميدتيرم بنجاح! بالتوفيق والنجاح للجميع';
    $('#nightBeforeWrap').classList.add('hidden');
    return;
  }
  $('#cdGrid').classList.remove('hidden');
  $('#cdDone').classList.add('hidden');
  const n = upcoming[0];
  $('#cdExamName').textContent = n.name;
  $('#cdExamDate').textContent = formatDateTime(n.datetime);
  const diff = n.ts - now;
  $('#cdDays').textContent = pad2(Math.floor(diff/86400000));
  $('#cdHours').textContent = pad2(Math.floor((diff%86400000)/3600000));
  $('#cdMins').textContent = pad2(Math.floor((diff%3600000)/60000));
  $('#cdSecs').textContent = pad2(Math.floor((diff%60000)/1000));
  if (diff <= 24*3600000 && diff > 0) $('#nightBeforeWrap').classList.remove('hidden');
  else $('#nightBeforeWrap').classList.add('hidden');
}

/* ============ Study Timer ============ */
let studyTimerState = { running: false, remaining: 25*60, mode: 'study' };
let studyTimerInterval = null;
function initStudyTimer() {
  const display = $('#studyTimerDisplay');
  const tick = () => {
    if (!studyTimerState.running) return;
    studyTimerState.remaining--;
    if (studyTimerState.remaining <= 0) {
      studyTimerState.running = false;
      showToast(studyTimerState.mode === 'study' ? 'خلصت 25 دقيقة! خد بريك 5 دقايق' : 'خلصت الراحة! يلا نكمل', 'success');
      clearInterval(studyTimerInterval);
      studyTimerInterval = null;
    }
    renderStudyTimer();
  };
  $('#studyTimerStart').onclick = () => {
    studyTimerState.running = !studyTimerState.running;
    if (studyTimerState.running && !studyTimerInterval) studyTimerInterval = setInterval(tick, 1000);
  };
  $('#studyTimerReset').onclick = () => {
    studyTimerState.remaining = 25*60; studyTimerState.mode = 'study';
    studyTimerState.running = false;
    clearInterval(studyTimerInterval); studyTimerInterval = null;
    renderStudyTimer();
  };
  $('#studyTimerBreak').onclick = () => {
    studyTimerState.remaining = 5*60; studyTimerState.mode = 'break';
    studyTimerState.running = true;
    if (!studyTimerInterval) studyTimerInterval = setInterval(tick, 1000);
    renderStudyTimer();
  };
  renderStudyTimer();
  function renderStudyTimer() {
    const m = Math.floor(studyTimerState.remaining/60), s = studyTimerState.remaining%60;
    display.textContent = pad2(m) + ':' + pad2(s);
  }
}

/* ============ Heartbeat ============ */
let heartbeatInterval = null;
function startHeartbeat() {
  if (!AppState.user) return;
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  const send = () => Cloud.sendHeartbeat(AppState.user.id);
  send();
  heartbeatInterval = setInterval(send, 60000);
}
async function updateLiveStudentsCount() {
  const el = $('#liveStudentsCount');
  if (!el) return;
  const count = await Cloud.getActiveStudentsCount();
  el.textContent = count + ' طالب';
  setTimeout(updateLiveStudentsCount, 30000);
}

/* ============ Notifications ============ */
async function notifyAllStudents(msg) {
  await Cloud.pushNotification(msg);
  showToast(msg, 'info', 5000);
  updateNotifBadge();
}
function updateNotifBadge() {
  const notifs = Store.get('notifications', []);
  const unread = notifs.filter(n => !n.read).length;
  const badge = $('#notifCount');
  if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}
function checkNotifications() {
  updateNotifBadge();
  $('#notifBtn').onclick = async () => {
    const notifs = await Cloud.getNotifications();
    $('#notifBody').innerHTML = notifs.length === 0 ? emptyState('لا توجد إشعارات','لسه مفيش حاجة جديدة') :
      notifs.map(n => `<div class="notif-item ${!n.read?'unread':''}"><strong>${escapeHtml(n.msg)}</strong><small>${new Date(n.date || n.createdAt || Date.now()).toLocaleString('ar-EG')}</small></div>`).join('');
    notifs.forEach(n => n.read = true);
    Store.set('notifications', notifs);
    updateNotifBadge();
    openModal('notifModal');
  };
}

/* ============ Readiness ============ */
async function updateReadiness() {
  if (!AppState.user || AppState.user.role === 'guest') return;
  const scores = (await Cloud.getScores()).filter(s => s.userName === AppState.user.name);
  let html = '<h3 class="section-title" style="font-size:1.15rem;">مؤشر جاهزيتك للجنة</h3><p class="section-sub">نسبة نجاحك في كل مادة</p>';
  for (const [sid, subj] of Object.entries(APP_DATA.subjects)) {
    const subScores = scores.filter(s => s.subjectId === sid);
    const avg = subScores.length ? Math.round(subScores.reduce((a,b) => a+b.pct, 0) / subScores.length) : 0;
    const msg = avg >= 80 ? 'فاضلك تكة وتقفل!' : (avg >= 60 ? 'كمّل كده' : (avg > 0 ? 'محتاج مراجعة' : 'ابدأ امتحان'));
    html += `
      <div class="readiness">
        <div class="readiness-circle" style="--pct:${avg}%"><span>${avg}%</span></div>
        <div class="readiness-info">
          <strong>${subj.name}</strong>
          <small>${subScores.length} امتحان — ${msg}</small>
        </div>
      </div>
    `;
  }
  $('#readinessSection').innerHTML = html;
}

/* ============ Branch Battle ============ */
async function updateBranchBattle() {
  const scores = await Cloud.getScores();
  const branches = ['MIS', 'Marketing', 'Accounting'];
  const names = { MIS: 'نظم معلومات', Marketing: 'تسويق', Accounting: 'محاسبة' };
  const avgs = {};
  branches.forEach(b => {
    const bs = scores.filter(s => s.branch === b);
    avgs[b] = bs.length ? Math.round(bs.reduce((a,x) => a+x.pct, 0) / bs.length) : 0;
  });
  const max = Math.max(...Object.values(avgs), 1);
  const leader = Object.entries(avgs).sort((a,b) => b[1]-a[1])[0];
  let html = '';
  branches.forEach(b => {
    const barW = max > 0 ? (avgs[b]/max)*100 : 0;
    html += `
      <div class="branch-row">
        <div class="br-name">${names[b]}</div>
        <div class="br-bar"><div class="br-fill ${b.toLowerCase()}" style="width:${barW}%"></div></div>
        <div class="br-pct">${avgs[b]}%</div>
      </div>
    `;
  });
  html += `<div class="leader">${avgs[leader[0]] > 0 ? 'الشعبة المتصدرة: ' + names[leader[0]] : 'ابدأوا الامتحانات لبدء المنافسة'}</div>`;
  $('#branchBattleContent').innerHTML = html;
}

/* ============ Poll ============ */
async function renderPoll() {
  const poll = await Cloud.getConfig('activePoll', null);
  if (!poll) { $('#pollWrap').innerHTML = ''; return; }
  const userVote = Store.get('pollVote', null);
  const total = poll.votes.reduce((a,b) => a+b, 0);
  $('#pollWrap').innerHTML = `
    <div class="poll-card">
      <h3>${escapeHtml(poll.question)}</h3>
      ${poll.options.map((opt, i) => {
        const pct = total > 0 ? Math.round((poll.votes[i]/total)*100) : 0;
        return `
          <div class="poll-option ${userVote===i?'voted':''}" data-opt="${i}">
            <div class="poll-fill" style="width:${pct}%"></div>
            <span class="poll-label">${escapeHtml(opt)}</span>
            <span class="poll-pct">${pct}%</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  if (userVote === null) {
    $$('#pollWrap .poll-option').forEach(o => o.onclick = async () => {
      const i = parseInt(o.dataset.opt);
      poll.votes[i]++;
      await Cloud.saveConfig('activePoll', poll);
      Store.set('pollVote', i);
      renderPoll();
      showToast('تم تسجيل صوتك', 'success');
    });
  }
}

/* ============ Rescue ============ */
function initRescue() {
  $('#rescueBtn').onclick = () => {
    if (AppState.user?.role === 'guest') return showToast('سجل حسابك أول', 'warning');
    const plan = Store.get('rescuePlan', null);
    if (plan) showRescuePlan(plan);
    else { $('#rescueForm').style.display = 'block'; $('#rescuePlanBody').innerHTML = ''; }
    openModal('rescuePlanModal');
  };
  $('#rescueStartBtn').onclick = () => {
    const subjId = $('#rescueSubject').value;
    const hours = parseInt($('#rescueHours').value);
    const plan = {
      subjectId: subjId, hours,
      slots: [
        { name: 'ملخصات', min: Math.round(hours*60*0.25) },
        { name: 'أسئلة', min: Math.round(hours*60*0.5) },
        { name: 'تركات', min: Math.round(hours*60*0.25) }
      ],
      startTime: Date.now()
    };
    Store.set('rescuePlan', plan);
    showRescuePlan(plan);
  };
}
function showRescuePlan(plan) {
  const subj = APP_DATA.subjects[plan.subjectId];
  const elapsed = Math.floor((Date.now() - plan.startTime) / 60000);
  $('#rescueForm').style.display = 'none';
  let html = `<h4 class="mb-2">خطة الإنقاذ — ${subj.name}</h4><p class="text-sm text-muted mb-2">${plan.hours} ساعة موزعة تلقائياً</p>`;
  let cum = 0;
  plan.slots.forEach(s => {
    const start = cum;
    cum += s.min;
    const done = elapsed >= cum;
    const active = elapsed >= start && elapsed < cum;
    html += `
      <div class="readiness" style="border-color:${done?'var(--success)':(active?'var(--primary)':'var(--border)')}">
        <div class="readiness-circle" style="--pct:${done?100:0}%"><span>${done?'تم':'...'}</span></div>
        <div class="readiness-info">
          <strong>${s.name}</strong>
          <small>${s.min} دقيقة — من د${start} لد${cum}</small>
        </div>
      </div>
    `;
  });
  if (elapsed < cum) html += `<p class="text-sm mt-2">الوقت الحالي: <strong>د${elapsed}</strong> من ${cum}</p>`;
  else { html += `<p class="text-sm mt-2" style="color:var(--success)">خلصت الخطة! بالتوفيق</p>`; Store.remove('rescuePlan'); }
  $('#rescuePlanBody').innerHTML = html;
}

/* ============ Duel ============ */
function initDuel() {
  $('#duelCreateBtn').onclick = async () => {
    if (AppState.user?.role === 'guest') return showToast('سجل حسابك أول', 'warning');
    const sid = $('#duelSubject').value;
    const qs = await Cloud.getQuestions(sid);
    if (qs.length < 10) return showToast('المادة تحتاج 10 أسئلة على الأقل', 'warning');
    const code = String(Math.floor(100000 + Math.random()*900000));
    const expiresAt = Date.now() + 30 * 60 * 1000;
    const duel = {
      code, subjectId: sid,
      creatorId: AppState.user.id,
      creatorName: AppState.user.name,
      questions: shuffle(qs).slice(0, 10),
      createdAt: Date.now(),
      expiresAt,
      status: 'waiting',
      players: {}
    };
    await registerUserWithLoading(null, null, null, 'جاري تجهيز التحدي...');
    await Cloud.createDuel(duel);
    $('#duelCodeDisplay').textContent = code;
    $('#duelExpiresAt').textContent = new Date(expiresAt).toLocaleTimeString('ar-EG');
    $('#duelCodeWrap').classList.remove('hidden');
    $('#duelCopyBtn').onclick = () => navigator.clipboard?.writeText(code).then(() => showToast('تم نسخ الكود', 'success'));
    $('#duelShareBtn').onclick = () => {
      const link = location.origin + location.pathname + '?duel=' + code;
      const txt = `تحدي 1v1 في MCI Social Hub — كود: ${code}\n${link}`;
      if (navigator.share) navigator.share({ title: 'تحدي 1v1', text: txt }).catch(()=>{});
      else navigator.clipboard?.writeText(txt).then(() => showToast('تم نسخ الرابط', 'success'));
    };
    openDuelWaiting(code, true);
  };
  $('#duelJoinBtn').onclick = async () => {
    if (AppState.user?.role === 'guest') return showToast('سجل حسابك أول', 'warning');
    const code = $('#duelJoinCode').value.trim();
    $('#duelJoinErr').classList.remove('show');
    if (!code) return;
    const duel = await Cloud.getDuel(code);
    if (!duel) { $('#duelJoinErr').classList.add('show'); return; }
    if (Date.now() > duel.expiresAt) { $('#duelJoinErr').textContent = 'انتهت صلاحية الكود'; $('#duelJoinErr').classList.add('show'); return; }
    if (duel.creatorId === AppState.user.id) return showToast('مش تقدر تلعب ضد نفسك', 'warning');
    openDuelWaiting(code, false);
  };
}

async function openDuelWaiting(code, isCreator) {
  openModal('duelRunnerModal');
  $('#duelRunnerTitle').textContent = 'تحدي 1v1 — غرفة الانتظار';
  $('#duelRunnerBody').innerHTML = `
    <div class="duel-wait">
      <div class="duel-spin"></div>
      <h3>في انتظار صاحبك يدخل...</h3>
      <p>كود التحدي: <strong>${code}</strong></p>
      <p class="mt-2 text-sm">${isCreator ? 'ابعت الكود لصاحبك عشان ينضم' : 'جاري تجهيز التحدي...'}</p>
    </div>
  `;
  if (AppState.duelUnsubscribe) AppState.duelUnsubscribe();
  AppState.duelUnsubscribe = Cloud.watchDuel(code, async (duel) => {
    if (duel.status === 'waiting') {
      if (!isCreator && duel.creatorId !== AppState.user.id) {
        await Cloud.updateDuel(code, {
          status: 'ready',
          players: { ...duel.players, [AppState.user.id]: { name: AppState.user.name, ready: true, joinedAt: Date.now() } }
        });
      }
    } else if (duel.status === 'ready') {
      $('#duelRunnerBody').innerHTML = `<div class="duel-wait"><h3>جاهز! استعد...</h3><p>التحدي هيبدأ في 3 ثواني</p></div>`;
      setTimeout(() => {
        if (AppState.duelUnsubscribe) AppState.duelUnsubscribe();
        startDuelExam(duel);
      }, 3000);
    }
  });
}

function startDuelExam(duel) {
  const qs = duel.questions.map(q => ({
    ...q,
    options: q.options ? shuffle(q.options) : q.options,
    _origOptions: q.options,
    _userAnswer: null, _flagged: false
  }));
  qs.forEach(q => { if (q.type !== 'tf' && q.options && q._origOptions) q.correct = q.options.indexOf(q._origOptions[q.correct]); });
  const s = {
    id: uid(), subjectId: duel.subjectId, mode: 'duel',
    questions: qs, currentIdx: 0, startTime: Date.now(), durationMs: 5*60000, tabSwitches: 0,
    code: duel.code
  };
  AppState.activeDuel = { session: s, code: duel.code };
  $('#duelRunnerTitle').textContent = 'تحدي 1v1 — ' + APP_DATA.subjects[duel.subjectId].name;
  renderDuelRunner();
}
function renderDuelRunner() {
  const s = AppState.activeDuel.session;
  const q = s.questions[s.currentIdx];
  const total = s.questions.length;
  const answered = s.questions.filter(x => x._userAnswer !== null).length;
  $('#duelRunnerBody').innerHTML = `
    <div class="exam-timer-text"><span>${answered}/${total} محلول</span><span>كود: ${AppState.activeDuel.code}</span></div>
    <div class="question-card">
      <span class="question-num">سؤال ${s.currentIdx+1} من ${total}</span>
      <div class="question-text">${escapeHtml(q.question)}</div>
      <div class="options-list" id="duelOptions">
        ${(q.options||[]).map((o,i) => `
          <div class="option ${q._userAnswer===i?'selected':''}" data-optidx="${i}">
            <span class="option-marker">${['أ','ب','ج','د'][i]||i+1}</span><span>${escapeHtml(o)}</span>
          </div>
        `).join('')}
      </div>
      <div class="flex between center mt-3">
        <button class="btn btn-ghost btn-sm" id="duelPrev" ${s.currentIdx===0?'disabled':''}>السابق</button>
        <button class="btn btn-ghost btn-sm" id="duelNext" ${s.currentIdx===total-1?'disabled':''}>التالي</button>
        ${s.currentIdx===total-1 ? '<button class="btn btn-primary btn-sm" id="duelSubmit">تسليم</button>' : ''}
      </div>
    </div>
  `;
  $$('#duelOptions .option').forEach(o => o.onclick = () => {
    s.questions[s.currentIdx]._userAnswer = parseInt(o.dataset.optidx);
    renderDuelRunner();
  });
  $('#duelPrev')?.addEventListener('click', () => { if (s.currentIdx>0) { s.currentIdx--; renderDuelRunner(); }});
  $('#duelNext')?.addEventListener('click', () => { if (s.currentIdx<total-1) { s.currentIdx++; renderDuelRunner(); }});
  $('#duelSubmit')?.addEventListener('click', submitDuel);
}
async function submitDuel() {
  const s = AppState.activeDuel.session;
  const total = s.questions.length;
  let correct = 0;
  s.questions.forEach(q => { if (q._userAnswer === q.correct) correct++; });
  const pct = Math.round((correct/total)*100);
  const time = Math.floor((Date.now() - s.startTime) / 1000);
  const xp = Math.round(pct/2) + 20;
  addXP(xp);
  await Cloud.updateDuel(AppState.activeDuel.code, {
    [`players.${AppState.user.id}`]: { name: AppState.user.name, score: pct, correct, total, time, finished: true, xp }
  });
  const duel = await Cloud.getDuel(AppState.activeDuel.code);
  const players = Object.entries(duel.players || {});
  const allFinished = players.filter(([id, p]) => p.finished && (p.score !== undefined)).length >= 2;
  let resultHtml = `
    <div class="result-hero">
      <div class="score-num">${correct}/${total}</div>
      <div class="score-pct">${pct}%</div>
      <div class="grade">وقتك: ${time} ثانية</div>
    </div>
    <h4 class="mt-3 mb-2">النتائج</h4>
    <div class="grid grid-2">
  `;
  players.forEach(([id, p]) => {
    resultHtml += `
      <div class="card">
        <strong>${escapeHtml(p.name || 'لاعب')}</strong>
        <p class="text-sm">${p.score !== undefined ? p.score + '%' : 'لم يلعب بعد'} ${p.finished ? '— ' + p.time + 'ث' : ''}</p>
      </div>
    `;
  });
  resultHtml += `</div>`;
  if (allFinished) {
    const sorted = players.filter(([id,p]) => p.finished).sort((a,b) => b[1].score - a[1].score || a[1].time - b[1].time);
    if (sorted.length >= 2) {
      const winner = sorted[0];
      const isWinnerMe = winner[0] === AppState.user.id;
      resultHtml += `<p class="text-center mt-3" style="font-size:1.1rem;font-weight:700;color:var(--success)">${isWinnerMe ? 'أنت كسبت! +20 XP إضافي' : 'صاحبك كسب التحدي'}</p>`;
      if (isWinnerMe) addXP(20);
    }
  } else {
    resultHtml += `<p class="text-center mt-3 text-muted">في انتظار صاحبك يخلص...</p>`;
  }
  resultHtml += `<button class="btn btn-primary btn-block mt-3" onclick="closeModal('duelRunnerModal');if(window.AppState.duelUnsubscribe)window.AppState.duelUnsubscribe();">تم</button>`;
  $('#duelRunnerBody').innerHTML = resultHtml;
}

/* ============ Motivation ============ */
function setRandomMotivation() {
  const list = APP_DATA.motivations;
  const pick = () => list[Math.floor(Math.random()*list.length)];
  $('#motivationText').textContent = pick();
  $('#newMotivationBtn').onclick = () => $('#motivationText').textContent = pick();
}

/* ============ Leaderboard ============ */
async function renderLeaderboard() {
  const scores = await Cloud.getScores();
  const users = await Cloud.getUsers();
  const container = $('#leaderboardContent');
  if (scores.length === 0 && users.length === 0) {
    container.innerHTML = emptyState('لوحة الشرف فارغة','أكمل امتحان لتظهر هنا');
    return;
  }
  const best = {};
  scores.forEach(s => { if (!best[s.subjectId] || s.pct > best[s.subjectId].pct) best[s.subjectId] = s; });
  const topUsers = users.slice().sort((a,b) => (b.xp||0) - (a.xp||0)).slice(0, 5);
  let html = '<div class="grid grid-2">';
  for (const [sid, subj] of Object.entries(APP_DATA.subjects)) {
    const b = best[sid];
    html += `<div class="card"><h3>${subj.name}</h3>${b ? `<p class="text-sm mt-1"><strong>${escapeHtml(b.userName)}</strong> — ${b.pct}%</p>` : '<p class="text-sm text-muted">لا توجد نتائج</p>'}</div>`;
  }
  html += '</div>';
  if (topUsers.length) {
    html += '<h3 class="section-title mt-3" style="font-size:1.15rem;">أعلى XP</h3><div class="grid grid-3">';
    topUsers.forEach((u, i) => {
      html += `<div class="card"><strong>#${i+1} ${escapeHtml(u.name)}</strong><p class="text-sm text-muted">${u.xp || 0} XP — ${APP_DATA.branches[u.branch]?.name || ''}</p></div>`;
    });
    html += '</div>';
  }
  container.innerHTML = html;
}

/* ============ Night Before ============ */
function initNightBefore() {
  $('#nightBeforeBtn')?.addEventListener('click', async () => {
    if (AppState.user?.role === 'guest') return showToast('سجل حسابك أول', 'warning');
    const exams = APP_DATA.branches[AppState.user.branch]?.exams || [];
    const next = exams.map(e => ({...e, ts: new Date(e.datetime).getTime()})).filter(e => e.ts > Date.now()).sort((a,b) => a.ts - b.ts)[0];
    if (!next) return showToast('لا يوجد امتحان قادم', 'warning');
    const sid = Object.keys(APP_DATA.subjects).find(k => APP_DATA.subjects[k].name === next.name) || 'law';
    const qs = await Cloud.getQuestions(sid);
    if (qs.length === 0) return showToast('جاري تجهيز أسئلة المادة', 'warning');
    const important = shuffle(qs).slice(0, 20);
    $('#nightBeforeBody').innerHTML = `
      <p class="text-sm text-muted mb-2">أهم 20 نقطة وتريكة لا تُفوَّت في ${APP_DATA.subjects[sid].name}</p>
      ${important.map((q, i) => `
        <div class="answer-review">
          <div class="ar-q">${i+1}. ${escapeHtml(q.question)} ${q.is_trick ? '<span class="badge badge-danger">تريكة</span>' : ''}</div>
          ${q.options ? q.options.map((o,j) => `<div class="ar-opt ${j===q.correct?'correct':''}">${escapeHtml(o)}</div>`).join('') : ''}
          ${q.explanation ? `<div class="ar-explain">${escapeHtml(q.explanation)}</div>` : ''}
        </div>
      `).join('')}
    `;
    openModal('nightBeforeModal');
  });
}

/* ============ Ask Salah ============ */
function initAskSalah() {
  $('#askSalahBtn').onclick = () => {
    if (AppState.user?.role === 'guest') return showToast('سجل حسابك أول', 'warning');
    $('#reportName').value = AppState.user.name;
    openModal('askSalahModal');
  };
  $('#reportSubmitBtn').onclick = async () => {
    const name = $('#reportName').value.trim();
    const phone = $('#reportPhone').value.trim();
    const msg = $('#reportMessage').value.trim();
    if (!name || !phone || !msg) return showToast('أكمل البيانات', 'warning');
    if (!/^01\d{9}$/.test(phone)) return showToast('رقم الموبايل غير صحيح', 'warning');
    await Cloud.saveReport({ id: uid(), name, phone, msg, date: new Date().toISOString(), resolved: false });
    closeModal('askSalahModal');
    $('#reportName').value=''; $('#reportPhone').value=''; $('#reportMessage').value='';
    showToast('تم إرسال البلاغ للّيدر', 'success');
  };
}

/* ============ Auth Handlers ============ */
function initAuthHandlers() {
  $('#registerCard').onclick = () => openModal('registerModal');
  $('#guestCard').onclick = () => openModal('guestBranchModal');
  $('#loginCard').onclick = () => openModal('loginModal');
  $('#lockRegisterBtn').onclick = () => openModal('registerModal');
  $('#lockRegisterBtn2').onclick = () => openModal('registerModal');
  
  $('#userChip').onclick = () => {
    if (AppState.user?.role === 'guest') openModal('registerModal');
  };
  
  $('#registerSubmitBtn').onclick = async () => {
    const name = $('#regName').value, branch = $('#regBranch').value, pin = $('#regPin').value;
    let ok = true;
    ['regNameErr','regBranchErr','regPinErr'].forEach(id => $('#'+id).classList.remove('show'));
    if (!name.trim() || name.trim().split(/\s+/).length < 2) { $('#regNameErr').classList.add('show'); ok=false; }
    if (!branch) { $('#regBranchErr').classList.add('show'); ok=false; }
    if (!/^\d{4,6}$/.test(pin)) { $('#regPinErr').classList.add('show'); ok=false; }
    if (!ok) return;
    const res = await registerUser(name, branch, pin);
    if (!res.ok) { $('#regPinErr').textContent = res.error; $('#regPinErr').classList.add('show'); return; }
    closeModal('registerModal');
    setSession(res.user);
    showToast('تم إنشاء حسابك بنجاح', 'success');
  };
  
  $('#guestEnterBtn').onclick = () => {
    const branch = $('#guestBranch').value;
    closeModal('guestBranchModal');
    loginGuest(branch);
    showToast('دخلت كزائر — المذاكرة متاحة، الامتحانات مقفولة', 'info');
  };
  
  $('#loginSubmitBtn').onclick = async () => {
    const pin = $('#loginPin').value;
    $('#loginPinErr').classList.remove('show');
    const user = await loginUserByPin(pin);
    if (!user) { $('#loginPinErr').classList.add('show'); return; }
    closeModal('loginModal');
    setSession(user);
    showToast('تم تسجيل الدخول', 'success');
  };
}

/* ============ Secret Admin ============ */
let secretClicks = 0, secretTimer = null;
function initSecretAdmin() {
  $('#secretTrigger').onclick = () => {
    secretClicks++;
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => secretClicks = 0, 2000);
    if (secretClicks >= 5) { secretClicks = 0; openModal('adminLoginModal'); }
  };
  $('#adminLoginBtn').onclick = () => {
    const pass = $('#adminPassword').value;
    if (pass === '123') {
      closeModal('adminLoginModal');
      $('#adminPassword').value = '';
      openModal('adminDashboardModal');
      initAdminDashboard();
      showToast('مرحباً ليدر الدفعة', 'success');
    } else {
      $('#adminPassErr').classList.add('show');
    }
  };
}

/* ============ Admin Dashboard ============ */
function initAdminDashboard() {
  $$('.admin-tab').forEach(t => t.onclick = () => {
    $$('.admin-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $$('.admin-panel').forEach(p => p.classList.remove('active'));
    const pid = 'adminPanel' + t.dataset.atab.charAt(0).toUpperCase() + t.dataset.atab.slice(1);
    $('#'+pid)?.classList.add('active');
    if (t.dataset.atab === 'stats') renderAdminStats();
    if (t.dataset.atab === 'reports') renderReports();
    if (t.dataset.atab === 'exams') renderQbank();
    if (t.dataset.atab === 'ztona') renderZtonaAdmin();
  });

  $('#bulkPreviewBtn').onclick = () => {
    const parsed = parseBulkText($('#bulkText').value);
    $('#bulkPreview').innerHTML = parsed.length ? parsed.map((q,i) => `<div class="qbank-item"><div class="qb-q">${i+1}. ${escapeHtml(q.question)}</div><div class="qb-meta">${q.options.map((o,j) => `<span class="badge ${j===q.correct?'badge-success':'badge-primary'}">${escapeHtml(o)}</span>`).join('')}</div></div>`).join('') : '<p class="text-muted">لا توجد أسئلة</p>';
  };
  $('#bulkSubmitBtn').onclick = async () => {
    const sid = $('#bulkSubject').value;
    const parsed = parseBulkText($('#bulkText').value);
    if (!parsed.length) return showToast('لا توجد أسئلة صالحة', 'warning');
    const existing = await Cloud.getQuestions(sid);
    await Cloud.saveQuestions(sid, existing.concat(parsed));
    showToast(`تم رفع ${parsed.length} سؤال`, 'success');
    $('#bulkText').value = '';
    $('#bulkPreview').innerHTML = '';
    renderSubjects();
    renderQbank();
    await notifyAllStudents('رفع الليدر صلاح أشرف أسئلة جديدة لمادة ' + APP_DATA.subjects[sid].name + ' دلوقتي!');
  };

  $('#singleSubmitBtn').onclick = async () => {
    const sid = $('#singleSubject').value;
    const type = $('#singleType').value;
    const question = $('#singleQuestion').value.trim();
    const correct = parseInt($('#singleCorrect').value);
    const isTrick = $('#singleTrick').value === 'true';
    const explanation = $('#singleExplain').value.trim();
    let options;
    if (type === 'tf') options = ['صح','خطأ'];
    else options = [$('#singleOptA').value.trim(), $('#singleOptB').value.trim(), $('#singleOptC').value.trim(), $('#singleOptD').value.trim()].filter(Boolean);
    if (!question || options.length < 2 || correct >= options.length) return showToast('أكمل البيانات', 'warning');
    const existing = await Cloud.getQuestions(sid);
    existing.push({ id: uid(), question, options, correct, explanation, type, is_trick: isTrick });
    await Cloud.saveQuestions(sid, existing);
    showToast('تم إضافة السؤال', 'success');
    $('#singleQuestion').value=''; $('#singleOptA').value=''; $('#singleOptB').value=''; $('#singleOptC').value=''; $('#singleOptD').value=''; $('#singleExplain').value='';
    renderSubjects();
    renderQbank();
    await notifyAllStudents('رفع الليدر صلاح أشرف أسئلة جديدة لمادة ' + APP_DATA.subjects[sid].name + ' دلوقتي!');
  };

  $('#bankSubjectFilter').onchange = renderQbank;
  renderQbank();

  $('#notesSubmitBtn').onclick = async () => {
    const sid = $('#notesSubject').value;
    const title = $('#notesChapter').value.trim(), content = $('#notesContent').value.trim();
    if (!title || !content) return showToast('أكمل البيانات', 'warning');
    const notes = await Cloud.getNotes(sid);
    notes.push({ title, content });
    await Cloud.saveNotes(sid, notes);
    $('#notesChapter').value=''; $('#notesContent').value='';
    showToast('تم إضافة الملخص', 'success');
  };
  $('#flashSubmitBtn').onclick = async () => {
    const sid = $('#flashSubject').value;
    const term = $('#flashTerm').value.trim(), answer = $('#flashAnswer').value.trim();
    if (!term || !answer) return showToast('أكمل البيانات', 'warning');
    const cards = await Cloud.getFlashcards(sid);
    cards.push({ term, answer });
    await Cloud.saveFlashcards(sid, cards);
    $('#flashTerm').value=''; $('#flashAnswer').value='';
    showToast('تم إضافة البطاقة', 'success');
  };

  $('#ztonaSubmitBtn').onclick = async () => {
    const sid = $('#ztonaSubject').value;
    const text = $('#ztonaText').value.trim();
    const important = $('#ztonaImportant').value === 'true';
    if (!text) return showToast('اكتب النقطة', 'warning');
    const ztona = await Cloud.getZtona(sid);
    ztona.push({ id: uid(), text, important });
    await Cloud.saveZtona(sid, ztona);
    $('#ztonaText').value = '';
    showToast('تم إضافة النقطة', 'success');
    renderZtonaAdmin();
  };

  $('#tickerSubmitBtn').onclick = async () => {
    const msgs = $('#tickerInput').value.split('\n').map(l => l.trim()).filter(Boolean);
    if (!msgs.length) return showToast('أدخل رسالة واحدة', 'warning');
    await Cloud.saveTicker(msgs);
    renderTicker(msgs);
    showToast('تم تحديث الشريط', 'success');
  };
  $('#broadcastBtn').onclick = async () => {
    const msg = $('#broadcastMsg').value.trim();
    if (!msg) return;
    await notifyAllStudents(msg);
    $('#broadcastMsg').value = '';
    showToast('تم إرسال الإشعار', 'success');
  };
  $('#leaderMsgSaveBtn').onclick = async () => {
    const txt = $('#leaderMsgEdit').value.trim();
    if (!txt) return;
    $('#leaderMessageContent').innerHTML = txt.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
    await Cloud.saveConfig('leaderMessage', txt);
    showToast('تم حفظ الرسالة', 'success');
  };
  (async () => {
    const savedMsg = await Cloud.getConfig('leaderMessage', null);
    if (savedMsg) $('#leaderMsgEdit').value = savedMsg;
    else $('#leaderMsgEdit').value = 'أهلاً بكم في MCI Social Hub،\nهذه المنصة بيتنا الرقمي الذي نجتمع فيه لنذاكر معاً.\nبالتوفيق للجميع.';
  })();

  $('#pollCreateBtn').onclick = async () => {
    const q = $('#pollQuestion').value.trim();
    const opts = $('#pollOptions').value.split('\n').map(l => l.trim()).filter(Boolean);
    if (!q || opts.length < 2) return showToast('أكمل البيانات', 'warning');
    const poll = { question: q, options: opts, votes: opts.map(() => 0), createdAt: Date.now() };
    await Cloud.saveConfig('activePoll', poll);
    Store.remove('pollVote');
    renderPoll();
    showToast('تم إنشاء التصويت', 'success');
    renderPollAdmin();
  };
  $('#pollResetBtn').onclick = async () => {
    if (!confirm('إعادة ضبط التصويت؟ سيتم حذفه نهائياً')) return;
    await Cloud.deleteConfig('activePoll');
    Store.remove('pollVote');
    renderPoll();
    renderPollAdmin();
    showToast('تم إعادة الضبط', 'success');
  };
  renderPollAdmin();
  async function renderPollAdmin() {
    const poll = await Cloud.getConfig('activePoll', null);
    if (!poll) { $('#pollAdminResult').innerHTML = '<p class="text-muted">لا يوجد تصويت نشط</p>'; return; }
    const total = poll.votes.reduce((a,b) => a+b, 0);
    $('#pollAdminResult').innerHTML = `<h4 class="mb-2">النتائج الحالية</h4>` + poll.options.map((o,i) => `<div class="qbank-item"><div class="qb-q">${escapeHtml(o)}</div><div class="qb-meta"><span class="badge badge-primary">${poll.votes[i]} صوت</span><span class="badge badge-success">${total>0?Math.round(poll.votes[i]/total*100):0}%</span></div></div>`).join('');
  }
  
  async function renderZtonaAdmin() {
    const sid = $('#ztonaSubject').value;
    if (!sid) return;
    const ztona = await Cloud.getZtona(sid);
    if (!ztona.length) { $('#ztonaAdminList').innerHTML = '<p class="text-muted">لا توجد نقاط</p>'; return; }
    $('#ztonaAdminList').innerHTML = ztona.map((z,i) => `
      <div class="qbank-item">
        <div class="qb-q">${i+1}. ${escapeHtml(z.text)} ${z.important ? '<span class="badge badge-danger">تريكة</span>' : ''}</div>
        <div class="qb-actions"><button class="btn btn-danger btn-xs" onclick="deleteZtona('${sid}','${z.id}')">حذف</button></div>
      </div>
    `).join('');
  }
  $('#ztonaSubject').onchange = renderZtonaAdmin;
  window.deleteZtona = async function(sid, zid) {
    if (!confirm('حذف النقطة؟')) return;
    const ztona = await Cloud.getZtona(sid);
    await Cloud.saveZtona(sid, ztona.filter(z => z.id !== zid));
    renderZtonaAdmin();
    showToast('تم الحذف', 'success');
  };
}

function parseBulkText(text) {
  const blocks = text.split(/\n-{3,}\n|\n\n+/).map(b => b.trim()).filter(Boolean);
  const result = [];
  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const question = lines[0];
    const options = [];
    let correct = -1, explanation = '';
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^الإجابة\s*[:：]/.test(line)) {
        const ans = line.replace(/^الإجابة\s*[:：]\s*/, '').trim().toLowerCase();
        const map = { 'أ':0,'ب':1,'ج':2,'د':3,'a':0,'b':1,'c':2,'d':3 };
        if (map[ans] !== undefined) correct = map[ans];
        else if (/^\d+$/.test(ans)) correct = parseInt(ans) - 1;
      } else if (/^الشرح\s*[:：]/.test(line)) {
        explanation = line.replace(/^الشرح\s*[:：]\s*/, '').trim();
      } else if (/^[أبجد]|^[a-dA-D][\.\)]/.test(line)) {
        options.push(line.replace(/^[أ-يa-zA-Z][\.\)]\s*/, '').trim());
      }
    }
    if (question && options.length >= 2 && correct >= 0 && correct < options.length) {
      result.push({
        id: uid(), question, options, correct, explanation,
        type: options.length === 2 && options.includes('صح') ? 'tf' : 'mcq',
        is_trick: /(تركة|استثناء|انتبه|خطأ شائع)/.test(question)
      });
    }
  });
  return result;
}

async function renderQbank() {
  const sid = $('#bankSubjectFilter').value;
  if (!sid) return;
  const qs = await Cloud.getQuestions(sid);
  if (!qs.length) { $('#qbankList').innerHTML = '<p class="text-muted">لا توجد أسئلة بعد</p>'; return; }
  $('#qbankList').innerHTML = qs.map((q,i) => `
    <div class="qbank-item">
      <div class="qb-q">${i+1}. ${escapeHtml(q.question)} ${q.is_trick?'<span class="badge badge-danger">تريكة</span>':''}</div>
      <div class="qb-meta">${q.options.map((o,j) => `<span class="badge ${j===q.correct?'badge-success':'badge-primary'}">${escapeHtml(o)}</span>`).join('')}</div>
      <div class="qb-actions"><button class="btn btn-danger btn-xs" onclick="deleteQuestion('${sid}','${q.id}')">حذف</button></div>
    </div>
  `).join('');
}

window.deleteQuestion = async function(sid, qid) {
  if (!confirm('حذف السؤال؟')) return;
  const qs = await Cloud.getQuestions(sid);
  await Cloud.saveQuestions(sid, qs.filter(q => q.id !== qid));
  renderQbank();
  renderSubjects();
  showToast('تم الحذف', 'success');
};

async function renderAdminStats() {
  const users = await Cloud.getUsers();
  const scores = await Cloud.getScores();
  const branches = { MIS: 0, Marketing: 0, Accounting: 0 };
  users.forEach(u => { if (branches[u.branch] !== undefined) branches[u.branch]++; });
  $('#adminStatsContent').innerHTML = `
    <div class="grid grid-2">
      <div class="card"><h3>إجمالي المسجلين</h3><p style="font-size:1.8rem;font-weight:700;color:var(--primary)">${users.length}</p></div>
      <div class="card"><h3>إجمالي الامتحانات</h3><p style="font-size:1.8rem;font-weight:700;color:var(--primary)">${scores.length}</p></div>
      <div class="card"><h3>نظم معلومات</h3><p style="font-size:1.8rem;font-weight:700;color:var(--primary)">${branches.MIS}</p></div>
      <div class="card"><h3>تسويق</h3><p style="font-size:1.8rem;font-weight:700;color:var(--primary)">${branches.Marketing}</p></div>
      <div class="card"><h3>محاسبة</h3><p style="font-size:1.8rem;font-weight:700;color:var(--primary)">${branches.Accounting}</p></div>
    </div>
    <h4 class="mt-3 mb-2">جدول الطلاب</h4>
    <div>${users.map(u => `<div class="qbank-item"><div class="qb-q">${escapeHtml(u.name)}</div><div class="qb-meta"><span class="badge badge-primary">${APP_DATA.branches[u.branch]?.name||u.branch}</span><span class="badge badge-success">${u.xp||0} XP</span></div><div class="qb-actions"><button class="btn btn-danger btn-xs" onclick="deleteUserAdmin('${u.id}')">حذف</button></div></div>`).join('')}</div>
  `;
}

window.deleteUserAdmin = async function(id) {
  if (!confirm('حذف الحساب؟')) return;
  await Cloud.deleteUser(id);
  renderAdminStats();
  showToast('تم الحذف', 'success');
};

async function renderReports() {
  const reports = await Cloud.getReports();
  if (!reports.length) { $('#reportsList').innerHTML = '<p class="text-muted">لا توجد بلاغات</p>'; return; }
  $('#reportsList').innerHTML = reports.map(r => `
    <div class="qbank-item">
      <div class="qb-q">${escapeHtml(r.name)} — ${escapeHtml(r.phone)}</div>
      <div class="qb-meta">${escapeHtml(r.msg)}</div>
      <div class="qb-meta"><span class="text-xs">${new Date(r.date || r.createdAt || Date.now()).toLocaleString('ar-EG')}</span><span class="badge ${r.resolved?'badge-success':'badge-warning'}">${r.resolved?'تم':'قيد الانتظار'}</span></div>
      <div class="qb-actions">${!r.resolved?`<button class="btn btn-success btn-xs" onclick="resolveReportAdmin('${r.id}')">تم الحل</button>`:''}</div>
    </div>
  `).join('');
}

window.resolveReportAdmin = async function(id) {
  await Cloud.resolveReport(id);
  renderReports();
  showToast('تم الحل', 'success');
};

/* ============ Ticker ============ */
async function loadTicker() {
  const msgs = await Cloud.getTicker();
  renderTicker(msgs);
  $('#tickerInput').value = msgs.join('\n');
}
function renderTicker(msgs) {
  $('#tickerInner').innerHTML = msgs.map(m => `<span>${escapeHtml(m)}</span>`).join('');
}

/* ============ Resume Banner ============ */
function checkResumeBanner() {
  const saved = Store.get('activeExam', null);
  if (!saved) return;
  const subj = APP_DATA.subjects[saved.subjectId];
  $('#resumeBannerText').textContent = `لديك امتحان غير مكتمل في ${subj.name} — هل تود استكماله؟`;
  $('#resumeBanner').classList.remove('hidden');
  $('#resumeBannerYes').onclick = () => {
    AppState.activeExam = saved;
    $('#resumeBanner').classList.add('hidden');
    launchExamRunner();
  };
  $('#resumeBannerNo').onclick = () => {
    Store.remove('activeExam');
    $('#resumeBanner').classList.add('hidden');
  };
}

/* ============ Leader Msg ============ */
function initLeaderMsg() { $('#leaderMsgBtn').onclick = () => openModal('leaderMsgModal'); }

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initModals();
  initNav();
  initSidebar();
  initAuthHandlers();
  initSecretAdmin();
  initLeaderMsg();
  initStudyTimer();
  initRescue();
  initDuel();
  initNightBefore();
  initAskSalah();

  if (restoreSession()) afterLogin();

  $('#heroStudyBtn').onclick = () => navigateTo('study');
  $('#heroExamBtn').onclick = () => navigateTo('exams');
  $('#heroDuelBtn').onclick = () => navigateTo('duel');
  
  $('#examQuitBtn').onclick = () => {
    if (confirm('إغلاق الامتحان؟ سيتم حفظ تقدمك')) { clearInterval(examTimerInterval); closeModal('examRunnerModal'); }
  };
  $('#duelQuitBtn').onclick = () => {
    if (AppState.duelUnsubscribe) AppState.duelUnsubscribe();
    closeModal('duelRunnerModal'); AppState.activeDuel = null;
  };

  const params = new URLSearchParams(location.search);
  const duelCode = params.get('duel');
  if (duelCode) {
    setTimeout(() => {
      const el = $('#duelJoinCode');
      if (el) el.value = duelCode;
      if (!AppState.user) openModal('registerModal');
      else navigateTo('duel');
    }, 1000);
  }
});

function initModals() {
  $$('.modal-close').forEach(b => b.onclick = () => { const t = b.dataset.close; if (t) closeModal(t); });
  $$('.modal-backdrop').forEach(bd => bd.onclick = (e) => {
    if (e.target === bd) {
      if (bd.id === 'examRunnerModal' && AppState.activeExam) return;
      if (bd.id === 'duelRunnerModal' && AppState.activeDuel) return;
      bd.classList.remove('active');
    }
  });
}
