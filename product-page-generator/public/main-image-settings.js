/**
 * main-image-settings.js
 * 设置弹窗功能：导出设置、系统设置、AI API配置
 * 依赖：state (main-image-core.js), showToast
 */

    // ========== 设置弹窗功能 ==========
    function switchSettingsSubTab(tab, btn) {
      document.querySelectorAll('.settings-sub-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('settingsExportSection').style.display = tab === 'export' ? 'block' : 'none';
      document.getElementById('settingsSystemSection').style.display = tab === 'system' ? 'block' : 'none';
      document.getElementById('settingsAiApiSection').style.display = tab === 'aiapi' ? 'block' : 'none';
      // 切换到AI API tab时加载当前配置
      if (tab === 'aiapi') loadJimengSettings();
      // 切换到系统设置时加载当前配置
      if (tab === 'system') loadSystemSettings();
    }

    async function loadSystemSettings() {
      try {
        const resp = await fetch('/api/settings/config', {
          headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
        });
        if (!resp.ok) return;
        const config = await resp.json();
        if (config.providers) {
          if (config.providers.ollama) {
            const urlEl = document.getElementById('settingsOllamaUrl');
            const modelEl = document.getElementById('settingsOllamaModel');
            if (urlEl && config.providers.ollama.baseUrl) urlEl.value = config.providers.ollama.baseUrl;
            if (modelEl && config.providers.ollama.model) modelEl.value = config.providers.ollama.model;
          }
          if (config.providers.deepseek) {
            const keyEl = document.getElementById('settingsDeepseekKey');
            const modelEl = document.getElementById('settingsDeepseekModel');
            if (keyEl && config.providers.deepseek.apiKey) keyEl.value = config.providers.deepseek.apiKey;
            if (modelEl && config.providers.deepseek.model) modelEl.value = config.providers.deepseek.model;
          }
          if (config.providers.zhipu) {
            const keyEl = document.getElementById('settingsZhipuKey');
            const modelEl = document.getElementById('settingsZhipuModel');
            if (keyEl && config.providers.zhipu.apiKey) keyEl.value = config.providers.zhipu.apiKey;
            if (modelEl && config.providers.zhipu.model) modelEl.value = config.providers.zhipu.model;
          }
        }
        if (config.maxIterations) document.getElementById('settingsMaxIter').value = config.maxIterations;
        if (config.maxTokens) document.getElementById('settingsMaxTokens').value = config.maxTokens;
      } catch (e) {
        console.error('加载系统设置失败:', e);
      }
    }

    async function saveSystemSettings() {
      try {
        const resp = await fetch('/api/settings/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
          body: JSON.stringify({
            defaultProvider: 'ollama',
            providers: {
              ollama: { baseUrl: document.getElementById('settingsOllamaUrl').value, model: document.getElementById('settingsOllamaModel').value },
              deepseek: { apiKey: document.getElementById('settingsDeepseekKey').value, model: document.getElementById('settingsDeepseekModel').value },
              zhipu: { apiKey: document.getElementById('settingsZhipuKey').value, model: document.getElementById('settingsZhipuModel').value },
            },
            maxIterations: parseInt(document.getElementById('settingsMaxIter').value) || 10,
            maxTokens: parseInt(document.getElementById('settingsMaxTokens').value) || 4000,
          })
        });
        if (resp.ok) {
          showToast('系统设置已保存');
        } else {
          showToast('保存失败', true);
        }
      } catch (e) {
        showToast('保存失败: ' + e.message, true);
      }
    }

    async function loadJimengSettings() {
      try {
        const resp = await fetch('/api/jimeng/config');
        const data = await resp.json();
        document.getElementById('settingsJimengUrl').value = data.apiUrl || 'http://localhost:8000';
        document.getElementById('settingsJimengToken').value = ''; // 不回显token
        document.getElementById('settingsJimengStatus').innerHTML = data.configured
          ? '<span style="color:#22c55e;">✅ API 已连接</span>'
          : '<span style="color:#ef4444;">❌ API 未配置</span>';
      } catch (e) {
        document.getElementById('settingsJimengStatus').innerHTML = '<span style="color:#ef4444;">❌ 连接失败</span>';
      }
    }

    async function saveJimengSettings() {
      const url = document.getElementById('settingsJimengUrl').value.trim();
      const token = document.getElementById('settingsJimengToken').value.trim();
      const statusEl = document.getElementById('settingsJimengStatus');

      if (!url) { showToast('请填写 API 地址', true); return; }

      statusEl.innerHTML = '<span style="color:#6b7280;">⏳ 保存中...</span>';

      try {
        const resp = await fetch('/api/jimeng/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl: url, apiToken: token })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          statusEl.innerHTML = '<span style="color:#22c55e;">✅ 保存成功，API 已连接</span>';
          checkAIEditApiStatus(); // 更新导航栏状态点
          showToast('AI编辑配置已保存');
        } else {
          statusEl.innerHTML = '<span style="color:#ef4444;">❌ ' + (data.error || '保存失败') + '</span>';
        }
      } catch (e) {
        statusEl.innerHTML = '<span style="color:#ef4444;">❌ 保存失败: ' + e.message + '</span>';
      }
    }
    // ========== 设置弹窗功能结束 ==========
