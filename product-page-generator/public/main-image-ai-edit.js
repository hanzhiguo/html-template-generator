/**
 * main-image-ai-edit.js
 * AI多图编辑功能：上传产品图、分析、生成、结果展示
 * 依赖：state (main-image-core.js), render, showToast
 */

    // ========== AI编辑功能（一键多图） ==========
    let aiMultiState = {
      uploadedImages: [],       // [{id, src, blob, name, selected:true}]
      productAnalysis: null,    // Ollama 视觉分析结果
      productSpecs: '',         // 产品规格文本
      isGenerating: false,      // 是否正在生成
      apiConfigured: false,     // API是否已配置
      results: {},              // 生成结果 { type_ratio: { images, currentIndex, status } }
      tasks: [],                // 生成任务队列
      currentTaskIndex: -1,     // 当前任务索引
      _imgIdCounter: 0,         // 图片ID计数器
    };

    // 生成任务定义
    // 场景模式状态：auto=智能体反推提示词, manual=用户手动输入
    const sceneModes = { 'ai-scene': 'auto', 'realistic-scene': 'auto' };

    function setSceneMode(type, mode) {
      sceneModes[type] = mode;
      const isAI = type === 'ai-scene';
      const autoBtn = document.getElementById(isAI ? 'aiSceneModeAuto' : 'realSceneModeAuto');
      const manualBtn = document.getElementById(isAI ? 'aiSceneModeManual' : 'realSceneModeManual');
      const autoArea = document.getElementById(isAI ? 'aiSceneAutoArea' : 'realSceneAutoArea');
      const manualArea = document.getElementById(isAI ? 'aiSceneManualArea' : 'realSceneManualArea');
      const activeColor = isAI ? '#7c3aed' : '#059669';

      if (mode === 'auto') {
        autoBtn.style.background = activeColor; autoBtn.style.color = '#fff';
        manualBtn.style.background = 'transparent'; manualBtn.style.color = '#6b7280';
        autoArea.style.display = 'block';
        manualArea.style.display = 'none';
      } else {
        manualBtn.style.background = activeColor; manualBtn.style.color = '#fff';
        autoBtn.style.background = 'transparent'; autoBtn.style.color = '#6b7280';
        autoArea.style.display = 'none';
        manualArea.style.display = 'block';
      }
    }

    const AI_MULTI_TASKS = [
      { id: 'white_1x1', label: '白底图', type: 'white', ratio: '1:1', icon: 'square' },
      { id: 'handheld_1x1', label: '手持图', type: 'handheld', ratio: '1:1', icon: 'hand' },
      { id: 'aiscene_1x1', label: 'AI场景 1:1', type: 'ai-scene', ratio: '1:1', icon: 'sparkles' },
      { id: 'aiscene_3x4', label: 'AI场景 3:4', type: 'ai-scene', ratio: '3:4', icon: 'sparkles' },
      { id: 'realscene_1x1', label: '实拍场景 1:1', type: 'realistic-scene', ratio: '1:1', icon: 'camera' },
      { id: 'realscene_3x4', label: '实拍场景 3:4', type: 'realistic-scene', ratio: '3:4', icon: 'camera' },
    ];

    // 白底图预设提示词
    const WHITE_BG_PROMPT = 'The exact main product from the reference image, including its precise position, scaling, angle, and 3D geometric details, remains absolutely unchanged and captured perfectly. Only the background is replaced with a pure, clean, absolute white background (#FFFFFF). No shadows, no reflections, no color casts, no ambient light effects on the product. The product edges are razor-sharp and perfectly defined. Remove any dust, scratches, smudges, or dirt from the product surface. Professional studio product photography, even flat lighting, no gradients. Ultra-clean e-commerce white background product shot. --ar 1:1 --iw 2.0';

    // ========== 上传产品图 ==========
    function handleAIMultiFileSelect(event) {
      const files = Array.from(event.target.files);
      files.forEach(file => { if (file.type.startsWith('image/')) addAIMultiImage(file); });
      event.target.value = '';
    }

    function handleAIMultiDrop(event) {
      const files = Array.from(event.dataTransfer.files);
      files.forEach(file => { if (file.type.startsWith('image/')) addAIMultiImage(file); });
    }

    function addAIMultiImage(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgObj = {
          id: 'img_' + (++aiMultiState._imgIdCounter),
          src: e.target.result,
          blob: file,
          name: file.name,
          selected: true,
        };
        aiMultiState.uploadedImages.push(imgObj);
        renderAIMultiPreviewList();
        document.getElementById('aiMultiEmpty').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }

    function renderAIMultiPreviewList() {
      const container = document.getElementById('aiMultiPreviewList');
      if (aiMultiState.uploadedImages.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }
      container.style.display = 'flex';
      container.innerHTML = aiMultiState.uploadedImages.map(img => `
        <div style="position:relative;width:48px;height:48px;border-radius:4px;overflow:hidden;border:2px solid ${img.selected ? '#3b82f6' : '#d1d5db'};cursor:pointer;" onclick="toggleAIMultiImageSelect('${img.id}')" title="${img.name}">
          <img src="${img.src}" style="width:100%;height:100%;object-fit:cover;" />
          <div style="position:absolute;top:1px;right:1px;width:14px;height:14px;border-radius:50%;background:${img.selected ? '#3b82f6' : '#9ca3af'};display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;">${img.selected ? '✓' : ''}</div>
          <button onclick="event.stopPropagation();removeAIMultiImage('${img.id}')" style="position:absolute;bottom:1px;right:1px;width:14px;height:14px;border-radius:50%;background:rgba(239,68,68,0.9);color:#fff;border:none;cursor:pointer;font-size:8px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
      `).join('');
    }

    function toggleAIMultiImageSelect(imgId) {
      const img = aiMultiState.uploadedImages.find(i => i.id === imgId);
      if (img) { img.selected = !img.selected; renderAIMultiPreviewList(); }
    }

    function removeAIMultiImage(imgId) {
      aiMultiState.uploadedImages = aiMultiState.uploadedImages.filter(i => i.id !== imgId);
      renderAIMultiPreviewList();
      if (aiMultiState.uploadedImages.length === 0) {
        document.getElementById('aiMultiEmpty').style.display = 'block';
        aiMultiState.results = {};
        document.getElementById('aiMultiResults').innerHTML = '';
      }
    }

    function getSelectedImages() {
      return aiMultiState.uploadedImages.filter(i => i.selected);
    }

    function clearAIMultiImage() {
      aiMultiState.uploadedImages = [];
      aiMultiState.productAnalysis = null;
      renderAIMultiPreviewList();
      document.getElementById('aiMultiFileInput').value = '';
      document.getElementById('aiMultiEmpty').style.display = 'block';
      aiMultiState.results = {};
      document.getElementById('aiMultiResults').innerHTML = '';
    }

    // ========== 产品规格 ==========
    let _docListCache = []; // 缓存文档列表
    let _currentDocContent = ''; // 缓存当前文档完整内容
    let _docDimData = { length: null, width: null, height: null, diameter: null, unit: 'cm' }; // 从文档解析的尺寸数据

    async function loadProductSpecs() {
      const docDropdown = document.getElementById('docDropdownSelect');
      if (docDropdown.options.length > 1 && _docListCache.length > 0) return; // 已加载过
      try {
        const resp = await fetch('/api/jimeng/product-specs');
        const data = await resp.json();
        if (data.specs && data.specs.length > 0) {
          _docListCache = data.specs;
          // 填充顶部文档工具栏下拉（显示文件名）
          data.specs.forEach(spec => {
            if (!docDropdown.querySelector(`option[value="${spec.filename}"]`)) {
              const opt = document.createElement('option');
              opt.value = spec.filename;
              opt.textContent = spec.filename.replace(/\.md$/i, '');
              docDropdown.appendChild(opt);
            }
          });
        }
      } catch (e) {
        console.warn('Load product specs failed:', e.message);
      }
    }

    // 搜索文档（关键词匹配）
    async function searchDocByKeyword() {
      const keyword = document.getElementById('docSearchInput').value.trim();
      if (!keyword) { showToast('请输入搜索关键词', true); return; }

      // 确保文档列表已加载
      await loadProductSpecs();

      const matches = _docListCache.filter(spec =>
        spec.title.toLowerCase().includes(keyword.toLowerCase()) ||
        spec.filename.toLowerCase().includes(keyword.toLowerCase()) ||
        (spec.preview && spec.preview.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (matches.length === 0) {
        showToast('未找到匹配文档', true);
        return;
      }

      // 自动加载第一个匹配的文档
      document.getElementById('docDropdownSelect').value = matches[0].filename;
      await loadDocByDropdown();
      showToast(`找到 ${matches.length} 个文档，已加载: ${matches[0].title}`);
    }

    // 通过下拉列表加载文档
    async function loadDocByDropdown() {
      const filename = document.getElementById('docDropdownSelect').value;
      if (!filename) return;

      try {
        const resp = await fetch(`/api/jimeng/product-specs/${encodeURIComponent(filename)}`);
        const data = await resp.json();
        if (data.content) {
          // 缓存完整文档内容
          _currentDocContent = data.content;

          // 1. 提取规格相关的行（尺寸表格等）→ AI套图
          const specLines = data.content.split('\n').filter(line =>
            /尺寸|规格|比例|scale|size|dimension|长|宽|高|直径|weight|重量|material|材质|cm|mm|比例尺|###|^\|/i.test(line)
          );
          const specsText = specLines.length > 0 ? specLines.join('\n') : data.content.substring(0, 500);
          const specsEl = document.getElementById('aiProductSpecs');
          if (specsEl) specsEl.value = specsText;
          aiMultiState.productSpecs = specsText;

          // 2. 解析文档中的尺寸数据 → 标注TAB
          parseDocDimensions(data.content);

          // 3. 更新状态信息
          const titleMatch = data.content.match(/^#\s+(.+)/m) || data.content.match(/^##\s+(.+)/m);
          const docTitle = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/i, '');

          // 4. 状态信息清空（不显示已加载提示）
          document.getElementById('docStatusInfo').textContent = ``;

          // 5. 自动加载文字TAB的文档文案（用文件名搜索更可靠）
          const searchName = filename.replace(/\.md$/i, '');
          await loadDocCopywriting(searchName, docTitle);
        }
      } catch (e) {
        showToast('读取文档失败: ' + e.message, true);
      }
    }

    // 从文档内容解析尺寸数据（长、宽、高、直径）
    function parseDocDimensions(content) {
      // 重置
      _docDimData = { length: null, width: null, height: null, diameter: null, unit: 'cm' };

      if (!content) return;

      const lines = content.split('\n');

      // 策略1a：从Markdown表格中提取（行标签格式：| 长度/Length | 6.5 cm | ...）
      // 这种格式中，尺寸名称在第一列，值在后续列
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/^\|/.test(line)) continue;
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length < 2) continue;

        const firstCell = cells[0];
        // 匹配行标签包含长度/宽度/高度/直径
        const isLengthRow = /长度|Length|长\s*[\/|]/i.test(firstCell) && !/宽度|Width/i.test(firstCell);
        const isWidthRow = /宽度|Width|宽\s*[\/|]/i.test(firstCell) && !/长度|Length/i.test(firstCell);
        const isHeightRow = /高度|Height|高\s*[\/|]|深度|Depth/i.test(firstCell);
        const isDiamRow = /直径|Diameter|Dia/i.test(firstCell);

        if (isLengthRow || isWidthRow || isHeightRow || isDiamRow) {
          // 从第二个cell开始找数值
          for (let j = 1; j < cells.length; j++) {
            const parsed = parseDimValue(cells[j]);
            if (parsed) {
              if (isLengthRow && !_docDimData.length) { _docDimData.length = parsed.value; _docDimData.unit = parsed.unit; }
              else if (isWidthRow && !_docDimData.width) { _docDimData.width = parsed.value; _docDimData.unit = parsed.unit; }
              else if (isHeightRow && !_docDimData.height) { _docDimData.height = parsed.value; _docDimData.unit = parsed.unit; }
              else if (isDiamRow && !_docDimData.diameter) { _docDimData.diameter = parsed.value; _docDimData.unit = parsed.unit; }
              break;
            }
          }
        }
        if (_docDimData.length && _docDimData.width && _docDimData.height) break;
      }

      // 策略1b：从Markdown表格中提取（列头格式：| 长 | 宽 | 高 |）
      if (!_docDimData.length && !_docDimData.width && !_docDimData.height) {
        for (const line of lines) {
          if (/^\|/.test(line)) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            const headerIdx = cells.findIndex(c => /^(长|Length|L\.?)$/i.test(c));
            const widthIdx = cells.findIndex(c => /^(宽|Width|W\.?)$/i.test(c));
            const heightIdx = cells.findIndex(c => /^(高|Height|H\.?|深度|Depth|D\.?)$/i.test(c));
            const diamIdx = cells.findIndex(c => /^(直径|Diameter|Dia\.?)$/i.test(c));

            if (headerIdx >= 0 || widthIdx >= 0 || heightIdx >= 0) {
              const dataLineIdx = lines.indexOf(line) + 1;
              let dataLine = lines[dataLineIdx];
              if (dataLine && /^\|[\s\-:|]+\|$/.test(dataLine)) {
                dataLine = lines[dataLineIdx + 1];
              }
              if (dataLine && /^\|/.test(dataLine)) {
                const dataCells = dataLine.split('|').map(c => c.trim()).filter(c => c);
                if (headerIdx >= 0 && headerIdx < dataCells.length) {
                  const parsed = parseDimValue(dataCells[headerIdx]);
                  if (parsed) { _docDimData.length = parsed.value; _docDimData.unit = parsed.unit; }
                }
                if (widthIdx >= 0 && widthIdx < dataCells.length) {
                  const parsed = parseDimValue(dataCells[widthIdx]);
                  if (parsed) { _docDimData.width = parsed.value; _docDimData.unit = parsed.unit; }
                }
                if (heightIdx >= 0 && heightIdx < dataCells.length) {
                  const parsed = parseDimValue(dataCells[heightIdx]);
                  if (parsed) { _docDimData.height = parsed.value; _docDimData.unit = parsed.unit; }
                }
                if (diamIdx >= 0 && diamIdx < dataCells.length) {
                  const parsed = parseDimValue(dataCells[diamIdx]);
                  if (parsed) { _docDimData.diameter = parsed.value; _docDimData.unit = parsed.unit; }
                }
                if (_docDimData.length || _docDimData.width || _docDimData.height) break;
              }
            }
          }
        }
      }

      // 策略2：从文本行中提取（如 "产品尺寸：5×3×2cm" 或 "长：5cm 宽：3cm 高：2cm"）
      if (!_docDimData.length && !_docDimData.width && !_docDimData.height) {
        for (const line of lines) {
          // 匹配 "5×3×2cm" 或 "5x3x2 cm" 或 "5*3*2cm" 格式
          const multiMatch = line.match(/(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          if (multiMatch) {
            _docDimData.length = parseFloat(multiMatch[1]);
            _docDimData.width = parseFloat(multiMatch[2]);
            _docDimData.height = parseFloat(multiMatch[3]);
            _docDimData.unit = multiMatch[4].toLowerCase();
            break;
          }

          // 匹配 "长：5cm" "宽：3cm" "高：2cm" 格式
          const lengthMatch = line.match(/(?:长|Length|L\.?)\s*[：:]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          const widthMatch = line.match(/(?:宽|Width|W\.?)\s*[：:]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          const heightMatch = line.match(/(?:高|Height|H\.?|深度|Depth)\s*[：:]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          const diamMatch = line.match(/(?:直径|Diameter|Dia\.?)\s*[：:]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);

          if (lengthMatch) _docDimData.length = parseFloat(lengthMatch[1]);
          if (widthMatch) _docDimData.width = parseFloat(widthMatch[1]);
          if (heightMatch) _docDimData.height = parseFloat(heightMatch[1]);
          if (diamMatch) _docDimData.diameter = parseFloat(diamMatch[1]);

          // 取单位（优先取最后匹配到的）
          const unitMatch = line.match(/(cm|mm|m)\b/i);
          if (unitMatch) _docDimData.unit = unitMatch[1].toLowerCase();

          if (_docDimData.length || _docDimData.width || _docDimData.height) break;
        }
      }

      // 策略3：从 "尺寸 5×3×2cm" 行提取
      if (!_docDimData.length && !_docDimData.width && !_docDimData.height) {
        for (const line of lines) {
          const sizeMatch = line.match(/(?:尺寸|Size|Dimensions?)\s*[：:]*\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          if (sizeMatch) {
            _docDimData.length = parseFloat(sizeMatch[1]);
            _docDimData.width = parseFloat(sizeMatch[2]);
            _docDimData.height = parseFloat(sizeMatch[3]);
            _docDimData.unit = sizeMatch[4].toLowerCase();
            break;
          }
          // 两维格式 "尺寸 5×3cm"
          const size2Match = line.match(/(?:尺寸|Size|Dimensions?)\s*[：:]*\s*(\d+\.?\d*)\s*[×xX*]\s*(\d+\.?\d*)\s*(cm|mm|m)/i);
          if (size2Match) {
            _docDimData.length = parseFloat(size2Match[1]);
            _docDimData.width = parseFloat(size2Match[2]);
            _docDimData.unit = size2Match[3].toLowerCase();
            break;
          }
        }
      }

      // mm → cm 转换
      if (_docDimData.unit === 'mm') {
        if (_docDimData.length) _docDimData.length = Math.round(_docDimData.length / 10 * 100) / 100;
        if (_docDimData.width) _docDimData.width = Math.round(_docDimData.width / 10 * 100) / 100;
        if (_docDimData.height) _docDimData.height = Math.round(_docDimData.height / 10 * 100) / 100;
        if (_docDimData.diameter) _docDimData.diameter = Math.round(_docDimData.diameter / 10 * 100) / 100;
        _docDimData.unit = 'cm';
      }

      // 更新标注TAB的规格显示
      updateDimSpecDisplay();
    }

    // 解析单个尺寸值（如 "5cm" "3.2 cm" "45mm"）
    function parseDimValue(str) {
      if (!str) return null;
      const match = str.match(/(\d+\.?\d*)\s*(cm|mm|m)/i);
      if (match) return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
      // 纯数字
      const numMatch = str.match(/(\d+\.?\d*)/);
      if (numMatch) return { value: parseFloat(numMatch[1]), unit: 'cm' };
      return null;
    }

    // 更新标注TAB的产品规格数据显示
    function updateDimSpecDisplay() {
      const container = document.getElementById('dimSpecDisplay');
      if (!container) return;

      const d = _docDimData;
      if (!d.length && !d.width && !d.height && !d.diameter) {
        container.innerHTML = '<div style="font-size:11px;color:#9ca3af;">加载文档后自动显示尺寸数据</div>';
        return;
      }

      let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;">';
      if (d.length) html += `<div style="color:#6b7280;">长 (L)</div><div style="font-weight:600;color:#1f2937;">${d.length} ${d.unit}</div>`;
      if (d.width) html += `<div style="color:#6b7280;">宽 (W)</div><div style="font-weight:600;color:#1f2937;">${d.width} ${d.unit}</div>`;
      if (d.height) html += `<div style="color:#6b7280;">高 (H)</div><div style="font-weight:600;color:#1f2937;">${d.height} ${d.unit}</div>`;
      if (d.diameter) html += `<div style="color:#6b7280;">直径 (D)</div><div style="font-weight:600;color:#1f2937;">${d.diameter} ${d.unit}</div>`;
      html += '</div>';

      // 更新标注TAB的默认数值输入框
      const dimValueInput = document.getElementById('dimValue');
      if (dimValueInput) {
        // 优先用宽度作为水平标注默认值
        if (d.width) {
          dimValueInput.value = d.width;
        } else if (d.length) {
          dimValueInput.value = d.length;
        } else if (d.diameter) {
          dimValueInput.value = d.diameter;
        }
      }

      container.innerHTML = html;
    }

    // 根据遮罩/标注区域的宽高，智能分配文档尺寸数值
    // 原则：长边用大数值，短边用小数值
    function getSmartDimValues(pixelW, pixelH) {
      if (typeof _docDimData === 'undefined' || !_docDimData) return null;

      // 收集所有可用尺寸值，按从大到小排序
      const vals = [];
      if (_docDimData.length != null) vals.push(_docDimData.length);
      if (_docDimData.width != null) vals.push(_docDimData.width);
      if (_docDimData.height != null) vals.push(_docDimData.height);
      if (_docDimData.diameter != null) vals.push(_docDimData.diameter);
      vals.sort((a, b) => b - a);

      if (vals.length === 0) return null;

      const isWider = pixelW >= pixelH;

      if (vals.length === 1) {
        return { horizVal: vals[0], vertVal: vals[0] };
      }

      if (isWider) {
        // 遮罩更宽 → 水平方向是长边 → 用大数值
        return { horizVal: vals[0], vertVal: vals[1] };
      } else {
        // 遮罩更高 → 垂直方向是长边 → 用大数值
        return { horizVal: vals[1], vertVal: vals[0] };
      }
    }

    // 从文档内容自动加载文案到文字TAB
    async function loadDocCopywriting(searchName, docTitle) {
      if (!searchName) return;

      // 同步文字TAB的隐藏字段
      const nameInput = document.getElementById('aiProductName');
      if (nameInput) nameInput.value = searchName;

      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = window.getToken ? window.getToken() : (window.app?.token || localStorage.getItem('token'));
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const currentLang = window.copyLang || 'zh';
        const res = await fetch('/api/main-image/copywriting', {
          method: 'POST',
          headers,
          body: JSON.stringify({ productName: searchName, productInfo: '', language: currentLang, aiOptimize: false })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn('Copywriting API error:', res.status, errText);
          showToast('文案加载失败: ' + res.status, true);
          return;
        }
        const copyData = await res.json();
        if (copyData.success && copyData.copyList && copyData.copyList.length > 0) {
          // 通过全局函数更新文案数据，确保语言切换功能正常
          if (window.updateCopyData) {
            window.updateCopyData(copyData);
          }
          const list = currentLang === 'en' ? (copyData.copyListEn || copyData.copyList) : copyData.copyList;
          window.renderAICopyList(list, copyData.source, copyData.productData);
        } else {
          // 没有匹配到文案
          const container = document.getElementById('aiCopyList');
          if (container) {
            container.style.display = 'block';
            container.innerHTML = '<div style="font-size:11px;color:#9ca3af;padding:4px;">未找到匹配的文案</div>';
          }
        }
      } catch (e) {
        console.warn('Auto load copywriting failed:', e.message);
        showToast('文案加载失败: ' + e.message, true);
      }
    }

    // 打开文档查看弹窗
    async function openDocViewModal() {
      const filename = document.getElementById('docDropdownSelect').value;
      if (!filename) {
        showToast('请先选择一个文档', true);
        return;
      }

      const modal = document.getElementById('docViewModal');
      const titleEl = document.getElementById('docViewTitle');
      const contentEl = document.getElementById('docViewContent');

      titleEl.innerHTML = '<i data-lucide="file-text" class="icon-inline"></i> ' + filename.replace(/\.md$/i, '');
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [titleEl] });

      // 如果已有缓存内容直接渲染，否则重新加载
      let mdContent = _currentDocContent;
      if (!mdContent) {
        try {
          const resp = await fetch(`/api/jimeng/product-specs/${encodeURIComponent(filename)}`);
          const data = await resp.json();
          if (data.content) {
            mdContent = data.content;
            _currentDocContent = data.content;
          }
        } catch (e) {
          contentEl.innerHTML = '<div style="color:#ef4444;">加载文档失败: ' + e.message + '</div>';
          modal.style.display = 'flex';
          return;
        }
      }

      if (!mdContent) {
        contentEl.innerHTML = '<div style="color:#9ca3af;">文档内容为空</div>';
        modal.style.display = 'flex';
        return;
      }

      // 使用 marked 渲染 Markdown
      if (typeof marked !== 'undefined') {
        contentEl.innerHTML = marked.parse(mdContent);
      } else {
        // fallback: 简单转义显示
        contentEl.innerHTML = '<pre style="white-space:pre-wrap;word-break:break-word;">' + mdContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
      }

      // 为渲染后的内容添加基础样式
      contentEl.querySelectorAll('table').forEach(table => {
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.style.marginBottom = '12px';
      });
      contentEl.querySelectorAll('th, td').forEach(cell => {
        cell.style.border = '1px solid #d1d5db';
        cell.style.padding = '6px 10px';
        cell.style.fontSize = '12px';
      });
      contentEl.querySelectorAll('th').forEach(th => {
        th.style.background = '#f3f4f6';
        th.style.fontWeight = '600';
      });
      contentEl.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%';
        img.style.borderRadius = '6px';
      });
      contentEl.querySelectorAll('code').forEach(code => {
        code.style.background = '#f3f4f6';
        code.style.padding = '2px 6px';
        code.style.borderRadius = '4px';
        code.style.fontSize = '12px';
      });
      contentEl.querySelectorAll('pre').forEach(pre => {
        pre.style.background = '#f3f4f6';
        pre.style.padding = '12px';
        pre.style.borderRadius = '6px';
        pre.style.overflowX = 'auto';
      });
      contentEl.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
        h.style.marginTop = '16px';
        h.style.marginBottom = '8px';
      });
      contentEl.querySelectorAll('blockquote').forEach(bq => {
        bq.style.borderLeft = '4px solid #8b5cf6';
        bq.style.paddingLeft = '12px';
        bq.style.marginLeft = '0';
        bq.style.color = '#6b7280';
      });

      modal.style.display = 'flex';
    }

    function closeDocViewModal() {
      document.getElementById('docViewModal').style.display = 'none';
    }

    // ========== API 状态检查 ==========
    async function checkAIEditApiStatus() {
      const dot = document.getElementById('aiEditStatusDot');
      try {
        const resp = await fetch('/api/jimeng/config');
        const data = await resp.json();
        aiMultiState.apiConfigured = data.configured;
        if (data.configured) {
          dot.style.display = 'inline-block';
          dot.style.background = '#22c55e';
          dot.title = 'AI编辑 API 已连接';
        } else {
          dot.style.display = 'inline-block';
          dot.style.background = '#ef4444';
          dot.title = 'AI编辑 API 未配置';
        }
      } catch (e) {
        dot.style.display = 'inline-block';
        dot.style.background = '#ef4444';
        dot.title = 'AI编辑 API 连接失败';
        aiMultiState.apiConfigured = false;
      }
    }

    // ========== 工具函数 ==========
    function dataURLtoBlob(dataURL) {
      const parts = dataURL.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const bstr = atob(parts[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
      return new Blob([u8arr], { type: mime });
    }

    // ========== 一键生成 ==========
    async function aiMultiGenerate() {
      if (aiMultiState.isGenerating) return;
      const selectedImgs = getSelectedImages();
      if (selectedImgs.length === 0) {
        showToast('请先上传并勾选产品图', true);
        return;
      }
      if (!aiMultiState.apiConfigured) {
        showToast('API 未配置，请在设置中配置即梦 API', true);
        return;
      }

      // 收集选中的类型
      const selectedTypes = [];
      if (document.getElementById('aiTypeWhite').checked) selectedTypes.push('white');
      if (document.getElementById('aiTypeHandheld').checked) selectedTypes.push('handheld');
      if (document.getElementById('aiTypeAIScene').checked) selectedTypes.push('ai-scene');
      if (document.getElementById('aiTypeRealScene').checked) selectedTypes.push('realistic-scene');

      if (selectedTypes.length === 0) {
        showToast('请至少选择一种生成类型', true);
        return;
      }

      // 构建基础任务模板
      const baseTasks = AI_MULTI_TASKS.filter(t => {
        if (t.type === 'white') return selectedTypes.includes('white');
        if (t.type === 'handheld') return selectedTypes.includes('handheld');
        if (t.type === 'ai-scene') return selectedTypes.includes('ai-scene');
        if (t.type === 'realistic-scene') return selectedTypes.includes('realistic-scene');
        return false;
      });

      // 多张产品图时，每张图创建独立taskId，防止覆盖
      const allTasks = [];
      for (let imgIdx = 0; imgIdx < selectedImgs.length; imgIdx++) {
        const suffix = selectedImgs.length > 1 ? `_img${imgIdx}` : '';
        for (const t of baseTasks) {
          allTasks.push({
            ...t,
            id: t.id + suffix,
            label: selectedImgs.length > 1 ? `${t.label} [图${imgIdx + 1}]` : t.label,
            _imgIdx: imgIdx,
            _originalId: t.id,
          });
        }
      }

      aiMultiState.tasks = allTasks;
      aiMultiState.results = {};
      aiMultiState.isGenerating = true;
      aiMultiState.productSpecs = (document.getElementById('aiProductSpecs')?.value || aiMultiState.productSpecs || '').trim();
      aiMultiState.stopOnError = false;

      // 初始化所有结果卡片
      renderAIResultCards(allTasks);

      // UI 状态
      const btn = document.getElementById('aiMultiGenerateBtn');
      btn.disabled = true;
      btn.textContent = '⏳ 生成中...';
      document.getElementById('aiMultiProgress').style.display = 'block';
      document.getElementById('aiMultiEmpty').style.display = 'none';

      let completedCount = 0;
      const totalCount = allTasks.length;

      const markDone = () => { completedCount++; updateProgress(completedCount, totalCount); };

      // 并发控制器 - 限制同时请求数
      const MAX_CONCURRENT = 4;
      let runningCount = 0;
      const waitQueue = [];
      const acquire = () => new Promise(resolve => {
        if (runningCount < MAX_CONCURRENT) { runningCount++; resolve(); }
        else waitQueue.push(resolve);
      });
      const release = () => { runningCount--; if (waitQueue.length > 0) { runningCount++; waitQueue.shift()(); } };

      // Generate image for a specific product image blob
      const genImage = async (task, prompt, imageBlob) => {
        await acquire();
        updateCardStatus(task.id, 'generating');
        updateProgress(completedCount, totalCount, `生成 ${task.label}...`);
        try {
          const images = await generateImage(prompt, task.ratio, imageBlob);
          aiMultiState.results[task.id] = { images: images, currentIndex: 0, status: 'done' };
          updateCardStatus(task.id, 'done', images);
        } catch (e) {
          console.error(`Generate ${task.id} failed:`, e.message);
          aiMultiState.results[task.id] = { images: [], status: 'error', error: e.message };
          updateCardStatus(task.id, 'error', null, e.message);
        } finally {
          release();
          markDone();
        }
      };

      try {
        // Read supplementary prompts
        const extraWhite = document.getElementById('aiPromptWhite')?.value?.trim() || '';
        const extraHandheld = document.getElementById('aiPromptHandheld')?.value?.trim() || '';
        const extraAIScene = document.getElementById('aiPromptAIScene')?.value?.trim() || '';
        const extraRealScene = document.getElementById('aiPromptRealScene')?.value?.trim() || '';

        // 预分析所有产品图（并发），避免生成时重复分析
        const analysisMap = {};
        if (selectedTypes.includes('ai-scene') || selectedTypes.includes('realistic-scene')) {
          const analysisPromises = selectedImgs.map(async (img, idx) => {
            if (sceneModes['ai-scene'] === 'manual' && sceneModes['realistic-scene'] === 'manual') return;
            updateProgress(completedCount, totalCount, `分析产品图 ${idx + 1}/${selectedImgs.length}...`);
            try {
              const formData = new FormData();
              formData.append('image', img.blob);
              const resp = await fetch('/api/jimeng/analyze-product', { method: 'POST', body: formData });
              if (resp.ok) {
                const data = await resp.json();
                analysisMap[idx] = data.analysis || '';
              }
            } catch (e) { console.warn('Analysis failed for img', idx, e.message); }
          });
          await Promise.all(analysisPromises);
        }

        // 预生成所有场景提示词（并发）：返回 { prompt_1x1, prompt_3x4 }
        const promptMap = {};
        const promptPromises = [];
        for (let imgIdx = 0; imgIdx < selectedImgs.length; imgIdx++) {
          const analysis = analysisMap[imgIdx] || '';
          const imgTasks = allTasks.filter(t => t._imgIdx === imgIdx);

          // AI场景提示词
          if (selectedTypes.includes('ai-scene')) {
            promptPromises.push((async () => {
              if (sceneModes['ai-scene'] === 'manual') {
                const manualPrompt = document.getElementById('aiPromptAISceneManual')?.value?.trim() || '';
                promptMap[`ai-scene_1x1_${imgIdx}`] = manualPrompt;
                promptMap[`ai-scene_3x4_${imgIdx}`] = manualPrompt;
              } else {
                updateProgress(completedCount, totalCount, `💬 生成AI场景提示词 [图${imgIdx + 1}]...`);
                try {
                  const result = await generatePrompt(selectedImgs[imgIdx].blob, aiMultiState.productSpecs, 'ai-scene');
                  let p1 = result.prompt_1x1 || '';
                  let p2 = result.prompt_3x4 || '';
                  if (extraAIScene) { p1 += ' ' + extraAIScene; p2 += ' ' + extraAIScene; }
                  promptMap[`ai-scene_1x1_${imgIdx}`] = p1;
                  promptMap[`ai-scene_3x4_${imgIdx}`] = p2;
                } catch (e) { console.warn('AI scene prompt failed:', e.message); }
              }
            })());
          }

          // 实拍场景提示词
          if (selectedTypes.includes('realistic-scene')) {
            promptPromises.push((async () => {
              if (sceneModes['realistic-scene'] === 'manual') {
                const manualPrompt = document.getElementById('aiPromptRealSceneManual')?.value?.trim() || '';
                promptMap[`realistic-scene_1x1_${imgIdx}`] = manualPrompt;
                promptMap[`realistic-scene_3x4_${imgIdx}`] = manualPrompt;
              } else {
                updateProgress(completedCount, totalCount, `💬 生成实拍场景提示词 [图${imgIdx + 1}]...`);
                try {
                  const result = await generatePrompt(selectedImgs[imgIdx].blob, aiMultiState.productSpecs, 'realistic-scene');
                  let p1 = result.prompt_1x1 || '';
                  let p2 = result.prompt_3x4 || '';
                  if (extraRealScene) { p1 += ' ' + extraRealScene; p2 += ' ' + extraRealScene; }
                  promptMap[`realistic-scene_1x1_${imgIdx}`] = p1;
                  promptMap[`realistic-scene_3x4_${imgIdx}`] = p2;
                } catch (e) { console.warn('Real scene prompt failed:', e.message); }
              }
            })());
          }
        }
        await Promise.all(promptPromises);

        // 所有图片生成任务并发提交
        const allGenPromises = [];

        for (let imgIdx = 0; imgIdx < selectedImgs.length; imgIdx++) {
          const currentImg = selectedImgs[imgIdx];
          const imgTasks = allTasks.filter(t => t._imgIdx === imgIdx);

          // Track 1: White bg
          if (selectedTypes.includes('white')) {
            const whiteTask = imgTasks.find(t => t.type === 'white');
            const prompt = extraWhite ? WHITE_BG_PROMPT + ' ' + extraWhite : WHITE_BG_PROMPT;
            allGenPromises.push(genImage(whiteTask, prompt, currentImg.blob));
          }

          // Track 2: Handheld
          if (selectedTypes.includes('handheld')) {
            const handheldTask = imgTasks.find(t => t.type === 'handheld');
            const specsPart = aiMultiState.productSpecs
              ? ` Product specifications: ${aiMultiState.productSpecs}. Ensure the hand-to-product scale ratio accurately reflects the actual product size.`
              : '';
            let handheldPrompt = `First-person POV shot, a hand naturally holding the product as if the viewer is holding it, close-up from the holder's perspective, professional product photography, clean background, studio lighting, e-commerce style, sharp focus on the product, immersive first-person view.${specsPart} --ar 1:1 --iw 2.0`;
            if (extraHandheld) handheldPrompt += ' ' + extraHandheld;
            allGenPromises.push(genImage(handheldTask, handheldPrompt, currentImg.blob));
          }

          // Track 3: AI scene - 1:1 and 3:4 (各自使用不同提示词)
          if (selectedTypes.includes('ai-scene')) {
            const aiSceneTasks = imgTasks.filter(t => t.type === 'ai-scene');
            for (const task of aiSceneTasks) {
              const ratioKey = task.ratio === '3:4' ? '3x4' : '1x1';
              const prompt = promptMap[`ai-scene_${ratioKey}_${imgIdx}`];
              if (prompt) allGenPromises.push(genImage(task, prompt, currentImg.blob));
            }
          }

          // Track 4: Realistic scene - 1:1 and 3:4 (各自使用不同提示词)
          if (selectedTypes.includes('realistic-scene')) {
            const realSceneTasks = imgTasks.filter(t => t.type === 'realistic-scene');
            for (const task of realSceneTasks) {
              const ratioKey = task.ratio === '3:4' ? '3x4' : '1x1';
              const prompt = promptMap[`realistic-scene_${ratioKey}_${imgIdx}`];
              if (prompt) allGenPromises.push(genImage(task, prompt, currentImg.blob));
            }
          }
        }

        // 并发执行所有生成任务（受 MAX_CONCURRENT 限制）
        await Promise.all(allGenPromises);

        updateProgress(totalCount, totalCount, '✅ 全部完成！');
        showToast('一键多图生成完成');

        // 收集所有成功生成的图片并自动保存（最多保存前20张）
        if (typeof saveGeneratedImages === 'function') {
          const allImages = [];
          for (const task of allTasks) {
            const result = aiMultiState.results[task.id];
            if (result && result.images && result.images.length > 0) {
              allImages.push(...result.images);
              if (allImages.length >= 20) break;
            }
          }
          if (allImages.length > 0) {
            saveGeneratedImages(allImages, 'batch', 'multi');
          }
        }

      } catch (error) {
        console.error('AI multi-generate error:', error);
        showToast('生成失败: ' + error.message, true);
      } finally {
        aiMultiState.isGenerating = false;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" class="icon-inline"></i> 一键生成全部';
        setTimeout(() => {
          document.getElementById('aiMultiProgress').style.display = 'none';
        }, 3000);
      }
    }

    // ========== Ollama 视觉分析 ==========
    async function analyzeProduct() {
      const formData = new FormData();
      formData.append('image', aiMultiState.uploadedImageBlob);

      const resp = await fetch('/api/jimeng/analyze-product', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: 'Analysis failed' } }));
        throw new Error(err.error?.message || 'Product analysis failed');
      }

      const data = await resp.json();
      return data.analysis || '';
    }

    // ========== Ollama 提示词生成（带图片视觉识别） ==========
    // 发送产品图片给 Ollama，让 LLM 亲眼看到产品来生成场景提示词
    // 返回 { prompt_1x1, prompt_3x4 }
    async function generatePrompt(imageBlob, specs, sceneType) {
      const formData = new FormData();
      formData.append('image', imageBlob, 'product.png');
      formData.append('productSpecs', specs || '');
      formData.append('sceneType', sceneType);

      const resp = await fetch('/api/jimeng/generate-prompts', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: 'Prompt generation failed' } }));
        throw new Error(err.error?.message || 'Prompt generation failed');
      }

      const data = await resp.json();
      // 新接口返回 prompt_1x1 和 prompt_3x4
      if (data.prompt_1x1 || data.prompt_3x4) {
        return {
          prompt_1x1: data.prompt_1x1 || getDefaultPrompt(sceneType, '1:1'),
          prompt_3x4: data.prompt_3x4 || getDefaultPrompt(sceneType, '3:4'),
        };
      }
      // 兼容旧接口（单条 prompt）
      const singlePrompt = data.prompt || getDefaultPrompt(sceneType, '1:1');
      return { prompt_1x1: singlePrompt, prompt_3x4: singlePrompt };
    }

    // 默认提示词（Ollama 不可用时使用）
    function getDefaultPrompt(type, ratio) {
      const ratioSuffix = ratio === '3:4' ? ' --ar 3:4' : ' --ar 1:1';
      const defaults = {
        'handheld': 'First-person POV shot, a hand naturally holding the product as if the viewer is holding it, close-up from the holder\'s perspective, professional product photography, clean background, studio lighting, e-commerce style, sharp focus on the product, immersive first-person view, --iw 2.0',
        'ai-scene': 'The exact main product from the reference image remains absolutely unchanged. Only the background is replaced with a professional diorama scene with realistic miniature textures, studio lighting, hyper-realistic, 8k resolution, --iw 2.0',
        'realistic-scene': 'The exact main product from the reference image remains absolutely unchanged. Only the background is replaced with a realistic real-life scene, natural lighting, authentic environment, professional product photography, --iw 2.0',
      };
      return (defaults[type] || '') + ratioSuffix;
    }

    // ========== 图生图 ==========
    async function generateImage(prompt, ratio, imageBlobOverride) {
      const model = document.getElementById('aiMultiModel').value;
      const strength = parseInt(document.getElementById('aiMultiStrength').value) / 100;

      const imageBlob = imageBlobOverride || (aiMultiState.uploadedImageSrc ? dataURLtoBlob(aiMultiState.uploadedImageSrc) : null);

      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('ratio', ratio);
      formData.append('resolution', '2k');
      formData.append('response_format', 'b64_json');
      // 有图片时使用 img2img，否则为文生图
      if (imageBlob) {
        formData.append('sample_strength', strength.toString());
        formData.append('images', imageBlob, 'product.png');
      }

      const resp = await fetch('/api/jimeng/compositions', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        // 尝试多种错误格式提取
        let errMsg = `Request failed (${resp.status})`;
        try {
          const errBody = await resp.json();
          errMsg = errBody.error?.message || errBody.error || errBody.message || JSON.stringify(errBody);
        } catch (e) {
          try {
            const text = await resp.text();
            if (text) errMsg = text.substring(0, 200);
          } catch (e2) {}
        }
        throw new Error(errMsg);
      }

      const result = await resp.json();
      if (!result.data || result.data.length === 0) {
        throw new Error('No result returned');
      }

      // Convert all returned images to data URLs
      const images = [];
      for (const item of result.data) {
        if (item.b64_json) {
          images.push('data:image/png;base64,' + item.b64_json);
        } else if (item.url) {
          const imgResp = await fetch(item.url);
          const imgBlob = await imgResp.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(imgBlob);
          });
          images.push(dataUrl);
        }
      }

      if (images.length === 0) {
        throw new Error('Cannot get result image');
      }

      return images; // Return array of all images
    }

    // ========== UI 渲染 ==========
    function renderAIResultCards(tasks) {
      const container = document.getElementById('aiMultiResults');
      container.innerHTML = tasks.map(task => `
        <div id="card-${task.id}" style="background:#fff;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);overflow:hidden;transition:all 0.2s;font-size:11px;">
          <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #f3f4f6;">
            <i data-lucide="${task.icon}" style="width:13px;height:13px;flex-shrink:0;"></i>
            <span style="font-size:11px;font-weight:600;color:#1f2937;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task.label}</span>
            <span id="status-${task.id}" style="font-size:9px;padding:1px 6px;border-radius:8px;background:#f3f4f6;color:#6b7280;">等待</span>
          </div>
          <div style="position:relative;">
            <div id="img-${task.id}" style="width:100%;aspect-ratio:${task.ratio === '3:4' ? '3/4' : '1'};background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;" onclick="openLightboxForTask('${task.id}')">
              <span style="font-size:10px;color:#9ca3af;">等待生成</span>
            </div>
            <button id="toggle-${task.id}" onclick="toggleOriginalImage('${task.id}')" style="display:none;position:absolute;top:4px;left:4px;padding:2px 6px;border:none;border-radius:3px;background:rgba(0,0,0,0.55);color:#fff;font-size:9px;cursor:pointer;z-index:2;backdrop-filter:blur(4px);" title="切换原图/结果图">原图</button>
          </div>
          <div id="thumbs-${task.id}" style="display:none;padding:4px 4px 0;gap:3px;flex-wrap:wrap;"></div>
          <div id="actions-${task.id}" style="padding:4px 6px;gap:4px;display:none;">
            <button onclick="downloadAIResult('${task.id}')" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="下载"><i data-lucide="download" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
            <button onclick="applyAIResultToTemplate('${task.id}')" style="flex:1;padding:3px;border:1px solid #3b82f6;border-radius:3px;background:#eff6ff;font-size:10px;cursor:pointer;color:#1e40af;" title="应用到模板"><i data-lucide="clipboard-list" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
            <button onclick="regenerateSingle('${task.id}')" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="重新生成"><i data-lucide="refresh-cw" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
          </div>
        </div>
      `).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    }

    // 创建单张任务卡片HTML（不覆盖已存在的卡片）
    function createSingleTaskCard(task) {
      return `
        <div id="card-${task.id}" style="background:#fff;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);overflow:hidden;transition:all 0.2s;font-size:11px;">
          <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #f3f4f6;">
            <i data-lucide="${task.icon}" style="width:13px;height:13px;flex-shrink:0;"></i>
            <span style="font-size:11px;font-weight:600;color:#1f2937;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${task.label}</span>
            <span id="status-${task.id}" style="font-size:9px;padding:1px 6px;border-radius:8px;background:#fef3c7;color:#92400e;">生成中</span>
          </div>
          <div style="position:relative;">
            <div id="img-${task.id}" style="width:100%;aspect-ratio:${task.ratio === '3:4' ? '3/4' : '1'};background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:80px;">
              <div style="text-align:center;"><div style="display:inline-block;width:22px;height:22px;border:2px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>
            </div>
            <button id="toggle-${task.id}" onclick="toggleOriginalImage('${task.id}')" style="display:none;position:absolute;top:4px;left:4px;padding:2px 6px;border:none;border-radius:3px;background:rgba(0,0,0,0.55);color:#fff;font-size:9px;cursor:pointer;z-index:2;backdrop-filter:blur(4px);" title="切换原图/结果图">原图</button>
          </div>
          <div id="thumbs-${task.id}" style="display:none;padding:4px 4px 0;gap:3px;flex-wrap:wrap;"></div>
          <div id="actions-${task.id}" style="padding:4px 6px;gap:4px;display:none;">
            <button onclick="downloadAIResult('${task.id}')" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="下载"><i data-lucide="download" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
            <button onclick="applyAIResultToTemplate('${task.id}')" style="flex:1;padding:3px;border:1px solid #3b82f6;border-radius:3px;background:#eff6ff;font-size:10px;cursor:pointer;color:#1e40af;" title="应用到模板"><i data-lucide="clipboard-list" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
            <button onclick="regenerateSingle('${task.id}')" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="重新生成"><i data-lucide="refresh-cw" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
          </div>
        </div>
      `;
    }

    function updateCardStatus(taskId, status, imagesOrSrc, errorMsg) {
      const statusEl = document.getElementById(`status-${taskId}`);
      const imgEl = document.getElementById(`img-${taskId}`);
      const thumbsEl = document.getElementById(`thumbs-${taskId}`);
      const actionsEl = document.getElementById(`actions-${taskId}`);

      if (status === 'generating') {
        statusEl.textContent = '生成中';
        statusEl.style.background = '#fef3c7';
        statusEl.style.color = '#92400e';
        imgEl.innerHTML = '<div style="text-align:center;"><div style="display:inline-block;width:18px;height:18px;border:2px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>';
      } else if (status === 'done') {
        const images = Array.isArray(imagesOrSrc) ? imagesOrSrc : [imagesOrSrc];
        statusEl.textContent = `${images.length}张`;
        statusEl.style.background = '#dcfce7';
        statusEl.style.color = '#166534';

        // Show current image (clickable for lightbox)
        const result = aiMultiState.results[taskId];
        const idx = result ? result.currentIndex : 0;
        imgEl.innerHTML = `<img src="${images[idx]}" style="width:100%;height:100%;object-fit:contain;" />`;

        // Show thumbnail strip if multiple images
        if (images.length > 1) {
          thumbsEl.style.display = 'flex';
          thumbsEl.innerHTML = images.map((src, i) => `
            <img src="${src}" onclick="selectThumb('${taskId}',${i})" style="width:28px;height:28px;object-fit:cover;border-radius:3px;cursor:pointer;border:2px solid ${i === idx ? '#3b82f6' : '#e5e7eb'};transition:border-color 0.15s;" onmouseenter="this.style.borderColor='#3b82f6'" onmouseleave="this.style.borderColor='${i === idx ? '#3b82f6' : '#e5e7eb'}'" />
          `).join('');
        } else {
          thumbsEl.style.display = 'none';
        }

        actionsEl.style.display = 'flex';
        // 显示原图切换按钮
        const toggleEl = document.getElementById(`toggle-${taskId}`);
        if (toggleEl) toggleEl.style.display = 'block';
      } else if (status === 'error') {
        statusEl.textContent = '失败';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#991b1b';
        imgEl.innerHTML = `<div style="text-align:center;padding:8px;"><div style="font-size:10px;color:#ef4444;">${errorMsg || '生成失败'}</div></div>`;
        actionsEl.style.display = 'flex';
      }
    }

    // Select a thumbnail to show
    function selectThumb(taskId, index) {
      const result = aiMultiState.results[taskId];
      if (!result || !result.images || index >= result.images.length) return;
      result.currentIndex = index;
      result._showingOriginal = false;
      const imgEl = document.getElementById(`img-${taskId}`);
      imgEl.innerHTML = `<img src="${result.images[index]}" style="width:100%;height:100%;object-fit:contain;" />`;
      // Update thumbnail borders
      const thumbsEl = document.getElementById(`thumbs-${taskId}`);
      const thumbImgs = thumbsEl.querySelectorAll('img');
      thumbImgs.forEach((img, i) => {
        img.style.borderColor = i === index ? '#3b82f6' : '#e5e7eb';
      });
      // Reset toggle button text
      const toggleEl = document.getElementById(`toggle-${taskId}`);
      if (toggleEl) toggleEl.textContent = '原图';
    }

    // Toggle between original image and generated result
    function toggleOriginalImage(taskId) {
      const result = aiMultiState.results[taskId];
      if (!result) return;
      const selectedImgs = getSelectedImages();
      if (selectedImgs.length === 0) return;

      // 根据任务的 _imgIdx 找到对应的原图
      const task = aiMultiState.tasks.find(t => t.id === taskId);
      const imgIdx = task ? (task._imgIdx || 0) : 0;
      const originalSrc = selectedImgs[Math.min(imgIdx, selectedImgs.length - 1)].src;

      const imgEl = document.getElementById(`img-${taskId}`);
      const toggleEl = document.getElementById(`toggle-${taskId}`);
      if (!result._showingOriginal) {
        // Show original
        result._savedResultHtml = imgEl.innerHTML;
        imgEl.innerHTML = `<img src="${originalSrc}" style="width:100%;height:100%;object-fit:contain;" />`;
        if (toggleEl) { toggleEl.textContent = '结果'; toggleEl.style.background = 'rgba(59,130,246,0.8)'; }
        result._showingOriginal = true;
      } else {
        // Show result
        if (result._savedResultHtml) {
          imgEl.innerHTML = result._savedResultHtml;
        } else {
          const idx = result.currentIndex || 0;
          imgEl.innerHTML = `<img src="${result.images[idx]}" style="width:100%;height:100%;object-fit:contain;" />`;
        }
        if (toggleEl) { toggleEl.textContent = '原图'; toggleEl.style.background = 'rgba(0,0,0,0.55)'; }
        result._showingOriginal = false;
      }
    }

    // Lightbox
    function openLightboxForTask(taskId) {
      const result = aiMultiState.results[taskId];
      if (!result || !result.images || result.images.length === 0) return;
      const src = result.images[result.currentIndex || 0];
      const task = aiMultiState.tasks.find(t => t.id === taskId) || AI_MULTI_TASKS.find(t => t.id === taskId);
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightboxInfo').textContent = `${task ? task.label : ''} - ${(result.currentIndex || 0) + 1}/${result.images.length}`;
      const modal = document.getElementById('lightboxModal');
      modal.style.display = 'flex';
    }

    function closeLightbox() {
      const modal = document.getElementById('lightboxModal');
      if (modal) modal.style.display = 'none';
    }

    // Keyboard support for lightbox
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('lightboxModal').style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
      }
    });

    function updateProgress(current, total, text) {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      document.getElementById('aiMultiProgressBar').style.width = pct + '%';
      document.getElementById('aiMultiProgressText').textContent = text;
    }

    // ========== 结果操作 ==========
    function downloadAIResult(taskId) {
      const result = aiMultiState.results[taskId];
      if (!result || !result.images || result.images.length === 0) return;
      const src = result.images[result.currentIndex || 0];
      const a = document.createElement('a');
      a.href = src;
      a.download = `ai-edit-${taskId}-${(result.currentIndex || 0) + 1}.png`;
      a.click();
    }

    function applyAIResultToTemplate(taskId) {
      const result = aiMultiState.results[taskId];
      if (!result || !result.images || result.images.length === 0) return;
      const src = result.images[result.currentIndex || 0];
      // 添加到模板图片列表
      const newImg = new Image();
      newImg.onload = () => {
        const imgData = {
          img: newImg,
          imgOriginal: newImg,
          src: src,
          srcOriginal: src,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          type: 'scene',
        };
        state.images.push(imgData);
        if (typeof updateImageList === 'function') updateImageList();
        render();
        showToast('已添加到模板图片列表');
      };
      newImg.src = src;
    }

    async function regenerateSingle(taskId) {
      const task = aiMultiState.tasks.find(t => t.id === taskId) || AI_MULTI_TASKS.find(t => t.id === taskId);
      if (!task) return;

      const selectedImgs = getSelectedImages();
      if (selectedImgs.length === 0) { showToast('请先上传并勾选产品图', true); return; }
      // 根据任务的 _imgIdx 找到对应的原图
      const imgIdx = task._imgIdx || 0;
      const currentImg = selectedImgs[Math.min(imgIdx, selectedImgs.length - 1)];
      aiMultiState.uploadedImageSrc = currentImg.src;
      aiMultiState.uploadedImageBlob = currentImg.blob;

      updateCardStatus(taskId, 'generating');

      try {
        let prompt;
        if (task.type === 'white') {
          prompt = WHITE_BG_PROMPT;
        } else if (task.type === 'handheld') {
          const specsPart = aiMultiState.productSpecs
            ? ` Product specifications: ${aiMultiState.productSpecs}. Ensure the hand-to-product scale ratio accurately reflects the actual product size.`
            : '';
          prompt = `First-person POV shot, a hand naturally holding the product as if the viewer is holding it, close-up from the holder's perspective, professional product photography, clean background, studio lighting, e-commerce style, sharp focus on the product, immersive first-person view.${specsPart} --ar 1:1 --iw 2.0`;
        } else if (task.type === 'ai-scene' || task.type === 'realistic-scene') {
          // 发送产品图片给视觉模型，生成对应比例的提示词
          const result = await generatePrompt(currentImg.blob, aiMultiState.productSpecs, task.type);
          // 重新生成时使用对应比例的提示词
          prompt = task.ratio === '3:4' ? (result.prompt_3x4 || result.prompt_1x1) : result.prompt_1x1;
        } else {
          prompt = getDefaultPrompt(task.type, task.ratio);
        }

        const images = await generateImage(prompt, task.ratio, currentImg.blob);
        aiMultiState.results[taskId] = { images: images, currentIndex: 0, status: 'done' };
        updateCardStatus(taskId, 'done', images);
        showToast(`${task.label} 重新生成完成`);

        // 保存到历史
        if (typeof saveGeneratedImages === 'function' && images.length > 0) {
          saveGeneratedImages(images, task.label, task.type);
        }
      } catch (e) {
        aiMultiState.results[taskId] = { images: [], status: 'error', error: e.message };
        updateCardStatus(taskId, 'error', null, e.message);
        showToast(`${task.label} 重新生成失败: ${e.message}`, true);
      }
    }

    // ========== 单独生成某类型 ==========
    async function generateSingleType(type) {
      if (!aiMultiState.apiConfigured) { showToast('API 未配置，请在设置中配置即梦 API', true); return; }
      const selectedImgs = getSelectedImages();
      if (selectedImgs.length === 0) { showToast('请先上传并勾选产品图', true); return; }
      if (!aiMultiState.apiConfigured) { showToast('API 未配置', true); return; }

      aiMultiState.productSpecs = (document.getElementById('aiProductSpecs')?.value || aiMultiState.productSpecs || '').trim();

      // Get supplementary prompt for this type
      const promptMap = {
        'white': 'aiPromptWhite',
        'handheld': 'aiPromptHandheld',
        'ai-scene': 'aiPromptAIScene',
        'realistic-scene': 'aiPromptRealScene',
      };
      const extraPrompt = document.getElementById(promptMap[type])?.value?.trim() || '';

      // Find tasks for this type
      const baseTasks = AI_MULTI_TASKS.filter(t => t.type === type);
      if (baseTasks.length === 0) { showToast('未找到该类型的任务', true); return; }

      // 多张产品图时，每张图创建独立taskId
      const allTasks = [];
      for (let imgIdx = 0; imgIdx < selectedImgs.length; imgIdx++) {
        const suffix = selectedImgs.length > 1 ? `_img${imgIdx}` : '';
        for (const t of baseTasks) {
          allTasks.push({
            ...t,
            id: t.id + suffix,
            label: selectedImgs.length > 1 ? `${t.label} [图${imgIdx + 1}]` : t.label,
            _imgIdx: imgIdx,
            _originalId: t.id,
          });
        }
      }

      // 只创建本类型的卡片，不影响已存在的其他类型卡片
      const existingTasks = aiMultiState.tasks.length > 0 ? aiMultiState.tasks : AI_MULTI_TASKS;
      const missingTasks = allTasks.filter(t => !document.getElementById(`card-${t.id}`));
      if (missingTasks.length > 0) {
        // 只合并本类型的任务，不渲染全部
        aiMultiState.tasks = [...new Set([...existingTasks, ...allTasks])];
        // 仅对缺失的卡片逐个添加，不重绘全部
        const container = document.getElementById('aiMultiResults');
        for (const task of missingTasks) {
          const cardHtml = createSingleTaskCard(task);
          container.insertAdjacentHTML('beforeend', cardHtml);
        }
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
      }

      document.getElementById('aiMultiEmpty').style.display = 'none';
      aiMultiState.isGenerating = true;

      let completedCount = 0;
      const totalCount = allTasks.length;

      try {
        // 依次处理每个选中的产品图
        for (let imgIdx = 0; imgIdx < selectedImgs.length; imgIdx++) {
          const currentImg = selectedImgs[imgIdx];
          const imgTasks = allTasks.filter(t => t._imgIdx === imgIdx);
          aiMultiState.uploadedImageSrc = currentImg.src;
          aiMultiState.uploadedImageBlob = currentImg.blob;
          aiMultiState.productAnalysis = null;

          // Build base prompt (场景类支持按比例返回不同提示词)
          let prompt1x1 = '';
          let prompt3x4 = '';
          if (type === 'white') {
            prompt1x1 = prompt3x4 = WHITE_BG_PROMPT;
          } else if (type === 'handheld') {
            const specsPart = aiMultiState.productSpecs
              ? ` Product specifications: ${aiMultiState.productSpecs}. Ensure the hand-to-product scale ratio accurately reflects the actual product size.`
              : '';
            prompt1x1 = prompt3x4 = `First-person POV shot, a hand naturally holding the product as if the viewer is holding it, close-up from the holder's perspective, professional product photography, clean background, studio lighting, e-commerce style, sharp focus on the product, immersive first-person view.${specsPart} --ar 1:1 --iw 2.0`;
          } else if (sceneModes[type] === 'manual') {
            // 手动模式：直接使用用户输入的提示词
            const manualEl = type === 'ai-scene' ? 'aiPromptAISceneManual' : 'aiPromptRealSceneManual';
            prompt1x1 = prompt3x4 = document.getElementById(manualEl)?.value?.trim() || '';
            if (!prompt1x1) { showToast('请输入场景提示词', true); continue; }
          } else {
            // 自动模式：智能体反推提示词（不同比例可返回不同提示词）
            showToast('正在分析产品图片...', false);
            try {
              const analysis = await analyzeProduct();
              aiMultiState.productAnalysis = analysis;
            } catch (e) {
              showToast('产品分析失败: ' + e.message, true);
              continue;
            }
            try {
              const result = await generatePrompt(currentImg.blob, aiMultiState.productSpecs, type);
              prompt1x1 = result.prompt_1x1 || '';
              prompt3x4 = result.prompt_3x4 || prompt1x1;
              if (extraPrompt) { prompt1x1 += ' ' + extraPrompt; prompt3x4 += ' ' + extraPrompt; }
            } catch (e) {
              prompt1x1 = getDefaultPrompt(type, '1:1');
              prompt3x4 = getDefaultPrompt(type, '3:4');
            }
          }
          // manual模式也加上extraPrompt
          if (sceneModes[type] === 'manual' && extraPrompt) {
            prompt1x1 += ' ' + extraPrompt;
            prompt3x4 += ' ' + extraPrompt;
          }

          // 1:1 和 3:4 并行发送（各自使用对应比例的提示词）
          await Promise.all(imgTasks.map(async (task) => {
            const taskPrompt = task.ratio === '3:4' ? prompt3x4 : prompt1x1;
            updateCardStatus(task.id, 'generating');
            try {
              const images = await generateImage(taskPrompt, task.ratio, currentImg.blob);
              aiMultiState.results[task.id] = { images: images, currentIndex: 0, status: 'done' };
              updateCardStatus(task.id, 'done', images);
            } catch (e) {
              console.error(`Generate ${task.id} failed:`, e.message);
              aiMultiState.results[task.id] = { images: [], status: 'error', error: e.message };
              updateCardStatus(task.id, 'error', null, e.message);
            }
          }));
        }

        showToast(`${baseTasks[0].label} 生成完成`);

        // 保存到历史
        if (typeof saveGeneratedImages === 'function') {
          const allImages = [];
          for (const task of allTasks) {
            const result = aiMultiState.results[task.id];
            if (result && result.images && result.images.length > 0) {
              allImages.push(...result.images);
              if (allImages.length >= 10) break;
            }
          }
          if (allImages.length > 0) {
            saveGeneratedImages(allImages, baseTasks[0].label, type);
          }
        }
      } finally {
        aiMultiState.isGenerating = false;
      }
    }

    // ========== 自定义提示词测试 ==========
    let customTestResultSrc = null;

    async function testCustomPrompt() {
      const prompt = document.getElementById('aiCustomPrompt').value.trim();
      if (!prompt) { showToast('请输入提示词', true); return; }
      if (!aiMultiState.apiConfigured) { showToast('API 未配置', true); return; }

      const ratio = document.getElementById('aiCustomRatio').value;

      // 如有已上传并选中的图片，则作为参考图（img2img），否则纯文生图
      const selectedImgs = getSelectedImages();
      if (selectedImgs.length > 0) {
        const currentImg = selectedImgs[0];
        aiMultiState.uploadedImageSrc = currentImg.src;
        aiMultiState.uploadedImageBlob = currentImg.blob;
      } else {
        aiMultiState.uploadedImageSrc = null;
        aiMultiState.uploadedImageBlob = null;
      }

      // 切换到右侧AI面板，创建加载占位
      const taskId = '_custom_' + Date.now();
      switchToAIPanel();
      showLoadingPlaceholder(taskId, prompt, ratio);

      try {
        const images = await generateImage(prompt, ratio);
        customTestResultSrc = images[0];
        customTestResultImages = images;

        // 用结果替换加载占位
        fillCustomResultCard(taskId, images, prompt, ratio);
        window._customResults = { taskId, images };

        // 自动保存到服务器
        saveGeneratedImages(images, prompt, 'custom');

        showToast(`自定义提示词生成成功，共${images.length}张图`);
      } catch (e) {
        // 显示错误状态
        fillCustomErrorCard(taskId, prompt, ratio, e.message);
        showToast('生成失败: ' + e.message, true);
      }
    }

    function switchToAIPanel() {
      const normalPanel = document.getElementById('mainContentNormal');
      const aiPanel = document.getElementById('mainContentAIEdit');
      if (normalPanel && aiPanel) {
        normalPanel.style.display = 'none';
        aiPanel.style.display = 'flex';
      }
      document.querySelectorAll('.sidebar-tab').forEach(tab => {
        const onclick = tab.getAttribute('onclick') || '';
        tab.classList.toggle('active', onclick.includes("'aiEdit'"));
      });
      document.querySelectorAll('.sidebar-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-aiEdit');
      });
      const emptyEl = document.getElementById('aiMultiEmpty');
      if (emptyEl) emptyEl.style.display = 'none';
      // 显示历史面板
      const hp = document.getElementById('historyPanel');
      if (hp) {
        hp.style.display = 'flex';
        if (typeof refreshHistory === 'function') refreshHistory();
      }
    }

    function showLoadingPlaceholder(taskId, prompt, ratio) {
      const container = document.getElementById('aiMultiResults');
      const aspectStyle = ratio === '3:4' ? '3/4' : '1';
      // 追加新卡片，不清除已有任务
      const cardHtml = `
        <div id="card-${taskId}" style="background:#fff;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);overflow:hidden;transition:all 0.2s;font-size:11px;">
          <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #f3f4f6;">
            <i data-lucide="sparkles" style="width:13px;height:13px;flex-shrink:0;"></i>
            <span style="font-size:11px;font-weight:600;color:#1f2937;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${prompt}">自定义: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}</span>
            <span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#fef3c7;color:#92400e;">生成中</span>
          </div>
          <div id="img-${taskId}" style="width:100%;aspect-ratio:${aspectStyle};background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:120px;">
            <div style="text-align:center;">
              <div style="display:inline-block;width:32px;height:32px;border:3px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
              <div style="margin-top:8px;font-size:11px;color:#9ca3af;">AI 正在生成图片...</div>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', cardHtml);
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [container] });
    }

    function fillCustomResultCard(taskId, images, prompt, ratio) {
      const card = document.getElementById(`card-${taskId}`);
      if (!card) return;
      const aspectStyle = ratio === '3:4' ? '3/4' : '1';

      let thumbsHtml = '';
      if (images.length > 1) {
        thumbsHtml = images.map((src, i) => `
          <img src="${src}" onclick="switchCustomResultThumb('${taskId}',${i})"
               style="width:28px;height:28px;object-fit:cover;border-radius:3px;cursor:pointer;border:2px solid ${i === 0 ? '#3b82f6' : '#e5e7eb'};"
               data-custom-thumb="${taskId}" data-index="${i}" />
        `).join('');
      }

      card.innerHTML = `
        <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #f3f4f6;">
          <i data-lucide="sparkles" style="width:13px;height:13px;flex-shrink:0;"></i>
          <span style="font-size:11px;font-weight:600;color:#1f2937;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${prompt}">自定义: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}</span>
          <span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#dcfce7;color:#166534;">${images.length}张</span>
        </div>
        <div style="position:relative;">
          <div id="img-${taskId}" style="width:100%;aspect-ratio:${aspectStyle};background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:60px;cursor:pointer;" onclick="window.open('${images[0]}', '_blank')">
            <img src="${images[0]}" style="width:100%;height:100%;object-fit:contain;" />
          </div>
        </div>
        ${images.length > 1 ? `
        <div id="thumbs-${taskId}" style="display:flex;padding:4px 4px 0;gap:3px;flex-wrap:wrap;">
          ${thumbsHtml}
        </div>` : ''}
        <div id="actions-${taskId}" style="padding:4px 6px;display:flex;gap:4px;">
          <button onclick="downloadCustomResultById('${taskId}')" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="下载"><i data-lucide="download" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
          <button onclick="applyCustomToTemplate()" style="flex:1;padding:3px;border:1px solid #3b82f6;border-radius:3px;background:#eff6ff;font-size:10px;cursor:pointer;color:#1e40af;" title="应用到模板"><i data-lucide="clipboard-list" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
          <button onclick="testCustomPrompt()" style="flex:1;padding:3px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="重新生成"><i data-lucide="refresh-cw" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [card] });
    }

    function fillCustomErrorCard(taskId, prompt, ratio, errorMsg) {
      const card = document.getElementById(`card-${taskId}`);
      if (!card) return;
      const aspectStyle = ratio === '3:4' ? '3/4' : '1';
      card.innerHTML = `
        <div style="padding:4px 8px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #f3f4f6;">
          <i data-lucide="sparkles" style="width:13px;height:13px;flex-shrink:0;"></i>
          <span style="font-size:11px;font-weight:600;color:#1f2937;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${prompt}">自定义: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}</span>
          <span style="font-size:9px;padding:1px 6px;border-radius:8px;background:#fee2e2;color:#991b1b;">失败</span>
        </div>
        <div id="img-${taskId}" style="width:100%;aspect-ratio:${aspectStyle};background:#fef2f2;display:flex;align-items:center;justify-content:center;min-height:80px;">
          <div style="text-align:center;color:#ef4444;font-size:11px;padding:12px;">${errorMsg || '生成失败'}</div>
        </div>
        <div style="padding:4px 6px;display:flex;gap:4px;">
          <button onclick="testCustomPrompt()" style="flex:1;padding:4px;border:1px solid #d1d5db;border-radius:3px;background:#fff;font-size:10px;cursor:pointer;color:#374151;" title="重试"><i data-lucide="refresh-cw" style="width:12px;height:12px;display:block;margin:0 auto;"></i></button>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [card] });
    }

    function switchCustomResultThumb(taskId, index) {
      const data = window._customResults;
      if (!data || data.taskId !== taskId || !data.images[index]) return;
      const imgEl = document.getElementById(`img-${taskId}`);
      if (imgEl) {
        imgEl.innerHTML = `<img src="${data.images[index]}" style="width:100%;height:100%;object-fit:contain;" />`;
        imgEl.onclick = function() { window.open(data.images[index], '_blank'); };
      }
      // 更新缩略图边框
      document.querySelectorAll(`[data-custom-thumb="${taskId}"]`).forEach(el => {
        const idx = parseInt(el.dataset.index);
        el.style.borderColor = idx === index ? '#3b82f6' : '#e5e7eb';
      });
    }

    function downloadCustomResultById(taskId, index) {
      const data = window._customResults;
      if (!data || data.taskId !== taskId) return;
      const a = document.createElement('a');
      a.href = data.images[0];
      a.download = 'custom-prompt-result.png';
      a.click();
    }

    function applyCustomToTemplate() {
      const data = window._customResults;
      if (!data || !data.images || !data.images[0]) return;
      const img = document.getElementById('mainImagePreview');
      if (img) {
        img.src = data.images[0];
        showToast('已应用到主图');
      }
    }

    // 页面加载时检查API状态
    checkAIEditApiStatus();

    // ========== 生成历史保存 ==========

    /**
     * 自动保存生成的图片到服务器
     */
    async function saveGeneratedImages(images, prompt, type) {
      try {
        const resp = await fetch('/api/jimeng/save-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images, prompt: prompt || '', type: type || '' }),
        });
        const data = await resp.json();
        if (data.success) {
          // 保存成功后刷新历史
          refreshHistory();
        }
        return data;
      } catch (e) {
        console.warn('Save images failed:', e.message);
        return null;
      }
    }

    // ========== 生成历史面板 ==========

    let historyPanelVisible = true;

    function toggleHistoryPanel() {
      const panel = document.getElementById('historyPanel');
      const icon = document.getElementById('historyToggleIcon');
      if (!panel) return;
      historyPanelVisible = !historyPanelVisible;
      panel.classList.toggle('collapsed', !historyPanelVisible);
      if (icon) {
        icon.setAttribute('data-lucide', historyPanelVisible ? 'chevron-right' : 'chevron-left');
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon.parentElement] });
      }
      if (historyPanelVisible) {
        refreshHistory();
      }
    }

    async function refreshHistory() {
      const listEl = document.getElementById('historyList');
      const loadingEl = document.getElementById('historyLoading');
      if (!listEl) return;
      loadingEl.style.display = 'block';
      listEl.innerHTML = '';

      try {
        const resp = await fetch('/api/jimeng/history');
        const data = await resp.json();
        loadingEl.style.display = 'none';

        if (!data.success || !data.groups || data.groups.length === 0) {
          listEl.innerHTML = '<div class="history-loading" style="display:block;">暂无生成历史</div>';
          return;
        }

        let html = '';
        for (const group of data.groups) {
          html += `<div class="history-date-group">`;
          html += `<div class="history-date-label">${group.date} (${group.count}张)</div>`;

          for (const img of group.images) {
            html += `
              <div class="history-item">
                <img src="${img.url}" onclick="viewHistoryImage('${img.url}')" loading="lazy" />
                <div class="history-item-actions">
                  <button onclick="event.stopPropagation();downloadHistoryImage('${img.url}', '${img.filename}')">下载</button>
                  <button onclick="event.stopPropagation();viewHistoryImage('${img.url}')">查看</button>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }
        listEl.innerHTML = html;
      } catch (e) {
        loadingEl.style.display = 'none';
        listEl.innerHTML = '<div class="history-loading" style="display:block;">加载失败</div>';
      }
    }

    function viewHistoryImage(url) {
      const modal = document.getElementById('lightboxModal');
      const img = document.getElementById('lightboxImg');
      if (modal && img) {
        img.src = url;
        modal.style.display = 'flex';
      }
    }

    function downloadHistoryImage(url, filename) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'generated.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // ========== AI编辑功能结束 ==========
