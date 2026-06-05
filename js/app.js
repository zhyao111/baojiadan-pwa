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

  // Settings sub-pages
  const settingsMenu = $('#settingsMenu');
  const btnGoRecords = $('#btnGoRecords');
  const btnGoModels = $('#btnGoModels');
  const btnGoFailover = $('#btnGoFailover');
  const subpageRecords = $('#subpageRecords');
  const subpageModels = $('#subpageModels');
  const subpageFailover = $('#subpageFailover');
  const btnBackFromRecords = $('#btnBackFromRecords');
  const btnBackFromModels = $('#btnBackFromModels');
  const btnBackFromFailover = $('#btnBackFromFailover');

  // Provider Management
  const providerListEl = $('#providerList');

  // Failover queue
  const chkFailover = $('#chkFailover');
  const selectFailoverProvider = $('#selectFailoverProvider');
  const btnAddFailover = $('#btnAddFailover');
  const failoverQueueEl = $('#failoverQueue');
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
  let ocrSections = null;

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
      subpageFailover.style.display = 'none';
      renderRecords();
    } else if (name === 'models') {
      subpageModels.style.display = 'block';
      subpageRecords.style.display = 'none';
      subpageFailover.style.display = 'none';
      renderProviders();
      renderFailoverUI();
    } else if (name === 'failover') {
      subpageFailover.style.display = 'block';
      subpageModels.style.display = 'none';
      subpageRecords.style.display = 'none';
      renderFailoverUI();
    }
  }

  function hideSubpages() {
    settingsMenu.style.display = 'block';
    subpageRecords.style.display = 'none';
    subpageModels.style.display = 'none';
    subpageFailover.style.display = 'none';
  }

  btnGoRecords.addEventListener('click', () => showSubpage('records'));
  btnGoFailover.addEventListener('click', () => showSubpage('failover'));
  btnGoModels.addEventListener('click', () => showSubpage('models'));
  btnBackFromRecords.addEventListener('click', hideSubpages);
  btnBackFromModels.addEventListener('click', hideSubpages);
  btnBackFromFailover.addEventListener('click', hideSubpages);

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

    // 如果保险公司为空，跳转到保险公司输入框并调出键盘
    if (!insuranceCompany.value.trim()) {
      showToast('请先填写保险公司');
      insuranceCompany.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => insuranceCompany.focus(), 300);
      return;
    }

    // 如果车牌号为空，跳转到车牌号输入框并调出键盘
    if (!plateNumber.value.trim()) {
      showToast('请先填写车牌号');
      plateNumber.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => plateNumber.focus(), 300);
      return;
    }

    // 保险公司有值但快速填写手续费比例为空，跳转到快速填写
    if (!quickRate.value.trim()) {
      showToast('请先填写手续费比例');
      quickRate.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => quickRate.focus(), 300);
      return;
    }
    const results = calculate(data);
    displayResults(results);
    resultSection.style.display = 'block';
    const text = formatPlanText(data, results);
    copyToClipboard(text);
    showToast('已计算并复制文案');
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
    ocrSections = null;
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
  "vehicleTax": 车船税金额(数字),
  "sections": {
    "compulsory": { "y_start": 0.1, "y_end": 0.3 },
    "commercial": { "y_start": 0.3, "y_end": 0.5 },
    "nonVehicle": { "y_start": 0.5, "y_end": 0.7 },
    "summary": { "y_start": 0.7, "y_end": 0.9 }
  }
}
识别规则：
- 交强险：直接提取保费金额、手续费比例和保险到期时间
- 商业险：直接提取保费金额、手续费比例和保险到期时间
- 随车非车保费：图片中除了交强险和商业险以外的所有其他保险项目（如驾意险、座位险、三者险、车损险、玻璃险、划痕险、涉水险、自燃险等），将它们的保费金额全部加总填入 nonVehicleAmount，手续费比例填入 nonVehicleRate，到期时间填入 nonVehicleExpiry
- 车船税：直接提取
- sections 字段：返回各保险板块和合计区域在图片中的垂直位置比例（0-1），y_start 为区域顶部，y_end 为区域底部。summary 为合计/总计/保费合计等汇总区域
注意：
- 所有金额单位为元，手续费比例为百分比数字（如 5 表示 5%）
- 到期时间格式统一为"X月X日"，如"3月20日"
- 如果某个字段在图片中找不到，对应值填 0 或空字符串
- 只返回 JSON，不要返回其他内容`;

  // ---- Recognize Image ----
  async function recognizeImage(file, provider) {
    try {
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
      const result = await tryWithFailover(provider, file, base64, dataUrl);
      imgPreviewStatus.textContent = `${result.providerName} · ${result.modelName} — 识别完成`;
      imgPreviewStatus.className = 'img-preview-status';
      applyOCRResult(result.data);
      showToast('识别完成，已自动填入数据');
    } catch (err) {
      console.error('OCR error:', err);
      imgPreviewStatus.textContent = '识别失败：' + (err.message || '未知错误');
      imgPreviewStatus.className = 'img-preview-status error';
      showToast('识别失败，请检查配置后重试');
    }
  }

  async function tryWithFailover(provider, file, base64, dataUrl) {
    const cfg = getFailoverConfig();
    if (!cfg.enabled || !cfg.queue || cfg.queue.length === 0) {
      const model = provider.selectedModel || provider.models[0] || '';
      return {
        providerName: provider.name,
        modelName: model,
        data: await callProviderAPI(provider, model, dataUrl, base64, file.type),
      };
    }

    const all = cfg.queue.map((id) => getProviders().find((p) => p.id === id)).filter(Boolean);
    const tryList = [];
    const seen = new Set();
    if (provider) { tryList.push(provider); seen.add(provider.id); }
    all.forEach((p) => { if (!seen.has(p.id)) { tryList.push(p); seen.add(p.id); } });

    const maxRetries = cfg.retryCount || 3;
    const timeout = (cfg.timeout || 30) * 1000;
    const breakerEnabled = cfg.circuitBreaker !== false;
    const breakerThreshold = cfg.breakerThreshold || 3;
    const breakerCooldown = (cfg.breakerCooldown || 5) * 60 * 1000;

    let totalTries = 0;
    let lastErr = null;

    // Circuit breaker state
    if (!window._failoverBreaker) window._failoverBreaker = {};
    const breaker = window._failoverBreaker;

    for (const p of tryList) {
      if (totalTries >= maxRetries) break;

      // Check circuit breaker
      if (breakerEnabled && breaker[p.id]) {
        const frozen = breaker[p.id];
        if (Date.now() - frozen.since < breakerCooldown) {
          console.warn(`Failover: ${p.name} is circuit-broken, skipping`);
          totalTries++;
          continue;
        } else {
          delete breaker[p.id]; // cooldown expired, reset
        }
      }

      const model = p.selectedModel || p.models[0] || '';
      imgPreviewStatus.textContent = `[${totalTries + 1}/${maxRetries}] 使用 ${p.name} · ${model} 识别中...`;
      imgPreviewStatus.className = 'img-preview-status loading';

      try {
        const data = await callProviderAPIWithTimeout(p, model, dataUrl, base64, file.type, timeout);
        // Success — reset breaker for this provider
        if (breaker[p.id]) delete breaker[p.id];
        return { providerName: p.name, modelName: model, data };
      } catch (err) {
        lastErr = err;
        totalTries++;
        console.warn(`Failover: ${p.name} failed (${totalTries}/${maxRetries})`, err.message);

        // Track for circuit breaker
        if (breakerEnabled) {
          if (!breaker[p.id]) breaker[p.id] = { failCount: 0, since: Date.now() };
          breaker[p.id].failCount++;
          breaker[p.id].since = Date.now();
          if (breaker[p.id].failCount >= breakerThreshold) {
            console.warn(`Failover: ${p.name} circuit BREAK (${breaker[p.id].failCount} consecutive failures)`);
          }
        }
      }
    }
    throw lastErr || new Error('所有供应商均识别失败');
  }

  async function callProviderAPIWithTimeout(provider, modelName, dataUrl, base64, mimeType, timeout) {
    const result = await Promise.race([
      callProviderAPI(provider, modelName, dataUrl, base64, mimeType),
      new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), timeout)),
    ]);
    return result;
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
      sections: parsed.sections || null,
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
    resultSection.style.display = 'none';
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
    ocrSections = data.sections || null;
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
    ocrSections = null;
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

    // 如果有识别到的板块位置，裁剪显示
    if (ocrSections && ocrSections.compulsory && ocrSections.commercial && ocrSections.nonVehicle) {
      cropAndShowSections();
    } else {
      updateBaseSize();
      resetViewer();
      imgViewerImg.src = imgPreview.src;
      imgViewerOverlay.style.display = 'block';
    }
  });

  function cropAndShowSections() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 收集所有有效板块的垂直范围
      const sections = [
        ocrSections.compulsory,
        ocrSections.commercial,
        ocrSections.nonVehicle,
        ocrSections.summary,
      ].filter(s => s && s.y_start != null && s.y_end != null);

      if (sections.length === 0) {
        // 没有有效板块，显示完整图片
        updateBaseSize();
        resetViewer();
        imgViewerImg.src = img.src;
        imgViewerOverlay.style.display = 'block';
        return;
      }

      // 计算整体垂直范围
      const yStart = Math.min(...sections.map(s => s.y_start));
      const yEnd = Math.max(...sections.map(s => s.y_end));

      // 添加一些边距
      const padding = 0.02;
      const cropYStart = Math.max(0, yStart - padding);
      const cropYEnd = Math.min(1, yEnd + padding);

      // 裁剪图片
      const srcY = img.naturalHeight * cropYStart;
      const srcH = img.naturalHeight * (cropYEnd - cropYStart);
      canvas.width = img.naturalWidth;
      canvas.height = srcH;

      ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, img.naturalWidth, srcH);

      // 显示裁剪后的图片
      updateBaseSize();
      resetViewer();
      imgViewerImg.src = canvas.toDataURL('image/jpeg', 0.95);
      imgViewerOverlay.style.display = 'block';
    };
    img.src = imgPreview.src;
  }

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
    const lines = [];
    if (data.company) lines.push(`保险公司：${data.company}`);
    if (data.plate) lines.push(`车牌号：${data.plate}`);

    let premium = 0;
    if (data.compulsoryRate > 0) {
      premium += data.compulsoryAmount;
      lines.push(`交强险保费${data.compulsoryAmount}元，到期时间为${data.compulsoryExpiry || '未知'}`);
    }
    if (data.commercialRate > 0) {
      premium += data.commercialAmount;
      lines.push(`商业险保费${data.commercialAmount}元，到期时间为${data.commercialExpiry || '未知'}`);
    }
    if (data.nonVehicleRate > 0) {
      premium += data.nonVehicleAmount;
      lines.push(`随车非车保费${data.nonVehicleAmount}元`);
    }
    if (data.vehicleTax > 0) {
      premium += data.vehicleTax;
      lines.push(`车船税${data.vehicleTax}元。`);
    }

    premium = round2(premium);
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
        <select class="provider-model-select" data-action="switchModel" data-id="${p.id}">
          ${(p.models || []).map((m) =>
            `<option value="${escapeHtml(m)}"${m === (p.selectedModel || p.models[0]) ? ' selected' : ''}>${escapeHtml(m)}</option>`
          ).join('')}
        </select>
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

  // ====== Failover Queue ======
  const FAILOVER_KEY = 'chefeibao_failover';
  const selectRetryCount = $('#selectRetryCount');
  const selectTimeout = $('#selectTimeout');
  const chkCircuitBreaker = $('#chkCircuitBreaker');
  const selectBreakerThreshold = $('#selectBreakerThreshold');
  const selectBreakerCooldown = $('#selectBreakerCooldown');

  function getFailoverConfig() {
    try { return JSON.parse(localStorage.getItem(FAILOVER_KEY) || '{"enabled":true,"queue":[],"retryCount":3,"timeout":30,"circuitBreaker":true,"breakerThreshold":3,"breakerCooldown":5}'); }
    catch { return { enabled: true, queue: [], retryCount: 3, timeout: 30, circuitBreaker: true, breakerThreshold: 3, breakerCooldown: 5 }; }
  }

  function saveFailoverConfig(cfg) {
    localStorage.setItem(FAILOVER_KEY, JSON.stringify(cfg));
  }

  function getFailoverQueue() {
    const cfg = getFailoverConfig();
    const providers = getProviders();
    return cfg.queue.map((id) => {
      const p = providers.find((x) => x.id === id);
      return p || null;
    }).filter(Boolean);
  }

  function renderFailoverUI() {
    const cfg = getFailoverConfig();
    chkFailover.checked = cfg.enabled;
    selectRetryCount.value = cfg.retryCount || 3;
    selectTimeout.value = cfg.timeout || 30;
    chkCircuitBreaker.checked = cfg.circuitBreaker !== false;
    selectBreakerThreshold.value = cfg.breakerThreshold || 3;
    selectBreakerCooldown.value = cfg.breakerCooldown || 5;
    const providers = getProviders();
    const queue = cfg.queue.filter((id) => providers.some((p) => p.id === id));

    // Populate select
    selectFailoverProvider.innerHTML = '<option value="">选择供应商...</option>';
    providers.forEach((p) => {
      if (!queue.includes(p.id)) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || p.id;
        selectFailoverProvider.appendChild(opt);
      }
    });

    // Render queue list
    if (queue.length === 0) {
      failoverQueueEl.innerHTML = '<p class="failover-queue-empty">暂无供应商，请将供应商加入队列</p>';
      return;
    }
    failoverQueueEl.innerHTML = '';
    queue.forEach((id, i) => {
      const p = providers.find((x) => x.id === id);
      if (!p) return;
      const item = document.createElement('div');
      item.className = 'failover-queue-item';
      item.innerHTML = `
        <span class="failover-queue-order">P${i + 1}</span>
        <div class="failover-queue-info">
          <div class="failover-queue-name">${escapeHtml(p.name || p.id)}</div>
          <div class="failover-queue-model">${escapeHtml(p.selectedModel || (p.models[0] || ''))}</div>
        </div>
        <button class="failover-queue-remove" data-id="${id}" title="移出队列">&times;</button>
      `;
      item.querySelector('.failover-queue-remove').addEventListener('click', () => {
        const newQueue = queue.filter((x) => x !== id);
        saveFailoverConfig({ ...getFailoverConfig(), queue: newQueue });
        renderFailoverUI();
      });
      failoverQueueEl.appendChild(item);
    });
  }

  chkFailover.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.enabled = chkFailover.checked;
    saveFailoverConfig(cfg);
  });

  selectRetryCount.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.retryCount = parseInt(selectRetryCount.value, 10);
    saveFailoverConfig(cfg);
  });

  selectTimeout.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.timeout = parseInt(selectTimeout.value, 10);
    saveFailoverConfig(cfg);
  });

  chkCircuitBreaker.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.circuitBreaker = chkCircuitBreaker.checked;
    saveFailoverConfig(cfg);
  });

  selectBreakerThreshold.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.breakerThreshold = parseInt(selectBreakerThreshold.value, 10);
    saveFailoverConfig(cfg);
  });

  selectBreakerCooldown.addEventListener('change', () => {
    const cfg = getFailoverConfig();
    cfg.breakerCooldown = parseInt(selectBreakerCooldown.value, 10);
    saveFailoverConfig(cfg);
  });

  btnAddFailover.addEventListener('click', () => {
    const id = selectFailoverProvider.value;
    if (!id) { showToast('请选择供应商'); return; }
    const cfg = getFailoverConfig();
    cfg.queue.push(id);
    saveFailoverConfig(cfg);
    renderFailoverUI();
  });

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
        // Xiaomi: only keep mimo-v2.5 models
        if (baseUrl.includes('xiaomimimo')) {
          models = models.filter((m) => m === 'mimo-v2.5' || m === 'mimo-v2.5-pro');
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
});
