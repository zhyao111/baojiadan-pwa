/**
 * 报价单 - 计算核心 (纯函数)
 * 包含计算逻辑、表单数据获取、文案格式化
 */

// ====== 表单数据 ======
function getFormData() {
  return {
    compulsoryAmount: num(document.getElementById('compulsoryAmount').value) || 0,
    compulsoryRate: num(document.getElementById('compulsoryRate').value) || 0,
    compulsoryExpiry: buildExpiryStr(
      document.getElementById('compulsoryExpiryYear'),
      document.getElementById('compulsoryExpiryMonth'),
      document.getElementById('compulsoryExpiryDay')
    ),
    commercialAmount: num(document.getElementById('commercialAmount').value) || 0,
    commercialRate: num(document.getElementById('commercialRate').value) || 0,
    commercialExpiry: buildExpiryStr(
      document.getElementById('commercialExpiryYear'),
      document.getElementById('commercialExpiryMonth'),
      document.getElementById('commercialExpiryDay')
    ),
    nonVehicleAmount: num(document.getElementById('nonVehicleAmount').value) || 0,
    nonVehicleRate: num(document.getElementById('nonVehicleRate').value) || 0,
    // nonVehicleExpiry 不参与计算，由 app.js 在保存记录时补充
    vehicleTax: num(document.getElementById('vehicleTax').value) || 0,
    company: document.getElementById('insuranceCompany').value.trim(),
    plate: document.getElementById('plateNumber').value.trim(),
  };
}

// ====== 费率状态（基础费率 + 加投） ======
// baseRates: 「快速填写费率」里的基础费率（不含加投）
// pendingAdd: 「加投」值（交强险/商业险），作为持久叠加层
// 展示规则：三个费率框 = 基础费率 + 加投；快速填写框 = 基础费率
// 这样加投是幂等的：无论触发多少次、改多少次其他值，费率框始终 = 基础 + 加投，
// 不会丢失、也不会重复累加。
let baseRates = { c: 0, m: 0, n: 0 };
let pendingAdd = { c: 0, m: 0 };

// ====== 快速费率解析 ======
function parseQuickRate(str) {
  const parts = str.split(/[\/\-\,\s]+/).filter(s => s.trim() !== '');
  return parts.map(s => parseFloat(s) || 0);
}

function formatRate(v) {
  const n = Math.round(v * 100) / 100;
  // 0 必须显示为 0（此前返回 '' 会被 getMissingRates 当成"没填费率"拦下，
  // 导致"费率 0 = 直接显示保费"的功能永远走不到）
  return n > 0 ? n : 0;
}

/** 重新渲染三个费率框 + 快速填写框（费率框 = 基础 + 加投） */
function recomputeRates() {
  const c = round2(baseRates.c + pendingAdd.c);
  const m = round2(baseRates.m + pendingAdd.m);
  const n = round2(baseRates.n);
  document.getElementById('compulsoryRate').value = formatRate(c);
  document.getElementById('commercialRate').value = formatRate(m);
  document.getElementById('nonVehicleRate').value = formatRate(n);
  // 快速填写框始终显示「基础费率」（不含加投）
  document.getElementById('quickRate').value =
    `${baseRates.c || '0'}/${baseRates.m || '0'}/${baseRates.n || '0'}`;
}

/** 快速填写费率 → 更新基础费率并重算（费率框 = 基础 + 加投） */
function applyQuickRate(value) {
  const rates = parseQuickRate(value);
  if (rates.length >= 1) baseRates.c = rates[0] || 0;
  if (rates.length >= 2) baseRates.m = rates[1] || 0;
  if (rates.length >= 3) baseRates.n = rates[2] || 0;
  recomputeRates();
}

// ====== 加投（幂等：每次只设置加投状态并重算，不做累加） ======
function applyAddInvest(value) {
  const str = String(value == null ? '' : value).trim();
  if (!str) {
    // 加投被清空 → 移除叠加层
    pendingAdd = { c: 0, m: 0 };
    recomputeRates();
    return;
  }
  const addRates = parseDoubleInput(str);
  if (!addRates) return; // 格式非法，保持原加投不变
  pendingAdd = { c: addRates[0], m: addRates[1] };
  recomputeRates();
}

/** 从三个费率框反填快速填写框：费率框里改的是「最终费率」，据此倒推基础费率 */
function syncRatesToQuick() {
  const c = num(document.getElementById('compulsoryRate').value);
  const m = num(document.getElementById('commercialRate').value);
  const n = num(document.getElementById('nonVehicleRate').value);
  baseRates.c = Math.max(0, round2(c - pendingAdd.c));
  baseRates.m = Math.max(0, round2(m - pendingAdd.m));
  baseRates.n = n;
  recomputeRates();
}

/**
 * 输入过程中：明细框当前值倒推基础费率，仅更新快速填写框，不回写费率框。
 * 如果用 recomputeRates 逐键回写，会吃掉正在输入的小数点和前导零
 * （曾导致输 0.5 变成 5、输 12.5 变成 125）。完整重算交给 blur/Enter 时的 syncRatesToQuick。
 */
function syncQuickOnly() {
  const c = Math.max(0, round2(num(document.getElementById('compulsoryRate').value) - pendingAdd.c));
  const m = Math.max(0, round2(num(document.getElementById('commercialRate').value) - pendingAdd.m));
  const n = round2(num(document.getElementById('nonVehicleRate').value));
  document.getElementById('quickRate').value = `${c || '0'}/${m || '0'}/${n || '0'}`;
}

// ====== 计算 ======
function calculate(data) {
  const allRatesZero = data.compulsoryRate === 0 && data.commercialRate === 0 && data.nonVehicleRate === 0;
  const allRatesNonZero = data.compulsoryRate > 0 && data.commercialRate > 0 && data.nonVehicleRate > 0;
  const premiumTotal = round2(data.compulsoryAmount + data.commercialAmount + data.nonVehicleAmount + data.vehicleTax);

  // 各险种独立计算：费率=0 时显示全额保费（展示用），但合计时只算手续费
  const calcAmount = (amount, rate) => {
    if (rate === 0) return round2(amount);
    return round2(amount / 1.06 * rate / 100);
  };

  const calcFee = (amount, rate) => {
    if (rate === 0) return 0;
    return round2(amount / 1.06 * rate / 100);
  };

  const compulsoryAmount = calcAmount(data.compulsoryAmount, data.compulsoryRate);
  const commercialAmount = calcAmount(data.commercialAmount, data.commercialRate);
  const nonVehicleAmount = calcAmount(data.nonVehicleAmount, data.nonVehicleRate);
  const compulsoryFee = calcFee(data.compulsoryAmount, data.compulsoryRate);
  const commercialFee = calcFee(data.commercialAmount, data.commercialRate);
  const nonVehicleFee = calcFee(data.nonVehicleAmount, data.nonVehicleRate);

  const total = round2(compulsoryFee + commercialFee + nonVehicleFee);
  const afterTax = total;

  // 供展示用的各险种金额（费率=0 显示保费，费率>0 显示手续费）
  const compulsoryDisplay = compulsoryAmount;
  const commercialDisplay = commercialAmount;
  const nonVehicleDisplay = nonVehicleAmount;

  return {
    compulsoryFee, commercialFee, nonVehicleFee,
    compulsoryDisplay, commercialDisplay, nonVehicleDisplay,
    total, afterTax,
    allRatesZero, allRatesNonZero, premiumTotal,
    compulsoryRateZero: data.compulsoryRate === 0,
    commercialRateZero: data.commercialRate === 0,
    nonVehicleRateZero: data.nonVehicleRate === 0,
  };
}

// ====== 展示结果 ======
function displayResults(results) {
  const labelCompulsory = document.getElementById('labelCompulsory');
  const labelCommercial = document.getElementById('labelCommercial');
  const labelNonVehicle = document.getElementById('labelNonVehicle');
  const labelAfterTax = document.getElementById('labelAfterTax');
  const resultCompulsory = document.getElementById('resultCompulsory');
  const resultCommercial = document.getElementById('resultCommercial');
  const resultNonVehicle = document.getElementById('resultNonVehicle');
  const resultAfterTax = document.getElementById('resultAfterTax');

  // 每个险种独立判断：费率=0 显示"保费"，费率>0 显示"手续费"
  labelCompulsory.textContent = results.compulsoryRateZero ? '交强险保费' : '交强险手续费';
  labelCommercial.textContent = results.commercialRateZero ? '商业险保费' : '商业险手续费';
  labelNonVehicle.textContent = results.nonVehicleRateZero ? '随车非车保费' : '随车非车保费手续费';

  if (results.allRatesZero) {
    labelAfterTax.textContent = '保费合计';
  } else if (results.allRatesNonZero) {
    labelAfterTax.textContent = '税后手续费';
  } else {
    labelAfterTax.textContent = '最终合计';
  }

  resultCompulsory.textContent = `¥ ${results.compulsoryDisplay.toFixed(2)}`;
  resultCommercial.textContent = `¥ ${results.commercialDisplay.toFixed(2)}`;
  resultNonVehicle.textContent = `¥ ${results.nonVehicleDisplay.toFixed(2)}`;
  const displayTotal = results.allRatesZero ? results.premiumTotal : results.afterTax;
  resultAfterTax.textContent = `¥ ${displayTotal.toFixed(2)}`;
}

// ====== 格式化文案 ======
function formatPlanText(data, results) {
  // PWA 补丁：金额统一两位小数（与结果区 formatMoney/displayTotal 一致），避免 "1000.5元" 这类显示
  const money = (n) => round2(Number(n) || 0).toFixed(2);
  const lines = [];
  if (data.company) lines.push(`保险公司：${data.company}`);
  if (data.plate) lines.push(`车牌号：${data.plate}`);

  let premium = 0;
  if (data.compulsoryAmount > 0) {
    premium += data.compulsoryAmount;
    lines.push(`交强险保费：${money(data.compulsoryAmount)}元，到期时间：${data.compulsoryExpiry || '未知'}`);
  }
  if (data.commercialAmount > 0) {
    premium += data.commercialAmount;
    lines.push(`商业险保费：${money(data.commercialAmount)}元，到期时间：${data.commercialExpiry || '未知'}`);
  }
  if (data.nonVehicleAmount > 0) {
    premium += data.nonVehicleAmount;
    lines.push(`随车非车保费：${money(data.nonVehicleAmount)}元`);
  }
  if (data.vehicleTax > 0) {
    premium += data.vehicleTax;
    lines.push(`车船税：${money(data.vehicleTax)}元`);
  }

  premium = round2(premium);
  if (premium > 0) lines.push(`保费合计：${money(premium)}元`);

  // 手续费
  const fee = round2(results.afterTax || 0);
  if (fee > 0) lines.push(`手续费：${money(fee)}元`);

  if (results.afterTax > 0) {
    // PWA 补丁：手续费异常大于保费时实付不为负（最少按 0 计）
    const shifu = Math.max(0, round2(premium - results.afterTax));
    lines.push(`实付为：${shifu.toFixed(2)}元`);
  }
  return lines.join('\n');
}

// ====== 数据比较 ======
function isSameData(a, b) {
  return a.company === b.company &&
    a.plate === b.plate &&
    a.compulsoryAmount === b.compulsoryAmount &&
    a.compulsoryRate === b.compulsoryRate &&
    a.commercialAmount === b.commercialAmount &&
    a.commercialRate === b.commercialRate &&
    a.nonVehicleAmount === b.nonVehicleAmount &&
    a.nonVehicleRate === b.nonVehicleRate &&
    a.vehicleTax === b.vehicleTax;
}

// ====== 检查验证 ======
function validateForm(data) {
  const missing = [];
  if (!document.getElementById('insuranceCompany').value.trim()) {
    missing.push({ label: '保险公司', el: document.getElementById('insuranceCompany') });
  }
  if (!document.getElementById('plateNumber').value.trim()) {
    missing.push({ label: '车牌号', el: document.getElementById('plateNumber') });
  }
  if (!document.getElementById('quickRate').value.trim()) {
    missing.push({ label: '费率', el: document.getElementById('quickRate') });
  }
  return missing;
}

function checkPremiums(data) {
  return data.compulsoryAmount > 0 || data.commercialAmount > 0 ||
         data.nonVehicleAmount > 0 || data.vehicleTax > 0;
}

function getMissingRates(data) {
  const missing = [];
  if (data.compulsoryAmount > 0 && !document.getElementById('compulsoryRate').value.trim()) {
    missing.push({ label: '交强险费率', el: document.getElementById('compulsoryRate') });
  }
  if (data.commercialAmount > 0 && !document.getElementById('commercialRate').value.trim()) {
    missing.push({ label: '商业险费率', el: document.getElementById('commercialRate') });
  }
  if (data.nonVehicleAmount > 0 && !document.getElementById('nonVehicleRate').value.trim()) {
    missing.push({ label: '随车非车费率', el: document.getElementById('nonVehicleRate') });
  }
  return missing;
}

function getMissingExpiry(data) {
  const missing = [];
  if (data.compulsoryAmount > 0 && data.compulsoryRate > 0 && !data.compulsoryExpiry) {
    missing.push({
      label: '交强险到期时间',
      expiryEls: [
        document.getElementById('compulsoryExpiryYear'),
        document.getElementById('compulsoryExpiryMonth'),
        document.getElementById('compulsoryExpiryDay'),
      ],
    });
  }
  if (data.commercialAmount > 0 && data.commercialRate > 0 && !data.commercialExpiry) {
    missing.push({
      label: '商业险到期时间',
      expiryEls: [
        document.getElementById('commercialExpiryYear'),
        document.getElementById('commercialExpiryMonth'),
        document.getElementById('commercialExpiryDay'),
      ],
    });
  }
  return missing;
}
