/**
 * 报价单 - 通用工具库
 */

// ====== DEBUG 开关 ======
const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log('[DEBUG]', ...args);
}

// ====== DOM 选择器 ======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/**
 * 从 CSS 变量读取颜色/值
 * @param {string} name — CSS 变量名，如 '--color-compulsory'
 * @returns {string}
 */
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ====== Storage Key 集中管理 ======
const STORAGE = {
  PROVIDERS: 'chefeibao_providers',
  ACTIVE_PROVIDER: 'chefeibao_active_provider',
  RECORDS: 'chefeibao_records',
  DUAL: 'chefeibao_dual',
  FONT_SIZE: 'chefeibao_font_size',
  CORRECTIONS: 'chefeibao_company_corrections',
};

/**
 * 安全读取 JSON
 * @param {string} key - localStorage key
 * @param {*} fallback - 解析失败时的默认值
 */
function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ====== Toast ======
let toastTimer = null;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ====== 数字工具 ======
function round2(num) {
  return Math.round(num * 100) / 100;
}

function formatMoney(n) {
  return `¥${n.toFixed(2)}`;
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ====== 字符串工具 ======
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* noop */ }
  document.body.removeChild(ta);
}

// ====== 日期格式化 ======
function formatExpiryDisplay(expiryStr) {
  if (!expiryStr) return '';
  return expiryStr.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1年 $2月 $3日')
                  .replace(/(\d{1,2})月(\d{1,2})日/, '$1月 $2日');
}

function formatRecordTime(timeStr) {
  if (!timeStr) return '';
  if (!timeStr.includes(':') && !timeStr.includes('时')) return timeStr;
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  } catch (e) { /* fall through */ }
  return timeStr.split(/\s+/)[0] || timeStr;
}

// ====== 解析工具 ======
function parseTripleInput(str) {
  if (!str) return null;
  const parts = str.split(/[\/\-\,]+/).map((s) => parseFloat(s.trim()));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) return parts;
  return null;
}

function parseDoubleInput(str) {
  if (!str) return null;
  const parts = str.split(/[\/\-\,]+/).map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => !isNaN(n))) return parts;
  return null;
}

function addValue(existing, add) {
  const base = parseFloat(existing) || 0;
  return (base + add).toFixed(2);
}

// ====== 图片压缩 (通用) ======
function resizeImage(imageSource, maxSize = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageSource;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====== 日期解析 ======
function parseExpiryToInputs(expiryStr, yearEl, monthEl, dayEl) {
  if (!expiryStr) return;
  const yearMatch = expiryStr.match(/(\d{4})\s*年/);
  const monthMatch = expiryStr.match(/(\d{1,2})\s*月/);
  const dayMatch = expiryStr.match(/(\d{1,2})\s*日/);
  if (yearMatch) yearEl.value = yearMatch[1];
  if (monthMatch) monthEl.value = monthMatch[1];
  if (dayMatch) dayEl.value = dayMatch[1];
}

function buildExpiryStr(yearEl, monthEl, dayEl) {
  const y = yearEl.value.trim();
  const m = monthEl.value.trim();
  const d = dayEl.value.trim();
  if (!m && !d) return '';
  let str = '';
  if (y) str += y + '年';
  if (m) str += m + '月';
  if (d) str += d + '日';
  return str;
}

// ====== 保险公司名称修正 ======
const COMPANY_CORRECTIONS_KEY = STORAGE.CORRECTIONS;

function getCompanyCorrections() {
  try { return JSON.parse(localStorage.getItem(COMPANY_CORRECTIONS_KEY) || '{}'); }
  catch { return {}; }
}

function saveCompanyCorrection(wrongName, correctName) {
  if (!wrongName || !correctName || wrongName === correctName) return;
  const corrections = getCompanyCorrections();
  corrections[wrongName] = correctName;
  localStorage.setItem(COMPANY_CORRECTIONS_KEY, JSON.stringify(corrections));
}

function correctCompanyName(name) {
  if (!name) return name;
  const corrections = getCompanyCorrections();
  return corrections[name] || name;
}
