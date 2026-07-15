/**
 * ═══════════════════════════════════════════════════════
 *  AI Fitness Buddy — Frontend Application Logic
 *  Chat · BMI Calculator · Workout Planner · Progress
 *  Nutrition · Profile · Dark Mode · Water Tracker
 * ═══════════════════════════════════════════════════════
 */

'use strict';

/* ── App State ─────────────────────────────────────── */
const State = {
  chatHistory:  [],      // {role, content}[]
  waterCount:   0,
  profile:      {},
  progressLog:  [],      // {date, weight, calories, duration, mood}[]
  stats:        { calories: 0, workouts: 0, streak: 0 },
  theme:        'light',
};

/* ── DOM Helpers ───────────────────────────────────── */
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ═══════════════════════════════════════════════════
   INITIALISATION
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initTheme();
  initGreeting();
  loadMotivation();
  renderStats();
  renderWater();
  renderProfile();
  renderProgress();
  renderAchievements();
  initChatInput();

  // Tab navigation
  $$('.nav-tab').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      // close mobile nav
      const col = document.getElementById('navMenu');
      if (col.classList.contains('show')) {
        bootstrap.Collapse.getInstance(col)?.hide();
      }
    });
  });
});

/* ═══════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('fitbuddy_theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  State.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = $('themeIcon');
  icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
  localStorage.setItem('fitbuddy_theme', theme);
}

$('themeToggle').addEventListener('click', () => {
  applyTheme(State.theme === 'dark' ? 'light' : 'dark');
});

/* ═══════════════════════════════════════════════════
   TAB NAVIGATION
═══════════════════════════════════════════════════ */
function switchTab(tabId) {
  $$('.tab-section').forEach(s => s.classList.remove('active'));
  $$('.nav-tab').forEach(l => l.classList.remove('active'));

  const section = $(`tab-${tabId}`);
  const navLink  = document.querySelector(`[data-tab="${tabId}"]`);
  if (section) section.classList.add('active');
  if (navLink)  navLink.classList.add('active');

  // Scroll to top on tab switch
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════
   GREETING
═══════════════════════════════════════════════════ */
function initGreeting() {
  const h = new Date().getHours();
  let greeting = 'Good Morning';
  if (h >= 12 && h < 17) greeting = 'Good Afternoon';
  else if (h >= 17)      greeting = 'Good Evening';
  $('greetingTime').textContent = greeting.replace('Good ', '');
  const name = State.profile?.name;
  if (name) $('heroName').textContent = name;
}

/* ═══════════════════════════════════════════════════
   DAILY MOTIVATION
═══════════════════════════════════════════════════ */
async function loadMotivation() {
  const btn = document.querySelector('.btn-refresh');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-small"></span>'; }

  try {
    const res  = await fetch('/api/motivation');
    const data = await res.json();
    $('dailyQuote').textContent = data.quote;
    $('quoteDate').textContent  = data.date;
  } catch {
    $('dailyQuote').textContent = 'Every step forward is progress. Keep going! 💪';
    $('quoteDate').textContent  = new Date().toDateString();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>'; }
  }
}

/* ═══════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════ */
function renderStats() {
  animateNumber('statsCalories', State.stats.calories);
  animateNumber('statsWorkouts', State.stats.workouts);
  animateNumber('statsWater',    State.waterCount);
  animateNumber('statsStreak',   State.stats.streak);
}

function animateNumber(elId, target) {
  const el = $(elId);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 30);
}

/* ═══════════════════════════════════════════════════
   WATER TRACKER
═══════════════════════════════════════════════════ */
function renderWater() {
  const pct  = (State.waterCount / 8) * 100;
  const fill = $('waterFill');
  const label = $('waterLabel');
  if (fill)  fill.style.height = `${Math.min(pct, 100)}%`;
  if (label) label.textContent = `${State.waterCount} / 8`;
  animateNumber('statsWater', State.waterCount);
}

function addWater() {
  if (State.waterCount >= 8) {
    showToast('Hydration Goal!', '🎉 You\'ve hit your 8-glass water goal today!');
    return;
  }
  State.waterCount++;
  saveToStorage();
  renderWater();
  if (State.waterCount === 8) {
    showToast('Goal Reached!', '💧 Excellent! 8 glasses done. Stay hydrated!');
  }
}

function resetWater() {
  State.waterCount = 0;
  saveToStorage();
  renderWater();
}

/* ═══════════════════════════════════════════════════
   CHAT
═══════════════════════════════════════════════════ */
function initChatInput() {
  const input = $('chatInput');
  if (!input) return;

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    // auto-resize
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    // char count
    $('charCount').textContent = `${input.value.length}/500`;
  });
}

async function sendMessage() {
  const input   = $('chatInput');
  const message = input.value.trim();
  if (!message) return;

  // Add user bubble
  appendBubble('user', message);
  State.chatHistory.push({ role: 'user', content: message });

  input.value = '';
  input.style.height = 'auto';
  $('charCount').textContent = '0/500';

  // Hide quick chips after first message
  const chips = $('quickChips');
  if (chips) chips.style.display = 'none';

  // Disable send
  const btn = $('sendBtn');
  btn.disabled = true;

  // Typing indicator
  const typingId = appendTypingIndicator();

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        message,
        history: State.chatHistory.slice(-8),
        profile: State.profile,
      }),
    });
    const data = await res.json();
    removeTypingIndicator(typingId);

    const reply = data.response || data.error || 'Sorry, I could not generate a response.';
    appendBubble('bot', reply, data.timestamp, data.model);
    State.chatHistory.push({ role: 'assistant', content: reply });
    saveToStorage();
  } catch {
    removeTypingIndicator(typingId);
    appendBubble('bot', '⚠️ Connection error. Please check your network and try again.');
  } finally {
    btn.disabled = false;
  }
}

function sendQuickPrompt(text) {
  const input = $('chatInput');
  if (!input) return;
  input.value = text;
  sendMessage();
}

function appendBubble(role, text, time, model) {
  const win  = $('chatWindow');
  const div  = document.createElement('div');
  div.className = `chat-bubble ${role}`;

  const ts   = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sub  = role === 'bot' ? `${ts}${model ? ' · ' + model.split('/').pop() : ''}` : ts;

  div.innerHTML = `
    <div class="bubble-content">${formatMessage(text)}</div>
    <div class="bubble-time">${sub}</div>
  `;

  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const win = $('chatWindow');
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id        = id;
  div.className = 'chat-bubble bot typing-bubble';
  div.innerHTML = `
    <div class="bubble-content">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = $(id);
  if (el) el.remove();
}

/**
 * Convert plain text with markdown-like syntax to HTML
 * Supports **bold**, *italic*, bullet lists, numbered lists, line breaks
 */
function formatMessage(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert numbered & bulleted lists
  const lines   = html.split('\n');
  let result    = [];
  let inList    = false;
  let listType  = '';

  for (let line of lines) {
    const ul = line.match(/^[-•]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);

    if (ul) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true; listType = 'ul';
      }
      result.push(`<li>${ul[1]}</li>`);
    } else if (ol) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true; listType = 'ol';
      }
      result.push(`<li>${ol[1]}</li>`);
    } else {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push(line ? `<p>${line}</p>` : '');
    }
  }
  if (inList) result.push(`</${listType}>`);
  return result.join('');
}

function clearChat() {
  const win = $('chatWindow');
  // Keep only the initial greeting bubble
  while (win.children.length > 1) win.removeChild(win.lastChild);
  State.chatHistory = [];
  const chips = $('quickChips');
  if (chips) chips.style.display = 'flex';
  saveToStorage();
}

/* ═══════════════════════════════════════════════════
   BMI CALCULATOR
═══════════════════════════════════════════════════ */
async function calculateBMI() {
  const weight = parseFloat($('bmiWeight')?.value);
  const height = parseFloat($('bmiHeight')?.value);
  const age    = parseInt($('bmiAge')?.value) || null;

  if (!weight || !height || weight <= 0 || height <= 0) {
    showToast('Input Error', '⚠️ Please enter valid weight and height values.', 'warning');
    return;
  }

  const resultEl = $('bmiResult');
  resultEl.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const res  = await fetch('/api/bmi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ weight, height }),
    });
    const data = await res.json();

    if (data.error) {
      resultEl.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
      return;
    }

    const ageNote = age ? `Age ${age} · ` : '';

    resultEl.innerHTML = `
      <div class="bmi-result-card">
        <div class="bmi-number">${data.bmi}</div>
        <div class="bmi-category fw-bold" style="color:${data.color}">${data.category}</div>
        <p class="text-muted mt-1 mb-3">${ageNote}Ideal weight range: <strong>${data.ideal_weight_range}</strong></p>
        <div class="progress mb-4" style="height:12px;border-radius:6px">
          <div class="progress-bar" role="progressbar"
               style="width:${getBMIPercent(data.bmi)}%;background:${data.color}"
               aria-valuenow="${data.bmi}" aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
        <h6 class="text-start fw-600 mb-3">💡 Personalised Advice</h6>
        <ul class="list-group list-group-flush text-start">
          ${data.advice.map(a => `
            <li class="list-group-item" style="background:transparent;border-color:var(--border);color:var(--text)">
              <i class="bi bi-check-circle-fill text-success me-2"></i>${a}
            </li>`).join('')}
        </ul>
        <div class="mt-4">
          <button class="btn btn-primary-custom" onclick="switchTab('chat');setTimeout(()=>sendQuickPrompt('My BMI is ${data.bmi} (${data.category}). Give me a personalised fitness and diet plan.'),300)">
            <i class="bi bi-robot me-2"></i>Get AI-Personalised Plan
          </button>
        </div>
      </div>`;

    // Auto-fill profile weight/height
    if ($('profileWeight')) $('profileWeight').value = weight;
    if ($('profileHeight')) $('profileHeight').value = height;

  } catch {
    resultEl.innerHTML = '<div class="alert alert-danger">Failed to calculate BMI. Please try again.</div>';
  }
}

function getBMIPercent(bmi) {
  // Map BMI 10–45 to 0–100%
  return Math.min(100, Math.max(0, ((bmi - 10) / 35) * 100)).toFixed(1);
}

/* ═══════════════════════════════════════════════════
   WORKOUT PLANNER
═══════════════════════════════════════════════════ */
async function generateWorkoutPlan() {
  const level = $('workoutLevel')?.value;
  const goal  = $('workoutGoal')?.value;
  const days  = parseInt($('workoutDays')?.value || 5);
  const el    = $('workoutPlanResult');

  el.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const res  = await fetch('/api/workout-plan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ level, goal, days }),
    });
    const data = await res.json();
    renderWorkoutPlan(data, el);
  } catch {
    el.innerHTML = '<div class="alert alert-danger">Failed to generate plan. Please try again.</div>';
  }
}

function renderWorkoutPlan(data, container) {
  const tipHTML = data.tips
    ? `<div class="card-panel mt-3">
        <h6 class="panel-title"><i class="bi bi-lightbulb me-2"></i>Pro Tips</h6>
        <ul>${data.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>` : '';

  const daysHTML = data.schedule.map(day => `
    <div class="col-md-6 col-lg-4">
      <div class="workout-day-card">
        <div class="day-header">
          <span class="day-name">${day.day}</span>
          <span class="day-focus">${day.focus}</span>
        </div>
        <div class="day-body">
          <ul class="exercise-list">
            ${day.exercises.map(ex => `<li>${ex}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div>
        <span class="badge rounded-pill" style="background:var(--accent-g);color:#fff;padding:6px 14px;font-size:13px">${data.level}</span>
        <span class="badge rounded-pill ms-2" style="background:rgba(16,185,129,0.1);color:var(--green);border:1px solid var(--green);padding:6px 14px;font-size:13px">${data.goal}</span>
      </div>
      <button class="btn btn-sm btn-outline-custom" onclick="switchTab('chat');setTimeout(()=>sendQuickPrompt('Create a custom ${data.level} workout plan for ${data.goal}. Be detailed and include sets, reps, and rest times.'),300)">
        <i class="bi bi-robot me-1"></i>Ask AI to Customise
      </button>
    </div>
    <div class="row g-3">${daysHTML}</div>
    ${tipHTML}`;

  // Update stats
  State.stats.workouts++;
  saveToStorage();
  renderStats();
  showToast('Workout Plan Ready!', `Your ${data.level} ${data.goal} plan has been generated! 💪`);
}

/* ═══════════════════════════════════════════════════
   MEAL PLAN
═══════════════════════════════════════════════════ */
async function generateMealPlan() {
  const goal = $('nutritionGoal')?.value;
  const veg  = $('prefVeg')?.checked ?? true;
  const el   = $('mealPlanResult');

  el.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const res  = await fetch('/api/meal-plan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ goal, vegetarian: veg }),
    });
    const data = await res.json();
    renderMealPlan(data, el);
  } catch {
    el.innerHTML = '<div class="alert alert-danger">Failed to generate meal plan. Please try again.</div>';
  }
}

function renderMealPlan(data, container) {
  const meals = [
    { icon: '🌅', key: 'breakfast', label: 'Breakfast' },
    { icon: '☀️', key: 'lunch',     label: 'Lunch'     },
    { icon: '🌙', key: 'dinner',    label: 'Dinner'    },
    { icon: '🍎', key: 'snacks',    label: 'Snacks'    },
  ];

  const tipsHTML = (data.tips || []).map(t =>
    `<li><i class="bi bi-check2-circle text-success me-2"></i>${t}</li>`).join('');

  const mealsHTML = meals.map(m => `
    <div class="meal-item">
      <div class="meal-icon">${m.icon}</div>
      <div>
        <div class="meal-name">${m.label}</div>
        <div class="meal-desc">${data[m.key] || '—'}</div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="meal-plan-card mb-3">
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 class="mb-0">${data.goal} Meal Plan</h5>
          <small class="text-muted">Daily target: <strong>${data.calories}</strong></small>
        </div>
        <button class="btn btn-sm btn-outline-custom" onclick="switchTab('chat');setTimeout(()=>sendQuickPrompt('Give me a detailed Indian meal plan for ${data.goal}. Include calorie counts and cooking instructions.'),300)">
          <i class="bi bi-robot me-1"></i>Ask AI for Full Recipe
        </button>
      </div>
      ${mealsHTML}
      ${tipsHTML ? `<div class="mt-3 pt-2 border-top" style="border-color:var(--border)!important">
        <h6 class="fw-600 mb-2">💡 Nutrition Tips</h6>
        <ul class="ps-3 mb-0">${tipsHTML}</ul>
      </div>` : ''}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   PROGRESS TRACKER
═══════════════════════════════════════════════════ */
function logActivity() {
  const weight   = $('logWeight')?.value   || '—';
  const calories = $('logCalories')?.value || '0';
  const duration = $('logDuration')?.value || '0';
  const mood     = $('logMood')?.value     || '3';

  const moodEmoji = { '5': '😄', '4': '😊', '3': '😐', '2': '😔', '1': '😫' };

  const entry = {
    date:     new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    weight:   weight !== '—' ? `${weight} kg` : '—',
    calories: `${calories} kcal`,
    duration: `${duration} min`,
    mood:     `${moodEmoji[mood] || '😐'} ${mood}/5`,
  };

  State.progressLog.unshift(entry);
  if (State.progressLog.length > 30) State.progressLog.pop(); // keep last 30

  // Update streak & stats
  State.stats.workouts++;
  State.stats.calories += parseInt(calories) || 0;
  State.stats.streak++;

  saveToStorage();
  renderProgress();
  renderStats();
  renderAchievements();

  // Clear form
  ['logWeight','logCalories','logDuration'].forEach(id => { if ($(id)) $(id).value = ''; });

  showToast('Activity Logged! 🎉', `Great work! Keep the streak alive — Day ${State.stats.streak}!`);
}

function renderProgress() {
  const tbody = $('progressBody');
  if (!tbody) return;

  if (State.progressLog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No entries yet. Log your first activity above!</td></tr>';
    return;
  }

  tbody.innerHTML = State.progressLog.slice(0, 7).map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.weight}</td>
      <td>${e.calories}</td>
      <td>${e.duration}</td>
      <td>${e.mood}</td>
    </tr>`).join('');
}

function renderAchievements() {
  const el = $('achievements');
  if (!el) return;

  const badges = [
    { icon: '🔥', cond: State.stats.streak >= 1,   name: 'First Step',    desc: 'Logged your first workout!'          },
    { icon: '💧', cond: State.waterCount >= 8,      name: 'Hydration Hero', desc: 'Drank 8 glasses of water in a day!' },
    { icon: '🏃', cond: State.stats.workouts >= 5,  name: '5 Workouts',    desc: 'Completed 5 workout sessions!'       },
    { icon: '🌟', cond: State.stats.streak >= 7,    name: 'Week Warrior',  desc: '7-day consistency streak!'           },
    { icon: '🏆', cond: State.stats.streak >= 21,   name: 'Habit Builder', desc: '21-day habit formation complete!'    },
    { icon: '⚡', cond: State.stats.calories >= 1000, name: 'Calorie Crusher', desc: 'Burned 1000+ calories total!'   },
  ];

  const earned = badges.filter(b => b.cond);
  if (earned.length === 0) {
    el.innerHTML = '<p class="text-muted text-center py-3">No achievements yet.<br>Start logging your workouts! 💪</p>';
    return;
  }

  el.innerHTML = earned.map(b => `
    <div class="achievement">
      <div class="ach-icon">${b.icon}</div>
      <div>
        <div class="ach-name">${b.name}</div>
        <div class="ach-desc">${b.desc}</div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════ */
function saveProfile() {
  const profile = {
    name:   $('profileName')?.value.trim()    || '',
    age:    $('profileAge')?.value            || '',
    weight: $('profileWeight')?.value         || '',
    height: $('profileHeight')?.value         || '',
    goal:   $('profileGoal')?.value           || '',
    level:  $('profileLevel')?.value          || '',
  };

  State.profile = profile;
  saveToStorage();
  renderProfile();
  initGreeting();
  showToast('Profile Saved! ✅', 'Your profile has been updated. FitBuddy now knows you better!');
}

function renderProfile() {
  const p = State.profile;

  // Fill form fields
  if (p.name   && $('profileName'))   $('profileName').value   = p.name;
  if (p.age    && $('profileAge'))    $('profileAge').value    = p.age;
  if (p.weight && $('profileWeight')) $('profileWeight').value = p.weight;
  if (p.height && $('profileHeight')) $('profileHeight').value = p.height;
  if (p.goal   && $('profileGoal'))   $('profileGoal').value   = p.goal;
  if (p.level  && $('profileLevel'))  $('profileLevel').value  = p.level;

  // Display name
  if ($('profileDisplayName')) $('profileDisplayName').textContent = p.name || 'Your Name';
  if ($('profileDisplayGoal')) $('profileDisplayGoal').textContent = p.goal || 'Set your goal below';

  // Summary box
  const summary = $('profileSummary');
  if (!summary) return;

  if (!p.name && !p.age) {
    summary.innerHTML = '<p class="text-muted text-center py-4">Fill in your details and save to see your profile summary.</p>';
    return;
  }

  const bmiStr = (p.weight && p.height)
    ? (() => {
        const bmi = (parseFloat(p.weight) / ((parseFloat(p.height)/100) ** 2)).toFixed(1);
        return isNaN(bmi) ? '—' : bmi;
      })()
    : '—';

  const rows = [
    { k: 'Name',     v: p.name   || '—' },
    { k: 'Age',      v: p.age    ? `${p.age} years`  : '—' },
    { k: 'Weight',   v: p.weight ? `${p.weight} kg`  : '—' },
    { k: 'Height',   v: p.height ? `${p.height} cm`  : '—' },
    { k: 'BMI',      v: bmiStr },
    { k: 'Goal',     v: p.goal  || '—' },
    { k: 'Level',    v: p.level || '—' },
  ];

  summary.innerHTML = rows.map(r => `
    <div class="summary-row">
      <span class="summary-key">${r.k}</span>
      <span class="summary-val">${r.v}</span>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════════════════════ */
function showToast(title, message, type = 'success') {
  $('toastTitle').textContent = title;
  $('toastBody').textContent  = message;
  const toast = bootstrap.Toast.getOrCreateInstance($('appToast'), { delay: 4000 });
  toast.show();
}

/* ═══════════════════════════════════════════════════
   LOCAL STORAGE
═══════════════════════════════════════════════════ */
function saveToStorage() {
  try {
    localStorage.setItem('fitbuddy_state', JSON.stringify({
      chatHistory: State.chatHistory.slice(-20),
      waterCount:  State.waterCount,
      profile:     State.profile,
      progressLog: State.progressLog.slice(0, 30),
      stats:       State.stats,
    }));
  } catch { /* storage full – ignore */ }
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('fitbuddy_state');
    if (!saved) return;
    const data = JSON.parse(saved);
    State.chatHistory = data.chatHistory || [];
    State.waterCount  = data.waterCount  || 0;
    State.profile     = data.profile     || {};
    State.progressLog = data.progressLog || [];
    State.stats       = data.stats       || { calories: 0, workouts: 0, streak: 0 };
  } catch { /* corrupted storage – ignore */ }
}

/* ═══════════════════════════════════════════════════
   KEYBOARD SHORTCUT  Alt+C → focus chat input
═══════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.altKey && e.key === 'c') {
    switchTab('chat');
    setTimeout(() => $('chatInput')?.focus(), 200);
  }
});
