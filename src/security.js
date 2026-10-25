import { PREFIX } from './api.js';

export const CANARY_KEY = `${PREFIX}canary`;
let refreshTimes = [];
const INCIDENTS_KEY = `${PREFIX}incidents`;
let incidents = [];

// Временный вывод для проверки ловушек. Постоянный журнал добавляется в бонусе.
function readIncidents() {
  try {
    const value = JSON.parse(localStorage.getItem(INCIDENTS_KEY));

    if (!Array.isArray(value)) return [];

    return value.filter(item =>
      item &&
      typeof item.time === 'string' &&
      Number.isFinite(Date.parse(item.time)) &&
      typeof item.type === 'string' &&
      typeof item.reason === 'string'
    ).slice(0, 30);
  } catch {
    return [];
  }
}

function renderIncidents() {
  const list = document.querySelector('#incident-list');
  list.replaceChildren();

  for (const incident of incidents) {
    const item = document.createElement('li');
    const time = new Date(incident.time).toLocaleString('ru-RU');
    item.textContent = `${time} — ${incident.type}: ${incident.reason}`;
    list.append(item);
  }

  document.querySelector('#incidents-empty').hidden = incidents.length > 0;
  document.querySelector('#incident-count').textContent = String(incidents.length);
}

export function reportIncident(type, reason) {
  incidents.unshift({
    time: new Date().toISOString(),
    type,
    reason
  });

  incidents = incidents.slice(0, 30);

  try {
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch {}

  renderIncidents();
}

// События: startup, refresh, submit, decoy. Условия ловушек добавьте здесь.
export function checkActivity(action, details = {}) {
  if (action === 'startup') {
    try {
      const canary = JSON.parse(localStorage.getItem(CANARY_KEY));

      if (canary?.role === 'admin') {
        reportIncident('T5', 'Обнаружена подмена маркера canary на admin.');
        localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
      }
    } catch {}

    const url = new URL(window.location.href);

    if (url.searchParams.getAll('staff').includes('1')) {
      reportIncident('T6', 'В адресе обнаружен параметр staff=1.');
      url.searchParams.delete('staff');
      window.history.replaceState(window.history.state, '', url);
    }
  }

  if (
    action === 'submit' &&
    details.topic &&
    !['html', 'javascript', 'api'].includes(details.topic)
  ) {
    reportIncident('T4', 'При отправке обнаружено неизвестное направление.');
  }

  if (action === 'decoy') {
    reportIncident('T3', 'Вызвана скрытая кнопка staff-export.');
  }

  if (action === 'submit' && details.supportCode) {
    reportIncident('T2', 'При отправке заполнено скрытое поле supportCode.');
  }

  if (action !== 'refresh') return;

  const now = Date.now();
  refreshTimes = refreshTimes.filter(time => now - time < 5000);
  refreshTimes.push(now);

  if (refreshTimes.length === 6) {
    reportIncident('T1', 'Шесть попыток обновить список за 5 секунд.');
  }
}

// Приложение вызывает эту функцию перед отправкой и обновлением списка.
export function isRestricted() {
  return false;
}

export function initializeSecurity() {
  incidents = readIncidents();
  renderIncidents();
  try {
    if (localStorage.getItem(CANARY_KEY) === null) {
      localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
    }
  } catch { /* Бонус должен учитывать недоступное хранилище. */ }
  checkActivity('startup');
}

export function resetSecurity() {
  refreshTimes = [];
  incidents = [];
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX) && key !== `${PREFIX}applications`) localStorage.removeItem(key);
    }
    localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
  } catch { /* Учебный сброс остаётся доступным без storage. */ }
  renderIncidents();
  document.querySelector('#security-status').textContent = 'Ограничений нет';
  document.querySelector('#restriction-detail').hidden = true;
}
