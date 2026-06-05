/**
 * 报价单 - Car Fee Calculator
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

  // Hide result when any input changes
  const allInputs = [insuranceCompany, plateNumber, quickRate, addInvest,
    compulsoryAmount, compulsoryRate, commercialAmount, commercialRate,
    nonVehicleAmount, nonVehicleRate, vehicleTax];
  allInputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (resultSection.style.display === 'block') {
        resultSection.style.display = 'none';
      }
    });
  });

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
  const recordSearchWrap = $('#recordSearchWrap');
  const recordSearchInput = $('#recordSearchInput');

  // Settings sub-pages
  const settingsMenu = $('#settingsMenu');
  const btnGoRecords = $('#btnGoRecords');
  const btnGoModels = $('#btnGoModels');
  const btnGoDualConfig = $('#btnGoDualConfig');
  const subpageRecords = $('#subpageRecords');
  const subpageModels = $('#subpageModels');
  const subpageDualConfig = $('#subpageDualConfig');
  const btnBackFromRecords = $('#btnBackFromRecords');
  const btnBackFromModels = $('#btnBackFromModels');
  const btnBackFromDualConfig = $('#btnBackFromDualConfig');

  // Provider Management
  const providerListEl = $('#providerList');

  // Provider Management
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

  // Expiry date inputs
  const compulsoryExpiryYear = $('#compulsoryExpiryYear');
  const compulsoryExpiryMonth = $('#compulsoryExpiryMonth');
  const compulsoryExpiryDay = $('#compulsoryExpiryDay');
  const commercialExpiryYear = $('#commercialExpiryYear');
  const commercialExpiryMonth = $('#commercialExpiryMonth');
  const commercialExpiryDay = $('#commercialExpiryDay');

  // ====== Company Name Correction ======
  const COMPANY_CORRECTIONS_KEY = 'chefeibao_company_corrections';

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

  // 监听保险公司输入框变化，记录用户修正
  let lastCompanyValue = '';
  insuranceCompany.addEventListener('blur', () => {
    const newVal = insuranceCompany.value.trim();
    if (lastCompanyValue && newVal && lastCompanyValue !== newVal) {
      saveCompanyCorrection(lastCompanyValue, newVal);
    }
    lastCompanyValue = newVal;
  });

  // 识别时记录原始值
  function trackCompanyBeforeOCR() {
    lastCompanyValue = insuranceCompany.value.trim();
  }

  // ====== Recognition Models (Custom Provider System) ======
  const PROVIDERS_KEY = 'chefeibao_providers';
  const ACTIVE_PROVIDER_KEY = 'chefeibao_active_provider';

  // Quick select presets
  const PROVIDER_PRESETS = {
    xiaomi: { name: '小米', baseUrl: 'https://api.xiaomimimo.com/v1', protocol: 'openai' },
    qwen: { name: '千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', protocol: 'openai' },
  };

  // Temporary model list during modal editing
  let modalModels = [];
  let editingProviderId = null;

  // Confirm dialog
  const confirmOverlay = $('#confirmOverlay');
  const confirmMessage = $('#confirmMessage');
  const confirmViewImg = $('#confirmViewImg');
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
      subpageDualConfig.style.display = 'none';
      renderRecords();
    } else if (name === 'models') {
      subpageModels.style.display = 'block';
      subpageRecords.style.display = 'none';
      subpageDualConfig.style.display = 'none';
      renderProviders();
    } else if (name === 'dualConfig') {
      subpageDualConfig.style.display = 'block';
      subpageModels.style.display = 'none';
      subpageRecords.style.display = 'none';
      renderDualConfigUI();
    }
  }

  function hideSubpages() {
    settingsMenu.style.display = 'block';
    subpageRecords.style.display = 'none';
    subpageModels.style.display = 'none';
    subpageDualConfig.style.display = 'none';
  }

  btnGoRecords.addEventListener('click', () => showSubpage('records'));
  btnGoModels.addEventListener('click', () => showSubpage('models'));
  btnGoDualConfig.addEventListener('click', () => showSubpage('dualConfig'));
  btnBackFromRecords.addEventListener('click', hideSubpages);
  btnBackFromModels.addEventListener('click', hideSubpages);
  btnBackFromDualConfig.addEventListener('click', hideSubpages);

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

  // ====== Rate Input Click -> Popup Edit ======
  const RATE_FIELDS = [
    { el: compulsoryRate, label: '交强险费率', idx: 0 },
    { el: commercialRate, label: '商业险费率', idx: 1 },
    { el: nonVehicleRate, label: '随车非车费率', idx: 2 },
  ];

  RATE_FIELDS.forEach(({ el, label, idx }) => {
    el.addEventListener('click', () => {
      showRateEditDialog(label, idx, el);
    });
  });

  function showRateEditDialog(label, idx, targetEl) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.zIndex = '1100';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.maxWidth = '300px';

    let html = '<div style="text-align:left;">';
    html += `<div style="font-weight:600;margin-bottom:12px;font-size:15px;">修改${label}</div>`;
    html += `<input type="number" id="rateEditInput" class="form-input" value="" placeholder="输入费率" step="0.01" min="0" style="width:100%;height:44px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:10px;padding:0 14px;font-size:16px;outline:none;">`;
    html += '<div style="display:flex;gap:10px;margin-top:16px;">';
    html += '<button class="confirm-btn confirm-cancel" id="rateEditCancel" style="flex:1;">取消</button>';
    html += '<button class="confirm-btn confirm-ok" id="rateEditOk" style="flex:1;">确定</button>';
    html += '</div>';
    html += '</div>';

    dialog.innerHTML = html;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 自动聚焦并弹出数字键盘
    const input = overlay.querySelector('#rateEditInput');
    setTimeout(() => input.focus(), 100);

    // 确定
    overlay.querySelector('#rateEditOk').addEventListener('click', (e) => {
      e.stopPropagation();
      const val = parseFloat(input.value) || 0;
      // 更新对应的费率输入框
      targetEl.value = val;
      // 同步到快速填写
      const rates = parseTripleInput(quickRate.value) || [0, 0, 0];
      rates[idx] = val;
      quickRate.value = rates.join('/');
      document.body.removeChild(overlay);
    });

    // 取消
    overlay.querySelector('#rateEditCancel').addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  // ====== Calculate ======
  let lastCalculatedData = null;

  btnCalculate.addEventListener('click', () => {
    const data = getFormData();

    // 检查必填项
    const missing = [];
    if (!insuranceCompany.value.trim()) missing.push({ label: '保险公司', el: insuranceCompany });
    if (!plateNumber.value.trim()) missing.push({ label: '车牌号', el: plateNumber });
    if (!quickRate.value.trim()) missing.push({ label: '手续费比例', el: quickRate });

    // 有未填项：弹窗显示所有未填项
    if (missing.length > 0) {
      showMissingFieldsDialog(missing);
      return;
    }

    // 从快速填写手续费比例解析并填入三个保险的手续费比例
    const rates = parseQuickRate(quickRate.value.trim());
    if (rates.length >= 1) compulsoryRate.value = rates[0];
    if (rates.length >= 2) commercialRate.value = rates[1];
    if (rates.length >= 3) nonVehicleRate.value = rates[2];

    // 重新获取数据（包含新填入的费率）
    const newData = getFormData();

    // 如果数据没有改动，直接计算不弹窗
    if (lastCalculatedData && isSameData(lastCalculatedData, newData)) {
      doCalculate(newData);
      return;
    }

    // 弹出确认框，让用户核对数据
    showConfirmDialog(newData);
  });

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

  function showMissingFieldsDialog(missing) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.zIndex = '1100';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.maxWidth = '320px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflow = 'auto';

    let html = '<div style="text-align:left;">';
    html += '<div style="font-weight:600;margin-bottom:12px;font-size:15px;color:#E74C3C;">⚠️ 请填写以下必填项</div>';

    missing.forEach((item, i) => {
      const inputType = item.el.type === 'number' ? 'number' : 'text';
      const placeholder = item.el.placeholder || '';
      html += `<div style="margin-bottom:12px;">`;
      html += `<label style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:6px;display:block;">${item.label}</label>`;
      html += `<input type="${inputType}" class="missing-field-input" data-idx="${i}" placeholder="${placeholder}" step="0.01" min="0" style="width:100%;height:42px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:10px;padding:0 14px;font-size:14px;color:var(--text);outline:none;box-sizing:border-box;">`;
      html += '</div>';
    });

    html += '<div style="display:flex;gap:10px;margin-top:16px;">';
    html += '<button class="confirm-btn confirm-cancel" id="missingFieldsCancel" style="flex:1;">取消</button>';
    html += '<button class="confirm-btn confirm-ok" id="missingFieldsOk" style="flex:1;">确定</button>';
    html += '</div>';
    html += '</div>';

    dialog.innerHTML = html;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 自动聚焦第一个输入框
    const firstInput = overlay.querySelector('.missing-field-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);

    // 确定：同步值到计算界面
    overlay.querySelector('#missingFieldsOk').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.querySelectorAll('.missing-field-input').forEach((input) => {
        const idx = parseInt(input.dataset.idx, 10);
        const val = input.value.trim();
        if (val) {
          missing[idx].el.value = val;
        }
      });
      document.body.removeChild(overlay);
    });

    // 取消
    overlay.querySelector('#missingFieldsCancel').addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.removeChild(overlay);
    });
  }

  function parseQuickRate(str) {
    // 支持 / 或 - 或 , 或 空格 分隔
    const parts = str.split(/[\/\-\,\s]+/).filter(s => s.trim() !== '');
    return parts.map(s => parseFloat(s) || 0);
  }

  function showConfirmDialog(data) {
    let html = '<div class="confirm-dialog-content">';
    html += '<div class="confirm-dialog-title">请核对以下数据：</div>';

    // 基本信息
    html += '<div class="confirm-card confirm-card-info">';
    html += `<div class="confirm-row"><span class="confirm-label">保险公司</span><span class="confirm-value">${data.company || '未填写'}</span></div>`;
    html += `<div class="confirm-row"><span class="confirm-label">车牌号</span><span class="confirm-value">${data.plate || '未填写'}</span></div>`;
    html += '</div>';

    // 交强险
    if (data.compulsoryRate > 0) {
      html += '<div class="confirm-card confirm-card-compulsory">';
      html += '<div class="confirm-card-title" style="color:#E8734A;">交强险</div>';
      html += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.compulsoryAmount} 元</span></div>`;
      html += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.compulsoryRate}%</span></div>`;
      if (data.compulsoryExpiry) html += `<div class="confirm-row"><span>到期</span><span class="confirm-value">${data.compulsoryExpiry}</span></div>`;
      html += '</div>';
    }

    // 商业险
    if (data.commercialRate > 0) {
      html += '<div class="confirm-card confirm-card-commercial">';
      html += '<div class="confirm-card-title" style="color:#E8A04A;">商业险</div>';
      html += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.commercialAmount} 元</span></div>`;
      html += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.commercialRate}%</span></div>`;
      if (data.commercialExpiry) html += `<div class="confirm-row"><span>到期</span><span class="confirm-value">${data.commercialExpiry}</span></div>`;
      html += '</div>';
    }

    // 随车非车
    if (data.nonVehicleRate > 0) {
      html += '<div class="confirm-card confirm-card-nonvehicle">';
      html += '<div class="confirm-card-title" style="color:#6CB4A8;">随车非车</div>';
      html += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.nonVehicleAmount} 元</span></div>`;
      html += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.nonVehicleRate}%</span></div>`;
      html += '</div>';
    }

    // 车船税
    if (data.vehicleTax > 0) {
      html += '<div class="confirm-card confirm-card-tax">';
      html += `<div class="confirm-row"><span class="confirm-label">车船税</span><span class="confirm-value">${data.vehicleTax} 元</span></div>`;
      html += '</div>';
    }

    html += '</div>';

    const confirmMsg = $('#confirmMessage');
    confirmMsg.innerHTML = html;

    // 如果有图片，显示查看图片按钮
    const hasImg = imgPreview.src && imgPreviewWrap.style.display !== 'none';
    confirmViewImg.style.display = hasImg ? 'flex' : 'none';

    confirmOverlay.style.display = 'flex';

    // 绑定确认按钮
    const onOk = () => {
      confirmOverlay.style.display = 'none';
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      confirmViewImg.removeEventListener('click', onViewImg);
      doCalculate(data);
    };
    const onCancel = () => {
      confirmOverlay.style.display = 'none';
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      confirmViewImg.removeEventListener('click', onViewImg);
    };
    const onViewImg = () => {
      // 不关闭确认弹窗，直接打开图片查看器覆盖在上面
      updateBaseSize();
      resetViewer();
      imgViewerImg.src = imgPreview.src;
      imgViewerOverlay.style.display = 'block';
    };
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
    confirmViewImg.addEventListener('click', onViewImg);
  }

  function doCalculate(data) {
    lastCalculatedData = { ...data };
    const results = calculate(data);
    displayResults(results);
    resultSection.style.display = 'block';
    const text = formatPlanText(data, results);
    copyToClipboard(text);
    showToast('已计算并复制文案');
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ====== Reset ======
  btnReset.addEventListener('click', () => {
    const inputs = [
      insuranceCompany, plateNumber, quickRate, addInvest,
      compulsoryAmount, compulsoryRate,
      commercialAmount, commercialRate,
      nonVehicleAmount, nonVehicleRate,
      vehicleTax,
      compulsoryExpiryYear, compulsoryExpiryMonth, compulsoryExpiryDay,
      commercialExpiryYear, commercialExpiryMonth, commercialExpiryDay,
    ];
    inputs.forEach((input) => (input.value = ''));
    resultSection.style.display = 'none';
    ocrExpiry.compulsory = '';
    ocrExpiry.commercial = '';
    ocrExpiry.nonVehicle = '';
    lastCalculatedData = null;
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
    setTimeout(() => {
      quickRate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => quickRate.focus(), 300);
    }, 200);
  });

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgPreview.src = ev.target.result;
      imgPreviewWrap.style.display = 'block';
      const provider = getActiveProvider();
      const statusText = provider
        ? `使用 ${provider.name} · ${provider.selectedModel || provider.models[0] || '默认模型'} 识别中...`
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
  const OCR_PROMPT = `识别图片中的车险报价信息，返回JSON：
{"company":"保险公司","plate":"车牌号","compulsoryAmount":数字,"compulsoryExpiry":"2025年3月15日","commercialAmount":数字,"commercialExpiry":"2025年3月15日","nonVehicleAmount":数字,"nonVehicleExpiry":"2025年3月15日","vehicleTax":数字}
规则：
- 只识别保费金额，不识别手续费比例
- 随车非车保费=除交强险商业险外所有其他险种保费总和
- 到期时间必须含年月日，格式XXXX年X月X日
- 未找到的字段填0或空字符串
- 只返回JSON`;

  // ---- Recognize Image (dual-model parallel) ----
  async function recognizeImage(file, provider) {
    try {
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

      // 获取双重识别配置
      const dualCfg = getDualConfig();
      const allProviders = getProviders().filter(p => p.models && p.models.length > 0);

      // 如果双重识别未启用或只有一个模型，走原有逻辑
      if (!dualCfg.enabled || dualCfg.models.length <= 1) {
        const result = await tryWithFailover(provider, file, base64, dataUrl);
        imgPreviewStatus.textContent = `${result.providerName} · ${result.modelName} — 识别完成`;
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 获取配置的模型对应的提供商和模型
      const providers = getProviders();
      let modelsToUse = dualCfg.models
        .map(item => {
          const p = providers.find(x => x.id === item.providerId);
          return p ? { provider: p, model: item.model } : null;
        })
        .filter(Boolean);

      if (modelsToUse.length <= 1) {
        // 配置的模型不够，降级为单模型
        const p = modelsToUse[0]?.provider || provider;
        const result = await tryWithFailover(p, file, base64, dataUrl);
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 如果模型数量超过配置的识别数，让用户选择不使用的模型
      const maxCount = dualCfg.count || 2;
      if (modelsToUse.length > maxCount) {
        modelsToUse = modelsToUse.slice(0, maxCount);
      }

      if (modelsToUse.length <= 1) {
        const p = modelsToUse[0]?.provider || provider;
        const result = await tryWithFailover(p, file, base64, dataUrl);
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 多个模型：同时识别，显示进度
      const total = modelsToUse.length;
      let completed = 0;
      imgPreviewStatus.textContent = `正在识别 (0/${total})...`;
      imgPreviewStatus.className = 'img-preview-status loading';

      const results = await Promise.allSettled(
        modelsToUse.map(async ({ provider: p, model }) => {
          // 临时设置选中的模型
          const originalModel = p.selectedModel;
          p.selectedModel = model;
          const result = await tryWithFailover(p, file, base64, dataUrl);
          p.selectedModel = originalModel;
          completed++;
          imgPreviewStatus.textContent = `正在识别 (${completed}/${total})...`;
          return result;
        })
      );

      // 收集成功的结果
      const succeeded = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      if (succeeded.length === 0) {
        throw new Error('所有模型识别失败');
      }

      // 如果只有一个成功，直接用
      if (succeeded.length === 1) {
        const r = succeeded[0];
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(r.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 多个都成功：逐字段对比合并
      let merged = succeeded[0].data;
      let allConflicts = [];
      for (let i = 1; i < succeeded.length; i++) {
        const result = mergeOCRResults(merged, succeeded[i].data);
        merged = result.data;
        allConflicts = [...new Set([...allConflicts, ...result.conflictFields])];
      }

      // 有冲突字段：必须弹窗让用户选择
      if (allConflicts.length > 0) {
        const chosen = await showConflictDialog(allConflicts, succeeded);
        if (chosen) {
          merged = chosen;
        } else {
          // 全部跳过：清空冲突字段，让用户自己填
          allConflicts.forEach(f => {
            if (f.includes('Amount') || f.includes('Rate') || f === 'vehicleTax') {
              merged[f] = 0;
            } else {
              merged[f] = '';
            }
          });
        }
      }

      imgPreviewStatus.textContent = '多重识别完成';
      imgPreviewStatus.className = 'img-preview-status';
      applyOCRResult(merged);
      showToast(allConflicts.length > 0
        ? '已选择您确认的数据'
        : '多重识别一致，已自动填入数据');
    } catch (err) {
      console.error('OCR error:', err);
      imgPreviewStatus.textContent = '识别失败：' + (err.message || '未知错误');
      imgPreviewStatus.className = 'img-preview-status error';
      showToast('识别失败，请检查配置后重试');
    }
  }

  // ---- 合并两个模型的识别结果 ----
  function mergeOCRResults(dataA, dataB) {
    const fields = [
      'company', 'plate',
      'compulsoryAmount', 'compulsoryExpiry',
      'commercialAmount', 'commercialExpiry',
      'nonVehicleAmount', 'nonVehicleExpiry',
      'vehicleTax',
    ];

    const merged = {};
    const conflictFields = [];

    for (const f of fields) {
      const valA = dataA[f];
      const valB = dataB[f];

      if (valA === valB) {
        merged[f] = valA;
      } else if (valA === 0 || valA === '') {
        merged[f] = valB; // A 没识别到，用 B
      } else if (valB === 0 || valB === '') {
        merged[f] = valA; // B 没识别到，用 A
      } else {
        // 两个都不一样且都有值：优先用数值更大的（更可能是正确的完整数据）
        // 对于字符串字段，用 A
        if (typeof valA === 'number') {
          merged[f] = Math.max(valA, valB);
        } else {
          merged[f] = valA;
        }
        conflictFields.push(f);
      }
    }

    return { data: merged, conflictCount: conflictFields.length, conflictFields };
  }

  // ---- 排除模型弹窗 ----
  function showExcludeModelsDialog(models, maxCount) {
    return new Promise((resolve) => {
      const excludeCount = models.length - maxCount;

      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.style.zIndex = '1100';

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.style.maxWidth = '340px';
      dialog.style.maxHeight = '80vh';
      dialog.style.overflow = 'auto';

      let html = '<div class="confirm-dialog-content">';
      html += `<div class="confirm-dialog-title" style="color:#E74C3C;">⚠️ 已添加 ${models.length} 个模型</div>`;
      html += `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">识别模型数为 ${maxCount}，请选择 ${excludeCount} 个不使用的模型：</div>`;

      models.forEach((item, i) => {
        html += `<div class="exclude-model-item" data-idx="${i}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:var(--card-bg);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;">`;
        html += `<span class="exclude-checkbox" style="width:20px;height:20px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;"></span>`;
        html += `<div style="flex:1;"><div style="font-weight:500;font-size:14px;">${item.provider.name || item.provider.id}</div><div style="font-size:12px;color:var(--text-secondary);">${item.model}</div></div>`;
        html += '</div>';
      });

      html += '<div style="display:flex;gap:10px;margin-top:16px;">';
      html += '<button class="confirm-btn confirm-cancel" id="excludeCancel" style="flex:1;">取消</button>';
      html += '<button class="confirm-btn confirm-ok" id="excludeConfirm" style="flex:1;">确定</button>';
      html += '</div>';
      html += '</div>';

      dialog.innerHTML = html;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // 记录选择
      const excludedIndices = new Set();

      // 点击选择/取消
      overlay.querySelectorAll('.exclude-model-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          if (excludedIndices.has(idx)) {
            excludedIndices.delete(idx);
            item.style.borderColor = 'var(--border)';
            item.style.background = 'var(--card-bg)';
            item.querySelector('.exclude-checkbox').style.background = 'transparent';
            item.querySelector('.exclude-checkbox').innerHTML = '';
          } else {
            if (excludedIndices.size >= excludeCount) {
              showToast(`最多选择 ${excludeCount} 个不使用`);
              return;
            }
            excludedIndices.add(idx);
            item.style.borderColor = '#E74C3C';
            item.style.background = '#FFF5F5';
            item.querySelector('.exclude-checkbox').style.background = '#E74C3C';
            item.querySelector('.exclude-checkbox').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          }
        });
      });

      // 确定
      overlay.querySelector('#excludeConfirm').addEventListener('click', (e) => {
        e.stopPropagation();
        if (excludedIndices.size !== excludeCount) {
          showToast(`请选择 ${excludeCount} 个不使用的模型`);
          return;
        }
        document.body.removeChild(overlay);
        resolve([...excludedIndices]);
      });

      // 取消
      overlay.querySelector('#excludeCancel').addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.removeChild(overlay);
        resolve(null);
      });
    });
  }

  // ---- 选择模型弹窗 ----
  function showSelectModelsDialog(availableModels, needCount) {
    return new Promise((resolve) => {
      // 如果可用模型不够，只需要选所有可用的
      const actualNeed = Math.min(needCount, availableModels.length);

      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.style.zIndex = '1100';

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.style.maxWidth = '340px';
      dialog.style.maxHeight = '80vh';
      dialog.style.overflow = 'auto';

      let html = '<div class="confirm-dialog-content">';
      html += `<div class="confirm-dialog-title" style="color:#4CAF50;">➕ 请添加模型</div>`;
      html += `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">当前模型不足，请选择要参与识别的模型：</div>`;

      availableModels.forEach((item, i) => {
        html += `<div class="select-model-item" data-idx="${i}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:var(--card-bg);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;">`;
        html += `<span class="select-checkbox" style="width:20px;height:20px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;"></span>`;
        html += `<div style="flex:1;"><div style="font-weight:500;font-size:14px;">${item.provider.name || item.provider.id}</div><div style="font-size:12px;color:var(--text-secondary);">${item.model}</div></div>`;
        html += '</div>';
      });

      html += '<div style="display:flex;gap:10px;margin-top:16px;">';
      html += '<button class="confirm-btn confirm-cancel" id="selectModelCancel" style="flex:1;">取消</button>';
      html += '<button class="confirm-btn confirm-ok" id="selectModelConfirm" style="flex:1;">确定</button>';
      html += '</div>';
      html += '</div>';

      dialog.innerHTML = html;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // 记录选择
      const selectedIndices = new Set();

      // 点击选择/取消
      overlay.querySelectorAll('.select-model-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          if (selectedIndices.has(idx)) {
            selectedIndices.delete(idx);
            item.style.borderColor = 'var(--border)';
            item.style.background = 'var(--card-bg)';
            item.querySelector('.select-checkbox').style.background = 'transparent';
            item.querySelector('.select-checkbox').innerHTML = '';
          } else {
            if (selectedIndices.size >= actualNeed) {
              showToast(`最多选择 ${actualNeed} 个模型`);
              return;
            }
            selectedIndices.add(idx);
            item.style.borderColor = '#4CAF50';
            item.style.background = '#F0FAF7';
            item.querySelector('.select-checkbox').style.background = '#4CAF50';
            item.querySelector('.select-checkbox').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          }
        });
      });

      // 确定
      overlay.querySelector('#selectModelConfirm').addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedIndices.size === 0) {
          showToast('请至少选择 1 个模型');
          return;
        }
        document.body.removeChild(overlay);
        resolve([...selectedIndices].map(i => availableModels[i]));
      });

      // 取消
      overlay.querySelector('#selectModelCancel').addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.removeChild(overlay);
        resolve(null);
      });
    });
  }

  // ---- 冲突选择弹窗 ----
  const FIELD_LABELS = {
    company: '保险公司',
    plate: '车牌号',
    compulsoryAmount: '交强险保费',
    compulsoryExpiry: '交强险到期',
    commercialAmount: '商业险保费',
    commercialExpiry: '商业险到期',
    nonVehicleAmount: '随车非车保费',
    nonVehicleExpiry: '随车非车到期',
    vehicleTax: '车船税',
  };

  function showConflictDialog(conflictFields, succeeded) {
    return new Promise((resolve) => {
      // 创建弹窗
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.style.zIndex = '1100';

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.style.maxWidth = '360px';
      dialog.style.maxHeight = '80vh';
      dialog.style.overflow = 'auto';

      const providerNames = succeeded.map(r => r.providerName);

      let html = '<div style="text-align:left;font-size:14px;">';
      html += '<div style="font-weight:600;margin-bottom:10px;color:#E74C3C;">⚠️ 以下字段两个模型识别结果不一致</div>';
      html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">请点击您认为正确的值</div>';

      conflictFields.forEach((f, idx) => {
        const label = FIELD_LABELS[f] || f;
        const values = succeeded.map(r => r.data[f]);

        html += `<div style="background:var(--primary-light);border-radius:10px;padding:10px 12px;margin-bottom:8px;">`;
        html += `<div style="font-weight:600;color:#E74C3C;margin-bottom:6px;font-size:13px;">${label}</div>`;

        values.forEach((val, vi) => {
          const displayVal = (val === 0 || val === '') ? '未识别到' : val;
          html += `<div class="conflict-option" data-field="${f}" data-value="${val}" data-idx="${idx}">`;
          html += `<span style="color:var(--text-secondary);font-size:12px;">${providerNames[vi]}</span>`;
          html += `<span style="font-weight:600;color:var(--text);">${displayVal}</span>`;
          html += `</div>`;
        });

        html += '</div>';
      });

      html += '</div>';

      // 查看图片按钮
      const hasImg = imgPreview.src && imgPreviewWrap.style.display !== 'none';
      if (hasImg) {
        html += `<div id="conflictViewImg" class="conflict-view-img-btn">`;
        html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="9.5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 16l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        html += `查看图片`;
        html += `</div>`;
      }

      // 按钮
      html += '<div style="display:flex;gap:10px;margin-top:14px;">';
      html += '<button class="confirm-btn confirm-cancel" id="conflictCancelAll" style="flex:1;">全部跳过</button>';
      html += '<button class="confirm-btn confirm-ok" id="conflictConfirm" style="flex:1;">确认选择</button>';
      html += '</div>';

      dialog.innerHTML = html;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // 记录用户选择
      const choices = {};
      conflictFields.forEach(f => {
        choices[f] = 0; // 默认选第一个
      });

      // 点击选择
      overlay.querySelectorAll('.conflict-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const f = opt.dataset.field;
          const v = opt.dataset.value;
          choices[f] = v;

          // 高亮选中的，取消其他
          overlay.querySelectorAll(`.conflict-option[data-field="${f}"]`).forEach(o => {
            o.classList.remove('selected');
          });
          opt.classList.add('selected');
        });
      });

      // 默认选中每个字段的第一个选项
      conflictFields.forEach(f => {
        const first = overlay.querySelector(`.conflict-option[data-field="${f}"]`);
        if (first) {
          first.classList.add('selected');
        }
      });

      // 查看图片
      const conflictViewImg = overlay.querySelector('#conflictViewImg');
      if (conflictViewImg) {
        conflictViewImg.addEventListener('click', () => {
          updateBaseSize();
          resetViewer();
          imgViewerImg.src = imgPreview.src;
          imgViewerOverlay.style.display = 'block';
        });
      }

      // 全部跳过
      overlay.querySelector('#conflictCancelAll').addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(null);
      });

      // 确认选择
      overlay.querySelector('#conflictConfirm').addEventListener('click', () => {
        document.body.removeChild(overlay);
        // 根据用户选择构建最终数据
        const finalData = { ...succeeded[0].data };
        conflictFields.forEach(f => {
          const chosenValue = choices[f];
          succeeded.forEach(r => {
            if (String(r.data[f]) === String(chosenValue)) {
              finalData[f] = r.data[f];
            }
          });
        });
        resolve(finalData);
      });
    });
  }

  async function tryWithFailover(provider, file, base64, dataUrl) {
    const model = provider.selectedModel || provider.models[0] || '';
    return {
      providerName: provider.name,
      modelName: model,
      data: await callProviderAPI(provider, model, dataUrl, base64, file.type),
    };
  }

  async function callProviderAPI(provider, modelName, dataUrl, base64, mimeType) {
    if (provider.protocol === 'openai') {
      return await callOpenAICompatible(provider, modelName, dataUrl);
    } else if (provider.protocol === 'ocr') {
      return await callOCRInterface(provider, modelName, base64, mimeType || 'image/jpeg');
    } else {
      return await callOpenAICompatible(provider, modelName, dataUrl);
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
        max_tokens: 4096,
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
    let raw = jsonMatch ? jsonMatch[1].trim() : text.trim();

    // 尝试修复截断的 JSON
    try {
      const parsed = JSON.parse(raw);
      return {
        company: parsed.company || '',
        plate: parsed.plate || '',
        compulsoryAmount: num(parsed.compulsoryAmount),
        compulsoryExpiry: parsed.compulsoryExpiry || '',
        commercialAmount: num(parsed.commercialAmount),
        commercialExpiry: parsed.commercialExpiry || '',
        nonVehicleAmount: num(parsed.nonVehicleAmount),
        nonVehicleExpiry: parsed.nonVehicleExpiry || '',
        vehicleTax: num(parsed.vehicleTax),
      };
    } catch (e) {
      // JSON 可能被截断，尝试逐字段提取
      console.warn('JSON parse failed, trying field extraction:', e.message);
      const extract = (key) => {
        const m = raw.match(new RegExp(`"${key}"\\s*:\\s*("?[^",}\\]]*"?|\\d+\\.?\\d*)`));
        return m ? m[1].replace(/"/g, '').trim() : '';
      };
      return {
        company: extract('company'),
        plate: extract('plate'),
        compulsoryAmount: num(extract('compulsoryAmount')),
        compulsoryExpiry: extract('compulsoryExpiry'),
        commercialAmount: num(extract('commercialAmount')),
        commercialExpiry: extract('commercialExpiry'),
        nonVehicleAmount: num(extract('nonVehicleAmount')),
        nonVehicleExpiry: extract('nonVehicleExpiry'),
        vehicleTax: num(extract('vehicleTax')),
      };
    }
  }

  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // 如果图片小于 500KB 直接发送
      if (file.size < 500 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // 大图片压缩后再发送
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // 限制最大边长为 1600px
          const MAX_SIZE = 1600;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > MAX_SIZE || h > MAX_SIZE) {
            if (w > h) {
              h = Math.round(h * MAX_SIZE / w);
              w = MAX_SIZE;
            } else {
              w = Math.round(w * MAX_SIZE / h);
              h = MAX_SIZE;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          // 压缩为 JPEG 80% 质量
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = compressed.split(',')[1] || '';
          resolve(base64);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function applyOCRResult(data) {
    resultSection.style.display = 'none';
    // 应用公司名称修正
    const correctedCompany = correctCompanyName(data.company);
    insuranceCompany.value = correctedCompany || '';
    lastCompanyValue = correctedCompany;
    plateNumber.value = data.plate || '';
    if (data.compulsoryAmount != null) compulsoryAmount.value = data.compulsoryAmount;
    if (data.compulsoryRate != null) compulsoryRate.value = data.compulsoryRate;
    ocrExpiry.compulsory = data.compulsoryExpiry || '';
    parseExpiryToInputs(data.compulsoryExpiry, compulsoryExpiryYear, compulsoryExpiryMonth, compulsoryExpiryDay);
    if (data.commercialAmount != null) commercialAmount.value = data.commercialAmount;
    if (data.commercialRate != null) commercialRate.value = data.commercialRate;
    ocrExpiry.commercial = data.commercialExpiry || '';
    parseExpiryToInputs(data.commercialExpiry, commercialExpiryYear, commercialExpiryMonth, commercialExpiryDay);
    if (data.nonVehicleAmount != null) nonVehicleAmount.value = data.nonVehicleAmount;
    if (data.nonVehicleRate != null) nonVehicleRate.value = data.nonVehicleRate;
    ocrExpiry.nonVehicle = data.nonVehicleExpiry || '';
    if (data.vehicleTax != null) vehicleTax.value = data.vehicleTax;
  }

  function parseExpiryToInputs(expiryStr, yearEl, monthEl, dayEl) {
    if (!expiryStr) return;
    // 格式如 "3月20日" 或 "2025年3月20日"
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

  // ====== Image Viewer (WeChat-style) ======
  const btnViewImg = $('#btnViewImg');
  const imgViewerOverlay = $('#imgViewerOverlay');
  const imgViewerImg = $('#imgViewerImg');

  // Center-based coordinate system
  // (cx, cy) = screen position of the image center
  let scale = 1, cx = 0, cy = 0;
  let baseW = 0, baseH = 0;
  const MIN_SCALE = 1, MAX_SCALE = 5;
  let lastTapTime = 0;
  let movedSinceTouch = false;

  // Touch tracking
  let t0 = null, t1 = null;
  let pinchStartDist = 0, pinchStartScale = 1;
  let pinchStartCX = 0, pinchStartCY = 0;
  let pinchMidStartX = 0, pinchMidStartY = 0;
  let panStartX = 0, panStartY = 0;
  let velHistory = [];
  let flingRAF = null;

  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight; }

  function updateBaseSize() {
    const natW = imgViewerImg.naturalWidth || 1;
    const natH = imgViewerImg.naturalHeight || 1;
    const ratio = natW / natH;
    if (ratio > vw() / vh()) {
      baseW = vw();
      baseH = vw() / ratio;
    } else {
      baseH = vh();
      baseW = vh() * ratio;
    }
  }

  function getScaledSize() {
    return { w: baseW * scale, h: baseH * scale };
  }

  function clampCenter() {
    if (scale <= 1) { cx = 0; cy = 0; return; }
    const s = getScaledSize();
    const maxX = Math.max(0, (s.w - vw()) / 2);
    const maxY = Math.max(0, (s.h - vh()) / 2);
    cx = Math.min(Math.max(cx, -maxX), maxX);
    cy = Math.min(Math.max(cy, -maxY), maxY);
  }

  function applyTransform(animate) {
    clampCenter();
    if (animate) {
      imgViewerImg.classList.add('animating');
      setTimeout(() => imgViewerImg.classList.remove('animating'), 320);
    } else {
      imgViewerImg.classList.remove('animating');
    }
    imgViewerImg.style.transform = `translate(${cx}px, ${cy}px) scale(${scale})`;
  }

  function resetViewer() {
    scale = 1; cx = 0; cy = 0;
    cancelFling();
    applyTransform(false);
  }

  // Open
  btnViewImg.addEventListener('click', () => {
    if (!imgPreview.src || imgPreviewWrap.style.display === 'none') {
      showToast('请先上传图片');
      return;
    }
    updateBaseSize();
    resetViewer();
    imgViewerImg.src = imgPreview.src;
    imgViewerOverlay.style.display = 'block';
  });

  // Close on overlay tap
  imgViewerOverlay.addEventListener('click', () => {
    imgViewerOverlay.style.display = 'none';
  });

  // ====== Touch Events ======

  imgViewerImg.addEventListener('touchstart', (e) => {
    cancelFling();
    movedSinceTouch = false;

    if (e.touches.length === 2) {
      t0 = e.touches[0]; t1 = e.touches[1];
      pinchStartDist = dist(t0, t1);
      pinchStartScale = scale;
      const m = mid(t0, t1);
      pinchMidStartX = m.x;
      pinchMidStartY = m.y;
      pinchStartCX = cx;
      pinchStartCY = cy;
    } else if (e.touches.length === 1) {
      t0 = e.touches[0];
      panStartX = t0.clientX - cx;
      panStartY = t0.clientY - cy;
      velHistory = [{ x: t0.clientX, y: t0.clientY, t: Date.now() }];
    }
  }, { passive: true });

  imgViewerImg.addEventListener('touchmove', (e) => {
    movedSinceTouch = true;

    if (e.touches.length === 2 && t0 && t1) {
      // Pinch zoom centered on pinch midpoint
      const ct0 = e.touches[0], ct1 = e.touches[1];
      const curDist = dist(ct0, ct1);
      const curMid = mid(ct0, ct1);
      const newScale = Math.min(Math.max(pinchStartScale * (curDist / pinchStartDist), 0.5), MAX_SCALE);

      // Keep pinch midpoint fixed on screen:
      // screenX = pinchMidStartX + pinchStartCX
      // After scale: screenX = curMid.x + newCX
      // => newCX = pinchMidStartX + pinchStartCX - curMid.x
      cx = pinchMidStartX + pinchStartCX - curMid.x;
      cy = pinchMidStartY + pinchStartCY - curMid.y;

      scale = newScale;
      clampCenter();
      imgViewerImg.style.transform = `translate(${cx}px, ${cy}px) scale(${scale})`;

    } else if (e.touches.length === 1 && t0) {
      const ct = e.touches[0];
      let newCX = ct.clientX - panStartX;
      let newCY = ct.clientY - panStartY;

      if (scale <= 1) {
        // Rubber-band horizontal
        newCY = 0;
      }
      // Soft clamp (allow overshoot)
      const s = getScaledSize();
      const maxX = Math.max(0, (s.w - vw()) / 2);
      const maxY = Math.max(0, (s.h - vh()) / 2);
      const overshoot = 80;
      newCX = Math.min(Math.max(newCX, -maxX - overshoot), maxX + overshoot);
      newCY = Math.min(Math.max(newCY, -maxY - overshoot), maxY + overshoot);

      cx = newCX;
      cy = newCY;
      imgViewerImg.style.transform = `translate(${cx}px, ${cy}px) scale(${scale})`;

      // Velocity tracking
      const now = Date.now();
      velHistory.push({ x: ct.clientX, y: ct.clientY, t: now });
      if (velHistory.length > 5) velHistory.shift();
    }
  }, { passive: true });

  imgViewerImg.addEventListener('touchend', (e) => {
    if (e.touches.length === 1) {
      const remaining = e.touches[0];
      t0 = remaining; t1 = null;
      panStartX = remaining.clientX - cx;
      panStartY = remaining.clientY - cy;
      velHistory = [{ x: remaining.clientX, y: remaining.clientY, t: Date.now() }];
    } else if (e.touches.length === 0) {
      t0 = null; t1 = null;

      // Fling
      if (scale > 1 && movedSinceTouch && velHistory.length >= 2) {
        const last = velHistory[velHistory.length - 1];
        const first = velHistory[0];
        const dt = (last.t - first.t) || 1;
        const vx = (last.x - first.x) / dt * 16;
        const vy = (last.y - first.y) / dt * 16;
        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          startFling(vx, vy);
          return;
        }
      }

      // Snap back
      if (scale < MIN_SCALE) scale = MIN_SCALE;
      clampCenter();
      applyTransform(true);
    }
  }, { passive: true });

  // ====== Click handling ======
  imgViewerImg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (movedSinceTouch) return;

    const now = Date.now();
    if (lastTapTime && now - lastTapTime < 300) {
      lastTapTime = 0;
      const tapX = e.clientX;
      const tapY = e.clientY;

      if (scale > MIN_SCALE) {
        scale = MIN_SCALE; cx = 0; cy = 0;
        applyTransform(true);
      } else {
        // Zoom to 2x centered on tap point
        scale = 2;
        updateBaseSize();
        cx = vw() / 2 - tapX;
        cy = vh() / 2 - tapY;
        clampCenter();
        applyTransform(true);
      }
      return;
    }
    lastTapTime = now;
    setTimeout(() => {
      if (lastTapTime !== now) return;
      imgViewerOverlay.style.display = 'none';
    }, 300);
  });

  // ====== Fling ======
  function startFling(vx, vy) {
    cancelFling();
    let curVX = vx, curVY = vy;

    function step() {
      cx += curVX;
      cy += curVY;
      curVX *= 0.95;
      curVY *= 0.95;

      const s = getScaledSize();
      const maxX = Math.max(0, (s.w - vw()) / 2);
      const maxY = Math.max(0, (s.h - vh()) / 2);
      let bounced = false;
      if (cx > maxX) { cx = maxX; curVX = 0; bounced = true; }
      if (cx < -maxX) { cx = -maxX; curVX = 0; bounced = true; }
      if (cy > maxY) { cy = maxY; curVY = 0; bounced = true; }
      if (cy < -maxY) { cy = -maxY; curVY = 0; bounced = true; }

      imgViewerImg.style.transform = `translate(${cx}px, ${cy}px) scale(${scale})`;
      if (Math.abs(curVX) < 0.3 && Math.abs(curVY) < 0.3) {
        if (bounced) applyTransform(true);
        return;
      }
      flingRAF = requestAnimationFrame(step);
    }
    flingRAF = requestAnimationFrame(step);
  }

  function cancelFling() {
    if (flingRAF) { cancelAnimationFrame(flingRAF); flingRAF = null; }
  }

  // ====== Helpers ======
  function dist(a, b) {
    return Math.sqrt((b.clientX - a.clientX) ** 2 + (b.clientY - a.clientY) ** 2);
  }
  function mid(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  // ====== Save Record ======
  btnSaveRecord.addEventListener('click', async () => {
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
      ...results,
      localImage: null,
    };

    // 保存图片到本地
    if (imgPreview.src && imgPreviewWrap.style.display !== 'none') {
      try {
        const localPath = await saveImageToLocal(imgPreview.src, record.id);
        record.localImage = localPath;
      } catch (e) {
        console.warn('图片保存到本地失败:', e);
      }
    }

    saveRecord(record);
    showToast('已保存到记录');
  });

  async function saveImageToLocal(dataUrl, recordId) {
    const { Filesystem } = window.Capacitor?.Plugins || {};
    if (!Filesystem) return null;

    // 压缩图片
    const compressedBase64 = await compressImage(dataUrl, 1600, 0.8);

    // 确保目录存在
    await Filesystem.mkdir({ path: 'chefeibao_images', directory: 'DATA', recursive: true });

    const fileName = `img_${recordId}.jpg`;
    const filePath = `chefeibao_images/${fileName}`;

    await Filesystem.writeFile({
      path: filePath,
      data: compressedBase64,
      directory: 'DATA',
      encoding: 'base64',
    });

    return filePath;
  }

  function compressImage(dataUrl, maxSize, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round(h * maxSize / w);
            w = maxSize;
          } else {
            w = Math.round(w * maxSize / h);
            h = maxSize;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.split(',')[1] || '');
      };
      img.src = dataUrl;
    });
  }

  async function deleteLocalImage(filePath) {
    if (!filePath) return;
    try {
      const { Filesystem } = window.Capacitor?.Plugins || {};
      if (!Filesystem) return;
      await Filesystem.deleteFile({ path: filePath, directory: 'DATA' });
    } catch (e) {
      console.warn('删除本地图片失败:', e);
    }
  }

  async function readLocalImage(filePath) {
    if (!filePath) return null;
    try {
      const { Filesystem } = window.Capacitor?.Plugins || {};
      if (!Filesystem) return null;
      const result = await Filesystem.readFile({ path: filePath, directory: 'DATA', encoding: 'base64' });
      return `data:image/jpeg;base64,${result.data}`;
    } catch (e) {
      console.warn('读取本地图片失败:', e);
      return null;
    }
  }

  // ====== Copy & Share Buttons ======
  btnCopyPlan.addEventListener('click', () => {
    const data = getFormData();
    const results = calculate(data);
    const text = formatPlanText(data, results);
    copyToClipboard(text);
    showToast('已复制文案');
  });

  const btnShareResult = $('#btnShareResult');
  btnShareResult.addEventListener('click', async () => {
    const data = getFormData();
    const results = calculate(data);
    const text = formatPlanText(data, results);

    // 尝试使用 Capacitor Share 插件
    try {
      const { Share } = window.Capacitor?.Plugins || {};
      if (Share) {
        await Share.share({ title: '车险报价单', text: text, dialogTitle: '分享报价单' });
        return;
      }
    } catch (e) {
      console.log('Capacitor Share failed:', e);
    }

    // 尝试 Web Share API
    try {
      if (navigator.share) {
        await navigator.share({ title: '车险报价单', text: text });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // 用户取消
      console.log('Web Share failed:', e);
    }

    // 兜底：复制到剪贴板
    copyToClipboard(text);
    showToast('已复制到剪贴板');
  });

  // ====== Clear All Records ======
  btnClearAllRecords.addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) return;
    showConfirm('确定要清空全部历史记录吗？此操作不可撤销。', async () => {
      // 删除所有本地图片
      for (const r of records) {
        if (r.localImage) await deleteLocalImage(r.localImage);
      }
      localStorage.removeItem('chefeibao_records');
      recordSearchInput.value = '';
      renderRecords();
      showToast('已清空全部记录');
    });
  });

  // ====== Record Search ======
  recordSearchInput.addEventListener('input', () => {
    renderRecords();
  });

  // ====== Confirm Dialog ======
  let confirmCallback = null;

  function showConfirm(message, onOk) {
    confirmMessage.textContent = message;
    confirmViewImg.style.display = 'none';
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
      compulsoryExpiry: buildExpiryStr(compulsoryExpiryYear, compulsoryExpiryMonth, compulsoryExpiryDay) || ocrExpiry.compulsory,
      commercialAmount: parseFloat(commercialAmount.value) || 0,
      commercialRate: parseFloat(commercialRate.value) || 0,
      commercialExpiry: buildExpiryStr(commercialExpiryYear, commercialExpiryMonth, commercialExpiryDay) || ocrExpiry.commercial,
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
    const lines = [];
    if (data.company) lines.push(`保险公司：${data.company}`);
    if (data.plate) lines.push(`车牌号：${data.plate}`);

    let premium = 0;
    if (data.compulsoryRate > 0) {
      premium += data.compulsoryAmount;
      lines.push(`交强险保费：${data.compulsoryAmount}元，到期时间：${data.compulsoryExpiry || '未知'}`);
    }
    if (data.commercialRate > 0) {
      premium += data.commercialAmount;
      lines.push(`商业险保费：${data.commercialAmount}元，到期时间：${data.commercialExpiry || '未知'}`);
    }
    if (data.nonVehicleRate > 0) {
      premium += data.nonVehicleAmount;
      lines.push(`随车非车保费：${data.nonVehicleAmount}元`);
    }
    if (data.vehicleTax > 0) {
      premium += data.vehicleTax;
      lines.push(`车船税：${data.vehicleTax}元`);
    }

    premium = round2(premium);
    lines.push(`保费合计：${premium}元`);
    lines.push(`费用：${formatMoney(results.afterTax)}`);
    lines.push(`实付为：${formatMoney(premium - results.afterTax)}`);
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
    // 如果车牌和保险公司一样，覆盖原来的记录
    const existIdx = records.findIndex(r =>
      r.plate === record.plate && r.company === record.company
    );
    if (existIdx >= 0) {
      records[existIdx] = record;
    } else {
      records.unshift(record); // newest first
    }
    localStorage.setItem('chefeibao_records', JSON.stringify(records));
  }

  function deleteRecord(id) {
    showConfirm('确定要删除这条记录吗？', async () => {
      const records = getRecords();
      const record = records.find(r => r.id === id);
      if (record && record.localImage) {
        await deleteLocalImage(record.localImage);
      }
      const newRecords = records.filter((r) => r.id !== id);
      localStorage.setItem('chefeibao_records', JSON.stringify(newRecords));
      renderRecords();
      showToast('已删除');
    });
  }

  function renderRecords() {
    const records = getRecords();

    // Show/hide clear all button and search
    btnClearAllRecords.style.display = records.length > 0 ? 'block' : 'none';
    recordSearchWrap.style.display = records.length > 0 ? 'block' : 'none';

    // 搜索过滤
    const searchTerm = recordSearchInput.value.trim().toLowerCase();
    const filtered = searchTerm
      ? records.filter(r => (r.plate || '').toLowerCase().includes(searchTerm))
      : records;

    if (filtered.length === 0) {
      emptyStateSettings.style.display = 'flex';
      recordListSettings.innerHTML = '';
      return;
    }

    emptyStateSettings.style.display = 'none';
    recordListSettings.innerHTML = '';

    filtered.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'record-item';
      item.dataset.recordId = r.id;

      // 构建费用明细
      const feeItems = [];
      if (r.compulsoryFee > 0) feeItems.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:#E8734A;"></span>交强险 ${formatMoney(r.compulsoryFee)}</span>`);
      if (r.commercialFee > 0) feeItems.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:#E8A04A;"></span>商业险 ${formatMoney(r.commercialFee)}</span>`);
      if (r.nonVehicleFee > 0) feeItems.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:#6CB4A8;"></span>随车非车 ${formatMoney(r.nonVehicleFee)}</span>`);

      // 构建保险类型标签
      const tags = [];
      if (r.compulsoryRate > 0) tags.push('交强');
      if (r.commercialRate > 0) tags.push('商业');
      if (r.nonVehicleRate > 0) tags.push('非车');

      item.innerHTML = `
        <div class="record-item-top">
          <div class="record-item-info">
            <div class="record-company">${escapeHtml(r.company || '未填写')}</div>
            <div class="record-plate">${escapeHtml(r.plate || '未填写')}</div>
          </div>
          <div class="record-item-meta">
            <div class="record-time">${escapeHtml(r.time)}</div>
            <div class="record-tags">${tags.map(t => `<span class="record-tag">${t}</span>`).join('')}</div>
          </div>
        </div>
        <div class="record-amount">¥${formatMoney(r.afterTax || 0)}</div>
        ${feeItems.length > 0 ? `<div class="record-fees">${feeItems.join('')}</div>` : ''}
        <div class="record-bottom">
          <button class="record-delete" data-id="${r.id}" title="删除记录">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            删除
          </button>
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

    // 点击记录恢复数据并跳转到计算界面
    recordListSettings.querySelectorAll('.record-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.record-delete')) return;
        const id = parseInt(item.dataset.recordId, 10);
        const record = records.find(r => r.id === id);
        if (!record) return;
        restoreRecordToForm(record);
      });
    });
  }

  async function restoreRecordToForm(record) {
    // 填入数据
    insuranceCompany.value = record.company || '';
    plateNumber.value = record.plate || '';
    compulsoryAmount.value = record.compulsoryAmount || '';
    compulsoryRate.value = record.compulsoryRate || '';
    commercialAmount.value = record.commercialAmount || '';
    commercialRate.value = record.commercialRate || '';
    nonVehicleAmount.value = record.nonVehicleAmount || '';
    nonVehicleRate.value = record.nonVehicleRate || '';
    vehicleTax.value = record.vehicleTax || '';
    addInvest.value = record.addInvest || '';

    // 恢复到期时间
    if (record.compulsoryExpiry) parseExpiryToInputs(record.compulsoryExpiry, compulsoryExpiryYear, compulsoryExpiryMonth, compulsoryExpiryDay);
    if (record.commercialExpiry) parseExpiryToInputs(record.commercialExpiry, commercialExpiryYear, commercialExpiryMonth, commercialExpiryDay);

    // 恢复快速填写手续费比例
    if (record.compulsoryRate && record.commercialRate && record.nonVehicleRate) {
      quickRate.value = `${record.compulsoryRate}/${record.commercialRate}/${record.nonVehicleRate}`;
    }

    // 恢复图片
    if (record.localImage) {
      const imageDataUrl = await readLocalImage(record.localImage);
      if (imageDataUrl) {
        imgPreview.src = imageDataUrl;
        imgPreviewWrap.style.display = 'block';
        imgPreviewStatus.textContent = '已恢复图片';
        imgPreviewStatus.className = 'img-preview-status';
      }
    }

    // 切换到计算 tab
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('[data-tab="tabCalc"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tabCalc').classList.add('active');

    // 重新计算并显示结果
    const data = getFormData();
    if (data.compulsoryRate > 0 || data.commercialRate > 0 || data.nonVehicleRate > 0) {
      const results = calculate(data);
      displayResults(results);
      resultSection.style.display = 'block';
    }

    hideSubpages();
    showToast('已恢复记录数据');
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
    const dualCfg = getDualConfig();
    const dualEnabled = dualCfg.enabled;

    // 更新页面标题
    const modelsTitle = document.querySelector('#subpageModels .subpage-title');
    if (modelsTitle) {
      modelsTitle.textContent = dualEnabled ? '识别模型配置（多重识别）' : '识别模型配置';
    }

    // 收集参与多重识别的供应商及其模型
    const dualInfoMap = new Map();
    if (dualEnabled) {
      dualCfg.models.forEach(item => {
        if (!dualInfoMap.has(item.providerId)) {
          dualInfoMap.set(item.providerId, []);
        }
        dualInfoMap.get(item.providerId).push(item.model);
      });
    }

    // 排序：使用的在前，未使用的在后
    const sortedProviders = [...providers].sort((a, b) => {
      const aDual = dualInfoMap.has(a.id) ? 0 : 1;
      const bDual = dualInfoMap.has(b.id) ? 0 : 1;
      return aDual - bDual;
    });

    sortedProviders.forEach((p) => {
      const isActive = p.id === activeId;
      const isDual = dualInfoMap.has(p.id);
      const dualModels = dualInfoMap.get(p.id) || [];
      const card = document.createElement('div');
      card.className = 'provider-card' + (!dualEnabled && isActive ? ' active' : '') + (isDual ? ' dual-active' : '');
      card.innerHTML = `
        <div class="provider-card-header">
          <span class="provider-card-dot"></span>
          <span class="provider-card-name">${escapeHtml(p.name || p.id)}</span>
          ${dualEnabled ? (isDual ? '<span class="provider-card-badge" style="background:var(--primary-light);color:var(--primary);">多重识别使用中</span>' : '<span class="provider-card-badge" style="background:#F5F5F5;color:#999;">未使用</span>') : (isActive ? '<span class="provider-card-badge">使用中</span>' : '')}
        </div>
        <div class="provider-card-meta">${escapeHtml(p.baseUrl)}</div>
        ${dualModels.length > 0 ? `<div class="provider-card-dual-models">${dualModels.map(m => `<span class="provider-model-chip" style="background:var(--primary-light);color:var(--primary);">${escapeHtml(m)}</span>`).join('')}</div>` : ''}
        ${!dualEnabled ? `
        <select class="provider-model-select" data-action="switchModel" data-id="${p.id}">
          ${(p.models || []).map((m) =>
            `<option value="${escapeHtml(m)}"${m === (p.selectedModel || p.models[0]) ? ' selected' : ''}>${escapeHtml(m)}</option>`
          ).join('')}
        </select>
        ` : ''}
        <div class="provider-card-actions">
          ${!dualEnabled ? `<button class="provider-action-btn provider-action-select" data-action="select" data-id="${p.id}">${isActive ? '当前使用' : '使用此模型'}</button>` : ''}
          <button class="provider-action-btn provider-action-test" data-action="test" data-id="${p.id}">测试</button>
          <button class="provider-action-btn provider-action-edit" data-action="edit" data-id="${p.id}">编辑</button>
          <button class="provider-action-btn provider-action-delete" data-action="delete" data-id="${p.id}">删除</button>
        </div>
      `;
      providerListEl.appendChild(card);
    });
  }

  // ====== Dual Recognition Config ======
  const DUAL_KEY = 'chefeibao_dual';
  const chkDualRecognize = $('#chkDualRecognize');
  const selectDualCount = $('#selectDualCount');
  const dualModelListEl = $('#dualModelList');
  const selectDualProvider = $('#selectDualProvider');
  const btnAddDualModel = $('#btnAddDualModel');
  const dualConfigBadge = $('#dualConfigBadge');

  function getDualConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem(DUAL_KEY) || '{"enabled":true,"count":2,"models":[]}');
      // 迁移旧格式：将 provider ID 数组转为 { providerId, model } 对象数组
      if (cfg.models.length > 0 && typeof cfg.models[0] === 'string') {
        const providers = getProviders();
        cfg.models = cfg.models.map(id => {
          const p = providers.find(x => x.id === id);
          return {
            providerId: id,
            model: p ? (p.selectedModel || (p.models && p.models[0]) || '') : ''
          };
        });
        saveDualConfig(cfg);
      }
      return cfg;
    } catch {
      return { enabled: true, count: 2, models: [] };
    }
  }

  function saveDualConfig(cfg) {
    localStorage.setItem(DUAL_KEY, JSON.stringify(cfg));
    updateDualBadge();
  }

  function updateDualBadge() {
    const cfg = getDualConfig();
    const count = cfg.enabled ? cfg.models.length || cfg.count : 1;
    dualConfigBadge.textContent = `${count} 个模型`;
  }

  function renderDualConfigUI() {
    const cfg = getDualConfig();
    chkDualRecognize.checked = cfg.enabled;
    selectDualCount.value = cfg.count;

    // 渲染模型列表
    const providers = getProviders();
    if (cfg.models.length === 0) {
      dualModelListEl.innerHTML = '<p class="failover-queue-empty">暂无模型，请添加</p>';
    } else {
      dualModelListEl.innerHTML = '';
      cfg.models.forEach((item, i) => {
        const p = providers.find((x) => x.id === item.providerId);
        if (!p) return;
        const model = item.model || p.selectedModel || (p.models && p.models[0]) || '';
        const queueItem = document.createElement('div');
        queueItem.className = 'failover-queue-item';
        queueItem.innerHTML = `
          <span class="failover-queue-order">${i + 1}</span>
          <div class="failover-queue-info">
            <div class="failover-queue-name">${escapeHtml(p.name || p.id)}</div>
            <div class="failover-queue-model">${escapeHtml(model)}</div>
          </div>
          <button class="failover-queue-remove" data-idx="${i}" title="移除">&times;</button>
        `;
        queueItem.querySelector('.failover-queue-remove').addEventListener('click', () => {
          cfg.models.splice(i, 1);
          saveDualConfig(cfg);
          renderDualConfigUI();
        });
        dualModelListEl.appendChild(queueItem);
      });
    }

    // 填充可用模型下拉（排除已添加的模型）
    const addedModels = new Set(cfg.models.map(m => `${m.providerId}|||${m.model}`));
    let hasAvailable = false;

    providers.forEach((p) => {
      (p.models || []).forEach((model) => {
        const key = `${p.id}|||${model}`;
        if (addedModels.has(key)) return; // 已添加的不显示
        hasAvailable = true;
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${p.name || p.id} · ${model}`;
        selectDualProvider.appendChild(opt);
      });
    });

    if (!hasAvailable) {
      selectDualProvider.innerHTML = '<option value="" disabled selected>暂无可选择的供应商</option>';
      selectDualProvider.disabled = true;
      selectDualProvider.classList.add('select-disabled');
    } else {
      selectDualProvider.disabled = false;
      selectDualProvider.classList.remove('select-disabled');
      selectDualProvider.innerHTML = '<option value="">选择供应商和模型...</option>';
      // 重新填充
      providers.forEach((p) => {
        (p.models || []).forEach((model) => {
          const key = `${p.id}|||${model}`;
          if (addedModels.has(key)) return;
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = `${p.name || p.id} · ${model}`;
          selectDualProvider.appendChild(opt);
        });
      });
    }
  }

  chkDualRecognize.addEventListener('change', () => {
    saveDualConfig({ ...getDualConfig(), enabled: chkDualRecognize.checked });
  });

  selectDualCount.addEventListener('change', async () => {
    const cfg = getDualConfig();
    const newCount = parseInt(selectDualCount.value);
    const oldCount = cfg.count;
    cfg.count = newCount;

    // 如果模型数量超过新的识别数，弹窗让用户选择不使用的模型
    if (cfg.models.length > newCount) {
      const providers = getProviders();
      const modelsWithInfo = cfg.models.map(item => {
        const p = providers.find(x => x.id === item.providerId);
        return p ? { provider: p, model: item.model } : null;
      }).filter(Boolean);

      const excluded = await showExcludeModelsDialog(modelsWithInfo, newCount);
      if (excluded !== null) {
        const sortedExcluded = [...excluded].sort((a, b) => b - a);
        sortedExcluded.forEach(idx => {
          cfg.models.splice(idx, 1);
        });
        saveDualConfig(cfg);
        renderDualConfigUI();
        showToast('已更新参与识别的模型');
      } else {
        // 取消：恢复原来的值
        cfg.count = oldCount;
        selectDualCount.value = oldCount;
        saveDualConfig(cfg);
        return;
      }
    }
    // 如果模型数量小于新的识别数，弹窗让用户选择要添加的模型
    else if (cfg.models.length < newCount) {
      const providers = getProviders();
      const addedModels = new Set(cfg.models.map(m => `${m.providerId}|||${m.model}`));

      // 收集所有可用模型
      const availableModels = [];
      providers.forEach((p) => {
        (p.models || []).forEach((model) => {
          const key = `${p.id}|||${model}`;
          if (!addedModels.has(key)) {
            availableModels.push({ provider: p, model });
          }
        });
      });

      if (availableModels.length === 0) {
        showToast('没有更多可用的模型');
        cfg.count = oldCount;
        selectDualCount.value = oldCount;
        saveDualConfig(cfg);
        return;
      }

      const needCount = newCount - cfg.models.length;
      const selected = await showSelectModelsDialog(availableModels, needCount);
      if (selected !== null) {
        selected.forEach(item => {
          cfg.models.push({ providerId: item.provider.id, model: item.model });
        });
        saveDualConfig(cfg);
        renderDualConfigUI();
        showToast('已添加参与识别的模型');
      } else {
        // 取消：恢复原来的值
        cfg.count = oldCount;
        selectDualCount.value = oldCount;
        saveDualConfig(cfg);
        return;
      }
    } else {
      saveDualConfig(cfg);
    }
  });

  btnAddDualModel.addEventListener('click', async () => {
    if (selectDualProvider.disabled) {
      showToast('暂无可选择的供应商');
      return;
    }
    const val = selectDualProvider.value;
    if (!val) { showToast('请选择供应商和模型'); return; }
    const [providerId, model] = val.split('|||');
    const cfg = getDualConfig();
    const maxCount = cfg.count || 2;

    // 先添加模型
    cfg.models.push({ providerId, model });

    // 如果模型数量超过配置的识别数，立即弹窗让用户选择不使用的模型
    if (cfg.models.length > maxCount) {
      const providers = getProviders();
      const modelsWithInfo = cfg.models.map(item => {
        const p = providers.find(x => x.id === item.providerId);
        return p ? { provider: p, model: item.model } : null;
      }).filter(Boolean);

      const excluded = await showExcludeModelsDialog(modelsWithInfo, maxCount);
      if (excluded !== null) {
        // 移除被勾选的模型（从后往前删，避免索引错位）
        const sortedExcluded = [...excluded].sort((a, b) => b - a);
        sortedExcluded.forEach(idx => {
          cfg.models.splice(idx, 1);
        });
        saveDualConfig(cfg);
        renderDualConfigUI();
        showToast('已更新参与识别的模型');
      } else {
        // 取消：移除刚添加的模型
        cfg.models.pop();
        saveDualConfig(cfg);
        renderDualConfigUI();
      }
    } else {
      saveDualConfig(cfg);
      renderDualConfigUI();
    }
  });

  // 测试所有使用中的多重识别模型
  const btnTestAllDualModels = $('#btnTestAllDualModels');
  btnTestAllDualModels.addEventListener('click', async () => {
    const cfg = getDualConfig();
    if (cfg.models.length === 0) {
      showToast('暂无参与识别的模型');
      return;
    }

    const providers = getProviders();
    const modelsToTest = cfg.models.map(item => {
      const p = providers.find(x => x.id === item.providerId);
      return p ? { provider: p, model: item.model } : null;
    }).filter(Boolean);

    if (modelsToTest.length === 0) {
      showToast('暂无可用的模型');
      return;
    }

    showToast(`正在测试 ${modelsToTest.length} 个模型...`);

    // 使用默认测试图片（一张简单的测试图）
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 100;
    testCanvas.height = 100;
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText('TEST', 25, 55);
    const testDataUrl = testCanvas.toDataURL('image/jpeg', 0.8);
    const testBase64 = testDataUrl.split(',')[1] || '';

    const results = await Promise.allSettled(
      modelsToTest.map(async ({ provider: p, model }) => {
        const startTime = Date.now();
        try {
          const testProvider = { ...p, selectedModel: model };
          const result = await callProviderAPI(testProvider, model, testDataUrl, testBase64, 'image/jpeg');
          return { provider: p.name || p.id, model, success: true, time: ((Date.now() - startTime) / 1000).toFixed(1) };
        } catch (e) {
          return { provider: p.name || p.id, model, success: false, error: e.message, time: ((Date.now() - startTime) / 1000).toFixed(1) };
        }
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = succeeded.filter(r => !r.success);
    const passed = succeeded.filter(r => r.success);

    let msg = `测试完成：${passed.length} 个成功`;
    if (failed.length > 0) {
      msg += `，${failed.length} 个失败`;
      failed.forEach(f => {
        msg += `\n${f.provider}·${f.model}: ${f.error || '未知错误'}`;
      });
    }
    showToast(msg);
  });

  // 初始化 badge
  updateDualBadge();

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

  // Model switch dropdown
  providerListEl.addEventListener('change', (e) => {
    if (e.target.dataset.action === 'switchModel') {
      const id = e.target.dataset.id;
      const model = e.target.value;
      const providers = getProviders();
      const p = providers.find((x) => x.id === id);
      if (p) {
        p.selectedModel = model;
        saveProviders(providers);
        showToast(`已切换到 ${model}`);
      }
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

  // Auto-fetch model names
  const btnAutoFetch = $('#btnAutoFetch');
  btnAutoFetch.addEventListener('click', () => {
    const baseUrl = inputBaseUrl.value.trim();
    const apiKey = inputApiKey.value.trim();
    if (!baseUrl) { showToast('请先填写 Base URL'); return; }
    if (!apiKey) { showToast('请先填写 API Key'); return; }

    showToast('正在获取模型列表...');
    fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(`${resp.status}`);
        return resp.json();
      })
      .then((json) => {
        let models = (json.data || []).map((m) => m.id).filter(Boolean);
        // Xiaomi: only keep mimo-v2.5 (mimo-v2.5-pro doesn't support image)
        if (baseUrl.includes('xiaomimimo')) {
          models = models.filter((m) => m === 'mimo-v2.5');
        }
        // Qwen: only keep qwen3.6-flash
        if (baseUrl.includes('dashscope')) {
          models = models.filter((m) => m === 'qwen3.6-flash');
        }
        if (models.length === 0) {
          showToast('未找到可用模型');
          return;
        }
        let added = 0;
        models.forEach((name) => {
          if (!modalModels.includes(name)) {
            modalModels.push(name);
            added++;
          }
        });
        renderModalModels();
        showToast(added > 0 ? `已添加 ${added} 个模型` : '模型列表已存在');
      })
      .catch((err) => {
        showToast('获取失败：' + (err.message || '网络错误'));
      });
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
    const emptyEl = $('#modalModelEmpty');

    if (modalModels.length === 0) {
      modalModelList.innerHTML = '<p class="model-tag-empty" id="modalModelEmpty">暂无模型</p>';
      return;
    }

    modalModelList.innerHTML = '';
    modalModels.forEach((m, i) => {
      const item = document.createElement('div');
      item.className = 'model-select-item';
      item.innerHTML = `
        <select class="model-select-list-pick" data-idx="${i}">
          ${modalModels.map((nm) => `<option value="${escapeHtml(nm)}"${nm === m ? ' selected' : ''}>${escapeHtml(nm)}</option>`).join('')}
        </select>
        <button class="model-remove-btn" data-idx="${i}">&times;</button>
      `;
      // Change model name via select
      item.querySelector('select').addEventListener('change', (e) => {
        modalModels[i] = e.target.value;
        renderModalModels();
      });
      // Remove model
      item.querySelector('.model-remove-btn').addEventListener('click', () => {
        modalModels.splice(i, 1);
        renderModalModels();
      });
      modalModelList.appendChild(item);
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
        providers[idx] = { ...providers[idx], id, name, baseUrl, apiKey, protocol, models: [...modalModels], selectedModel: modalModels[0] || '' };
      }
    } else {
      // Check duplicate
      if (providers.some((p) => p.id === id)) {
        showToast('提供商 ID 已存在');
        return;
      }
      providers.push({ id, name, baseUrl, apiKey, protocol, models: [...modalModels], selectedModel: modalModels[0] || '' });
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

  // ====== Back Button Handler ======
  const { App } = window.Capacitor?.Plugins || {};
  if (App) {
    App.addListener('backButton', ({ canGoBack }) => {
      // 1. 关闭冲突弹窗
      const conflictOverlay = document.querySelector('.confirm-overlay[style*="z-index: 1100"]');
      if (conflictOverlay) {
        conflictOverlay.remove();
        return;
      }

      // 2. 关闭费率编辑弹窗
      const rateOverlay = document.querySelector('.confirm-overlay[style*="z-index: 1100"]');
      if (rateOverlay) {
        rateOverlay.remove();
        return;
      }

      // 3. 关闭确认弹窗
      if (confirmOverlay.style.display === 'flex') {
        confirmOverlay.style.display = 'none';
        return;
      }

      // 4. 关闭图片查看器
      if (imgViewerOverlay.style.display === 'block') {
        imgViewerOverlay.style.display = 'none';
        return;
      }

      // 5. 关闭提供商弹窗
      if (providerModal.style.display === 'flex') {
        closeProviderModal();
        return;
      }

      // 6. 返回子页面
      if (subpageRecords.style.display === 'block' ||
          subpageModels.style.display === 'block' ||
          subpageDualConfig.style.display === 'block') {
        hideSubpages();
        return;
      }

      // 7. 切换到计算 Tab
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab && activeTab.id === 'tabSettings') {
        navItems.forEach(item => item.classList.remove('active'));
        document.querySelector('[data-tab="tabCalc"]').classList.add('active');
        tabContents.forEach(tab => tab.classList.remove('active'));
        document.getElementById('tabCalc').classList.add('active');
        return;
      }

      // 8. 退出应用
      App.exitApp();
    });
  }
});
