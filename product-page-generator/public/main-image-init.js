/**
 * main-image-init.js
 * 初始化、事件绑定、拖拽交互、AI文案、UI同步
 * 依赖：state (main-image-core.js), render, presets, 所有业务模块
 */

    
    function init() {
      bindEvents();
      initSlotTypes();
      updateCircleOptions();
      initDragAndDrop();
      updateExportSize();
      renderBatchTypeSettings(); // 初始化批量生成信息
      syncTabEyeButtons(); // 同步Tab眼睛按钮初始状态

      // 初始化折叠面板
      document.querySelectorAll('.collapsible-body').forEach(body => {
        body.style.maxHeight = 'none';
      });

      // 加载LOGO素材库
      loadLogoLibrary();

      // 预加载文档列表（填充顶部工具栏下拉）
      loadProductSpecs();

      // 加载可用字体列表
      loadAvailableFonts();

      // 初始化 ComfyUI 连接
      if (typeof comfyInit === 'function') comfyInit();

      // 等待字体加载完成后再渲染
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          console.log('字体加载完成');
          render();
        });
      } else {
        // 如果浏览器不支持document.fonts，直接渲染
        render();
      }
    }

    // 加载可用字体列表
    let availableFontFamilies = []; // 缓存字体数据

    async function loadAvailableFonts() {
      try {
        const res = await fetch('/api/main-image/fonts');
        const data = await res.json();

        if (data.success && data.fonts) {
          availableFontFamilies = data.fonts;

          // 动态加载字体CSS
          loadFontsCSS(data.fonts);

          // 填充字体下拉框
          populateFontSelects(data.fonts);
        }
      } catch (err) {
        console.error('加载字体列表失败:', err);
      }
    }

    // 动态加载字体CSS
    function loadFontsCSS(fontFamilies) {
      const styleEl = document.createElement('style');
      let css = '';

      for (const family of fontFamilies) {
        const fontName = family.name;

        for (const fileInfo of family.files) {
          const ext = fileInfo.ext || path_ext(fileInfo.file);
          const format = ext === '.woff2' ? 'woff2' :
                         ext === '.woff' ? 'woff' :
                         ext === '.ttf' ? 'truetype' :
                         ext === '.otf' ? 'opentype' : 'truetype';

          css += `@font-face{font-family:'${fontName}';src:url('../fonts/${fileInfo.file}') format('${format}');font-weight:${fileInfo.weight};font-style:${fileInfo.style};font-display:swap;}`;
        }
      }

      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    function path_ext(filepath) {
      const dot = filepath.lastIndexOf('.');
      return dot >= 0 ? filepath.substring(dot) : '';
    }

    // 填充字体下拉框
    function populateFontSelects(fontFamilies) {
      const mainSelect = document.getElementById('mainTitleFont');
      const subSelect = document.getElementById('subTitleFont');
      const numberSelect = document.getElementById('numberTextFont');

      if (!mainSelect || !subSelect) return;

      const defaultOption = '<option value="sans-serif">默认字体</option>';
      const fontOptions = fontFamilies.map(f => `<option value="${f.name}">${f.name}</option>`).join('');

      mainSelect.innerHTML = defaultOption + fontOptions;
      subSelect.innerHTML = defaultOption + fontOptions;
      if (numberSelect) numberSelect.innerHTML = defaultOption + fontOptions;

      // 恢复当前选中的值
      if (state.mainTitleFont && state.mainTitleFont !== 'sans-serif') {
        mainSelect.value = state.mainTitleFont;
      }
      if (state.subTitleFont && state.subTitleFont !== 'sans-serif') {
        subSelect.value = state.subTitleFont;
      }
      if (numberSelect && state.numberTextFont && state.numberTextFont !== 'sans-serif') {
        numberSelect.value = state.numberTextFont;
      }

      // 初始化字重下拉框
      updateWeightSelect('mainTitleFont', 'mainTitleWeight');
      updateWeightSelect('subTitleFont', 'subTitleWeight');
    }

    // 根据选中的字体更新字重下拉框
    function updateWeightSelect(fontSelectId, weightSelectId) {
      const fontSelect = document.getElementById(fontSelectId);
      const weightSelect = document.getElementById(weightSelectId);
      if (!fontSelect || !weightSelect) return;

      const selectedFont = fontSelect.value;
      const currentWeight = weightSelect.value;

      if (selectedFont === 'sans-serif') {
        // 默认字体，显示全部字重
        weightSelect.innerHTML = `
          <option value="normal">Regular 正常</option>
          <option value="bold">Bold 粗体</option>
          <option value="100">Thin 100</option>
          <option value="200">ExtraLight 200</option>
          <option value="300">Light 300</option>
          <option value="400">Regular 400</option>
          <option value="500">Medium 500</option>
          <option value="600">SemiBold 600</option>
          <option value="700">Bold 700</option>
          <option value="800">ExtraBold 800</option>
          <option value="900">Black 900</option>`;
        weightSelect.value = currentWeight || (weightSelectId === 'mainTitleWeight' ? 'bold' : 'normal');
        return;
      }

      // 查找该字体的可用字重
      const family = availableFontFamilies.find(f => f.name === selectedFont);
      if (!family || !family.weightOptions) {
        weightSelect.innerHTML = '<option value="400">Regular 400</option>';
        return;
      }

      weightSelect.innerHTML = family.weightOptions.map(w =>
        `<option value="${w.value}">${w.label}</option>`
      ).join('');

      // 尝试保持当前字重，否则选第一个
      const hasCurrent = family.weightOptions.some(w => w.value === currentWeight);
      weightSelect.value = hasCurrent ? currentWeight : family.weightOptions[0].value;
    }
    
    // 同步Tab眼睛按钮状态
    function syncTabEyeButtons() {
      const eyeText = document.getElementById('tabEyeText');
      if (eyeText) {
        if (state.textLayerVisible) { eyeText.innerHTML = '<i data-lucide="eye" class="icon-xs"></i>'; eyeText.classList.remove('hidden-layer'); }
        else { eyeText.innerHTML = '<i data-lucide="eye-off" class="icon-xs"></i>'; eyeText.classList.add('hidden-layer'); }
        lucide.createIcons({ nodes: [eyeText] });
      }
      const eyeLogo = document.getElementById('tabEyeLogo');
      if (eyeLogo) {
        if (state.logoLayerVisible) { eyeLogo.innerHTML = '<i data-lucide="eye" class="icon-xs"></i>'; eyeLogo.classList.remove('hidden-layer'); }
        else { eyeLogo.innerHTML = '<i data-lucide="eye-off" class="icon-xs"></i>'; eyeLogo.classList.add('hidden-layer'); }
        lucide.createIcons({ nodes: [eyeLogo] });
      }
      const eyeDim = document.getElementById('tabEyeDim');
      if (eyeDim) {
        if (state.dimLayerVisible) { eyeDim.innerHTML = '<i data-lucide="eye" class="icon-xs"></i>'; eyeDim.classList.remove('hidden-layer'); }
        else { eyeDim.innerHTML = '<i data-lucide="eye-off" class="icon-xs"></i>'; eyeDim.classList.add('hidden-layer'); }
        lucide.createIcons({ nodes: [eyeDim] });
      }
      const editDim = document.getElementById('tabEditDim');
      if (editDim) {
        if (state.dimEditing) { editDim.classList.add('active'); }
        else { editDim.classList.remove('active'); }
      }
    }
    
    function initDragAndDrop() {
      const dragOverlay = document.getElementById('dragOverlay');
      const HANDLE_HIT_SIZE = 12; // 控制点点击热区大小
      
      // 坐标转换：屏幕坐标 -> Canvas 1024坐标
      function toCanvasCoords(e) {
        const rect = dragOverlay.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) / rect.width * 1024,
          y: (e.clientY - rect.top) / rect.height * 1024
        };
      }
      
      // 反向变换坐标（用于点击检测）
      function inverseTransformPoint(x, y) {
        return { x, y };
      }
      
      // 检测是否点击了控制点
      function hitTestHandle(cx, cy) {
        if (!state.textLayerVisible) return null;
        const bb = getTextBoundingBox();
        if (!bb) return null;
        const handles = getTextResizeHandles(bb, 8);
        for (const h of handles) {
          if (Math.abs(cx - h.x) <= HANDLE_HIT_SIZE && Math.abs(cy - h.y) <= HANDLE_HIT_SIZE) {
            return h;
          }
        }
        return null;
      }
      
      // 检测是否点击了文字区域
      function hitTestText(cx, cy) {
        if (!state.textLayerVisible) return false;
        const bb = getTextBoundingBox();
        if (!bb) return false;
        return cx >= bb.x && cx <= bb.x + bb.w && cy >= bb.y && cy <= bb.y + bb.h;
      }

      // 检测是否点击了数量文字区域
      function hitTestNumberText(cx, cy) {
        if (!state.numberTextVisible || !state.numberText) return false;
        const bb = getNumberTextBBox();
        if (!bb) return false;
        return cx >= bb.x && cx <= bb.x + bb.w && cy >= bb.y && cy <= bb.y + bb.h;
      }

      // 数量文字拖拽状态
      let numberTextDrag = { isDragging: false, startX: 0, startY: 0, startNX: 0, startNY: 0 };
      
      // 更新光标样式
      function updateCursor(e) {
        const { x, y } = toCanvasCoords(e);
        const handle = hitTestHandle(x, y);
        if (handle) {
          dragOverlay.style.cursor = handle.cursor;
        } else if (hitTestNumberText(x, y)) {
          dragOverlay.style.cursor = 'move';
        } else if (hitTestText(x, y)) {
          dragOverlay.style.cursor = 'move';
        } else {
          dragOverlay.style.cursor = 'pointer';
        }
      }
      
      dragOverlay.addEventListener('mousedown', (e) => {
        const { x, y } = toCanvasCoords(e);
        
        // 优先检测控制点（缩放）
        const handle = hitTestHandle(x, y);
        if (handle) {
          state.textDragState.isResizing = true;
          state.textDragState.resizeHandle = handle.pos;
          state.textDragState.startX = x;
          state.textDragState.startY = y;
          state.textDragState.startTitleSize = state.titleSize;
          state.textDragState.startBBox = getTextBoundingBox();
          e.preventDefault();
          return;
        }
        
        // 检测文字区域（拖拽移动）
        if (hitTestText(x, y)) {
          state.textDragState.isDragging = true;
          state.textDragState.startX = x;
          state.textDragState.startY = y;
          state.textDragState.startCustomTextPos = state.customTextPos
            ? { ...state.customTextPos }
            : null;
          // 如果没有customTextPos，基于当前预设位置创建一个，保留对齐方式
          if (!state.customTextPos) {
            const preset = presets[state.preset];
            state.customTextPos = { x: preset.textX, y: preset.textY, textAlign: preset.textAlign, textVAlign: preset.textVAlign };
            state.textDragState.startCustomTextPos = { ...state.customTextPos };
            document.getElementById('clearCustomPosBtn') && (document.getElementById('clearCustomPosBtn').style.display = '');
            document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
          }
          dragOverlay.style.cursor = 'move';
          e.preventDefault();
          return;
        }

        // 检测数量文字区域（拖拽移动）
        if (hitTestNumberText(x, y)) {
          numberTextDrag.isDragging = true;
          numberTextDrag.startX = x;
          numberTextDrag.startY = y;
          numberTextDrag.startNX = state.numberTextX;
          numberTextDrag.startNY = state.numberTextY;
          dragOverlay.style.cursor = 'move';
          e.preventDefault();
          return;
        }
        
        // 图片交互：点击选中 + Shift多选 + Ctrl多选 + 拖拽移动offset + 拖拽到其他位置交换
        const tp = inverseTransformPoint(x, y);
        const index = getImageIndexAtPosition(tp.x, tp.y);
        if (index !== -1 && state.images[index]) {
          // Ctrl/Cmd+点击：切换多选
          if (e.ctrlKey || e.metaKey) {
            const idx = state.multiSelectedIndices.indexOf(index);
            if (idx > -1) {
              state.multiSelectedIndices.splice(idx, 1);
              if (state.multiSelectedIndices.length === 0) {
                state.multiSelectedIndices = [index];
              }
            } else {
              state.multiSelectedIndices.push(index);
            }
            setActiveImage(state.multiSelectedIndices[state.multiSelectedIndices.length - 1]);
            updateImageAdjustPanelForMulti();
            renderImageList();
            render();
            return;
          }
          
          // Shift+点击：范围选择
          if (e.shiftKey && state.activeImageIndex >= 0 && state.activeImageIndex !== index) {
            const start = Math.min(state.activeImageIndex, index);
            const end = Math.max(state.activeImageIndex, index);
            for (let i = start; i <= end; i++) {
              if (!state.multiSelectedIndices.includes(i)) {
                state.multiSelectedIndices.push(i);
              }
            }
            setActiveImage(index);
            updateImageAdjustPanelForMulti();
            renderImageList();
            render();
            return;
          }
          
          // 检查点击的图片是否已在多选列表中
          const isInMultiSelect = state.multiSelectedIndices.includes(index) && state.multiSelectedIndices.length > 1;
          
          if (!isInMultiSelect) {
            // 点击的图片不在多选列表中，清除多选，设为单一活跃
            state.multiSelectedIndices = [index];
            setActiveImage(index);
          }
          // 如果已在多选列表中，保持多选状态，不清除
          
          state.dragState.isDragging = true;
          state.dragState.dragIndex = index;
          state.dragState.startX = x;
          state.dragState.startY = y;
          state.dragState.hasMoved = false;
          
          // 记录所有选中图片的原始offset，用于整体拖拽移动
          state.imageDragState.isDragging = true;
          state.imageDragState.index = index;
          state.imageDragState.startX = x;
          state.imageDragState.startY = y;
          // 记录主图片的原始offset
          state.imageDragState.startOffsetX = state.images[index].offsetX || 0;
          state.imageDragState.startOffsetY = state.images[index].offsetY || 0;
          // 记录所有选中图片的原始offset（用于整体移动）
          state.imageDragState.multiStartOffsets = {};
          state.multiSelectedIndices.forEach(idx => {
            if (idx < state.images.length) {
              state.imageDragState.multiStartOffsets[idx] = {
                offsetX: state.images[idx].offsetX || 0,
                offsetY: state.images[idx].offsetY || 0
              };
            }
          });
          
          dragOverlay.style.cursor = 'grabbing';
        }
      });
      
      dragOverlay.addEventListener('mousemove', (e) => {
        // 更新光标
        if (!state.dragState.isDragging && !state.textDragState.isDragging && !state.textDragState.isResizing) {
          updateCursor(e);
        }
        
        const { x, y } = toCanvasCoords(e);
        
        // 文字缩放
        if (state.textDragState.isResizing) {
          const startBBox = state.textDragState.startBBox;
          const startSize = state.textDragState.startTitleSize;
          const handlePos = state.textDragState.resizeHandle;
          
          // 计算拖拽距离对应的缩放比例
          let scaleFactor = 1;
          if (handlePos === 'mr' || handlePos === 'ml') {
            // 水平缩放
            const dx = x - state.textDragState.startX;
            scaleFactor = (startBBox.w + dx) / startBBox.w;
          } else if (handlePos === 'tc' || handlePos === 'bc') {
            // 垂直缩放
            const dy = y - state.textDragState.startY;
            scaleFactor = (startBBox.h + dy) / startBBox.h;
          } else {
            // 角落缩放 - 取对角线方向
            const dx = x - state.textDragState.startX;
            const dy = y - state.textDragState.startY;
            // 使用对角线距离比
            const startDist = Math.sqrt(startBBox.w * startBBox.w + startBBox.h * startBBox.h);
            const currentDist = Math.sqrt(
              Math.pow(startBBox.w + dx, 2) + Math.pow(startBBox.h + dy, 2)
            );
            scaleFactor = currentDist / startDist;
          }
          
          const newSize = Math.round(Math.max(16, Math.min(120, startSize * scaleFactor)));
          if (newSize !== state.titleSize) {
            state.titleSize = newSize;
            const titleSizeEl = document.getElementById('titleSize');
            if (titleSizeEl) {
              titleSizeEl.value = newSize;
              document.getElementById('titleSizeVal').textContent = newSize + 'px';
            }
            render();
          }
          return;
        }
        
        // 文字拖拽移动
        if (state.textDragState.isDragging) {
          const dx = x - state.textDragState.startX;
          const dy = y - state.textDragState.startY;
          const startPos = state.textDragState.startCustomTextPos;
          state.customTextPos = {
            x: Math.round(Math.max(0, Math.min(1024, startPos.x + dx))),
            y: Math.round(Math.max(0, Math.min(1024, startPos.y + dy))),
            textAlign: startPos.textAlign,
            textVAlign: startPos.textVAlign
          };
          render();
          return;
        }

        // 数量文字拖拽移动
        if (numberTextDrag.isDragging) {
          const dx = x - numberTextDrag.startX;
          const dy = y - numberTextDrag.startY;
          state.numberTextX = Math.round(Math.max(50, Math.min(1000, numberTextDrag.startNX + dx)));
          state.numberTextY = Math.round(Math.max(10, Math.min(1000, numberTextDrag.startNY + dy)));
          render();
          return;
        }
        
        // 图片拖拽
        if (state.dragState.isDragging) {
          const dx = x - state.dragState.startX;
          const dy = y - state.dragState.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            state.dragState.hasMoved = true;
          }
          
          // 检查是否拖到了另一个图片位置上（用于交换）
          const tp2 = inverseTransformPoint(x, y);
          const dropIndex = getImageIndexAtPosition(tp2.x, tp2.y);
          
          if (dropIndex !== -1 && dropIndex !== state.dragState.dragIndex && state.multiSelectedIndices.length === 1) {
            // 拖到其他图片位置上，显示交换指示器（仅单选时支持交换）
            state.dragState.dropIndex = dropIndex;
            state.imageDragState.isDragging = false; // 不再移动offset
            render();
          } else {
            // 在同一图片区域内拖拽，移动图片offset
            state.dragState.dropIndex = -1;
            const imgIdx = state.imageDragState.index;
            if (imgIdx >= 0 && imgIdx < state.images.length) {
              const dx = x - state.imageDragState.startX;
              const dy = y - state.imageDragState.startY;
              
              // 使用记录的multiStartOffsets实现整体移动
              if (state.multiSelectedIndices.length > 1 && state.imageDragState.multiStartOffsets) {
                // 多选：所有选中图片基于各自的起始位置整体移动
                state.multiSelectedIndices.forEach(idx => {
                  if (idx < state.images.length && state.imageDragState.multiStartOffsets[idx]) {
                    const startOffset = state.imageDragState.multiStartOffsets[idx];
                    state.images[idx].offsetX = Math.round(startOffset.offsetX - dx);
                    state.images[idx].offsetY = Math.round(startOffset.offsetY - dy);
                  }
                });
              } else {
                // 单选：只移动当前图片
                state.images[imgIdx].offsetX = Math.round(state.imageDragState.startOffsetX - dx);
                state.images[imgIdx].offsetY = Math.round(state.imageDragState.startOffsetY - dy);
              }
              
              // 同步更新调整面板（显示主图片的值）
              if (state.activeImageIndex === imgIdx) {
                document.getElementById('imgOffsetX').value = state.images[imgIdx].offsetX;
                document.getElementById('imgOffsetXDisplay').value = state.images[imgIdx].offsetX;
                document.getElementById('imgOffsetY').value = state.images[imgIdx].offsetY;
                document.getElementById('imgOffsetYDisplay').value = state.images[imgIdx].offsetY;
              }
              render();
            }
          }
        }
      });
      
      function handleDragEnd(e) {
        // 文字缩放结束
        if (state.textDragState.isResizing) {
          state.textDragState.isResizing = false;
          state.textDragState.resizeHandle = null;
          state.textDragState.startBBox = null;
          return;
        }
        
        // 文字拖拽结束
        if (state.textDragState.isDragging) {
          state.textDragState.isDragging = false;
          state.textDragState.startCustomTextPos = null;
          return;
        }

        // 数量文字拖拽结束
        if (numberTextDrag.isDragging) {
          numberTextDrag.isDragging = false;
          return;
        }
        
        // 图片拖拽结束
        if (state.dragState.isDragging) {
          const dragIndex = state.dragState.dragIndex;
          
          if (e && e.type === 'mouseup') {
            if (!state.dragState.hasMoved) {
              // 短点击：弹出类型选择菜单
              showSlotTypeMenu(dragIndex, e);
            } else if (state.dragState.dropIndex !== -1 && state.dragState.dropIndex !== dragIndex) {
              // 拖到其他图片位置：交换图片
              swapImages(dragIndex, state.dragState.dropIndex);
            }
            // 拖拽移动offset的情况不需要额外处理，已经在mousemove中实时更新了
          }
          state.dragState.isDragging = false;
          state.dragState.dragIndex = -1;
          state.dragState.dropIndex = -1;
          state.dragState.hasMoved = false;
          state.imageDragState.isDragging = false;
          dragOverlay.style.cursor = 'pointer';
          renderImageList();
          render();
        }
      }
      
      dragOverlay.addEventListener('mouseup', handleDragEnd);
      dragOverlay.addEventListener('mouseleave', handleDragEnd);
      
      // 滚轮缩放图片
      dragOverlay.addEventListener('wheel', (e) => {
        const { x, y } = toCanvasCoords(e);
        const index = getImageIndexAtPosition(x, y);
        if (index === -1 || !state.images[index]) return;
        
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.05 : 0.05; // 向下滚缩小，向上滚放大
        
        // 如果该图片在多选列表中，缩放所有选中图片（保持多选状态）
        if (state.multiSelectedIndices.includes(index) && state.multiSelectedIndices.length > 1) {
          state.multiSelectedIndices.forEach(idx => {
            if (idx < state.images.length) {
              state.images[idx].scale = Math.max(0.1, Math.min(3, state.images[idx].scale + delta));
            }
          });
          // 同步更新调整面板
          document.getElementById('imgScaleValue').value = Math.round(state.images[index].scale * 100);
          document.getElementById('imgScaleDisplay').value = Math.round(state.images[index].scale * 100);
        } else {
          // 单选：只缩放当前图片，不改变多选状态（除非当前没有选中这个图片）
          if (!state.multiSelectedIndices.includes(index)) {
            state.multiSelectedIndices = [index];
            setActiveImage(index);
          }
          state.images[index].scale = Math.max(0.1, Math.min(3, state.images[index].scale + delta));
          document.getElementById('imgScaleValue').value = Math.round(state.images[index].scale * 100);
          document.getElementById('imgScaleDisplay').value = Math.round(state.images[index].scale * 100);
        }
        
        renderImageList();
        render();
      }, { passive: false });
    }
    
    function bindEvents() {
      document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          state.templateCount = parseInt(item.dataset.count);
          
          // 更新slotTypes
          initSlotTypes();
          
          // 不再截断图片数组，模板数量只决定布局
          document.getElementById('imageCount').textContent = state.images.length;
          
          const twoImageSection = document.getElementById('twoImageStyleSection');
          const mask4Section = document.getElementById('mask4StyleSection');
          const fiveImageSection = document.getElementById('fiveImageStyleSection');
          const sixImageSection = document.getElementById('sixImageStyleSection');
          
          // 隐藏所有子样式面板内容
          ['circleOptions','detailOptions','cardOptions','irregularMaskOptions','useDisplayOptions','mainDetailOptions'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          });
          
          twoImageSection.style.display = state.templateCount === 2 ? 'flex' : 'none';
          mask4Section.style.display = state.templateCount === 4 ? 'flex' : 'none';
          fiveImageSection.style.display = state.templateCount === 5 ? 'flex' : 'none';
          sixImageSection.style.display = state.templateCount === 6 ? 'flex' : 'none';
          
          updateCircleOptions();
          
          // 更新批量模式设置
          if (state.batchMode) {
            renderBatchTypeSettings();
          }
          
          render();
        });
      });
      
      document.querySelectorAll('[data-style="twoImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-style="twoImageStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.twoImageStyle = btn.dataset.value;
          updateCircleOptions();
          render();
        });
      });
      
      document.querySelectorAll('[data-style="circlePosition"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-style="circlePosition"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.circlePosition = btn.dataset.value;
          render();
        });
      });
      
      document.getElementById('circleSize')?.addEventListener('input', (e) => {
        state.circleSize = parseInt(e.target.value);
        document.getElementById('circleSizeVal').textContent = e.target.value + 'px';
        render();
      });
      
      document.getElementById('circleBorderColor')?.addEventListener('input', (e) => {
        state.circleBorderColor = e.target.value;
        document.getElementById('circleBorderColorText').value = e.target.value;
        render();
      });
      document.getElementById('circleBorderColorText')?.addEventListener('input', (e) => {
        state.circleBorderColor = e.target.value;
        document.getElementById('circleBorderColor').value = e.target.value;
        render();
      });
      
      document.getElementById('circleBorderWidth')?.addEventListener('input', (e) => {
        state.circleBorderWidth = parseInt(e.target.value);
        document.getElementById('circleBorderWidthVal').textContent = e.target.value + 'px';
        render();
      });
      
      document.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          state.preset = item.dataset.preset;
          state.customTextPos = null;
          document.getElementById('clearCustomPosBtn') && (document.getElementById('clearCustomPosBtn').style.display = 'none');
          render();
        });
      });
      
      document.querySelectorAll('.style-btn:not([data-value])').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          state[btn.dataset.style] = btn.classList.contains('active');
          // 更新文字背景/毛玻璃控件的可见状态指示
          if (btn.dataset.style === 'textBg') {
            updateBgControlOpacity();
          }
          // 加粗按钮同步控制字重
          if (btn.dataset.style === 'bold') {
            state.mainTitleWeight = btn.classList.contains('active') ? 'bold' : 'normal';
            const mw = document.getElementById('mainTitleWeight');
            if (mw) mw.value = state.mainTitleWeight;
          }
          render();
        });
      });
      
      // 文字背景控件始终可见，用透明度表示启用状态
      function updateBgControlOpacity() {
        const textBgRow = document.getElementById('textBgColorRow');
        if (textBgRow) textBgRow.style.opacity = state.textBg ? '1' : '0.35';
      }
      updateBgControlOpacity();
      
      document.querySelectorAll('.text-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('mainTitle').value = btn.dataset.title;
          document.getElementById('subTitle').value = btn.dataset.subtitle;
          state.mainTitle = btn.dataset.title;
          state.subTitle = btn.dataset.subtitle;
          render();
        });
      });
      
      document.getElementById('mainTitle').addEventListener('input', (e) => { state.mainTitle = e.target.value; render(); });
      document.getElementById('subTitle').addEventListener('input', (e) => { state.subTitle = e.target.value; render(); });
      
      document.getElementById('titleColor').addEventListener('input', (e) => { state.titleColor = e.target.value; document.getElementById('titleColorText').value = e.target.value; render(); });
      document.getElementById('titleColorText').addEventListener('input', (e) => { state.titleColor = e.target.value; document.getElementById('titleColor').value = e.target.value; render(); });
      document.getElementById('subtitleColor').addEventListener('input', (e) => { state.subtitleColor = e.target.value; document.getElementById('subtitleColorText').value = e.target.value; render(); });
      document.getElementById('subtitleColorText').addEventListener('input', (e) => { state.subtitleColor = e.target.value; document.getElementById('subtitleColor').value = e.target.value; render(); });
      document.getElementById('bgColor').addEventListener('input', (e) => { state.bgColor = e.target.value; document.getElementById('bgColorText').value = e.target.value; document.getElementById('bgColorBlock').style.background = e.target.value; render(); });
      document.getElementById('bgColorText').addEventListener('input', (e) => { state.bgColor = e.target.value; document.getElementById('bgColor').value = e.target.value; document.getElementById('bgColorBlock').style.background = e.target.value; render(); });
      
      // 文字背景颜色
      document.getElementById('textBgColorPicker').addEventListener('input', (e) => {
        const hex = e.target.value;
        const opacity = parseInt(document.getElementById('textBgOpacity').value) / 100;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        state.textBgColor = `rgba(${r},${g},${b},${opacity})`;
        render();
      });
      document.getElementById('textBgOpacity').addEventListener('input', (e) => {
        document.getElementById('textBgOpacityVal').textContent = e.target.value + '%';
        const hex = document.getElementById('textBgColorPicker').value;
        const opacity = parseInt(e.target.value) / 100;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        state.textBgColor = `rgba(${r},${g},${b},${opacity})`;
        render();
      });
      
      // 文字背景圆角
      document.getElementById('textBgRadius').addEventListener('input', (e) => {
        document.getElementById('textBgRadiusVal').textContent = e.target.value + 'px';
        state.textBgRadius = parseInt(e.target.value);
        render();
      });
      
      // 配色方案
      initColorSchemes();
      
      document.getElementById('titleSize').addEventListener('input', (e) => { state.titleSize = parseInt(e.target.value); document.getElementById('titleSizeVal').textContent = e.target.value + 'px'; render(); });
      
      document.getElementById('mainTitleFont').addEventListener('change', (e) => {
        state.mainTitleFont = e.target.value;
        updateWeightSelect('mainTitleFont', 'mainTitleWeight');
        state.mainTitleWeight = document.getElementById('mainTitleWeight').value;
        // 等待字体加载后再渲染
        if (document.fonts) {
          document.fonts.ready.then(() => render());
        } else {
          setTimeout(() => render(), 100);
        }
      });
      document.getElementById('subTitleFont').addEventListener('change', (e) => {
        state.subTitleFont = e.target.value;
        updateWeightSelect('subTitleFont', 'subTitleWeight');
        state.subTitleWeight = document.getElementById('subTitleWeight').value;
        if (document.fonts) {
          document.fonts.ready.then(() => render());
        } else {
          setTimeout(() => render(), 100);
        }
      });
      document.getElementById('mainTitleWeight').addEventListener('change', (e) => { 
        state.mainTitleWeight = e.target.value; 
        render(); 
      });
      document.getElementById('subTitleWeight').addEventListener('change', (e) => { 
        state.subTitleWeight = e.target.value; 
        render(); 
      });
      document.getElementById('mainTitleItalic').addEventListener('change', (e) => { 
        state.mainTitleItalic = e.target.checked; 
        render(); 
      });
      document.getElementById('subTitleItalic').addEventListener('change', (e) => { 
        state.subTitleItalic = e.target.checked; 
        render(); 
      });

      // 数量文字事件绑定
      document.getElementById('numberText').addEventListener('input', (e) => {
        state.numberText = e.target.value;
        if (state.numberText && !state.numberTextVisible) {
          state.numberTextVisible = true;
          document.getElementById('numberTextVisible').checked = true;
        }
        render();
      });
      document.getElementById('numberTextVisible').addEventListener('change', (e) => {
        state.numberTextVisible = e.target.checked;
        render();
      });
      document.getElementById('numberTextSize').addEventListener('input', (e) => {
        state.numberTextSize = parseInt(e.target.value);
        document.getElementById('numberTextSizeVal').textContent = e.target.value + 'px';
        render();
      });
      document.getElementById('numberTextColor').addEventListener('input', (e) => {
        state.numberTextColor = e.target.value;
        document.getElementById('numberTextColorText').value = e.target.value;
        render();
      });
      document.getElementById('numberTextColorText').addEventListener('change', (e) => {
        state.numberTextColor = e.target.value;
        document.getElementById('numberTextColor').value = e.target.value;
        render();
      });
      document.getElementById('numberTextFont').addEventListener('change', (e) => {
        state.numberTextFont = e.target.value;
        if (document.fonts) {
          document.fonts.ready.then(() => render());
        } else {
          setTimeout(() => render(), 100);
        }
      });
      document.getElementById('numberTextWeight').addEventListener('change', (e) => {
        state.numberTextWeight = e.target.value;
        render();
      });
      
      document.getElementById('imageGap').addEventListener('input', (e) => { state.imageGap = parseInt(e.target.value); document.getElementById('imageGapVal').textContent = e.target.value + 'px'; render(); });
      document.getElementById('imageRadius').addEventListener('input', (e) => { state.imageRadius = parseInt(e.target.value); document.getElementById('imageRadiusVal').textContent = e.target.value + 'px'; render(); });
      
      const logoUploadZone = document.getElementById('logoUploadZone');
      const logoInput = document.getElementById('logoInput');
      logoUploadZone.addEventListener('click', () => logoInput.click());
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleLogoUpload(file);
      });
      
      document.getElementById('logoColor')?.addEventListener('input', (e) => { 
        state.logoColor = e.target.value; 
        document.getElementById('logoColorText').value = e.target.value; 
        const block = document.getElementById('logoColorBlock');
        if (block) block.style.background = e.target.value;
        updateLogoPreview();
        render(); 
      });
      document.getElementById('logoColorText')?.addEventListener('input', (e) => { 
        state.logoColor = e.target.value; 
        document.getElementById('logoColor').value = e.target.value; 
        const block = document.getElementById('logoColorBlock');
        if (block) block.style.background = e.target.value;
        updateLogoPreview();
        render(); 
      });
      document.getElementById('logoSize')?.addEventListener('input', (e) => { state.logoSize = parseInt(e.target.value); document.getElementById('logoSizeVal').textContent = e.target.value + 'px'; render(); });
      document.getElementById('logoMargin')?.addEventListener('input', (e) => { state.logoMargin = parseInt(e.target.value); document.getElementById('logoMarginVal').textContent = e.target.value + 'px'; render(); });
      
      const uploadZone = document.getElementById('uploadZone');
      const fileInput = document.getElementById('fileInput');
      uploadZone.addEventListener('click', () => fileInput.click());
      uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
      uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
      fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
      
      bindMask4Events();
      bindDimEvents();
    }
    
    function bindMask4Events() {
      document.querySelectorAll('[data-style="maskStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-style="maskStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.maskStyle = btn.dataset.value;
          const irregularOptions = document.getElementById('irregularMaskOptions');
          const useDisplayOptions = document.getElementById('useDisplayOptions');
          irregularOptions.style.display = state.maskStyle === 'irregular' ? 'block' : 'none';
          useDisplayOptions.style.display = state.maskStyle === 'useDisplay' ? 'block' : 'none';
          const mainDetailOptions = document.getElementById('mainDetailOptions');
          mainDetailOptions.style.display = state.maskStyle === 'mainDetail' ? 'block' : 'none';
          updateSubstylePanel();
          render();
        });
      });
      
      document.querySelectorAll('[data-style="fiveImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-style="fiveImageStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.fiveImageStyle = btn.dataset.value;
          render();
        });
      });
      
      document.querySelectorAll('[data-style="sixImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-style="sixImageStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.sixImageStyle = btn.dataset.value;
          render();
        });
      });
      
      const maskInputs = ['maskTitle', 'maskText1', 'maskText2', 'maskText3', 'maskText4'];
      maskInputs.forEach((id, idx) => {
        document.getElementById(id)?.addEventListener('input', (e) => {
          if (id === 'maskTitle') {
            state.maskTitle = e.target.value;
          } else {
            state.maskTexts[idx - 1] = e.target.value;
          }
          render();
        });
      });
      
      document.getElementById('maskBgColor')?.addEventListener('input', (e) => { state.maskBgColor = e.target.value; document.getElementById('maskBgColorText').value = e.target.value; render(); });
      document.getElementById('maskBgColorText')?.addEventListener('input', (e) => { state.maskBgColor = e.target.value; document.getElementById('maskBgColor').value = e.target.value; render(); });
      document.getElementById('maskCardColor')?.addEventListener('input', (e) => { state.maskCardColor = e.target.value; document.getElementById('maskCardColorText').value = e.target.value; render(); });
      document.getElementById('maskCardColorText')?.addEventListener('input', (e) => { state.maskCardColor = e.target.value; document.getElementById('maskCardColor').value = e.target.value; render(); });
      document.getElementById('maskNumberBg')?.addEventListener('input', (e) => { state.maskNumberBg = e.target.value; document.getElementById('maskNumberBgText').value = e.target.value; render(); });
      document.getElementById('maskNumberBgText')?.addEventListener('input', (e) => { state.maskNumberBg = e.target.value; document.getElementById('maskNumberBg').value = e.target.value; render(); });
      document.getElementById('maskTextColor')?.addEventListener('input', (e) => { state.maskTextColor = e.target.value; document.getElementById('maskTextColorText').value = e.target.value; render(); });
      document.getElementById('maskTextColorText')?.addEventListener('input', (e) => { state.maskTextColor = e.target.value; document.getElementById('maskTextColor').value = e.target.value; render(); });
      
      document.getElementById('useDisplayTitleInput')?.addEventListener('input', (e) => { state.useDisplayTitle = e.target.value; render(); });
      document.getElementById('useDisplayBgColor')?.addEventListener('input', (e) => { state.useDisplayBgColor = e.target.value; document.getElementById('useDisplayBgColorText').value = e.target.value; render(); });
      document.getElementById('useDisplayBgColorText')?.addEventListener('input', (e) => { state.useDisplayBgColor = e.target.value; document.getElementById('useDisplayBgColor').value = e.target.value; render(); });
      document.getElementById('useDisplayCardBg')?.addEventListener('input', (e) => { state.useDisplayCardBg = e.target.value; document.getElementById('useDisplayCardBgText').value = e.target.value; render(); });
      document.getElementById('useDisplayCardBgText')?.addEventListener('input', (e) => { state.useDisplayCardBg = e.target.value; document.getElementById('useDisplayCardBg').value = e.target.value; render(); });
      document.getElementById('useDisplayTitleColor')?.addEventListener('input', (e) => { state.useDisplayTitleColor = e.target.value; document.getElementById('useDisplayTitleColorText').value = e.target.value; render(); });
      document.getElementById('useDisplayTitleColorText')?.addEventListener('input', (e) => { state.useDisplayTitleColor = e.target.value; document.getElementById('useDisplayTitleColor').value = e.target.value; render(); });
      document.getElementById('useDisplayBorderColor')?.addEventListener('input', (e) => { state.useDisplayBorderColor = e.target.value; document.getElementById('useDisplayBorderColorText').value = e.target.value; render(); });
      document.getElementById('useDisplayBorderColorText')?.addEventListener('input', (e) => { state.useDisplayBorderColor = e.target.value; document.getElementById('useDisplayBorderColor').value = e.target.value; render(); });
      
      document.getElementById('mainDetailBgColor')?.addEventListener('input', (e) => { state.mainDetailBgColor = e.target.value; document.getElementById('mainDetailBgColorText').value = e.target.value; render(); });
      document.getElementById('mainDetailBgColorText')?.addEventListener('input', (e) => { state.mainDetailBgColor = e.target.value; document.getElementById('mainDetailBgColor').value = e.target.value; render(); });
      document.getElementById('mainDetailMainRadius')?.addEventListener('input', (e) => { state.mainDetailMainRadius = parseInt(e.target.value); render(); });
      document.getElementById('mainDetailDetailRadius')?.addEventListener('input', (e) => { state.mainDetailDetailRadius = parseInt(e.target.value); render(); });
      document.getElementById('mainDetailMainBorder')?.addEventListener('input', (e) => { state.mainDetailMainBorder = e.target.value; document.getElementById('mainDetailMainBorderText').value = e.target.value; render(); });
      document.getElementById('mainDetailMainBorderText')?.addEventListener('input', (e) => { state.mainDetailMainBorder = e.target.value; document.getElementById('mainDetailMainBorder').value = e.target.value; render(); });
      document.getElementById('mainDetailDetailBorder')?.addEventListener('input', (e) => { state.mainDetailDetailBorder = e.target.value; document.getElementById('mainDetailDetailBorderText').value = e.target.value; render(); });
      document.getElementById('mainDetailDetailBorderText')?.addEventListener('input', (e) => { state.mainDetailDetailBorder = e.target.value; document.getElementById('mainDetailDetailBorder').value = e.target.value; render(); });
      
      document.getElementById('detailTitle')?.addEventListener('input', (e) => { state.detailTitle = e.target.value; render(); });
      document.getElementById('detailSubtitle')?.addEventListener('input', (e) => { state.detailSubtitle = e.target.value; render(); });
      document.getElementById('detailText1Title')?.addEventListener('input', (e) => { state.detailText1Title = e.target.value; render(); });
      document.getElementById('detailText2Title')?.addEventListener('input', (e) => { state.detailText2Title = e.target.value; render(); });
      document.getElementById('detailText1Desc')?.addEventListener('input', (e) => { state.detailText1Desc = e.target.value; render(); });
      document.getElementById('detailText2Desc')?.addEventListener('input', (e) => { state.detailText2Desc = e.target.value; render(); });
      document.getElementById('detailBgColor')?.addEventListener('input', (e) => { state.detailBgColor = e.target.value; document.getElementById('detailBgColorText').value = e.target.value; render(); });
      document.getElementById('detailBgColorText')?.addEventListener('input', (e) => { state.detailBgColor = e.target.value; document.getElementById('detailBgColor').value = e.target.value; render(); });
      document.getElementById('detailCardColor')?.addEventListener('input', (e) => { state.detailCardColor = e.target.value; document.getElementById('detailCardColorText').value = e.target.value; render(); });
      document.getElementById('detailCardColorText')?.addEventListener('input', (e) => { state.detailCardColor = e.target.value; document.getElementById('detailCardColor').value = e.target.value; render(); });
      document.getElementById('detailTitleColor')?.addEventListener('input', (e) => { state.detailTitleColor = e.target.value; document.getElementById('detailTitleColorText').value = e.target.value; render(); });
      document.getElementById('detailTitleColorText')?.addEventListener('input', (e) => { state.detailTitleColor = e.target.value; document.getElementById('detailTitleColor').value = e.target.value; render(); });
      document.getElementById('detailTextColor')?.addEventListener('input', (e) => { state.detailTextColor = e.target.value; document.getElementById('detailTextColorText').value = e.target.value; render(); });
      document.getElementById('detailTextColorText')?.addEventListener('input', (e) => { state.detailTextColor = e.target.value; document.getElementById('detailTextColor').value = e.target.value; render(); });
      
      document.getElementById('cardTitle')?.addEventListener('input', (e) => { state.cardTitle = e.target.value; render(); });
      document.getElementById('cardSubtitle')?.addEventListener('input', (e) => { state.cardSubtitle = e.target.value; render(); });
      document.getElementById('cardBgColor')?.addEventListener('input', (e) => { state.cardBgColor = e.target.value; document.getElementById('cardBgColorText').value = e.target.value; render(); });
      document.getElementById('cardBgColorText')?.addEventListener('input', (e) => { state.cardBgColor = e.target.value; document.getElementById('cardBgColor').value = e.target.value; render(); });
      document.getElementById('cardRadius')?.addEventListener('input', (e) => {
        state.cardRadius = parseInt(e.target.value);
        document.getElementById('cardRadiusVal').textContent = state.cardRadius + 'px';
        render();
      });
      document.getElementById('cardTitleColor')?.addEventListener('input', (e) => { state.cardTitleColor = e.target.value; document.getElementById('cardTitleColorText').value = e.target.value; render(); });
      document.getElementById('cardTitleColorText')?.addEventListener('input', (e) => { state.cardTitleColor = e.target.value; document.getElementById('cardTitleColor').value = e.target.value; render(); });
      document.getElementById('cardSubtitleColor')?.addEventListener('input', (e) => { state.cardSubtitleColor = e.target.value; document.getElementById('cardSubtitleColorText').value = e.target.value; render(); });
      document.getElementById('cardSubtitleColorText')?.addEventListener('input', (e) => { state.cardSubtitleColor = e.target.value; document.getElementById('cardSubtitleColor').value = e.target.value; render(); });
    }
    
    // ===== 文档文案生成（已迁移至 main-image-ai-copy.js）=====
    
    function updateCircleOptions() {
      const circleOpts = document.getElementById('circleOptions');
      const detailOpts = document.getElementById('detailOptions');
      const cardOpts = document.getElementById('cardOptions');
      
      if (circleOpts) {
        circleOpts.style.display = (state.templateCount === 2 && state.twoImageStyle === 'circle') ? 'block' : 'none';
      }
      if (detailOpts) {
        detailOpts.style.display = (state.templateCount === 2 && state.twoImageStyle === 'detail') ? 'block' : 'none';
      }
      if (cardOpts) {
        cardOpts.style.display = (state.templateCount === 2 && state.twoImageStyle === 'card') ? 'block' : 'none';
      }
      updateSubstylePanel();
    }
    
    // 更新子样式展开面板的可见性
    function updateSubstylePanel() {
      const panel = document.getElementById('templateSubstylePanel');
      if (!panel) return;
      
      // 检查是否有任何子选项需要显示
      const circleOpts = document.getElementById('circleOptions');
      const detailOpts = document.getElementById('detailOptions');
      const cardOpts = document.getElementById('cardOptions');
      const irregularOpts = document.getElementById('irregularMaskOptions');
      const useDisplayOpts = document.getElementById('useDisplayOptions');
      const mainDetailOpts = document.getElementById('mainDetailOptions');
      
      const hasVisible = [circleOpts, detailOpts, cardOpts, irregularOpts, useDisplayOpts, mainDetailOpts]
        .some(el => el && el.style.display !== 'none');
      
      panel.style.display = hasVisible ? 'block' : 'none';
    }
    
    function clearCustomTextPos() {
      state.customTextPos = null;
      document.getElementById('clearCustomPosBtn') && (document.getElementById('clearCustomPosBtn').style.display = 'none');
      // 恢复当前预设的高亮
      document.querySelectorAll('.preset-item').forEach(i => {
        i.classList.toggle('active', i.dataset.preset === state.preset);
      });
      render();
    }
    
    // Tab 切换
    function switchSidebarTab(tabName) {
      // 更新 Tab 按钮状态
      document.querySelectorAll('.sidebar-tab').forEach(tab => {
        const isActive = tab.getAttribute('onclick').includes("'" + tabName + "'");
        tab.classList.toggle('active', isActive);
      });
      // 更新 Tab 内容显示
      document.querySelectorAll('.sidebar-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabName);
      });
      // 涂抹/移除 Tab 切换处理
      if (typeof onBrushTabSwitch === 'function') {
        onBrushTabSwitch(tabName);
      }
      // 标注 Tab 切换：控制 Konva 标注层显示
      const konvaOverlay = document.getElementById('konvaOverlay');
      if (tabName === 'dim') {
        if (state.dimLayerVisible && konvaOverlay) {
          konvaOverlay.style.display = '';
        }
        // 刷新标注TAB的产品规格数据显示
        if (typeof updateDimSpecDisplay === 'function') updateDimSpecDisplay();
      } else if (tabName !== 'mask') {
        // 切换到非标注、非涂抹 Tab 时隐藏 Konva 覆盖层
        if (konvaOverlay) konvaOverlay.style.display = 'none';
      }
      // AI编辑 Tab 切换：替换右侧面板
      if (tabName === 'aiEdit') {
        document.getElementById('mainContentNormal').style.display = 'none';
        document.getElementById('mainContentAIEdit').style.display = 'flex';
        loadProductSpecs();
      } else {
        document.getElementById('mainContentNormal').style.display = 'flex';
        document.getElementById('mainContentAIEdit').style.display = 'none';
      }
    }
    
    // 折叠面板切换
    function toggleCollapsible(header) {
      header.classList.toggle('collapsed');
      const body = header.nextElementSibling;
      if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = 'none';
      } else {
        // 先设为当前高度，再折叠
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(() => {
          body.classList.add('collapsed');
        });
      }
    }
    
    // 文字层可见性切换
    function toggleTextLayer(visible) {
      state.textLayerVisible = visible;
      const status = document.getElementById('textLayerStatus');
      if (status) {
        status.textContent = visible ? '可见' : '已隐藏';
        status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
      }
      render();
    }
    
    // 遮罩避让切换
    function toggleMaskAvoid(enabled) {
      state.maskAvoidText = enabled;
      const status = document.getElementById('maskAvoidStatus');
      const marginRow = document.getElementById('maskAvoidMarginRow');
      if (status) {
        status.textContent = enabled ? '开启' : '关闭';
        status.style.color = enabled ? '#3b82f6' : '#9ca3af';
      }
      if (marginRow) marginRow.style.display = enabled ? 'block' : 'none';
      render();
    }
    window.toggleMaskAvoid = toggleMaskAvoid;
    
    // 遮罩避让间距更新
    function updateMaskAvoidMargin() {
      const slider = document.getElementById('maskAvoidMargin');
      const val = document.getElementById('maskAvoidMarginVal');
      state.maskAvoidMargin = parseInt(slider.value);
      if (val) val.textContent = state.maskAvoidMargin + 'px';
      render();
    }
    window.updateMaskAvoidMargin = updateMaskAvoidMargin;
    
    // 标注层可见性切换
    function toggleDimLayer(visible) {
      state.dimLayerVisible = visible;
      const konvaOverlay = document.getElementById('konvaOverlay');
      if (konvaOverlay) {
        konvaOverlay.style.display = visible ? '' : 'none';
      }
      syncTabEyeButtons();
      render();
    }

    // 标注编辑模式切换
    function toggleDimEdit(editing) {
      state.dimEditing = editing;
      syncTabEyeButtons();
      if (typeof window.refreshDimAnchors === 'function') {
        window.refreshDimAnchors();
      }
      render();
    }
    
    function updateUIFromState() {
      const presetEl = document.getElementById('preset');
      const mainTitleEl = document.getElementById('mainTitle');
      const subTitleEl = document.getElementById('subTitle');
      const titleColorEl = document.getElementById('titleColor');
      const subtitleColorEl = document.getElementById('subtitleColor');
      const bgColorEl = document.getElementById('bgColor');
      const titleSizeEl = document.getElementById('titleSize');
      const shadowEl = document.getElementById('shadow');
      const strokeEl = document.getElementById('stroke');
      const boldEl = document.getElementById('bold');
      const textBgEl = document.getElementById('textBg');
      const imageGapEl = document.getElementById('imageGap');
      const imageRadiusEl = document.getElementById('imageRadius');
      
      if (presetEl) presetEl.value = state.preset;
      if (mainTitleEl) mainTitleEl.value = state.mainTitle;
      if (subTitleEl) subTitleEl.value = state.subTitle;
      if (titleColorEl) titleColorEl.value = state.titleColor;
      if (subtitleColorEl) subtitleColorEl.value = state.subtitleColor;
      if (bgColorEl) bgColorEl.value = state.bgColor;
      if (titleSizeEl) titleSizeEl.value = state.titleSize;
      
      const mainTitleFontEl = document.getElementById('mainTitleFont');
      const subTitleFontEl = document.getElementById('subTitleFont');
      const mainTitleWeightEl = document.getElementById('mainTitleWeight');
      const subTitleWeightEl = document.getElementById('subTitleWeight');
      const mainTitleItalicEl = document.getElementById('mainTitleItalic');
      const subTitleItalicEl = document.getElementById('subTitleItalic');
      if (mainTitleFontEl) mainTitleFontEl.value = state.mainTitleFont;
      if (subTitleFontEl) subTitleFontEl.value = state.subTitleFont;
      if (mainTitleWeightEl) mainTitleWeightEl.value = state.mainTitleWeight;
      if (subTitleWeightEl) subTitleWeightEl.value = state.subTitleWeight;
      if (mainTitleItalicEl) mainTitleItalicEl.checked = state.mainTitleItalic;
      if (subTitleItalicEl) subTitleItalicEl.checked = state.subTitleItalic;
      
      if (shadowEl) shadowEl.checked = state.shadow;
      if (strokeEl) strokeEl.checked = state.stroke;
      if (boldEl) boldEl.checked = state.bold;
      if (textBgEl) textBgEl.checked = state.textBg;
      // 同步文字背景颜色控件
      const rgbMatch = (state.textBgColor || '').match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2,'0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2,'0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2,'0');
        document.getElementById('textBgColorPicker').value = '#' + r + g + b;
        document.getElementById('textBgOpacity').value = Math.round(parseFloat(rgbMatch[4]) * 100);
        document.getElementById('textBgOpacityVal').textContent = Math.round(parseFloat(rgbMatch[4]) * 100) + '%';
      }
      // 同步文字背景控件状态
      if (typeof updateBgControlOpacity === 'function') updateBgControlOpacity();
      // 同步文字背景圆角
      if (document.getElementById('textBgRadius')) {
        document.getElementById('textBgRadius').value = state.textBgRadius;
        document.getElementById('textBgRadiusVal').textContent = state.textBgRadius + 'px';
      }
      if (imageGapEl) imageGapEl.value = state.imageGap;
      if (imageRadiusEl) imageRadiusEl.value = state.imageRadius;
      // 同步背景色块预览
      const bgBlock = document.getElementById('bgColorBlock');
      if (bgBlock) bgBlock.style.background = state.bgColor;
      
      // 同步文字层可见性
      const textLayerVisibleEl = document.getElementById('textLayerVisible');
      const textLayerStatusEl = document.getElementById('textLayerStatus');
      if (textLayerVisibleEl) textLayerVisibleEl.checked = state.textLayerVisible;
      if (textLayerStatusEl) {
        textLayerStatusEl.textContent = state.textLayerVisible ? '可见' : '已隐藏';
        textLayerStatusEl.className = 'toggle-status ' + (state.textLayerVisible ? 'visible' : 'hidden');
      }
      
      // 同步LOGO层可见性
      const logoLayerVisibleEl = document.getElementById('logoLayerVisible');
      const logoLayerStatusEl = document.getElementById('logoLayerStatus');
      if (logoLayerVisibleEl) logoLayerVisibleEl.checked = state.logoLayerVisible;
      if (logoLayerStatusEl) {
        logoLayerStatusEl.textContent = state.logoLayerVisible ? '可见' : '已隐藏';
        logoLayerStatusEl.className = 'toggle-status ' + (state.logoLayerVisible ? 'visible' : 'hidden');
      }
      
      document.querySelectorAll('.template-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.count) === state.templateCount);
      });
      
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === state.preset);
      });
      
      document.querySelectorAll('[data-style="twoImageStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.twoImageStyle);
      });
      
      document.querySelectorAll('[data-style="fiveImageStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.fiveImageStyle);
      });
      
      document.querySelectorAll('[data-style="sixImageStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.sixImageStyle);
      });
      
      document.getElementById('imageCount').textContent = state.images.length;
      
      const twoImageSection = document.getElementById('twoImageStyleSection');
      const mask4Section = document.getElementById('mask4StyleSection');
      const fiveImageSection = document.getElementById('fiveImageStyleSection');
      const sixImageSection = document.getElementById('sixImageStyleSection');
      
      twoImageSection.style.display = state.templateCount === 2 ? 'flex' : 'none';
      mask4Section.style.display = state.templateCount === 4 ? 'flex' : 'none';
      fiveImageSection.style.display = state.templateCount === 5 ? 'flex' : 'none';
      sixImageSection.style.display = state.templateCount === 6 ? 'flex' : 'none';
      
      updateCircleOptions();
      
      document.querySelectorAll('[data-style="maskStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.maskStyle);
      });
      
      const irregularOptions = document.getElementById('irregularMaskOptions');
      const useDisplayOptions = document.getElementById('useDisplayOptions');
      if (irregularOptions) irregularOptions.style.display = state.maskStyle === 'irregular' ? 'block' : 'none';
      if (useDisplayOptions) useDisplayOptions.style.display = state.maskStyle === 'useDisplay' ? 'block' : 'none';
      
      const useDisplayTitleInput = document.getElementById('useDisplayTitleInput');
      const useDisplayBgColorEl = document.getElementById('useDisplayBgColor');
      const useDisplayCardBgEl = document.getElementById('useDisplayCardBg');
      const useDisplayTitleColorEl = document.getElementById('useDisplayTitleColor');
      const useDisplayBorderColorEl = document.getElementById('useDisplayBorderColor');
      if (useDisplayTitleInput) useDisplayTitleInput.value = state.useDisplayTitle;
      if (useDisplayBgColorEl) useDisplayBgColorEl.value = state.useDisplayBgColor;
      const useDisplayBgColorTextEl = document.getElementById('useDisplayBgColorText');
      if (useDisplayBgColorTextEl) useDisplayBgColorTextEl.value = state.useDisplayBgColor;
      if (useDisplayCardBgEl) useDisplayCardBgEl.value = state.useDisplayCardBg;
      const useDisplayCardBgTextEl = document.getElementById('useDisplayCardBgText');
      if (useDisplayCardBgTextEl) useDisplayCardBgTextEl.value = state.useDisplayCardBg;
      if (useDisplayTitleColorEl) useDisplayTitleColorEl.value = state.useDisplayTitleColor;
      const useDisplayTitleColorTextEl = document.getElementById('useDisplayTitleColorText');
      if (useDisplayTitleColorTextEl) useDisplayTitleColorTextEl.value = state.useDisplayTitleColor;
      if (useDisplayBorderColorEl) useDisplayBorderColorEl.value = state.useDisplayBorderColor;
      const useDisplayBorderColorTextEl = document.getElementById('useDisplayBorderColorText');
      if (useDisplayBorderColorTextEl) useDisplayBorderColorTextEl.value = state.useDisplayBorderColor;
      
      const mainDetailOptions = document.getElementById('mainDetailOptions');
      if (mainDetailOptions) mainDetailOptions.style.display = state.maskStyle === 'mainDetail' ? 'block' : 'none';
      
      updateSubstylePanel();
      
      const mainDetailBgColorEl = document.getElementById('mainDetailBgColor');
      const mainDetailMainRadiusEl = document.getElementById('mainDetailMainRadius');
      const mainDetailDetailRadiusEl = document.getElementById('mainDetailDetailRadius');
      const mainDetailMainBorderEl = document.getElementById('mainDetailMainBorder');
      const mainDetailDetailBorderEl = document.getElementById('mainDetailDetailBorder');
      if (mainDetailBgColorEl) mainDetailBgColorEl.value = state.mainDetailBgColor;
      const mainDetailBgColorTextEl = document.getElementById('mainDetailBgColorText');
      if (mainDetailBgColorTextEl) mainDetailBgColorTextEl.value = state.mainDetailBgColor;
      if (mainDetailMainRadiusEl) mainDetailMainRadiusEl.value = state.mainDetailMainRadius;
      if (mainDetailDetailRadiusEl) mainDetailDetailRadiusEl.value = state.mainDetailDetailRadius;
      if (mainDetailMainBorderEl) mainDetailMainBorderEl.value = state.mainDetailMainBorder;
      const mainDetailMainBorderTextEl = document.getElementById('mainDetailMainBorderText');
      if (mainDetailMainBorderTextEl) mainDetailMainBorderTextEl.value = state.mainDetailMainBorder;
      if (mainDetailDetailBorderEl) mainDetailDetailBorderEl.value = state.mainDetailDetailBorder;
      const mainDetailDetailBorderTextEl = document.getElementById('mainDetailDetailBorderText');
      if (mainDetailDetailBorderTextEl) mainDetailDetailBorderTextEl.value = state.mainDetailDetailBorder;
    }

