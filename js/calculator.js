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

// ====== 快速费率解析 ======
function parseQuickRate(str) {
  const parts = str.split(/[\/\-\,\s]+/).filter(s => s.trim() !== '');
  return parts.map(s => parseFloat(s) || 0);
}

/** 快速填写费率 → 填入三个费率字段 */
function applyQuickRate(value) {
  const rates = parseQuickRate(value);
  const els = [
    document.getElementById('compulsoryRate'),
    document.getElementById('commercialRate'),
    document.getElementById('nonVehicleRate'),
  ];
  rates.forEach((r, i) => { if (i < els.length) els[i].value = r; });
}

// ====== 加投 ======
function applyAddInvest(value) {
  const addRates = parseDoubleInput(value);
  if (!addRates) return;
  const crEl = document.getElementById('compulsoryRate');
  const mrEl = document.getElementById('commercialRate');
  crEl.value = addValue(crEl.value, addRates[0]);
  mrEl.value = addValue(mrEl.value, addRates[1]);
}

/** 从三个费率反填快速填写框 (不触发用户事件) */
function syncRatesToQuick() {
  const c = document.getElementById('compulsoryRate').value || '0';
  const m = document.getElementById('commercialRate').value || '0';
  const n = document.getElementById('nonVehicleRate').value || '0';
  document.getElementById('quickRate').value = `${c}/${m}/${n}`;
}

// ====== 计算 ======
function calculate(data) {
  const allRatesZero = data.compulsoryRate === 0 && data.commercialRate === 0 && data.nonVehicleRate === 0;
  const allRatesNonZero = data.compulsoryRate > 0 && data.commercialRate > 0 && data.nonVehicleRate > 0;
  const premiumTotal = round2(data.compulsoryAmount + data.commercialAmount + data.nonVehicleAmount + data.vehicleTax);

  // 各险种独立处理：费率为 0 时，保费直接计入合计；费率 > 0 时按公式计算手续费
  const calcFee = (amount, rate) => {
    if (rate === 0) return round2(amount);
    return round2(amount / 1.06 * rate / 100);
  };

  const compulsoryFee = calcFee(data.compulsoryAmount, data.compulsoryRate);
  const commercialFee = calcFee(data.commercialAmount, data.commercialRate);
  const nonVehicleFee = calcFee(data.nonVehicleAmount, data.nonVehicleRate);

  const total = round2(compulsoryFee + commercialFee + nonVehicleFee);
  const afterTax = total;

  return {
    compulsoryFee, commercialFee, nonVehicleFee, total, afterTax,
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

  resultCompulsory.textContent = `¥ ${results.compulsoryFee.toFixed(2)}`;
  resultCommercial.textContent = `¥ ${results.commercialFee.toFixed(2)}`;
  resultNonVehicle.textContent = `¥ ${results.nonVehicleFee.toFixed(2)}`;
  resultAfterTax.textContent = `¥ ${results.afterTax.toFixed(2)}`;
}

// ====== 格式化文案 ======
function formatPlanText(data, results) {
  const lines = [];
  if (data.company) lines.push(`保险公司：${data.company}`);
  if (data.plate) lines.push(`车牌号：${data.plate}`);

  let premium = 0;
  if (data.compulsoryAmount > 0) {
    premium += data.compulsoryAmount;
    lines.push(`交强险保费：${data.compulsoryAmount}元，到期时间：${data.compulsoryExpiry || '未知'}`);
  }
  if (data.commercialAmount > 0) {
    premium += data.commercialAmount;
    lines.push(`商业险保费：${data.commercialAmount}元，到期时间：${data.commercialExpiry || '未知'}`);
  }
  if (data.nonVehicleAmount > 0) {
    premium += data.nonVehicleAmount;
    lines.push(`随车非车保费：${data.nonVehicleAmount}元`);
  }
  if (data.vehicleTax > 0) {
    premium += data.vehicleTax;
    lines.push(`车船税：${data.vehicleTax}元`);
  }

  premium = round2(premium);
  if (premium > 0) lines.push(`保费合计：${premium}元`);

  // 手续费
  const fee = round2(results.afterTax || 0);
  if (fee > 0) lines.push(`手续费：${fee}元`);

  if (results.afterTax > 0) {
    if (results.allRatesZero) {
      lines.push(`实付为：${premium.toFixed(2)}元`);
    } else if (results.allRatesNonZero) {
      lines.push(`实付为：${(premium - results.afterTax).toFixed(2)}元`);
    } else {
      // 混合情况：部分险种费率为0（保费直接计入），部分按手续费计算
      let feePart = 0, premiumPart = 0;
      if (data.compulsoryAmount > 0 && !results.compulsoryRateZero) feePart += results.compulsoryFee;
      else if (data.compulsoryAmount > 0) premiumPart += data.compulsoryAmount;
      if (data.commercialAmount > 0 && !results.commercialRateZero) feePart += results.commercialFee;
      else if (data.commercialAmount > 0) premiumPart += data.commercialAmount;
      if (data.nonVehicleAmount > 0 && !results.nonVehicleRateZero) feePart += results.nonVehicleFee;
      else if (data.nonVehicleAmount > 0) premiumPart += data.nonVehicleAmount;
      lines.push(`实付为：${(premium - premiumPart - feePart).toFixed(2)}元`);
    }
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
