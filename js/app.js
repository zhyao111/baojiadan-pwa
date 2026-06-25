/**
 * 报价单 - 入口文件
 * 负责初始化、事件绑定、各模块协调
 * 具体逻辑见 js/utils.js, calculator.js, dialogs.js
 */

document.addEventListener('DOMContentLoaded', () => {

  // ====== Status Bar ======
  (function setupStatusBar() {
    const { StatusBar } = window.Capacitor?.Plugins || {};
    if (!StatusBar) return;
    const apply = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#C8604A';
      StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
      StatusBar.setBackgroundColor({ color: isDark ? '#000000' : primary });
    };
    apply();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  })();

  // ====== DOM 引用（仅高频使用的元素） ======
  const navItems = $$('.nav-item');
  const tabContents = $$('.tab-content');
  const headerTitle = $('.header-title');

  // 计算页
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

  const allInputs = [insuranceCompany, plateNumber, quickRate, addInvest,
    compulsoryAmount, compulsoryRate, commercialAmount, commercialRate,
    nonVehicleAmount, nonVehicleRate, vehicleTax];

  const resultSection = $('#resultSection');
  const btnReset = $('#btnReset');
  const btnCalculate = $('#btnCalculate');
  const btnSaveRecord = $('#btnSaveRecord');
  const btnCopyPlan = $('#btnCopyPlan');
  const btnShareResult = $('#btnShareResult');

  // 图片
  const fileInput = $('#fileInput');
  const btnSelectImg = $('#btnSelectImg');
  const imgPreviewWrap = $('#imgPreviewWrap');
  const imgPreview = $('#imgPreview');
  const imgPreviewStatus = $('#imgPreviewStatus');
  const btnRemoveImg = $('#btnRemoveImg');
  const btnViewImg = $('#btnViewImg');

  // 设置
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

  // 其他
  const confirmOverlay = $('#confirmOverlay');
  const confirmMessage = $('#confirmMessage');
  const confirmViewImg = $('#confirmViewImg');
  const confirmCancel = $('#confirmCancel');
  const confirmOk = $('#confirmOk');

  // ====== OCR 到期时间暂存 ======
  const ocrExpiry = { compulsory: '', commercial: '', nonVehicle: '' };

  // ====== 公司名称修正 ======
  let lastCompanyValue = '';
  insuranceCompany.addEventListener('blur', () => {
    const newVal = insuranceCompany.value.trim();
    if (lastCompanyValue && newVal && lastCompanyValue !== newVal) {
      saveCompanyCorrection(lastCompanyValue, newVal);
    }
    lastCompanyValue = newVal;
  });

  // ====== Tab 切换 ======
  const tabTitles = { tabCalc: '计算', tabSettings: '设置' };
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      tabContents.forEach(t => t.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');
      headerTitle.textContent = tabTitles[targetTab] || '报价单';
      if (targetTab === 'tabSettings') hideSubpages();
    });
  });

  // ====== 设置子页面 ======
  function showSubpage(name) {
    settingsMenu.style.display = 'none';
    subpageRecords.style.display = name === 'records' ? 'block' : 'none';
    subpageModels.style.display = name === 'models' ? 'block' : 'none';
    subpageDualConfig.style.display = name === 'dualConfig' ? 'block' : 'none';
    if (name === 'records') renderRecords();
    if (name === 'models') renderProviders();
    if (name === 'dualConfig') renderDualConfigUI();
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

  // ====== 输入联动 ======
  // 任何输入变化隐藏结果
  allInputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (resultSection.style.display === 'block') {
        resultSection.style.display = 'none';
      }
    });
  });

  // 快速填写费率
  quickRate.addEventListener('blur', () => {
    applyQuickRate(quickRate.value);
  });

  // 加投
  addInvest.addEventListener('blur', () => {
    applyAddInvest(addInvest.value);
  });

  // 费率变化 → 同步到快速填写
  [compulsoryRate, commercialRate, nonVehicleRate].forEach((el) => {
    el.addEventListener('input', syncRatesToQuick);
  });

  // ====== 计算流程 ======
  let lastCalculatedData = null;

  btnCalculate.addEventListener('click', () => {
    // 校验必填
    let missing = validateForm();
    if (missing.length > 0) {
      showMissingFieldsDialog(missing);
      return;
    }

    // 从快速填写解析并填入费率
    applyQuickRate(quickRate.value.trim());
    const data = getFormData();

    // 检查保费
    if (!checkPremiums(data)) {
      showMissingFieldsDialog([
        { label: '交强险保费', el: compulsoryAmount },
        { label: '商业险保费', el: commercialAmount },
        { label: '随车非车保费', el: nonVehicleAmount },
        { label: '车船税', el: vehicleTax },
      ]);
      return;
    }

    // 检查有保费没费率
    const rateMissing = getMissingRates(data);
    if (rateMissing.length > 0) {
      showMissingFieldsDialog(rateMissing);
      return;
    }

    // 检查到期时间
    const expiryMissing = getMissingExpiry(data);
    if (expiryMissing.length > 0) {
      showMissingExpiryDialog(
        expiryMissing,
        () => doCalculate(data),   // 跳过 → 直接算
        () => {
          const newData = getFormData();
          showDataConfirmDialog(newData, getImgSrc(), () => doCalculate(newData));
        },
      );
      return;
    }

    // 没改动直接算
    if (lastCalculatedData && isSameData(lastCalculatedData, data)) {
      doCalculate(data);
      return;
    }

    // 弹出确认框
    showDataConfirmDialog(data, getImgSrc(), () => doCalculate(data));
  });

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

  function getImgSrc() {
    return imgPreview.src && imgPreviewWrap.style.display !== 'none' ? imgPreview.src : null;
  }

  // ====== 重置 ======
  btnReset.addEventListener('click', () => {
    allInputs.forEach(input => (input.value = ''));
    document.getElementById('compulsoryExpiryYear').value = '';
    document.getElementById('compulsoryExpiryMonth').value = '';
    document.getElementById('compulsoryExpiryDay').value = '';
    document.getElementById('commercialExpiryYear').value = '';
    document.getElementById('commercialExpiryMonth').value = '';
    document.getElementById('commercialExpiryDay').value = '';
    resultSection.style.display = 'none';
    ocrExpiry.compulsory = '';
    ocrExpiry.commercial = '';
    ocrExpiry.nonVehicle = '';
    lastCalculatedData = null;
  });

  // ====== 图片查看器（PhotoSwipe） ======
  var _currentImgSrc = null;

  // 图片查看器引用（供返回键使用）
  var _currentPhotoSwipe = null;

  window.openImageViewer = function(src) {
    var target = src || _currentImgSrc || '';
    if (!target) {
      showToast('无可查看的图片');
      return;
    }
    // 预加载图片获取真实尺寸
    var preloadImg = new Image();
    preloadImg.onload = function() {
      _openImageViewerWithSize(target, preloadImg.naturalWidth, preloadImg.naturalHeight);
    };
    preloadImg.onerror = function() {
      showToast('图片加载失败');
    };
    preloadImg.src = target;
  };

  function _openImageViewerWithSize(target, realW, realH) {
    // 隐藏状态栏
    var SB = window.Capacitor?.Plugins?.StatusBar;
    if (SB) SB.hide().catch(function() {});

    // 创建 PhotoSwipe 所需的 DOM 结构
    var pswp = document.createElement('div');
    pswp.className = 'pswp';
    pswp.setAttribute('aria-hidden', 'true');
    pswp.setAttribute('role', 'dialog');

    var pswp__bg = document.createElement('div');
    pswp__bg.className = 'pswp__bg';
    pswp.appendChild(pswp__bg);

    var pswp_scroll_wrap = document.createElement('div');
    pswp_scroll_wrap.className = 'pswp__scroll-wrap';

    var pswp_container = document.createElement('div');
    pswp_container.className = 'pswp__container';
    pswp_container.style.touchAction = 'none';
    pswp_scroll_wrap.appendChild(pswp_container);

    pswp.appendChild(pswp_scroll_wrap);
    document.body.appendChild(pswp);

    // 初始化 PhotoSwipe
    try {
      var photoSwipe = new PhotoSwipe({
        dataSource: [{ src: target, w: realW, h: realH }],
        pswp: pswp,
        bgOpacity: 1,
        showHideOpacity: true,
        maxWidthToAnimate: 400,
        closeOnVerticalDrag: false,
        pinchToClose: true,
        maxSpreadZoom: 3,
        history: false,
        toolbar: false,
        zoom: false,
        tapAction: 'close',
      });

      _currentPhotoSwipe = photoSwipe;

      photoSwipe.on('close', function() {
        _currentPhotoSwipe = null;
        // 恢复状态栏
        var SB = window.Capacitor?.Plugins?.StatusBar;
        if (SB) SB.show().catch(function() {});
        if (pswp && pswp.parentNode) {
          pswp.parentNode.removeChild(pswp);
        }
      });

      // 点击背景关闭
      pswp__bg.addEventListener('click', function() {
        photoSwipe.close();
      });

      photoSwipe.init();
    } catch (e) {
      // 恢复状态栏
      var SB = window.Capacitor?.Plugins?.StatusBar;
      if (SB) SB.show().catch(function() {});
      // PhotoSwipe 初始化失败时清理 DOM
      if (pswp && pswp.parentNode) {
        pswp.parentNode.removeChild(pswp);
      }
      showToast('图片查看器加载失败');
    }
  }

  // ====== 图片上传 ======
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/heic'];
  const MAX_SIZE_MB = 10;

  btnSelectImg.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) { showToast('请选择 JPG / PNG / WebP 格式的图片'); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { showToast(`图片大小不能超过 ${MAX_SIZE_MB}MB`); return; }
    document.getElementById('quickRate').value = '';
    setTimeout(function() { document.getElementById('quickRate').focus(); }, 300);
    showImagePreview(file);
  });

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      _currentImgSrc = ev.target.result;
      imgPreview.src = _currentImgSrc;
      imgPreviewWrap.style.display = 'block';
      const provider = getActiveProvider();
      if (!provider) {
        imgPreviewStatus.textContent = '未配置识别模型，请先在设置中添加';
        imgPreviewStatus.className = 'img-preview-status error';
        return;
      }
      imgPreviewStatus.textContent = `使用 ${provider.name} · ${provider.selectedModel || provider.models[0] || '默认模型'} 识别中...`;
      imgPreviewStatus.className = 'img-preview-status loading';
      await recognizeImage(file, provider);
    };
    reader.onerror = () => showToast('图片读取失败，请重试');
    reader.readAsDataURL(file);
  }

  btnRemoveImg.addEventListener('click', () => {
    _currentImgSrc = null;
    imgPreview.src = '';
    imgPreviewWrap.style.display = 'none';
    imgPreviewStatus.textContent = '';
    imgPreviewStatus.className = 'img-preview-status';
    fileInput.value = '';
  });

  // 主页面"查看图片"按钮
  btnViewImg.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.openImageViewer(_currentImgSrc);
  });


  // ====== OCR 识别 ======
  const OCR_PROMPT = `识别图片中的车险报价信息，返回JSON：
{"company":"保险公司全称","plate":"车牌号","compulsoryAmount":数字,"compulsoryExpiry":"2025年3月15日","commercialAmount":数字,"commercialExpiry":"2025年3月15日","nonVehicleAmount":数字,"nonVehicleExpiry":"2025年3月15日","vehicleTax":数字}
规则：
- 保险公司必须原文照抄，一字不改（如"申能财险"就写"申能财险"，不要改成"申能保险"）
- 只识别保费金额，不识别手续费比例
- 随车非车保费=除交强险商业险外所有其他险种保费总和
- 到期时间必须含年月日，格式XXXX年X月X日
- 未找到的字段填0或空字符串
- 只返回JSON`;

  async function recognizeImage(file, provider) {
    try {
      const base64 = await fileToBase64(file);
      const compressed = await resizeImage(base64, 1600, 0.8);
      const compressedBase64 = compressed.split(',')[1] || '';

      const dualCfg = getDualConfig();
      const allProviders = getProviders().filter(p => p.models?.length);

      if (!dualCfg.enabled || dualCfg.models.length <= 1) {
        const result = await tryWithFailover(provider, compressed, compressedBase64, file.type);
        imgPreviewStatus.textContent = `${result.providerName} · ${result.modelName} — 识别完成`;
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 多重识别
      let modelsToUse = dualCfg.models.map(item => {
        const p = allProviders.find(x => x.id === item.providerId);
        return p ? { provider: p, model: item.model } : null;
      }).filter(Boolean);

      if (modelsToUse.length <= 1) {
        const p = modelsToUse[0]?.provider || provider;
        const result = await tryWithFailover(p, compressed, compressedBase64, file.type);
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      const maxCount = dualCfg.count || 2;
      if (modelsToUse.length > maxCount) modelsToUse = modelsToUse.slice(0, maxCount);
      if (modelsToUse.length <= 1) {
        const p = modelsToUse[0]?.provider || provider;
        const result = await tryWithFailover(p, compressed, compressedBase64, file.type);
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(result.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      const total = modelsToUse.length;
      let completed = 0;
      imgPreviewStatus.textContent = `正在识别 (0/${total})...`;
      imgPreviewStatus.className = 'img-preview-status loading';

      const results = await Promise.allSettled(
        modelsToUse.map(async ({ provider: p, model }) => {
          const originalModel = p.selectedModel;
          p.selectedModel = model;
          const result = await tryWithFailover(p, compressed, compressedBase64, file.type);
          p.selectedModel = originalModel;
          completed++;
          imgPreviewStatus.textContent = `正在识别 (${completed}/${total})...`;
          return result;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      if (succeeded.length === 0) throw new Error('所有模型识别失败');

      if (succeeded.length === 1) {
        const r = succeeded[0];
        imgPreviewStatus.textContent = '识别完成';
        imgPreviewStatus.className = 'img-preview-status';
        applyOCRResult(r.data);
        showToast('识别完成，已自动填入数据');
        return;
      }

      // 合并多个结果——不再用 Math.max 自动选大的，全部冲突弹窗
      let merged = succeeded[0].data;
      let allConflicts = [];
      for (let i = 1; i < succeeded.length; i++) {
        const result = mergeOCRResults(merged, succeeded[i].data);
        merged = result.data;
        allConflicts = [...new Set([...allConflicts, ...result.conflictFields])];
      }

      if (allConflicts.length > 0) {
        const chosen = await showConflictDialog(allConflicts, succeeded, imgPreview.src);
        if (chosen) {
          merged = chosen;
        } else {
          allConflicts.forEach(f => {
            if (f.includes('Amount') || f === 'vehicleTax') merged[f] = 0;
            else merged[f] = '';
          });
        }
      }

      imgPreviewStatus.textContent = '多重识别完成';
      imgPreviewStatus.className = 'img-preview-status';
      applyOCRResult(merged);
      showToast(allConflicts.length > 0 ? '已选择您确认的数据' : '多重识别一致，已自动填入数据');

    } catch (err) {
      debugLog('OCR error:', err);
      imgPreviewStatus.textContent = '识别失败：' + (err.message || '未知错误');
      imgPreviewStatus.className = 'img-preview-status error';
      showToast('识别失败，请检查配置后重试');
    }
  }

  function mergeOCRResults(dataA, dataB) {
    const fields = ['company', 'plate', 'compulsoryAmount', 'compulsoryExpiry',
      'commercialAmount', 'commercialExpiry', 'nonVehicleAmount', 'nonVehicleExpiry', 'vehicleTax'];
    const merged = {};
    const conflictFields = [];
    for (const f of fields) {
      const valA = dataA[f], valB = dataB[f];
      if (valA === valB) { merged[f] = valA; }
      else if (valA === 0 || valA === '') { merged[f] = valB; }
      else if (valB === 0 || valB === '') { merged[f] = valA; }
      else {
        // 不再自动取 Max，全部标记冲突由用户选择
        merged[f] = valA;
        conflictFields.push(f);
      }
    }
    return { data: merged, conflictCount: conflictFields.length, conflictFields };
  }

  async function tryWithFailover(provider, dataUrl, base64, mimeType) {
    const model = provider.selectedModel || provider.models?.[0] || '';
    return {
      providerName: provider.name,
      modelName: model,
      data: await callProviderAPI(provider, model, dataUrl, base64, mimeType),
    };
  }

  // ---- API 超时控制 ----
  async function callProviderAPI(provider, modelName, dataUrl, base64, mimeType) {
    if (provider.protocol === 'ocr') {
      return await callOCRInterface(provider, modelName, base64, mimeType);
    }
    return await callOpenAICompatible(provider, modelName, dataUrl);
  }

  async function callOpenAICompatible(provider, model, dataUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const url = provider.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: [{ type: 'text', text: OCR_PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }],
          temperature: 0.1, max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`API 返回 ${resp.status}: ${errBody.slice(0, 100)}`);
      }
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || '';
      return parseOCRJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function callOCRInterface(provider, model, base64, mimeType) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const resp = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ model, image: `data:${mimeType};base64,${base64}`, prompt: OCR_PROMPT }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`OCR API 返回 ${resp.status}: ${errBody.slice(0, 100)}`);
      }
      const json = await resp.json();
      const content = json.result || json.text || json.choices?.[0]?.message?.content || JSON.stringify(json);
      return parseOCRJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  function parseOCRJson(text) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    let raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
    try {
      const parsed = JSON.parse(raw);
      return {
        company: parsed.company || '', plate: parsed.plate || '',
        compulsoryAmount: num(parsed.compulsoryAmount), compulsoryExpiry: parsed.compulsoryExpiry || '',
        commercialAmount: num(parsed.commercialAmount), commercialExpiry: parsed.commercialExpiry || '',
        nonVehicleAmount: num(parsed.nonVehicleAmount), nonVehicleExpiry: parsed.nonVehicleExpiry || '',
        vehicleTax: num(parsed.vehicleTax),
      };
    } catch (e) {
      debugLog('JSON parse failed, trying field extraction:', e.message);
      const extract = (key) => {
        const m = raw.match(new RegExp(`"${key}"\\s*:\\s*("?[^",}\\]]*"?|\\d+\\.?\\d*)`));
        return m ? m[1].replace(/"/g, '').trim() : '';
      };
      return {
        company: extract('company'), plate: extract('plate'),
        compulsoryAmount: num(extract('compulsoryAmount')), compulsoryExpiry: extract('compulsoryExpiry'),
        commercialAmount: num(extract('commercialAmount')), commercialExpiry: extract('commercialExpiry'),
        nonVehicleAmount: num(extract('nonVehicleAmount')), nonVehicleExpiry: extract('nonVehicleExpiry'),
        vehicleTax: num(extract('vehicleTax')),
      };
    }
  }

  function applyOCRResult(data) {
    resultSection.style.display = 'none';
    const correctedCompany = correctCompanyName(data.company);
    insuranceCompany.value = correctedCompany || '';
    lastCompanyValue = correctedCompany;
    plateNumber.value = data.plate || '';
    if (data.compulsoryAmount != null) compulsoryAmount.value = data.compulsoryAmount;
    ocrExpiry.compulsory = data.compulsoryExpiry || '';
    parseExpiryToInputs(data.compulsoryExpiry,
      document.getElementById('compulsoryExpiryYear'),
      document.getElementById('compulsoryExpiryMonth'),
      document.getElementById('compulsoryExpiryDay'));
    if (data.commercialAmount != null) commercialAmount.value = data.commercialAmount;
    ocrExpiry.commercial = data.commercialExpiry || '';
    parseExpiryToInputs(data.commercialExpiry,
      document.getElementById('commercialExpiryYear'),
      document.getElementById('commercialExpiryMonth'),
      document.getElementById('commercialExpiryDay'));
    if (data.nonVehicleAmount != null) nonVehicleAmount.value = data.nonVehicleAmount;
    ocrExpiry.nonVehicle = data.nonVehicleExpiry || '';
    if (data.vehicleTax != null) vehicleTax.value = data.vehicleTax;
  }

  // ====== 复制 & 分享 ======
  btnCopyPlan.addEventListener('click', () => {
    const data = getFormData();
    const results = calculate(data);
    copyToClipboard(formatPlanText(data, results));
    showToast('已复制文案');
  });

  btnShareResult.addEventListener('click', async () => {
    const data = getFormData();
    const results = calculate(data);
    const text = formatPlanText(data, results);
    console.log('[SHARE] 开始分享, text长度:', text.length);
    // 1. Capacitor Share 插件
    try {
      const { Share } = window.Capacitor?.Plugins || {};
      if (Share) {
        console.log('[SHARE] 使用 Capacitor Share');
        const result = await Share.share({ title: '车险报价单', text: text, dialogTitle: '分享报价单' });
        console.log('[SHARE] Share 结果:', JSON.stringify(result));
        return;
      }
      console.log('[SHARE] Capacitor Share 不可用');
    } catch (e) {
      console.log('[SHARE] Capacitor Share 失败:', e.message || e);
    }
    // 2. Web Share API
    try {
      if (navigator.share) {
        console.log('[SHARE] 使用 navigator.share');
        await navigator.share({ title: '车险报价单', text: text });
        console.log('[SHARE] navigator.share 成功');
        return;
      }
      console.log('[SHARE] navigator.share 不可用');
    } catch (e) {
      console.log('[SHARE] navigator.share 失败:', e.name, e.message);
      if (e.name === 'AbortError') return; // 用户取消
    }
    // 3. 最终兜底：复制到剪贴板
    console.log('[SHARE] fallback 到剪贴板');
    copyToClipboard(text);
    showToast('已复制到剪贴板');
  });

  // ====== 保存记录 ======
  btnSaveRecord.addEventListener('click', async () => {
    const data = getFormData();
    const results = calculate(data);
    if (results.total === 0) { showToast('请先填写数据并计算'); return; }

    const record = {
      id: Date.now(),
      company: insuranceCompany.value || '未填写',
      plate: plateNumber.value || '未填写',
      time: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      ...data, ...results,
      nonVehicleExpiry: ocrExpiry.nonVehicle,
      localImage: null,
      imageData: null,
    };

    // 保存图片：优先存 imageData（直接存 base64），localImage 作为备选
    var imgSrc = _currentImgSrc || (imgPreview.src && imgPreviewWrap.style.display !== 'none' ? imgPreview.src : null);
    if (imgSrc) {
      try {
        // 直接存 base64 到记录（不依赖 Filesystem）
        record.imageData = imgSrc;
        // 也尝试存到 Filesystem
        try {
          const localPath = await saveImageToLocal(imgSrc, record.id);
          record.localImage = localPath;
        } catch (e) { debugLog('Filesystem 保存失败，使用 imageData:', e); }
      } catch (e) { debugLog('图片保存失败:', e); }
    }

    saveRecord(record);
    showToast('已保存到记录');
  });

  async function saveImageToLocal(dataUrl, recordId) {
    const { Filesystem } = window.Capacitor?.Plugins || {};
    if (!Filesystem) { debugLog('Filesystem 插件不可用，跳过图片保存'); return null; }
    const compressedBase64 = await compressImage(dataUrl, 1600, 0.8);
    if (!compressedBase64) { debugLog('图片压缩结果为空，跳过保存'); return null; }
    await Filesystem.mkdir({ path: 'chefeibao_images', directory: 'DATA', recursive: true });
    const fileName = `img_${recordId}.jpg`;
    const filePath = `chefeibao_images/${fileName}`;
    await Filesystem.writeFile({ path: filePath, data: compressedBase64, directory: 'DATA', encoding: 'base64' });
    return filePath;
  }

  function compressImage(dataUrl, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          const base64 = compressed.split(',')[1] || '';
          if (!base64) { reject(new Error('图片压缩后数据为空')); return; }
          resolve(base64);
        } catch (e) { reject(new Error('图片压缩失败: ' + (e.message || e))); }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    });
  }

  async function deleteLocalImage(filePath) {
    if (!filePath) return;
    try {
      const { Filesystem } = window.Capacitor?.Plugins || {};
      if (!Filesystem) return;
      await Filesystem.deleteFile({ path: filePath, directory: 'DATA' });
    } catch (e) { debugLog('删除本地图片失败:', e); }
  }

  async function readLocalImage(filePath) {
    if (!filePath) return null;
    try {
      const { Filesystem } = window.Capacitor?.Plugins || {};
      if (!Filesystem) return null;
      const result = await Filesystem.readFile({ path: filePath, directory: 'DATA', encoding: 'base64' });
      return `data:image/jpeg;base64,${result.data}`;
    } catch (e) { debugLog('读取本地图片失败:', e); return null; }
  }

  // ====== 历史记录 ======
  const RECORDS_KEY = 'chefeibao_records';
  const recordSearchInput = $('#recordSearchInput');
  const emptyStateSettings = $('#emptyStateSettings');
  const recordListSettings = $('#recordListSettings');
  const btnClearAllRecords = $('#btnClearAllRecords');
  const recordSearchWrap = $('#recordSearchWrap');

  function getRecords() { return getJSON(RECORDS_KEY, []); }

  function saveRecord(record) {
    const records = getRecords();
    const existIdx = records.findIndex(r => r.plate === record.plate && r.company === record.company);
    if (existIdx >= 0) { records[existIdx] = record; }
    else { records.unshift(record); }
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  function deleteRecord(id) {
    showConfirm('确定要删除这条记录吗？', async () => {
      const records = getRecords();
      const record = records.find(r => r.id === id);
      if (record?.localImage) await deleteLocalImage(record.localImage);
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records.filter(r => r.id !== id)));
      renderRecords();
      showToast('已删除');
    });
  }

  function renderRecords() {
    const records = getRecords();
    btnClearAllRecords.style.display = records.length > 0 ? 'block' : 'none';
    recordSearchWrap.style.display = records.length > 0 ? 'block' : 'none';

    const searchTerm = recordSearchInput.value.trim().toLowerCase();
    const filtered = searchTerm ? records.filter(r => (r.plate || '').toLowerCase().includes(searchTerm)) : records;

    if (filtered.length === 0) {
      emptyStateSettings.style.display = 'flex'; recordListSettings.innerHTML = ''; return;
    }
    emptyStateSettings.style.display = 'none';
    recordListSettings.innerHTML = '';

    filtered.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'record-item';
      item.dataset.recordId = r.id;
      const feeParts = [];
      if (r.compulsoryFee > 0) feeParts.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:var(--color-compulsory);"></span>交强险 ${formatMoney(r.compulsoryFee)}</span>`);
      if (r.commercialFee > 0) feeParts.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:var(--color-commercial);"></span>商业险 ${formatMoney(r.commercialFee)}</span>`);
      if (r.nonVehicleFee > 0) feeParts.push(`<span class="record-fee-item"><span class="record-fee-dot" style="background:var(--color-nonvehicle);"></span>随车非车 ${formatMoney(r.nonVehicleFee)}</span>`);
      const feeHtml = feeParts.join('<span class="record-fee-separator">/</span>');

      item.innerHTML = `
        <div class="record-item-top">
          <div class="record-item-info">
            <div class="record-company">${escapeHtml(r.company || '未填写')}</div>
            <div class="record-plate">${escapeHtml(r.plate || '未填写')}</div>
          </div>
          <div class="record-item-meta">
            <div class="record-time">${escapeHtml(formatRecordTime(r.time))}</div>
          </div>
        </div>
        <div class="record-amount">${formatMoney(r.afterTax || 0)}</div>
        ${feeParts.length ? `<div class="record-fees">${feeHtml}</div>` : ''}
        <div class="record-bottom">
          <button class="record-delete" data-id="${r.id}" title="删除记录">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            删除
          </button>
        </div>`;
      recordListSettings.appendChild(item);
    });

    recordListSettings.querySelectorAll('.record-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteRecord(parseInt(btn.dataset.id, 10)); });
    });

    recordListSettings.querySelectorAll('.record-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.record-delete')) return;
        const id = parseInt(item.dataset.recordId, 10);
        const record = getRecords().find(r => r.id === id);
        if (record) restoreRecordToForm(record);
      });
    });
  }

  async function restoreRecordToForm(record) {
    insuranceCompany.value = record.company || ''; plateNumber.value = record.plate || '';
    compulsoryAmount.value = record.compulsoryAmount || ''; compulsoryRate.value = record.compulsoryRate || '';
    commercialAmount.value = record.commercialAmount || ''; commercialRate.value = record.commercialRate || '';
    nonVehicleAmount.value = record.nonVehicleAmount || ''; nonVehicleRate.value = record.nonVehicleRate || '';
    vehicleTax.value = record.vehicleTax || ''; addInvest.value = record.addInvest || '';
    if (record.compulsoryExpiry) parseExpiryToInputs(record.compulsoryExpiry,
      document.getElementById('compulsoryExpiryYear'),
      document.getElementById('compulsoryExpiryMonth'),
      document.getElementById('compulsoryExpiryDay'));
    if (record.commercialExpiry) parseExpiryToInputs(record.commercialExpiry,
      document.getElementById('commercialExpiryYear'),
      document.getElementById('commercialExpiryMonth'),
      document.getElementById('commercialExpiryDay'));
    if (record.compulsoryRate && record.commercialRate && record.nonVehicleRate) {
      quickRate.value = `${record.compulsoryRate}/${record.commercialRate}/${record.nonVehicleRate}`;
    }
    // 恢复图片：优先用 imageData（存在记录中的 base64），其次用 localImage（Filesystem）
    var restoredImg = false;
    if (record.imageData) {
      _currentImgSrc = record.imageData;
      imgPreview.src = record.imageData;
      imgPreviewWrap.style.display = 'block';
      imgPreviewStatus.textContent = '已恢复图片';
      imgPreviewStatus.className = 'img-preview-status';
      restoredImg = true;
    } else if (record.localImage) {
      try {
        const url = await readLocalImage(record.localImage);
        if (url) {
          _currentImgSrc = url;
          imgPreview.src = url;
          imgPreviewWrap.style.display = 'block';
          imgPreviewStatus.textContent = '已恢复图片';
          imgPreviewStatus.className = 'img-preview-status';
          restoredImg = true;
        }
      } catch (e) { debugLog('恢复图片失败:', e); }
    }
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('[data-tab="tabCalc"]').classList.add('active');
    tabContents.forEach(tab => tab.classList.remove('active'));
    document.getElementById('tabCalc').classList.add('active');
    const data = getFormData();
    if (data.compulsoryRate > 0 || data.commercialRate > 0 || data.nonVehicleRate > 0) {
      displayResults(calculate(data));
      resultSection.style.display = 'block';
    }
    hideSubpages();
    showToast('已恢复记录数据');
  }

  btnClearAllRecords.addEventListener('click', () => {
    const records = getRecords();
    if (records.length === 0) return;
    showConfirm('确定要清空全部历史记录吗？此操作不可撤销。', async () => {
      for (const r of records) { if (r.localImage) await deleteLocalImage(r.localImage); }
      localStorage.removeItem(RECORDS_KEY);
      recordSearchInput.value = '';
      renderRecords();
      showToast('已清空全部记录');
    });
  });

  recordSearchInput.addEventListener('input', renderRecords);

  // ====== 确认弹窗（简单场景兼容旧的 confirmOverlay DOM） ======
  let confirmCallback = null;

  confirmCancel.addEventListener('click', () => { confirmOverlay.style.display = 'none'; confirmCallback = null; });
  confirmOk.addEventListener('click', () => {
    confirmOverlay.style.display = 'none';
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) { confirmOverlay.style.display = 'none'; confirmCallback = null; }
  });

  // ====== 提供商管理 ======
  // 所有 provider CRUD 逻辑放在这里（量大但自成体系，暂不拆分）
  const PROVIDERS_KEY = 'chefeibao_providers';
  const ACTIVE_PROVIDER_KEY = 'chefeibao_active_provider';

  const PROVIDER_PRESETS = {
    xiaomi: { name: '小米', baseUrl: 'https://api.xiaomimimo.com/v1', protocol: 'openai' },
    qwen: { name: '千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', protocol: 'openai' },
  };

  let modalModels = [];
  let editingProviderId = null;

  function getProviders() { return getJSON(PROVIDERS_KEY, []); }
  function saveProviders(list) { localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list)); }
  function getActiveProviderId() { return localStorage.getItem(ACTIVE_PROVIDER_KEY) || ''; }
  function setActiveProvider(id) { localStorage.setItem(ACTIVE_PROVIDER_KEY, id); }
  function getActiveProvider() {
    const id = getActiveProviderId();
    return getProviders().find(p => p.id === id) || null;
  }

  function deleteProvider(id) {
    showConfirm('确定要删除此提供商吗？', () => {
      const providers = getProviders().filter(p => p.id !== id);
      saveProviders(providers);
      if (getActiveProviderId() === id) setActiveProvider(providers.length > 0 ? providers[0].id : '');
      renderProviders();
      showToast('已删除');
    });
  }

  async function testProvider(id) {
    const provider = getProviders().find(p => p.id === id);
    if (!provider) return;
    if (!provider.apiKey) { showToast('请先配置 API Key'); return; }
    if (!provider.baseUrl) { showToast('请先配置 Base URL'); return; }
    if (!provider.models?.length) { showToast('请先添加至少一个模型'); return; }
    showToast(`正在测试 ${provider.name} 连接...`);
    try {
      if (provider.protocol === 'openai') {
        const url = provider.baseUrl.replace(/\/+$/, '') + '/models';
        const resp = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
        if (!resp.ok) { const b = await resp.text().catch(() => ''); throw new Error(`${resp.status}: ${b.slice(0, 80)}`); }
        showToast(`${provider.name} 连接测试通过 ✓`);
      } else {
        const resp = await fetch(provider.baseUrl, { method: 'OPTIONS' }).catch(() => null);
        showToast(resp?.ok ? `${provider.name} 连接测试通过 ✓` : `${provider.name} 端点可达，请上传图片测试`);
      }
    } catch (err) { showToast(`${provider.name} 连接失败: ${err.message}`); }
  }

  function renderProviders() {
    const providers = getProviders();
    const emptyStateProviders = $('#emptyStateProviders');
    const providerListEl = $('#providerList');
    emptyStateProviders.style.display = providers.length === 0 ? 'flex' : 'none';
    providerListEl.innerHTML = '';
    if (providers.length === 0) return;

    const activeId = getActiveProviderId();
    const dualCfg = getDualConfig();
    const dualEnabled = dualCfg.enabled;
    const dualInfoMap = new Map();
    if (dualEnabled) {
      dualCfg.models.forEach(item => {
        if (!dualInfoMap.has(item.providerId)) dualInfoMap.set(item.providerId, []);
        dualInfoMap.get(item.providerId).push(item.model);
      });
    }
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
        ${dualModels.length ? `<div class="provider-card-dual-models">${dualModels.map(m => `<span class="provider-model-chip" style="background:var(--primary-light);color:var(--primary);">${escapeHtml(m)}</span>`).join('')}</div>` : ''}
        ${!dualEnabled ? `<select class="provider-model-select" data-action="switchModel" data-id="${p.id}">${(p.models || []).map(m => `<option value="${escapeHtml(m)}"${m === (p.selectedModel || p.models[0]) ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select>` : ''}
        <div class="provider-card-actions">
          ${!dualEnabled ? `<button class="provider-action-btn provider-action-select" data-action="select" data-id="${p.id}">${isActive ? '当前使用' : '使用此模型'}</button>` : ''}
          <button class="provider-action-btn provider-action-test" data-action="test" data-id="${p.id}">测试</button>
          <button class="provider-action-btn provider-action-edit" data-action="edit" data-id="${p.id}">编辑</button>
          <button class="provider-action-btn provider-action-delete" data-action="delete" data-id="${p.id}">删除</button>
        </div>`;
      providerListEl.appendChild(card);
    });

    // 事件委托
    providerListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action, id = btn.dataset.id;
      if (action === 'select') { setActiveProvider(id); renderProviders(); showToast(`已切换到 ${getProviders().find(x => x.id === id)?.name}`); }
      else if (action === 'edit') { openProviderModal(id); }
      else if (action === 'delete') { deleteProvider(id); }
      else if (action === 'test') { testProvider(id); }
    });

    providerListEl.addEventListener('change', (e) => {
      if (e.target.dataset.action === 'switchModel') {
        const id = e.target.dataset.id, model = e.target.value;
        const providers = getProviders();
        const p = providers.find(x => x.id === id);
        if (p) { p.selectedModel = model; saveProviders(providers); showToast(`已切换到 ${model}`); }
      }
    });
  }

  // ====== 提供商弹窗 ======
  function openProviderModal(editId) {
    editingProviderId = editId || null; modalModels = [];
    const providerModal = $('#providerModal');
    const providerModalTitle = $('#providerModalTitle');
    const quickSelectProvider = $('#quickSelectProvider');
    const inputProviderId = $('#inputProviderId');
    const inputBaseUrl = $('#inputBaseUrl');
    const inputProtocol = $('#inputProtocol');
    const inputApiKey = $('#inputApiKey');

    if (editingProviderId) {
      const p = getProviders().find(x => x.id === editingProviderId);
      if (!p) return;
      providerModalTitle.textContent = '编辑模型提供商';
      quickSelectProvider.value = '';
      inputProviderId.value = p.id; inputBaseUrl.value = p.baseUrl;
      inputProtocol.value = p.protocol || 'openai'; inputApiKey.value = p.apiKey || '';
      modalModels = [...(p.models || [])];
    } else {
      providerModalTitle.textContent = '添加模型提供商';
      quickSelectProvider.value = ''; inputProviderId.value = ''; inputBaseUrl.value = '';
      inputProtocol.value = 'openai'; inputApiKey.value = ''; modalModels = [];
    }
    renderModalModels();
    providerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeProviderModal() {
    $('#providerModal').style.display = 'none';
    document.body.style.overflow = '';
    editingProviderId = null; modalModels = [];
  }

  $('#btnAddProvider').addEventListener('click', () => openProviderModal(null));
  $('#btnCloseProviderModal').addEventListener('click', closeProviderModal);
  $('#btnCancelProvider').addEventListener('click', closeProviderModal);
  $('#providerModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeProviderModal(); });

  $('#quickSelectProvider').addEventListener('change', () => {
    const key = $('#quickSelectProvider').value;
    if (!key) return;
    const preset = PROVIDER_PRESETS[key];
    if (!preset) return;
    $('#inputProviderId').value = key;
    $('#inputBaseUrl').value = preset.baseUrl;
    $('#inputProtocol').value = preset.protocol;
    $('#inputApiKey').value = '';
    $('#inputProviderId').focus();
  });

  let apiKeyVisible = false;
  $('#btnToggleApiKey').addEventListener('click', () => {
    apiKeyVisible = !apiKeyVisible;
    $('#inputApiKey').type = apiKeyVisible ? 'text' : 'password';
  });

  $('#btnAddModel').addEventListener('click', () => {
    const name = $('#inputModelName').value.trim();
    if (!name) return;
    if (modalModels.includes(name)) { showToast('模型已存在'); return; }
    modalModels.push(name);
    $('#inputModelName').value = '';
    renderModalModels();
    $('#inputModelName').focus();
  });

  $('#inputModelName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#btnAddModel').click(); }
  });

  $('#btnAutoFetch').addEventListener('click', () => {
    const baseUrl = $('#inputBaseUrl').value.trim();
    const apiKey = $('#inputApiKey').value.trim();
    if (!baseUrl) { showToast('请先填写 Base URL'); return; }
    if (!apiKey) { showToast('请先填写 API Key'); return; }
    showToast('正在获取模型列表...');
    fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` },
    }).then(resp => { if (!resp.ok) throw new Error(`${resp.status}`); return resp.json(); })
      .then(json => {
        let models = (json.data || []).map(m => m.id).filter(Boolean);
        if (baseUrl.includes('xiaomimimo')) models = models.filter(m => m === 'mimo-v2.5' || m === 'mimo-v2-omni');
        if (baseUrl.includes('dashscope')) models = models.filter(m => m === 'qwen3.6-flash' || m === 'qwen3.5-flash');
        if (!models.length) { showToast('未找到可用模型'); return; }
        let added = 0;
        models.forEach(name => { if (!modalModels.includes(name)) { modalModels.push(name); added++; } });
        renderModalModels();
        showToast(added > 0 ? `已添加 ${added} 个模型` : '模型列表已存在');
      }).catch(err => showToast('获取失败：' + (err.message || '网络错误')));
  });

  function renderModalModels() {
    const modalModelList = $('#modalModelList');
    const modelCountEl = $('#modelCount');
    modelCountEl.textContent = modalModels.length;
    if (modalModels.length === 0) {
      modalModelList.innerHTML = '<p class="model-tag-empty" id="modalModelEmpty">暂无模型</p>';
      return;
    }
    modalModelList.innerHTML = '';
    modalModels.forEach((m, i) => {
      const item = document.createElement('div');
      item.className = 'model-select-item';
      item.innerHTML = `
        <select class="model-select-list-pick" data-idx="${i}">${modalModels.map(nm => `<option value="${escapeHtml(nm)}"${nm === m ? ' selected' : ''}>${escapeHtml(nm)}</option>`).join('')}</select>
        <button class="model-remove-btn" data-idx="${i}">&times;</button>`;
      item.querySelector('select').addEventListener('change', (e) => { modalModels[i] = e.target.value; renderModalModels(); });
      item.querySelector('.model-remove-btn').addEventListener('click', () => { modalModels.splice(i, 1); renderModalModels(); });
      modalModelList.appendChild(item);
    });
  }

  $('#btnSaveProvider').addEventListener('click', () => {
    const id = $('#inputProviderId').value.trim();
    const baseUrl = $('#inputBaseUrl').value.trim();
    const apiKey = $('#inputApiKey').value.trim();
    const protocol = $('#inputProtocol').value;
    if (!id) { showToast('请填写提供商 ID'); return; }
    if (!baseUrl) { showToast('请填写 Base URL'); return; }
    if (!modalModels.length) { showToast('请至少添加一个模型'); return; }
    const name = PROVIDER_PRESETS[id] ? PROVIDER_PRESETS[id].name : id;
    const providers = getProviders();
    if (editingProviderId) {
      const idx = providers.findIndex(p => p.id === editingProviderId);
      if (idx >= 0) providers[idx] = { ...providers[idx], id, name, baseUrl, apiKey, protocol, models: [...modalModels], selectedModel: modalModels[0] || '' };
    } else {
      if (providers.some(p => p.id === id)) { showToast('提供商 ID 已存在'); return; }
      providers.push({ id, name, baseUrl, apiKey, protocol, models: [...modalModels], selectedModel: modalModels[0] || '' });
      if (!getActiveProviderId()) setActiveProvider(id);
    }
    saveProviders(providers);
    closeProviderModal();
    renderProviders();
    showToast(editingProviderId ? '已更新' : '已添加');
  });

  // ====== 双重识别配置 ======
  const DUAL_KEY = 'chefeibao_dual';
  const MIGRATION_VERSION = 2;

  function getDualConfig() {
    const cfg = getJSON(DUAL_KEY, { enabled: true, count: 2, models: [] });
    if (!cfg) return { enabled: true, count: 2, models: [] };
    // 只迁移一次
    if (cfg._version >= MIGRATION_VERSION) return cfg;
    if (cfg.models?.length && typeof cfg.models[0] === 'string') {
      const providers = getProviders();
      cfg.models = cfg.models.map(id => {
        const p = providers.find(x => x.id === id);
        return { providerId: id, model: p ? (p.selectedModel || p.models?.[0] || '') : '' };
      });
    }
    cfg._version = MIGRATION_VERSION;
    localStorage.setItem(DUAL_KEY, JSON.stringify(cfg));
    return cfg;
  }

  function saveDualConfig(cfg) { localStorage.setItem(DUAL_KEY, JSON.stringify(cfg)); updateDualBadge(); }

  function updateDualBadge() {
    const cfg = getDualConfig();
    const count = cfg.enabled ? cfg.models.length || cfg.count : 1;
    $('#dualConfigBadge').textContent = `${count} 个模型`;
  }

  function renderDualConfigUI() {
    const cfg = getDualConfig();
    $('#chkDualRecognize').checked = cfg.enabled;
    $('#selectDualCount').value = cfg.count;
    const providers = getProviders();
    const dualModelListEl = $('#dualModelList');
    const selectDualProvider = $('#selectDualProvider');

    if (!cfg.models.length) {
      dualModelListEl.innerHTML = '<p class="failover-queue-empty">暂无模型，请添加</p>';
    } else {
      dualModelListEl.innerHTML = '';
      cfg.models.forEach((item, i) => {
        const p = providers.find(x => x.id === item.providerId);
        if (!p) return;
        const model = item.model || p.selectedModel || p.models?.[0] || '';
        const el = document.createElement('div');
        el.className = 'failover-queue-item';
        el.innerHTML = `<span class="failover-queue-order">${i + 1}</span><div class="failover-queue-info"><div class="failover-queue-name">${escapeHtml(p.name || p.id)}</div><div class="failover-queue-model">${escapeHtml(model)}</div></div><button class="failover-queue-remove" data-idx="${i}" title="移除">&times;</button>`;
        el.querySelector('.failover-queue-remove').addEventListener('click', () => { cfg.models.splice(i, 1); saveDualConfig(cfg); renderDualConfigUI(); });
        dualModelListEl.appendChild(el);
      });
    }

    const addedModels = new Set(cfg.models.map(m => `${m.providerId}|||${m.model}`));
    selectDualProvider.innerHTML = '<option value="">选择供应商和模型...</option>';
    let hasAvailable = false;
    providers.forEach(p => (p.models || []).forEach(model => {
      const key = `${p.id}|||${model}`;
      if (addedModels.has(key)) return;
      hasAvailable = true;
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = `${p.name || p.id} · ${model}`;
      selectDualProvider.appendChild(opt);
    }));
    selectDualProvider.disabled = !hasAvailable;
    selectDualProvider.classList.toggle('select-disabled', !hasAvailable);
    if (!hasAvailable) selectDualProvider.innerHTML = '<option value="" disabled selected>暂无可选择的供应商</option>';
  }

  $('#chkDualRecognize').addEventListener('change', () => {
    saveDualConfig({ ...getDualConfig(), enabled: $('#chkDualRecognize').checked });
  });

  $('#selectDualCount').addEventListener('change', async () => {
    const cfg = getDualConfig();
    const newCount = parseInt($('#selectDualCount').value);
    const oldCount = cfg.count;
    cfg.count = newCount;
    if (cfg.models.length > newCount) {
      // 选排除的
      const modelsWithInfo = cfg.models.map(item => { const p = getProviders().find(x => x.id === item.providerId); return p ? { provider: p, model: item.model } : null; }).filter(Boolean);
      showExcludeModelsDialog(modelsWithInfo, newCount).then(excluded => {
        if (excluded !== null) {
          [...excluded].sort((a, b) => b - a).forEach(idx => cfg.models.splice(idx, 1));
          saveDualConfig(cfg); renderDualConfigUI(); showToast('已更新参与识别的模型');
        } else { cfg.count = oldCount; $('#selectDualCount').value = oldCount; saveDualConfig(cfg); }
      });
    } else if (cfg.models.length < newCount) {
      const needCount = newCount - cfg.models.length;
      const availableModels = [];
      const addedModels = new Set(cfg.models.map(m => `${m.providerId}|||${m.model}`));
      getProviders().forEach(p => (p.models || []).forEach(model => {
        const key = `${p.id}|||${model}`;
        if (!addedModels.has(key)) availableModels.push({ provider: p, model });
      }));
      if (!availableModels.length) { showToast('没有更多可用的模型'); cfg.count = oldCount; $('#selectDualCount').value = oldCount; saveDualConfig(cfg); return; }
      showSelectModelsDialog(availableModels, needCount).then(selected => {
        if (selected) { selected.forEach(item => cfg.models.push({ providerId: item.provider.id, model: item.model })); saveDualConfig(cfg); renderDualConfigUI(); showToast('已添加参与识别的模型'); }
        else { cfg.count = oldCount; $('#selectDualCount').value = oldCount; saveDualConfig(cfg); }
      });
    } else { saveDualConfig(cfg); }
  });

  $('#btnAddDualModel').addEventListener('click', async () => {
    const sel = $('#selectDualProvider');
    if (sel.disabled) { showToast('暂无可选择的供应商'); return; }
    const val = sel.value;
    if (!val) { showToast('请选择供应商和模型'); return; }
    const [providerId, model] = val.split('|||');
    const cfg = getDualConfig();
    const maxCount = cfg.count || 2;
    cfg.models.push({ providerId, model });
    if (cfg.models.length > maxCount) {
      const modelsWithInfo = cfg.models.map(item => { const p = getProviders().find(x => x.id === item.providerId); return p ? { provider: p, model: item.model } : null; }).filter(Boolean);
      showExcludeModelsDialog(modelsWithInfo, maxCount).then(excluded => {
        if (excluded) { [...excluded].sort((a, b) => b - a).forEach(idx => cfg.models.splice(idx, 1)); saveDualConfig(cfg); renderDualConfigUI(); showToast('已更新参与识别的模型'); }
        else { cfg.models.pop(); saveDualConfig(cfg); renderDualConfigUI(); }
      });
    } else { saveDualConfig(cfg); renderDualConfigUI(); }
  });

  $('#btnTestAllDualModels').addEventListener('click', async () => {
    const cfg = getDualConfig();
    if (!cfg.models.length) { showToast('暂无参与识别的模型'); return; }
    const modelsToTest = cfg.models.map(item => { const p = getProviders().find(x => x.id === item.providerId); return p ? { provider: p, model: item.model } : null; }).filter(Boolean);
    if (!modelsToTest.length) { showToast('暂无可用的模型'); return; }
    showToast(`正在测试 ${modelsToTest.length} 个模型...`);
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 100; testCanvas.height = 100;
    const ctx = testCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#000000'; ctx.font = '14px Arial'; ctx.fillText('TEST', 25, 55);
    const testDataUrl = testCanvas.toDataURL('image/jpeg', 0.8);
    const testBase64 = testDataUrl.split(',')[1] || '';
    const results = await Promise.allSettled(modelsToTest.map(async ({ provider: p, model }) => {
      const startTime = Date.now();
      try { const testProvider = { ...p, selectedModel: model }; await callProviderAPI(testProvider, model, testDataUrl, testBase64, 'image/jpeg'); return { provider: p.name || p.id, model, success: true, time: ((Date.now() - startTime) / 1000).toFixed(1) }; }
      catch (e) { return { provider: p.name || p.id, model, success: false, error: e.message, time: ((Date.now() - startTime) / 1000).toFixed(1) }; }
    }));
    const passed = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
    let msg = `测试完成：${passed.length} 个成功`;
    if (failed.length) { msg += `，${failed.length} 个失败`; failed.forEach(f => { msg += `\n${f.value.provider}·${f.value.model}: ${f.value.error || '未知错误'}`; }); }
    showToast(msg);
  });

  updateDualBadge();

  function showExcludeModelsDialog(models, maxCount) {
    const excludeCount = models.length - maxCount;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay'; overlay.style.zIndex = '1100';
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog'; dialog.style.maxWidth = '340px'; dialog.style.maxHeight = '80vh'; dialog.style.overflow = 'auto';
      let html = '<div class="confirm-dialog-content">';
      html += `<div class="confirm-dialog-title" style="color:var(--color-danger);">⚠️ 已添加 ${models.length} 个模型</div>`;
      html += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">识别模型数为 ${maxCount}，请选择 ${excludeCount} 个不使用的模型：</div>`;
      models.forEach((item, i) => {
        html += `<div class="exclude-model-item" data-idx="${i}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:var(--card-bg);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;">`;
        html += `<span class="exclude-checkbox" style="width:20px;height:20px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;"></span>`;
        html += `<div style="flex:1;"><div style="font-weight:500;font-size:0.85rem;">${item.provider.name || item.provider.id}</div><div style="font-size:0.75rem;color:var(--text-secondary);">${item.model}</div></div></div>`;
      });
      html += '<div style="display:flex;gap:10px;margin-top:16px;"><button class="confirm-btn confirm-cancel" id="excludeCancel" style="flex:1;">取消</button><button class="confirm-btn confirm-ok" id="excludeConfirm" style="flex:1;">确定</button></div></div>';
      dialog.innerHTML = html; overlay.appendChild(dialog); document.body.appendChild(overlay);
      const excludedIndices = new Set();
      overlay.querySelectorAll('.exclude-model-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          if (excludedIndices.has(idx)) {
            excludedIndices.delete(idx);
            item.style.borderColor = 'var(--border)'; item.style.background = 'var(--card-bg)'; item.querySelector('.exclude-checkbox').style.background = 'transparent'; item.querySelector('.exclude-checkbox').innerHTML = '';
          } else {
            if (excludedIndices.size >= excludeCount) { showToast(`最多选择 ${excludeCount} 个不使用`); return; }
            excludedIndices.add(idx);
            item.style.borderColor = 'var(--color-danger)'; item.style.background = 'var(--color-danger-light)'; item.querySelector('.exclude-checkbox').style.background = 'var(--color-danger)'; item.querySelector('.exclude-checkbox').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          }
        });
      });
      overlay.querySelector('#excludeConfirm').addEventListener('click', (e) => {
        e.stopPropagation();
        if (excludedIndices.size !== excludeCount) { showToast(`请选择 ${excludeCount} 个不使用的模型`); return; }
        document.body.removeChild(overlay); resolve([...excludedIndices]);
      });
      overlay.querySelector('#excludeCancel').addEventListener('click', (e) => { e.stopPropagation(); document.body.removeChild(overlay); resolve(null); });
    });
  }

  function showSelectModelsDialog(availableModels, needCount) {
    const actualNeed = Math.min(needCount, availableModels.length);
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay'; overlay.style.zIndex = '1100';
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog'; dialog.style.maxWidth = '340px'; dialog.style.maxHeight = '80vh'; dialog.style.overflow = 'auto';
      let html = '<div class="confirm-dialog-content">';
      html += `<div class="confirm-dialog-title" style="color:var(--color-success);">➕ 请添加模型</div>`;
      html += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">当前模型不足，请选择要参与识别的模型：</div>`;
      availableModels.forEach((item, i) => {
        html += `<div class="select-model-item" data-idx="${i}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:var(--card-bg);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;">`;
        html += `<span class="select-checkbox" style="width:20px;height:20px;border-radius:6px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;"></span>`;
        html += `<div style="flex:1;"><div style="font-weight:500;font-size:0.85rem;">${item.provider.name || item.provider.id}</div><div style="font-size:0.75rem;color:var(--text-secondary);">${item.model}</div></div></div>`;
      });
      html += '<div style="display:flex;gap:10px;margin-top:16px;"><button class="confirm-btn confirm-cancel" id="selectModelCancel" style="flex:1;">取消</button><button class="confirm-btn confirm-ok" id="selectModelConfirm" style="flex:1;">确定</button></div></div>';
      dialog.innerHTML = html; overlay.appendChild(dialog); document.body.appendChild(overlay);
      const selectedIndices = new Set();
      overlay.querySelectorAll('.select-model-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          if (selectedIndices.has(idx)) {
            selectedIndices.delete(idx);
            item.style.borderColor = 'var(--border)'; item.style.background = 'var(--card-bg)'; item.querySelector('.select-checkbox').style.background = 'transparent'; item.querySelector('.select-checkbox').innerHTML = '';
          } else {
            if (selectedIndices.size >= actualNeed) { showToast(`最多选择 ${actualNeed} 个模型`); return; }
            selectedIndices.add(idx);
            item.style.borderColor = 'var(--color-success)'; item.style.background = 'var(--color-success-bg)'; item.querySelector('.select-checkbox').style.background = 'var(--color-success)'; item.querySelector('.select-checkbox').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          }
        });
      });
      overlay.querySelector('#selectModelConfirm').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedIndices.size) { showToast('请至少选择 1 个模型'); return; }
        document.body.removeChild(overlay); resolve([...selectedIndices].map(i => availableModels[i]));
      });
      overlay.querySelector('#selectModelCancel').addEventListener('click', (e) => { e.stopPropagation(); document.body.removeChild(overlay); resolve(null); });
    });
  }

  // ====== 字号控制 ======
  const FONT_SIZE_KEY = 'chefeibao_font_size';
  const fontSizeSlider = $('#fontSizeSlider');
  const fontSizeValue = $('#fontSizeValue');

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--font-scale', size / 100);
    fontSizeValue.textContent = `${size}%`;
  }

  const savedFontSize = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '100');
  fontSizeSlider.value = savedFontSize;
  applyFontSize(savedFontSize);

  function onFontSizeChange() {
    const size = parseInt(fontSizeSlider.value);
    localStorage.setItem(FONT_SIZE_KEY, size);
    applyFontSize(size);
  }
  fontSizeSlider.addEventListener('input', onFontSizeChange);
  fontSizeSlider.addEventListener('change', onFontSizeChange);
  fontSizeSlider.addEventListener('touchmove', onFontSizeChange);
  fontSizeSlider.addEventListener('touchend', onFontSizeChange);

  // ====== 键盘弹出时滚动聚焦输入到可见区域 ======
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) {
        setTimeout(function() { a.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
      }
    });
  }

  // ====== 返回键 ======
  const { App } = window.Capacitor?.Plugins || {};
  if (App) {
    App.addListener('backButton', ({ canGoBack }) => {
      // 0. 关闭图片查看器
      if (_currentPhotoSwipe) { _currentPhotoSwipe.close(); return; }

      // 1. 弹窗栈 — 统一处理所有弹窗
      if (closeTopDialog()) return;

      // 2. 关闭提供商弹窗
      if ($('#providerModal').style.display === 'flex') { closeProviderModal(); return; }

      // 4. 返回子页面
      if (subpageRecords.style.display === 'block' || subpageModels.style.display === 'block' || subpageDualConfig.style.display === 'block') { hideSubpages(); return; }

      // 5. 切换到计算 Tab
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab?.id === 'tabSettings') {
        navItems.forEach(item => item.classList.remove('active'));
        document.querySelector('[data-tab="tabCalc"]').classList.add('active');
        tabContents.forEach(tab => tab.classList.remove('active'));
        document.getElementById('tabCalc').classList.add('active');
        return;
      }

      // 6. 退出
      App.exitApp();
    });
  }

  // ====== 初始化 ======
  renderRecords();
  renderProviders();
});
