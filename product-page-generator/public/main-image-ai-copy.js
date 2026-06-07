/**
 * AI文案模块
 * 负责AI文案生成、语言切换、列表渲染、应用等功能
 */

(function() {
  'use strict';

  // 全局变量
  let copyLang = 'zh';
  let lastCopyData = null; // 缓存上次结果用于语言切换

  /**
   * 设置文案语言
   */
  function setCopyLang(lang) {
    copyLang = lang;
    document.getElementById('langZh').style.background = lang === 'zh' ? '#3b82f6' : 'transparent';
    document.getElementById('langZh').style.color = lang === 'zh' ? '#fff' : '#6b7280';
    document.getElementById('langEn').style.background = lang === 'en' ? '#3b82f6' : 'transparent';
    document.getElementById('langEn').style.color = lang === 'en' ? '#fff' : '#6b7280';
    // 如果已有文案，切换语言时直接切换显示
    if (lastCopyData) {
      const list = copyLang === 'en' ? (lastCopyData.copyListEn || lastCopyData.copyList) : lastCopyData.copyList;
      renderAICopyList(list, lastCopyData.source, lastCopyData.productData);
    }
  }

  /**
   * 生成AI文案
   */
  async function generateAICopy(aiOptimize = false) {
    const productName = document.getElementById('aiProductName').value.trim();
    if (!productName) { window.showToast('请输入产品名称', true); return; }
    
    const productInfo = document.getElementById('aiProductInfo').value.trim();
    const token = window.getToken();
    if (!token) { window.showToast('请先登录', true); return; }
    
    const btn = aiOptimize ? document.getElementById('aiOptBtn') : document.getElementById('aiGenBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = aiOptimize ? 'AI优化中...' : '搜索中...';
    
    try {
      const res = await fetch('/api/main-image/copywriting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ productName, productInfo, language: copyLang, aiOptimize })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }
      
      const data = await res.json();
      if (data.success && data.copyList) {
        lastCopyData = data;
        const list = copyLang === 'en' ? (data.copyListEn || data.copyList) : data.copyList;
        renderAICopyList(list, data.source, data.productData);
        
        const sourceLabel = data.source === 'document' ? '文档解析' : data.source === 'document+ai' ? '文档+AI优化' : data.source === 'ai' ? 'AI生成' : '默认';
        const fileCount = data.matchedFiles?.length || 0;
        window.showToast(`${sourceLabel} ${list.length} 组文案${fileCount > 0 ? ' (匹配' + fileCount + '个文档)' : ''}`);
      }
    } catch (e) {
      window.showToast('文案生成失败: ' + e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  /**
   * 渲染AI文案列表
   */
  function renderAICopyList(copyList, source, productData) {
    const container = document.getElementById('aiCopyList');
    container.style.display = 'block';
    
    const sourceLabel = source === 'document' ? '📄 文档解析' : source === 'document+ai' ? '📄+✨ AI优化' : source === 'ai' ? '✨ AI生成' : '📋 默认';
    
    let html = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
      <span>来源: ${sourceLabel}</span>
      <span style="cursor:pointer;color:#3b82f6;" onclick="setCopyLang(copyLang==='zh'?'en':'zh')">${copyLang === 'zh' ? '切换英文 ▸' : '◂ 切换中文'}</span>
    </div>`;
    
    // 产品信息摘要
    if (productData && productData.product_name) {
      html += `<div style="font-size:9px;color:#6b7280;margin-bottom:4px;padding:3px 6px;background:#f0f9ff;border-radius:3px;">
        ${productData.product_name}${productData.product_name_en ? ' / ' + productData.product_name_en : ''}
        ${productData.material ? ' · ' + productData.material : ''}
      </div>`;
    }
    
    html += copyList.map((item, i) => `
      <div class="ai-copy-item" onclick="applyAICopy(${i})" data-title="${item.title.replace(/"/g, '&quot;')}" data-subtitle="${item.subtitle.replace(/"/g, '&quot;')}" style="padding:5px 8px;margin-bottom:3px;background:#fff;border:1px solid #e5e7eb;border-radius:4px;cursor:pointer;font-size:11px;transition:all 0.15s;">
        <div style="font-weight:600;color:#111827;">${item.title}</div>
        <div style="color:#6b7280;font-size:10px;">${item.subtitle}</div>
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    // 显示AI优化按钮
    const optBar = document.getElementById('aiOptimizeBar');
    if (source === 'document' || source === 'default') {
      optBar.style.display = 'block';
    } else {
      optBar.style.display = 'none';
    }
    
    // 悬停效果
    container.querySelectorAll('.ai-copy-item').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.borderColor = '#3b82f6'; el.style.background = '#eff6ff'; });
      el.addEventListener('mouseleave', () => { el.style.borderColor = '#e5e7eb'; el.style.background = '#fff'; });
    });
  }

  /**
   * 应用AI文案
   */
  function applyAICopy(index) {
    const items = document.querySelectorAll('.ai-copy-item');
    const item = items[index];
    if (!item) return;
    
    const title = item.dataset.title;
    const subtitle = item.dataset.subtitle;
    
    window.state.mainTitle = title;
    window.state.subTitle = subtitle;
    document.getElementById('mainTitle').value = title;
    document.getElementById('subTitle').value = subtitle;
    window.render();
    window.showToast('文案已应用');
  }

  // 暴露到全局
  window.copyLang = copyLang;
  window.setCopyLang = setCopyLang;
  window.generateAICopy = generateAICopy;
  window.renderAICopyList = renderAICopyList;
  window.applyAICopy = applyAICopy;

})();
