/**
 * 车费宝 - Car Fee Calculator
 * 核心交互逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  // ====== DOM Elements ======
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Tabs
  const navItems = $$('.nav-item');
  const tabContents = $$('.tab-content');

  // Inputs
  const insuranceCompany = $('#insuranceCompany');
  const plateNumber = $('#plateNumber');
  const quickRate = $('#quickRate');
  const addInvest = $('#addInvest');
  const compulsoryAmount = $('#compulsoryAmount');
  const compulsoryRate = $('#compulsoryRate');
  const commercialAmount = $('#commercialAmount');
  const commercialRate = $('#commercialRate');
  const nonVehicleAmount = $('#nonVehicleAmount');
  const nonVehicleRate = $('#nonVehicleRate');
  const vehicleTax = $('#vehicleTax');

  // Buttons
  const btnReset = $('#btnReset');
  const btnCalculate = $('#btnCalculate');
  const btnSelectImg = $('#btnSelectImg');
  const btnSaveRecord = $('#btnSaveRecord');
  const btnCopyPlan = $('#btnCopyPlan');

  // Result
  const resultSection = $('#resultSection');
  const resultCompulsory = $('#resultCompulsory');
  const resultCommercial = $('#resultCommercial');
  const resultNonVehicle = $('#resultNonVehicle');
  const resultAfterTax = $('#resultAfterTax');

  // Settings / Records
  const emptyStateSettings = $('#emptyStateSettings');
  const recordListSettings = $('#recordListSettings');
  const btnClearAllRecords = $('#btnClearAllRecords');

  // Settings sub-pages
  const settingsMenu = $('#settingsMenu');
  const btnGoRecords = $('#btnGoRecords');
  const btnGoModels = $('#btnGoModels');
  const subpageRecords = $('#subpageRecords');
  const subpageModels = $('#subpageModels');
  const btnBackFromRecords = $('#btnBackFromRecords');
  const btnBackFromModels = $('#btnBackFromModels');

  // Provider Management
  const providerListEl = $('#providerList');
  const emptyStateProviders = $('#emptyStateProviders');
  const btnAddProvider = $('#btnAddProvider');
  const providerModal = $('#providerModal');
  const providerModalTitle = $('#providerModalTitle');
  const btnCloseProviderModal = $('#btnCloseProviderModal');
  const btnCancelProvider = $('#btnCancelProvider');
  const btnSaveProvider = $('#btnSaveProvider');
  const quickSelectProvider = $('#quickSelectProvider');
  const inputProviderId = $('#inputProviderId');
  const inputBaseUrl = $('#inputBaseUrl');
  const inputProtocol = $('#inputProtocol');
  const inputApiKey = $('#inputApiKey');
  const btnToggleApiKey = $('#btnToggleApiKey');
  const inputModelName = $('#inputModelName');
  const btnAddModel = $('#btnAddModel');
  const modalModelList = $('#modalModelList');
  const modelCountEl = $('#modelCount');

  // Image Upload
  const fileInput = $('#fileInput');
  const imgPreviewWrap = $('#imgPreviewWrap');
  const imgPreview = $('#imgPreview');
  const imgPreviewStatus = $('#imgPreviewStatus');
  const btnRemoveImg = $('#btnRemoveImg');

  // OCR expiry dates (populated by recognition)
  const ocrExpiry = { compulsory: '', commercial: '', nonVehicle: '' };

  // ====== Recognition Models (Custom Provider System) ======
  const PROVIDERS_KEY = 'chefeibao_providers';
  const ACTIVE_PROVIDER_KEY = 'chefeibao_active_provider';

  // Quick select presets
  const PROVIDER_PRESETS = {
    openai:    { name: 'OpenAI',    baseUrl: 'https://api.openai.com/v1',     protocol: 'openai' },
    deepseek:  { name: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/v1',   protocol: 'openai' },
    zhipu:     { name: '智谱 AI',   baseUrl: 'https://open.bigmodel.cn/api/paas/v4', protocol: 'openai' },
    qwen:      { name: '通义千问',   baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', protocol: 'openai' },
    moonshot:  { name: '月之暗面',   baseUrl: 'https://api.moonshot.cn/v1',     protocol: 'openai' },
    baidu:     { name: '百度智能云', baseUrl: 'https://aip.baidubce.com',      protocol: 'ocr' },
    tencent:   { name: '腾讯云',     baseUrl: 'https://ocr.tencentcloudapi.com', protocol: 'ocr' },
    aliyun:    { name: '阿里云',     baseUrl: 'https://ocr-api.cn-hangzhou.aliyuncs.com', protocol: 'ocr' },
  };

  // Temporary model list during modal editing
  let modalModels = [];
  let editingProviderId = null;

  // Confirm dialog
  const confirmOverlay = $('#confirmOverlay');
  const confirmMessage = $('#confirmMessage');
  const confirmCancel = $('#confirmCancel');
  const confirmOk = $('#confirmOk');

  // ====== Tab Switching ======
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;

      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      tabContents.forEach((t) => t.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');

      // Refresh data when switching to settings tab
      if (targetTab === 'tabSettings') {
        hideSubpages();
      }
    });
  });

  // ====== Settings Sub-pages ======
  function showSubpage(name) {
    settingsMenu.style.display = 'none';
    if (name === 'records') {
      subpageRecords.style.display = 'block';
      subpageModels.style.display = 'none';
      renderRecords();
    } else if (name === 'models') {
      subpageModels.style.display = 'block';
      subpageRecords.style.display = 'none';
      renderProviders();
    }
  }

  function hideSubpages() {
    settingsMenu.style.display = 'block';
    subpageRecords.style.display = 'none';
    subpageModels.style.display = 'none';
  }

  btnGoRecords.addEventListener('click', () => showSubpage('records'));
  btnGoModels.addEventListener('click', () => showSubpage('models'));
  btnBackFromRecords.addEventListener('click', hideSubpages);
  btnBackFromModels.addEventListener('click', hideSubpages);

  // ====== Quick Fill Rate ======
  quickRate.addEventListener('blur', () => {
    const rates = parseTripleInput(quickRate.value);
    if (rates) {
      compulsoryRate.value = rates[0];
      commercialRate.value = rates[1];
      nonVehicleRate.value = rates[2];
    }
  });

  // ====== Add Investment ======
  addInvest.addEventListener('blur', () => {
    const addRates = parseDoubleInput(addInvest.value);
    if (addRates) {
      compulsoryRate.value = addValue(compulsoryRate.value, addRates[0]);
      commercialRate.value = addValue(commercialRate.value, addRates[1]);
    }
  });

  // ====== Calculate ======
  btnCalculate.addEventListener('click', () => {
    const data = getFormData();
    const allZero = data.compulsoryRate === 0 && data.commercialRate === 0 && data.nonVehicleRate === 0;
    if (allZero) {
      showToast('请先填写手续费比例');
      quickRate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => quickRate.focus(), 300);
      return;
    }
    const results = calculate(data);
    displayResults(results);
    resultSection.style.display = 'block';
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });

  // ====== Reset ======
  btnReset.addEventListener('click', () => {
    const inputs = [
      insuranceCompany, plateNumber, quickRate, addInvest,
      compulsoryAmount, compulsoryRate,
      commercialAmount, commercialRate,
      nonVehicleAmount, nonVehicleRate,
      vehicleTax
    ];
    inputs.forEach((input) => (input.value = ''));
    resultSection.style.display = 'none';
    ocrExpiry.compulsory = '';
    ocrExpiry.commercial = '';
    ocrExpiry.nonVehicle = '';
  });

  // ====== Image Upload ======
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/heic'];
  const MAX_SIZE_MB = 10;

  btnSelectImg.addEventListener('click', () => {
    fileInput.value = '';          // reset so same file can be re-selected
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast('请选择 JPG / PNG / WebP 格式的图片');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`图片大小不能超过 ${MAX_SIZE_MB}MB`);
      return;
    }

    showImagePreview(file);
  });

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgPreview.src = ev.target.result;
      imgPreviewWrap.style.display = 'block';
      const provider = getActiveProvider();
      const statusText = provider
        ? `使用 ${provider.name} · ${provider.models[0] || '默认模型'} 识别中...`
        : '未配置识别模型，请先在设置中添加';
      imgPreviewStatus.textContent = statusText;
      imgPreviewStatus.className = provider ? 'img-preview-status loading' : 'img-preview-status error';

      if (!provider) return;

      recognizeImage(file, provider);
    };
    reader.onerror = () => {
      showToast('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  }

  // ---- OCR Prompt ----
  const OCR_PROMPT = `你是一个车险报价单识别助手。请仔细识别这张图片中的车险报价信息，提取以下字段并以 JSON 格式返回：
{
  "company": "保险公司名称",
  "plate": "车牌号",
  "compulsoryAmount": 交强险保费金额(数字),
  "compulsoryRate": 交强险手续费比例(数字),
  "compulsoryExpiry": "交强险保险到期时间，格式如：1月15日",
  "commercialAmount": 商业险保费金额(数字),
  "commercialRate": 商业险手续费比例(数字),
  "commercialExpiry": "商业险保险到期时间，格式如：1月15日",
  "nonVehicleAmount": 随车非车保费金额(数字),
  "nonVehicleRate": 随车非车保费手续费比例(数字),
  "nonVehicleExpiry": "随车非车保险到期时间，格式如：1月15日",
  "vehicleTax": 车船税金额(数字)
}
识别规则：
- 交强险：直接提取保费金额、手续费比例和保险到期时间
- 商业险：直接提取保费金额、手续费比例和保险到期时间
- 随车非车保费：图片中除了交强险和商业险以外的所有其他保险项目（如驾意险、座位险、三者险、车损险、玻璃险、划痕险、涉水险、自燃险等），将它们的保费金额全部加总填入 nonVehicleAmount，手续费比例填入 nonVehicleRate，到期时间填入 nonVehicleExpiry
- 车船税：直接提取
注意：
- 所有金额单位为元，手续费比例为百分比数字（如 5 表示 5%）
- 到期时间格式统一为"X月X日"，如"3月20日"
- 如果某个字段在图片中找不到，对应值填 0 或空字符串
- 只返回 JSON，不要返回其他内容`;

  // ---- Recognize Image ----
  async function recognizeImage(file, provider) {
    const modelName = provider.models[0] || '';
    try {
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

      let result;

      if (provider.protocol === 'openai') {
        result = await callOpenAICompatible(provider, modelName, dataUrl);
      } else if (provider.protocol === 'ocr') {
        result = await callOCRInterface(provider, modelName, base64, file.type || 'image/jpeg');
      } else {
        // custom — fallback to openai format
        result = await callOpenAICompatible(provider, modelName, dataUrl);
      }

      imgPreviewStatus.textContent = `${provider.name} · ${modelName} — 识别完成`;
      imgPreviewStatus.className = 'img-preview-status';
      applyOCRResult(result);
      showToast('识别完成，已自动填入数据');
      setTimeout(() => {
        quickRate.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => quickRate.focus(), 300);
      }, 500);

    } catch (err) {
      console.error('OCR error:', err);
      imgPreviewStatus.textContent = '识别失败：' + (err.message || '未知错误');
      imgPreviewStatus.className = 'img-preview-status error';
      showToast('识别失败，请检查配置后重试');
    }
  }

  // ---- OpenAI-compatible (multimodal chat) ----
  async function callOpenAICompatible(provider, model, dataUrl) {
    const url = provider.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`API 返回 ${resp.status}: ${errBody.slice(0, 100)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';
    return parseOCRJson(content);
  }

  // ---- OCR-specific interface (vendor-specific, extensible) ----
  async function callOCRInterface(provider, model, base64, mimeType) {
    const url = provider.baseUrl;

    // Generic OCR POST — adjust per vendor as needed
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        image: `data:${mimeType};base64,${base64}`,
        prompt: OCR_PROMPT,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`OCR API 返回 ${resp.status}: ${errBody.slice(0, 100)}`);
    }

    const json = await resp.json();
    // Try common response shapes
    const content = json.result || json.text || json.choices?.[0]?.message?.content || JSON.stringify(json);
    return parseOCRJson(content);
  }

  // ---- Parse JSON from LLM response ----
  function parseOCRJson(text) {
    // Extract JSON from possible markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();

    const parsed = JSON.parse(raw);

    return {
      company: parsed.company || '',
      plate: parsed.plate || '',
      compulsoryAmount: num(parsed.compulsoryAmount),
      compulsoryRate: num(parsed.compulsoryRate),
      compulsoryExpiry: parsed.compulsoryExpiry || '',
      commercialAmount: num(parsed.commercialAmount),
      commercialRate: num(parsed.commercialRate),
      commercialExpiry: parsed.commercialExpiry || '',
      nonVehicleAmount: num(parsed.nonVehicleAmount),
      nonVehicleRate: num(parsed.nonVehicleRate),
      nonVehicleExpiry: parsed.nonVehicleExpiry || '',
      vehicleTax: num(parsed.vehicleTax),
    };
  }

  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Strip data:mime;base64, prefix
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function applyOCRResult(data) {
    insuranceCompany.value = data.company || '';
    plateNumber.value = data.plate || '';
    if (data.compulsoryAmount != null) compulsoryAmount.value = data.compulsoryAmount;
    if (data.compulsoryRate != null) compulsoryRate.value = data.compulsoryRate;
    ocrExpiry.compulsory = data.compulsoryExpiry || '';
    if (data.commercialAmount != null) commercialAmount.value = data.commercialAmount;
    if (data.commercialRate != null) commercialRate.value = data.commercialRate;
    ocrExpiry.commercial = data.commercialExpiry || '';
    if (data.nonVehicleAmount != null) nonVehicleAmount.value = data.nonVehicleAmount;
    if (data.nonVehicleRate != null) nonVehicleRate.value = data.nonVehicleRate;
    ocrExpiry.nonVehicle = data.nonVehicleExpiry || '';
    if (data.vehicleTax != null) vehicleTax.value = data.vehicleTax;
  }

  function showOCRError(err) {
    imgPreviewStatus.textContent = '识别失败，请重试或更换图片';
    imgPreviewStatus.className = 'img-preview-status error';
    showToast('识别失败：' + (err.message || '未知错误'));
  }

  btnRemoveImg.addEventListener('click', () => {
    imgPreview.src = '';
    imgPreviewWrap.style.display = 'none';
    imgPreviewStatus.textContent = '';
    imgPreviewStatus.className = 'img-preview-status';
    fileInput.value = '';
  });

  // ====== Save Record ======
  btnSaveRecord.addEventListener('click', () => {
    const data = getFormData();
    const results = calculate(data);

    if (results.total === 0) {
      showToast('请先填写数据并计算');
      return;
    }

    const record = {
      id: Date.now(),
      company: insuranceCompany.value || '未填写',
      plate: plateNumber.value || '未填写',
      time: new Date().toLocaleString('zh-CN'),
      ...data,
      ...results
    };

    saveRecord(record);
    showToast('已保存到记录');
  });

  // ====== Copy Buttons ======
  btnCopyPlan.addEventListener('click', () => {
    const data = getFormData();
    const results = calculate(data);
    const text = formatPlanText(data, results);
    copyToClipboard(text);
    showToast('已复制文案');
  });

  // ====== Clear All Records ======
  btnClearAllRecords.addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) return;
    showConfirm('确定要清空全部历史记录吗？此操作不可撤销。', () => {
      localStorage.removeItem('chefeibao_records');
      renderRecords();
      showToast('已清空全部记录');
    });
  });

  // ====== Confirm Dialog ======
  let confirmCallback = null;

  function showConfirm(message, onOk) {
    confirmMessage.textContent = message;
    confirmCallback = onOk;
    confirmOverlay.style.display = 'flex';
  }

  confirmCancel.addEventListener('click', () => {
    confirmOverlay.style.display = 'none';
    confirmCallback = null;
  });

  confirmOk.addEventListener('click', () => {
    confirmOverlay.style.display = 'none';
    if (confirmCallback) {
      confirmCallback();
      confirmCallback = null;
    }
  });

  // Close on overlay click
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      confirmOverlay.style.display = 'none';
      confirmCallback = null;
    }
  });

  // ====== Helper Functions ======

  function parseTripleInput(str) {
    if (!str) return null;
    const parts = str.split(/[\/\-\,]+/).map((s) => parseFloat(s.trim()));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return parts;
    }
    return null;
  }

  function parseDoubleInput(str) {
    if (!str) return null;
    const parts = str.split(/[\/\-\,]+/).map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
      return parts;
    }
    return null;
  }

  function addValue(existing, add) {
    const base = parseFloat(existing) || 0;
    return (base + add).toFixed(2);
  }

  function getFormData() {
    return {
      company: insuranceCompany.value.trim(),
      plate: plateNumber.value.trim(),
      compulsoryAmount: parseFloat(compulsoryAmount.value) || 0,
      compulsoryRate: parseFloat(compulsoryRate.value) || 0,
      compulsoryExpiry: ocrExpiry.compulsory,
      commercialAmount: parseFloat(commercialAmount.value) || 0,
      commercialRate: parseFloat(commercialRate.value) || 0,
      commercialExpiry: ocrExpiry.commercial,
      nonVehicleAmount: parseFloat(nonVehicleAmount.value) || 0,
      nonVehicleRate: parseFloat(nonVehicleRate.value) || 0,
      nonVehicleExpiry: ocrExpiry.nonVehicle,
      vehicleTax: parseFloat(vehicleTax.value) || 0,
    };
  }

  function calculate(data) {
    const compulsoryFee = round2(data.compulsoryAmount / 1.06 * data.compulsoryRate / 100);
    const commercialFee = round2(data.commercialAmount / 1.06 * data.commercialRate / 100);
    const nonVehicleFee = round2(data.nonVehicleAmount / 1.06 * data.nonVehicleRate / 100);
    const total = round2(compulsoryFee + commercialFee + nonVehicleFee);
    const afterTax = total;

    return {
      compulsoryFee: round2(compulsoryFee),
      commercialFee: round2(commercialFee),
      nonVehicleFee: round2(nonVehicleFee),
      total: round2(total),
      afterTax: round2(afterTax),
    };
  }

  function round2(num) {
    return Math.round(num * 100) / 100;
  }

  function displayResults(results) {
    resultCompulsory.textContent = `¥ ${results.compulsoryFee.toFixed(2)}`;
    resultCommercial.textContent = `¥ ${results.commercialFee.toFixed(2)}`;
    resultNonVehicle.textContent = `¥ ${results.nonVehicleFee.toFixed(2)}`;
    resultAfterTax.textContent = `¥ ${results.afterTax.toFixed(2)}`;
  }

  function formatMoney(n) {
    return `¥${n.toFixed(2)}`;
  }

  function formatPlanText(data, results) {
    const premium = round2(data.compulsoryAmount + data.commercialAmount + data.nonVehicleAmount + data.vehicleTax);
    const lines = [];
    if (data.company) lines.push(`保险公司：${data.company}`);
    if (data.plate) lines.push(`车牌号：${data.plate}`);
    lines.push(`交强险保费${data.compulsoryAmount}元，到期时间为${data.compulsoryExpiry || '未知'}`);
    lines.push(`商业险保费${data.commercialAmount}元，到期时间为${data.commercialExpiry || '未知'}`);
    lines.push(`随车非车保费${data.nonVehicleAmount}元`);
    lines.push(`车船税${data.vehicleTax}元。`);
    lines.push(`保费合计${premium}元`);
    lines.push(`费用${formatMoney(results.afterTax)}`);
    lines.push(`实付为${formatMoney(premium - results.afterTax)}`);
    return lines.join('\n');
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

  // ====== Records (localStorage) ======

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem('chefeibao_records') || '[]');
    } catch {
      return [];
    }
  }

  function saveRecord(record) {
    const records = getRecords();
    records.unshift(record); // newest first
    localStorage.setItem('chefeibao_records', JSON.stringify(records));
  }

  function deleteRecord(id) {
    showConfirm('确定要删除这条记录吗？', () => {
      const records = getRecords().filter((r) => r.id !== id);
      localStorage.setItem('chefeibao_records', JSON.stringify(records));
      renderRecords();
      showToast('已删除');
    });
  }

  function renderRecords() {
    const records = getRecords();

    // Show/hide clear all button
    btnClearAllRecords.style.display = records.length > 0 ? 'block' : 'none';

    if (records.length === 0) {
      emptyStateSettings.style.display = 'flex';
      recordListSettings.innerHTML = '';
      return;
    }

    emptyStateSettings.style.display = 'none';
    recordListSettings.innerHTML = '';

    records.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'record-item';
      item.innerHTML = `
        <button class="record-delete" data-id="${r.id}" title="删除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="record-item-header">
          <span class="record-plate">${escapeHtml(r.company || '未填写')} · ${escapeHtml(r.plate || '未填写')}</span>
          <span class="record-time">${escapeHtml(r.time)}</span>
        </div>
        <div class="record-amount">${formatMoney(r.afterTax || 0)}</div>
        <div class="record-detail">
          交强险 ${formatMoney(r.compulsoryFee || 0)} / 商业险 ${formatMoney(r.commercialFee || 0)} / 随车非车 ${formatMoney(r.nonVehicleFee || 0)}
        </div>
      `;
      recordListSettings.appendChild(item);
    });

    // Delete handlers
    recordListSettings.querySelectorAll('.record-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        deleteRecord(id);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

  // ====== Provider Management ======

  function getProviders() {
    try {
      return JSON.parse(localStorage.getItem(PROVIDERS_KEY) || '[]');
    } catch { return []; }
  }

  function saveProviders(list) {
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
  }

  function getActiveProviderId() {
    return localStorage.getItem(ACTIVE_PROVIDER_KEY) || '';
  }

  function setActiveProvider(id) {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, id);
  }

  function getActiveProvider() {
    const id = getActiveProviderId();
    const providers = getProviders();
    return providers.find((p) => p.id === id) || null;
  }

  function deleteProvider(id) {
    showConfirm('确定要删除此提供商吗？', () => {
      const providers = getProviders().filter((p) => p.id !== id);
      saveProviders(providers);
      if (getActiveProviderId() === id) {
        setActiveProvider(providers.length > 0 ? providers[0].id : '');
      }
      renderProviders();
      showToast('已删除');
    });
  }

  async function testProvider(id) {
    const provider = getProviders().find((p) => p.id === id);
    if (!provider) return;

    if (!provider.apiKey) { showToast('请先配置 API Key'); return; }
    if (!provider.baseUrl) { showToast('请先配置 Base URL'); return; }
    if (!provider.models || provider.models.length === 0) { showToast('请先添加至少一个模型'); return; }

    showToast(`正在测试 ${provider.name} 连接...`);

    try {
      if (provider.protocol === 'openai') {
        // Try fetching the model list
        const url = provider.baseUrl.replace(/\/+$/, '') + '/models';
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${provider.apiKey}` },
        });
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`${resp.status}: ${errBody.slice(0, 80)}`);
        }
        showToast(`${provider.name} 连接测试通过 ✓`);
      } else {
        // For OCR / custom protocols, just do a HEAD or OPTIONS check
        const resp = await fetch(provider.baseUrl, { method: 'OPTIONS' }).catch(() => null);
        if (resp && resp.ok) {
          showToast(`${provider.name} 连接测试通过 ✓`);
        } else {
          showToast(`${provider.name} 端点可达，具体请上传图片测试`);
        }
      }
    } catch (err) {
      console.error('Provider test error:', err);
      showToast(`${provider.name} 连接失败: ${err.message}`);
    }
  }

  function renderProviders() {
    const providers = getProviders();
    emptyStateProviders.style.display = providers.length === 0 ? 'flex' : 'none';
    providerListEl.innerHTML = '';

    if (providers.length === 0) return;

    const activeId = getActiveProviderId();

    providers.forEach((p) => {
      const isActive = p.id === activeId;
      const card = document.createElement('div');
      card.className = 'provider-card' + (isActive ? ' active' : '');
      card.innerHTML = `
        <div class="provider-card-header">
          <span class="provider-card-dot"></span>
          <span class="provider-card-name">${escapeHtml(p.name || p.id)}</span>
          ${isActive ? '<span class="provider-card-badge">使用中</span>' : ''}
        </div>
        <div class="provider-card-meta">${escapeHtml(p.baseUrl)}</div>
        <div class="provider-card-models">
          ${(p.models || []).map((m) =>
            `<span class="provider-model-chip${isActive ? ' active-model' : ''}">${escapeHtml(m)}</span>`
          ).join('')}
        </div>
        <div class="provider-card-actions">
          <button class="provider-action-btn provider-action-select" data-action="select" data-id="${p.id}">${isActive ? '当前使用' : '使用此模型'}</button>
          <button class="provider-action-btn provider-action-test" data-action="test" data-id="${p.id}">测试</button>
          <button class="provider-action-btn provider-action-edit" data-action="edit" data-id="${p.id}">编辑</button>
          <button class="provider-action-btn provider-action-delete" data-action="delete" data-id="${p.id}">删除</button>
        </div>
      `;
      providerListEl.appendChild(card);
    });
  }

  // Provider card actions (event delegation, registered once)
  providerListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'select') {
      setActiveProvider(id);
      renderProviders();
      const p = getProviders().find((x) => x.id === id);
      showToast(p ? `已切换到 ${p.name}` : '已切换');
    } else if (action === 'edit') {
      openProviderModal(id);
    } else if (action === 'delete') {
      deleteProvider(id);
    } else if (action === 'test') {
      testProvider(id);
    }
  });

  // ====== Provider Modal ======

  function openProviderModal(editId) {
    editingProviderId = editId || null;
    modalModels = [];

    if (editingProviderId) {
      const p = getProviders().find((x) => x.id === editingProviderId);
      if (!p) return;
      providerModalTitle.textContent = '编辑模型提供商';
      quickSelectProvider.value = '';
      inputProviderId.value = p.id;
      inputBaseUrl.value = p.baseUrl;
      inputProtocol.value = p.protocol || 'openai';
      inputApiKey.value = p.apiKey || '';
      modalModels = [...(p.models || [])];
    } else {
      providerModalTitle.textContent = '添加模型提供商';
      quickSelectProvider.value = '';
      inputProviderId.value = '';
      inputBaseUrl.value = '';
      inputProtocol.value = 'openai';
      inputApiKey.value = '';
      modalModels = [];
    }

    renderModalModels();
    providerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeProviderModal() {
    providerModal.style.display = 'none';
    document.body.style.overflow = '';
    editingProviderId = null;
    modalModels = [];
  }

  btnAddProvider.addEventListener('click', () => openProviderModal(null));
  btnCloseProviderModal.addEventListener('click', closeProviderModal);
  btnCancelProvider.addEventListener('click', closeProviderModal);

  providerModal.addEventListener('click', (e) => {
    if (e.target === providerModal) closeProviderModal();
  });

  // Quick select
  quickSelectProvider.addEventListener('change', () => {
    const key = quickSelectProvider.value;
    if (!key) return;
    const preset = PROVIDER_PRESETS[key];
    if (!preset) return;
    inputProviderId.value = key;
    inputBaseUrl.value = preset.baseUrl;
    inputProtocol.value = preset.protocol;
    inputApiKey.value = '';
    inputProviderId.focus();
  });

  // Toggle API key visibility
  let apiKeyVisible = false;
  btnToggleApiKey.addEventListener('click', () => {
    apiKeyVisible = !apiKeyVisible;
    inputApiKey.type = apiKeyVisible ? 'text' : 'password';
  });

  // Add model tag
  btnAddModel.addEventListener('click', addModelTag);
  inputModelName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addModelTag(); }
  });

  function addModelTag() {
    const name = inputModelName.value.trim();
    if (!name) return;
    if (modalModels.includes(name)) {
      showToast('模型已存在');
      return;
    }
    modalModels.push(name);
    inputModelName.value = '';
    renderModalModels();
    inputModelName.focus();
  }

  function removeModalModel(index) {
    modalModels.splice(index, 1);
    renderModalModels();
  }

  function renderModalModels() {
    modelCountEl.textContent = modalModels.length;
    if (modalModels.length === 0) {
      modalModelList.innerHTML = '<p class="model-tag-empty">暂无模型</p>';
      return;
    }
    modalModelList.innerHTML = '';
    modalModels.forEach((m, i) => {
      const tag = document.createElement('span');
      tag.className = 'model-tag-item';
      tag.innerHTML = `${escapeHtml(m)}<button class="model-tag-remove" data-idx="${i}">&times;</button>`;
      tag.querySelector('.model-tag-remove').addEventListener('click', () => removeModalModel(i));
      modalModelList.appendChild(tag);
    });
  }

  // Save provider
  btnSaveProvider.addEventListener('click', () => {
    const id = inputProviderId.value.trim();
    const baseUrl = inputBaseUrl.value.trim();
    const apiKey = inputApiKey.value.trim();
    const protocol = inputProtocol.value;

    if (!id) { showToast('请填写提供商 ID'); return; }
    if (!baseUrl) { showToast('请填写 Base URL'); return; }
    if (modalModels.length === 0) { showToast('请至少添加一个模型'); return; }

    const name = PROVIDER_PRESETS[id] ? PROVIDER_PRESETS[id].name : id;
    const providers = getProviders();

    if (editingProviderId) {
      // Update existing
      const idx = providers.findIndex((p) => p.id === editingProviderId);
      if (idx >= 0) {
        providers[idx] = { ...providers[idx], id, name, baseUrl, apiKey, protocol, models: [...modalModels] };
      }
    } else {
      // Check duplicate
      if (providers.some((p) => p.id === id)) {
        showToast('提供商 ID 已存在');
        return;
      }
      providers.push({ id, name, baseUrl, apiKey, protocol, models: [...modalModels] });
      // Auto-select first added provider
      if (!getActiveProviderId()) setActiveProvider(id);
    }

    saveProviders(providers);
    closeProviderModal();
    renderProviders();
    showToast(editingProviderId ? '已更新' : '已添加');
  });

  // ====== Init ======
  renderRecords();
  renderProviders();
});
