/**
 * 报价单 - 统一弹窗系统
 * 所有弹窗通过 showDialog / showFormDialog 创建
 * 配合 dialogStack 管理弹窗栈，处理返回键
 */

// ====== 弹窗栈 ======
const dialogStack = [];

/**
 * 最底层弹窗工厂
 * @param {Object} opt
 * @param {string} opt.title          - 标题（纯文本）
 * @param {string} opt.content        - HTML 内容
 * @param {string} [opt.type]         - 'danger' | 'confirm' 影响确认按钮颜色
 * @param {Array<{text:string, type:'cancel'|'ok', onClick:Function}>} [opt.buttons]
 * @param {boolean} [opt.showViewImg] - 显示"查看图片"按钮
 * @param {Function} [opt.onViewImg]  - 查看图片回调
 * @param {boolean} [opt.allowOverlayClick] - 点击背景关闭
 * @returns {Function} close — 关闭弹窗的函数
 */
function showDialog(opt) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.style.zIndex = '1100';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog' + (opt.scrollableContent ? ' confirm-dialog--scrollable' : '');

  let html = '';

  // 固定头部（标题 + 额外头部内容）
  if (opt.title || opt.headerContent) {
    html += '<div class="confirm-dialog-header">';
    if (opt.title) {
      const titleColor = opt.type === 'danger' ? 'var(--color-danger)' : 'var(--text)';
      html += `<div style="font-weight:600;margin-bottom:12px;font-size:1rem;color:${titleColor};">${opt.title}</div>`;
    }
    if (opt.headerContent) html += opt.headerContent;
    html += '</div>';
  }

  // 可滚动内容区
  if (opt.scrollableContent) {
    html += '<div class="confirm-dialog-scroll">';
    html += opt.content;
    html += '</div>';
  } else {
    html += '<div style="text-align:left;font-size:0.85rem;">';
    html += opt.content;
    html += '</div>';
  }

  // 固定底部（查看图片 + 按钮）
  html += '<div class="confirm-dialog-footer">';

  // 查看图片按钮
  if (opt.showViewImg) {
    html += `<div class="conflict-view-img-btn">` +
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="9.5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 16l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
      `查看图片</div>`;
  }

  // 按钮
  if (opt.buttons && opt.buttons.length > 0) {
    html += '<div style="display:flex;gap:10px;margin-top:14px;">';
    opt.buttons.forEach((btn) => {
      const cls = btn.type === 'cancel' ? 'confirm-cancel' : 'confirm-ok';
      html += `<button class="confirm-btn ${cls}" id="dialogBtn_${btn.text}" style="flex:1;">${btn.text}</button>`;
    });
    html += '</div>';
  }

  html += '</div>';
  dialog.innerHTML = html;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // 关闭函数
  function close() {
    if (overlay.parentNode) document.body.removeChild(overlay);
    const idx = dialogStack.indexOf(close);
    if (idx >= 0) dialogStack.splice(idx, 1);
  }

  // 按钮事件
  if (opt.buttons) {
    opt.buttons.forEach((btn) => {
      const btnEl = overlay.querySelector(`#dialogBtn_${btn.text}`);
      if (btnEl) {
        btnEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (btn.onClick) btn.onClick();
          close();
        });
      }
    });
  }

  // 查看图片
  if (opt.showViewImg) {
    overlay.querySelector('.conflict-view-img-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (opt.onViewImg) opt.onViewImg();
    });
  }

  // 点击背景关闭
  if (opt.allowOverlayClick !== false) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  dialogStack.push(close);
  return close;
}

/**
 * 简化的确认弹窗
 * @param {string} message - 纯文本消息
 * @param {Function} onOk  - 确定回调
 * @param {Object} [opts]  - { title, okText, cancelText, type }
 */
function showConfirm(message, onOk, opts = {}) {
  showDialog({
    title: opts.title || '',
    type: opts.type || 'danger',
    content: `<p style="text-align:center;color:var(--text);font-weight:500;">${message}</p>`,
    buttons: [
      { text: opts.cancelText || '取消', type: 'cancel', onClick: () => {} },
      { text: opts.okText || '确定', type: 'ok', onClick: onOk },
    ],
  });
}

/**
 * 缺少字段弹窗（带输入框的表单弹窗）
 * @param {Array<{label:string, el:HTMLElement, placeholder?:string}>} fields
 * @param {Function} onConfirm
 */
function showMissingFieldsDialog(fields, onConfirm) {
  let html = '<div style="font-weight:600;margin-bottom:12px;font-size:1rem;color:var(--color-danger);">⚠️ 请填写以下必填项</div>';

  fields.forEach((field, i) => {
    const inputType = field.el.type === 'number' ? 'number' : 'text';
    const placeholder = field.placeholder || field.el.placeholder || '';
    html += `<div style="margin-bottom:12px;">`;
    html += `<label style="font-size:0.8rem;font-weight:500;color:var(--text);margin-bottom:6px;display:block;">${field.label}</label>`;
    html += `<input type="${inputType}" class="missing-field-input" data-idx="${i}" placeholder="${placeholder}" step="0.01" min="0" style="width:100%;height:42px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:10px;padding:0 14px;font-size:0.85rem;color:var(--text);outline:none;box-sizing:border-box;">`;
    html += '</div>';
  });

  const close = showDialog({
    title: '',
    content: html,
    buttons: [
      { text: '取消', type: 'cancel', onClick: () => {} },
      {
        text: '确定', type: 'ok', onClick: () => {
          const inputs = document.body.querySelectorAll('.missing-field-input');
          inputs.forEach((input) => {
            const idx = parseInt(input.dataset.idx, 10);
            const val = input.value.trim();
            if (val && fields[idx]) fields[idx].el.value = val;
          });
          if (onConfirm) onConfirm();
        },
      },
    ],
  });

  // 聚焦第一个输入框
  setTimeout(() => {
    const first = document.body.querySelector('.missing-field-input');
    if (first) first.focus();
  }, 100);

  return close;
}

/**
 * 缺少到期时间弹窗
 * @param {Array<{label:string, expiryEls:HTMLElement[]}>} items
 * @param {Object} data - 当前表单数据 (用于跳过时继续)
 * @param {Function} onConfirm
 */
function showMissingExpiryDialog(items, onSkip, onSave) {
  let html = '<div style="font-weight:600;margin-bottom:8px;font-size:1rem;color:var(--color-danger);">⚠️ 请填写到期时间</div>';
  html += '<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">以下保险有保费但缺少到期时间：</div>';

  items.forEach((item, i) => {
    html += `<div style="margin-bottom:12px;">`;
    html += `<label style="font-size:0.8rem;font-weight:500;color:var(--text);margin-bottom:6px;display:block;">${item.label}</label>`;
    html += `<div class="expiry-inputs" style="gap:6px;">`;
    html += `<input type="number" class="expiry-dialog-input" data-idx="${i}" data-type="year" placeholder="年" min="2020" max="2099" style="flex:1;min-width:50px;height:40px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:0.85rem;color:var(--text);outline:none;">`;
    html += `<span style="font-size:0.8rem;color:var(--text-secondary);">年</span>`;
    html += `<input type="number" class="expiry-dialog-input" data-idx="${i}" data-type="month" placeholder="月" min="1" max="12" style="flex:1;min-width:40px;height:40px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:0.85rem;color:var(--text);outline:none;">`;
    html += `<span style="font-size:0.8rem;color:var(--text-secondary);">月</span>`;
    html += `<input type="number" class="expiry-dialog-input" data-idx="${i}" data-type="day" placeholder="日" min="1" max="31" style="flex:1;min-width:40px;height:40px;background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:0.85rem;color:var(--text);outline:none;">`;
    html += `<span style="font-size:0.8rem;color:var(--text-secondary);">日</span>`;
    html += `</div></div>`;
  });

  showDialog({
    title: '',
    content: html,
    buttons: [
      { text: '跳过', type: 'cancel', onClick: onSkip },
      {
        text: '确定', type: 'ok', onClick: () => {
          items.forEach((item) => {
            const inputs = document.body.querySelectorAll(`.expiry-dialog-input[data-type]`);
            let y = '', m = '', d = '';
            inputs.forEach((inp) => {
              const idx = parseInt(inp.dataset.idx, 10);
              if (idx !== items.indexOf(item)) return;
              if (inp.dataset.type === 'year') y = inp.value.trim();
              if (inp.dataset.type === 'month') m = inp.value.trim();
              if (inp.dataset.type === 'day') d = inp.value.trim();
            });
            if (y && m && d) {
              item.expiryEls[0].value = y;
              item.expiryEls[1].value = m;
              item.expiryEls[2].value = d;
            }
          });
          if (onSave) onSave();
        },
      },
    ],
  });
}

/**
 * 冲突弹窗 — 多重识别时字段值不一致
 * @param {string[]} conflictFields
 * @param {Array<{providerName:string, data:Object}>} succeeded
 * @param {string} imgSrc - 当前预览图
 * @returns {Promise<Object|null>} 用户选择后的数据，或 null（跳过）
 */
function showConflictDialog(conflictFields, succeeded, imgSrc) {
  return new Promise((resolve) => {
    const FIELD_LABELS = {
      company: '保险公司', plate: '车牌号',
      compulsoryAmount: '交强险保费', compulsoryExpiry: '交强险到期',
      commercialAmount: '商业险保费', commercialExpiry: '商业险到期',
      nonVehicleAmount: '随车非车保费', nonVehicleExpiry: '随车非车到期',
      vehicleTax: '车船税',
    };
    const providerNames = succeeded.map(r => r.providerName);
    const choices = {};
    conflictFields.forEach(f => { choices[f] = 0; });

    let html = '<div style="font-weight:600;margin-bottom:10px;color:var(--color-danger);">⚠️ 以下字段识别结果不一致</div>';
    html += '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px;">请点击您认为正确的值</div>';

    conflictFields.forEach((f) => {
      const label = FIELD_LABELS[f] || f;
      const values = succeeded.map(r => r.data[f]);
      html += `<div style="background:var(--primary-light);border-radius:10px;padding:10px 12px;margin-bottom:8px;">`;
      html += `<div style="font-weight:600;color:var(--color-danger);margin-bottom:6px;font-size:0.8rem;">${label}</div>`;
      values.forEach((val, vi) => {
        const displayVal = (val === 0 || val === '') ? '未识别到' : val;
        html += `<div class="conflict-option" data-field="${f}" data-value="${val}">`;
        html += `<span style="color:var(--text-secondary);font-size:0.75rem;">${providerNames[vi]}</span>`;
        html += `<span style="font-weight:600;color:var(--text);">${displayVal}</span>`;
        html += `</div>`;
      });
      html += '</div>';
    });

    // 图片
    if (imgSrc) {
      html += `<div class="conflict-view-img-btn" id="conflictViewImg">` +
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="9.5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 16l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
        `查看图片</div>`;
    }

    html += '<div style="display:flex;gap:10px;margin-top:14px;">';
    html += '<button class="confirm-btn confirm-cancel" id="conflictSkip" style="flex:1;">全部跳过</button>';
    html += '<button class="confirm-btn confirm-ok" id="conflictConfirm" style="flex:1;">确认选择</button>';
    html += '</div>';

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.style.zIndex = '1100';
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.maxWidth = '360px';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflow = 'auto';
    dialog.innerHTML = html;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 点击选择
    overlay.querySelectorAll('.conflict-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const f = opt.dataset.field;
        choices[f] = opt.dataset.value;
        overlay.querySelectorAll(`.conflict-option[data-field="${f}"]`).forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // 默认选中第一个
    conflictFields.forEach(f => {
      const first = overlay.querySelector(`.conflict-option[data-field="${f}"]`);
      if (first) first.classList.add('selected');
    });

    // 查看图片
    const viewImgBtn = overlay.querySelector('#conflictViewImg');
    if (viewImgBtn && window.openImageViewer) {
      viewImgBtn.addEventListener('click', () => { window.openImageViewer(imgSrc); });
    }

    overlay.querySelector('#conflictSkip').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    overlay.querySelector('#conflictConfirm').addEventListener('click', () => {
      document.body.removeChild(overlay);
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

/**
 * 数据确认弹窗（计算前）
 * @param {Object} data - 表单数据
 * @param {string} imgSrc - 当前预览图
 * @param {Function} onConfirm
 */
function showDataConfirmDialog(data, imgSrc, onConfirm) {
  // 固定头部：标题 + 保险公司 + 车牌号
  let header = '<div class="confirm-card confirm-card-info">';
  header += `<div class="confirm-row"><span class="confirm-label">保险公司</span><span class="confirm-value">${data.company || '未填写'}</span></div>`;
  header += `<div class="confirm-row"><span class="confirm-label">车牌号</span><span class="confirm-value">${data.plate || '未填写'}</span></div>`;
  header += '</div>';

  // 可滚动区域：保险明细
  let content = '';
  if (data.compulsoryAmount > 0) {
    content += '<div class="confirm-card confirm-card-compulsory">';
    content += '<div class="confirm-card-title" style="color:var(--color-compulsory);">交强险</div>';
    content += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.compulsoryAmount} 元</span></div>`;
    content += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.compulsoryRate}%</span></div>`;
    if (data.compulsoryExpiry) content += `<div class="confirm-row"><span>到期</span><span class="confirm-value">${formatExpiryDisplay(data.compulsoryExpiry)}</span></div>`;
    content += '</div>';
  }

  if (data.commercialAmount > 0) {
    content += '<div class="confirm-card confirm-card-commercial">';
    content += '<div class="confirm-card-title" style="color:var(--color-commercial);">商业险</div>';
    content += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.commercialAmount} 元</span></div>`;
    content += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.commercialRate}%</span></div>`;
    if (data.commercialExpiry) content += `<div class="confirm-row"><span>到期</span><span class="confirm-value">${formatExpiryDisplay(data.commercialExpiry)}</span></div>`;
    content += '</div>';
  }

  if (data.nonVehicleAmount > 0) {
    content += '<div class="confirm-card confirm-card-nonvehicle">';
    content += '<div class="confirm-card-title" style="color:var(--color-nonvehicle);">随车非车</div>';
    content += `<div class="confirm-row"><span>保费</span><span class="confirm-value">${data.nonVehicleAmount} 元</span></div>`;
    content += `<div class="confirm-row"><span>费率</span><span class="confirm-value">${data.nonVehicleRate}%</span></div>`;
    content += '</div>';
  }

  if (data.vehicleTax > 0) {
    content += '<div class="confirm-card confirm-card-tax">';
    content += `<div class="confirm-row"><span class="confirm-label">车船税</span><span class="confirm-value">${data.vehicleTax} 元</span></div>`;
    content += '</div>';
  }

  showDialog({
    title: '请核对以下数据：',
    headerContent: header,
    content: content,
    scrollableContent: true,
    showViewImg: !!imgSrc,
    onViewImg: imgSrc ? () => { if (window.openImageViewer) window.openImageViewer(imgSrc); } : undefined,
    allowOverlayClick: false,
    buttons: [
      { text: '取消', type: 'cancel', onClick: () => {} },
      { text: '确认计算', type: 'ok', onClick: () => { if (onConfirm) onConfirm(); } },
    ],
  });
}

// ====== 弹窗栈管理（给 backButton 使用） ======
function closeTopDialog() {
  if (dialogStack.length > 0) {
    const close = dialogStack.pop();
    close();
    return true;
  }
  return false;
}
