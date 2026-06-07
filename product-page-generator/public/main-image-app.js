  <script>
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    let renderCtx = null;
    
    function getCtx() {
      return renderCtx || ctx;
    }
    
    const RENDER_SZ = 1024;
    let konvaStage = null, konvaDimLayer = null;
    let displayScale = 1;
    
    const presets = {
      topLeft: { textAlign: 'left', textVAlign: 'top', textX: 60, textY: 80 },
      top: { textAlign: 'center', textVAlign: 'top', textX: 512, textY: 80 },
      topRight: { textAlign: 'right', textVAlign: 'top', textX: 964, textY: 80 },
      left: { textAlign: 'left', textVAlign: 'center', textX: 60, textY: 512 },
      center: { textAlign: 'center', textVAlign: 'center', textX: 512, textY: 512 },
      right: { textAlign: 'right', textVAlign: 'center', textX: 964, textY: 512 },
      bottomLeft: { textAlign: 'left', textVAlign: 'bottom', textX: 60, textY: 950 },
      bottom: { textAlign: 'center', textVAlign: 'bottom', textX: 512, textY: 950 },
      bottomRight: { textAlign: 'right', textVAlign: 'bottom', textX: 964, textY: 950 }
    };
    
    function init() {
      bindEvents();
      initSlotTypes();
      updateCircleOptions();
      initDragAndDrop();
      updateExportSize();
      renderBatchTypeSettings(); // 鍒濆鍖栨壒閲忕敓鎴愪俊鎭?
      
      // 鍒濆鍖栨姌鍙犻潰鏉?
      document.querySelectorAll('.collapsible-body').forEach(body => {
        body.style.maxHeight = 'none';
      });
      
      // 鍔犺浇LOGO绱犳潗搴?
      loadLogoLibrary();
      
      // 绛夊緟瀛椾綋鍔犺浇瀹屾垚鍚庡啀娓叉煋
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          console.log('瀛椾綋鍔犺浇瀹屾垚');
          render();
        });
      } else {
        // 濡傛灉娴忚鍣ㄤ笉鏀寔document.fonts锛岀洿鎺ユ覆鏌?
        render();
      }
    }
    
    function initDragAndDrop() {
      const dragOverlay = document.getElementById('dragOverlay');
      const HANDLE_HIT_SIZE = 12; // 鎺у埗鐐圭偣鍑荤儹鍖哄ぇ灏?
      
      // 鍧愭爣杞崲锛氬睆骞曞潗鏍?-> Canvas 1024鍧愭爣
      function toCanvasCoords(e) {
        const rect = dragOverlay.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) / rect.width * 1024,
          y: (e.clientY - rect.top) / rect.height * 1024
        };
      }
      
      // 妫€娴嬫槸鍚︾偣鍑讳簡鎺у埗鐐?
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
      
      // 妫€娴嬫槸鍚︾偣鍑讳簡鏂囧瓧鍖哄煙
      function hitTestText(cx, cy) {
        if (!state.textLayerVisible) return false;
        const bb = getTextBoundingBox();
        if (!bb) return false;
        return cx >= bb.x && cx <= bb.x + bb.w && cy >= bb.y && cy <= bb.y + bb.h;
      }
      
      // 鏇存柊鍏夋爣鏍峰紡
      function updateCursor(e) {
        if (state.dimEnabled) return;
        const { x, y } = toCanvasCoords(e);
        const handle = hitTestHandle(x, y);
        if (handle) {
          dragOverlay.style.cursor = handle.cursor;
        } else if (hitTestText(x, y)) {
          dragOverlay.style.cursor = 'move';
        } else {
          dragOverlay.style.cursor = 'pointer';
        }
      }
      
      dragOverlay.addEventListener('mousedown', (e) => {
        if (state.dimEnabled) return;
        const { x, y } = toCanvasCoords(e);
        
        // 浼樺厛妫€娴嬫帶鍒剁偣锛堢缉鏀撅級
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
        
        // 妫€娴嬫枃瀛楀尯鍩燂紙鎷栨嫿绉诲姩锛?
        if (hitTestText(x, y)) {
          state.textDragState.isDragging = true;
          state.textDragState.startX = x;
          state.textDragState.startY = y;
          state.textDragState.startCustomTextPos = state.customTextPos
            ? { ...state.customTextPos }
            : null;
          // 濡傛灉娌℃湁customTextPos锛屽熀浜庡綋鍓嶉璁句綅缃垱寤轰竴涓紝淇濈暀瀵归綈鏂瑰紡
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
        
        // 鍥剧墖浜や簰锛氱偣鍑婚€変腑 + Shift澶氶€?+ 鎷栨嫿绉诲姩offset + 鎷栨嫿鍒板叾浠栦綅缃氦鎹?
        const index = getImageIndexAtPosition(x, y);
        if (index !== -1 && state.images[index]) {
          if (e.shiftKey) {
            // Shift+鐐瑰嚮锛氬閫?鍙栨秷閫夋嫨
            const idx = state.multiSelectedIndices.indexOf(index);
            if (idx > -1) {
              state.multiSelectedIndices.splice(idx, 1);
            } else {
              state.multiSelectedIndices.push(index);
            }
            // 濡傛灉杩樻湁閫変腑鐨勶紝浠ユ渶鍚庝竴涓负涓?
            if (state.multiSelectedIndices.length > 0) {
              setActiveImage(state.multiSelectedIndices[state.multiSelectedIndices.length - 1]);
            }
            updateImageAdjustPanelForMulti();
            renderImageList();
            render();
            return;
          }
          
          // 鏅€氱偣鍑伙細娓呴櫎澶氶€夛紝璁句负娲昏穬
          state.multiSelectedIndices = [index];
          setActiveImage(index);
          state.dragState.isDragging = true;
          state.dragState.dragIndex = index;
          state.dragState.startX = x;
          state.dragState.startY = y;
          state.dragState.hasMoved = false;
          // 璁板綍鍥剧墖鍘熷offset锛岀敤浜庢嫋鎷界Щ鍔?
          state.imageDragState.isDragging = true;
          state.imageDragState.index = index;
          state.imageDragState.startX = x;
          state.imageDragState.startY = y;
          state.imageDragState.startOffsetX = state.images[index].offsetX || 0;
          state.imageDragState.startOffsetY = state.images[index].offsetY || 0;
          dragOverlay.style.cursor = 'grabbing';
        }
      });
      
      dragOverlay.addEventListener('mousemove', (e) => {
        // 鏇存柊鍏夋爣
        if (!state.dragState.isDragging && !state.textDragState.isDragging && !state.textDragState.isResizing) {
          updateCursor(e);
        }
        
        const { x, y } = toCanvasCoords(e);
        
        // 鏂囧瓧缂╂斁
        if (state.textDragState.isResizing) {
          const startBBox = state.textDragState.startBBox;
          const startSize = state.textDragState.startTitleSize;
          const handlePos = state.textDragState.resizeHandle;
          
          // 璁＄畻鎷栨嫿璺濈瀵瑰簲鐨勭缉鏀炬瘮渚?
          let scaleFactor = 1;
          if (handlePos === 'mr' || handlePos === 'ml') {
            // 姘村钩缂╂斁
            const dx = x - state.textDragState.startX;
            scaleFactor = (startBBox.w + dx) / startBBox.w;
          } else if (handlePos === 'tc' || handlePos === 'bc') {
            // 鍨傜洿缂╂斁
            const dy = y - state.textDragState.startY;
            scaleFactor = (startBBox.h + dy) / startBBox.h;
          } else {
            // 瑙掕惤缂╂斁 - 鍙栧瑙掔嚎鏂瑰悜
            const dx = x - state.textDragState.startX;
            const dy = y - state.textDragState.startY;
            // 浣跨敤瀵硅绾胯窛绂绘瘮
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
        
        // 鏂囧瓧鎷栨嫿绉诲姩
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
        
        // 鍥剧墖鎷栨嫿
        if (state.dragState.isDragging) {
          const dx = x - state.dragState.startX;
          const dy = y - state.dragState.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            state.dragState.hasMoved = true;
          }
          
          // 妫€鏌ユ槸鍚︽嫋鍒颁簡鍙︿竴涓浘鐗囦綅缃笂锛堢敤浜庝氦鎹級
          const dropIndex = getImageIndexAtPosition(x, y);
          
          if (dropIndex !== -1 && dropIndex !== state.dragState.dragIndex) {
            // 鎷栧埌鍏朵粬鍥剧墖浣嶇疆涓婏紝鏄剧ず浜ゆ崲鎸囩ず鍣?
            state.dragState.dropIndex = dropIndex;
            state.imageDragState.isDragging = false; // 涓嶅啀绉诲姩offset
            render();
          } else {
            // 鍦ㄥ悓涓€鍥剧墖鍖哄煙鍐呮嫋鎷斤紝绉诲姩鍥剧墖offset
            state.dragState.dropIndex = -1;
            const imgIdx = state.imageDragState.index;
            if (imgIdx >= 0 && imgIdx < state.images.length) {
              const newOffsetX = Math.round(state.imageDragState.startOffsetX - dx);
              const newOffsetY = Math.round(state.imageDragState.startOffsetY - dy);
              
              // 濡傛灉澶氶€夛紝鎵€鏈夐€変腑鍥剧墖涓€璧风Щ鍔?
              if (state.multiSelectedIndices.length > 1 && state.multiSelectedIndices.includes(imgIdx)) {
                const deltaX = newOffsetX - (state.images[imgIdx].offsetX || 0);
                const deltaY = newOffsetY - (state.images[imgIdx].offsetY || 0);
                state.multiSelectedIndices.forEach(idx => {
                  if (idx < state.images.length) {
                    state.images[idx].offsetX = (state.images[idx].offsetX || 0) + deltaX;
                    state.images[idx].offsetY = (state.images[idx].offsetY || 0) + deltaY;
                  }
                });
              } else {
                state.images[imgIdx].offsetX = newOffsetX;
                state.images[imgIdx].offsetY = newOffsetY;
              }
              
              // 鍚屾鏇存柊璋冩暣闈㈡澘
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
        // 鏂囧瓧缂╂斁缁撴潫
        if (state.textDragState.isResizing) {
          state.textDragState.isResizing = false;
          state.textDragState.resizeHandle = null;
          state.textDragState.startBBox = null;
          return;
        }
        
        // 鏂囧瓧鎷栨嫿缁撴潫
        if (state.textDragState.isDragging) {
          state.textDragState.isDragging = false;
          state.textDragState.startCustomTextPos = null;
          return;
        }
        
        // 鍥剧墖鎷栨嫿缁撴潫
        if (state.dragState.isDragging) {
          const dragIndex = state.dragState.dragIndex;
          
          if (e && e.type === 'mouseup') {
            if (!state.dragState.hasMoved) {
              // 鐭偣鍑伙細寮瑰嚭绫诲瀷閫夋嫨鑿滃崟
              showSlotTypeMenu(dragIndex, e);
            } else if (state.dragState.dropIndex !== -1 && state.dragState.dropIndex !== dragIndex) {
              // 鎷栧埌鍏朵粬鍥剧墖浣嶇疆锛氫氦鎹㈠浘鐗?
              swapImages(dragIndex, state.dragState.dropIndex);
            }
            // 鎷栨嫿绉诲姩offset鐨勬儏鍐典笉闇€瑕侀澶栧鐞嗭紝宸茬粡鍦╩ousemove涓疄鏃舵洿鏂颁簡
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
      
      // 婊氳疆缂╂斁鍥剧墖
      dragOverlay.addEventListener('wheel', (e) => {
        if (state.dimEnabled) return;
        const { x, y } = toCanvasCoords(e);
        const index = getImageIndexAtPosition(x, y);
        if (index === -1 || !state.images[index]) return;
        
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.05 : 0.05; // 鍚戜笅婊氱缉灏忥紝鍚戜笂婊氭斁澶?
        
        // 濡傛灉璇ュ浘鐗囧湪澶氶€夊垪琛ㄤ腑锛岀缉鏀炬墍鏈夐€変腑鍥剧墖
        if (state.multiSelectedIndices.includes(index) && state.multiSelectedIndices.length > 1) {
          state.multiSelectedIndices.forEach(idx => {
            if (idx < state.images.length) {
              state.images[idx].scale = Math.max(0.1, Math.min(3, state.images[idx].scale + delta));
            }
          });
        } else {
          state.multiSelectedIndices = [index];
          state.images[index].scale = Math.max(0.1, Math.min(3, state.images[index].scale + delta));
        }
        
        setActiveImage(index);
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
          
          // 鏇存柊slotTypes
          initSlotTypes();
          
          // 涓嶅啀鎴柇鍥剧墖鏁扮粍锛屾ā鏉挎暟閲忓彧鍐冲畾甯冨眬
          document.getElementById('imageCount').textContent = state.images.length;
          
          const twoImageSection = document.getElementById('twoImageStyleSection');
          const mask4Section = document.getElementById('mask4StyleSection');
          const fiveImageSection = document.getElementById('fiveImageStyleSection');
          const sixImageSection = document.getElementById('sixImageStyleSection');
          
          // 闅愯棌鎵€鏈夊瓙鏍峰紡闈㈡澘鍐呭
          ['circleOptions','detailOptions','cardOptions','irregularMaskOptions','useDisplayOptions','mainDetailOptions'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          });
          
          twoImageSection.style.display = state.templateCount === 2 ? 'flex' : 'none';
          mask4Section.style.display = state.templateCount === 4 ? 'flex' : 'none';
          fiveImageSection.style.display = state.templateCount === 5 ? 'flex' : 'none';
          sixImageSection.style.display = state.templateCount === 6 ? 'flex' : 'none';
          
          updateCircleOptions();
          
          // 鏇存柊鎵归噺妯″紡璁剧疆
          if (state.batchMode) {
            renderBatchTypeSettings();
          }
          
          render();
        });
      });
      
      document.querySelectorAll('.style-btn[data-style="twoImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.style-btn[data-style="twoImageStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.twoImageStyle = btn.dataset.value;
          updateCircleOptions();
          render();
        });
      });
      
      document.querySelectorAll('.style-btn[data-style="circlePosition"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.style-btn[data-style="circlePosition"]').forEach(b => b.classList.remove('active'));
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
          // 鏇存柊鏂囧瓧鑳屾櫙/姣涚幓鐠冩帶浠剁殑鍙鐘舵€佹寚绀?
          if (btn.dataset.style === 'textBg') {
            updateBgControlOpacity();
          }
          // 鍔犵矖鎸夐挳鍚屾鎺у埗瀛楅噸
          if (btn.dataset.style === 'bold') {
            state.mainTitleWeight = btn.classList.contains('active') ? 'bold' : 'normal';
            const mw = document.getElementById('mainTitleWeight');
            if (mw) mw.value = state.mainTitleWeight;
          }
          render();
        });
      });
      
      // 鏂囧瓧鑳屾櫙鎺т欢濮嬬粓鍙锛岀敤閫忔槑搴﹁〃绀哄惎鐢ㄧ姸鎬?
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
      
      // 鏂囧瓧鑳屾櫙棰滆壊
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
      
      // 鏂囧瓧鑳屾櫙鍦嗚
      document.getElementById('textBgRadius').addEventListener('input', (e) => {
        document.getElementById('textBgRadiusVal').textContent = e.target.value + 'px';
        state.textBgRadius = parseInt(e.target.value);
        render();
      });
      
      // 閰嶈壊鏂规
      initColorSchemes();
      
      document.getElementById('titleSize').addEventListener('input', (e) => { state.titleSize = parseInt(e.target.value); document.getElementById('titleSizeVal').textContent = e.target.value + 'px'; render(); });
      
      document.getElementById('mainTitleFont').addEventListener('change', (e) => { 
        state.mainTitleFont = e.target.value; 
        setTimeout(() => render(), 50);
      });
      document.getElementById('subTitleFont').addEventListener('change', (e) => { 
        state.subTitleFont = e.target.value; 
        setTimeout(() => render(), 50);
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
      document.querySelectorAll('.style-btn[data-style="maskStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.style-btn[data-style="maskStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.maskStyle = btn.dataset.value;
          const irregularOptions = document.getElementById('irregularMaskOptions');
          const useDisplayOptions = document.getElementById('useDisplayOptions');
          irregularOptions.style.display = state.maskStyle === 'irregular' ? 'block' : 'none';
          useDisplayOptions.style.display = state.maskStyle === 'useDisplay' ? 'block' : 'none';
          const mainDetailOptions = document.getElementById('mainDetailOptions');
          mainDetailOptions.style.display = state.maskStyle === 'mainDetail' ? 'block' : 'none';
          const scenarioDisplayOptions = document.getElementById('scenarioDisplayOptions');
          if (scenarioDisplayOptions) scenarioDisplayOptions.style.display = state.maskStyle === 'scenarioDisplay' ? 'block' : 'none';
          updateSubstylePanel();
          render();
        });
      });
      
      document.querySelectorAll('.style-btn[data-style="fiveImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.style-btn[data-style="fiveImageStyle"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.fiveImageStyle = btn.dataset.value;
          render();
        });
      });
      
      document.querySelectorAll('.style-btn[data-style="sixImageStyle"]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.style-btn[data-style="sixImageStyle"]').forEach(b => b.classList.remove('active'));
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
      
      // 缁熶竴瀛愭牱寮忛潰鏉匡細鑳屾櫙鑹层€侀棿璺濄€佸渾瑙掞紙鎿嶄綔state.bgColor/imageGap/imageRadius锛?
      document.getElementById('subBgColor')?.addEventListener('input', (e) => { state.bgColor = e.target.value; render(); });
      document.getElementById('subImageGap')?.addEventListener('input', (e) => { state.imageGap = parseInt(e.target.value); document.getElementById('subImageGapVal').textContent = e.target.value + 'px'; render(); });
      document.getElementById('subImageRadius')?.addEventListener('input', (e) => { state.imageRadius = parseInt(e.target.value); document.getElementById('subImageRadiusVal').textContent = e.target.value + 'px'; render(); });
      
      document.getElementById('detailTitle')?.addEventListener('input', (e) => { state.detailTitle = e.target.value; render(); });
      document.getElementById('detailSubtitle')?.addEventListener('input', (e) => { state.detailSubtitle = e.target.value; render(); });
      document.getElementById('detailText1Title')?.addEventListener('input', (e) => { state.detailText1Title = e.target.value; render(); });
      document.getElementById('detailText2Title')?.addEventListener('input', (e) => { state.detailText2Title = e.target.value; render(); });
      document.getElementById('detailText1Desc')?.addEventListener('input', (e) => { state.detailText1Desc = e.target.value; render(); });
      document.getElementById('detailText2Desc')?.addEventListener('input', (e) => { state.detailText2Desc = e.target.value; render(); });
      document.getElementById('detailBgColor')?.addEventListener('input', (e) => { state.detailBgColor = e.target.value; render(); });
      document.getElementById('detailCardColor')?.addEventListener('input', (e) => { state.detailCardColor = e.target.value; render(); });
      document.getElementById('detailTitleColor')?.addEventListener('input', (e) => { state.detailTitleColor = e.target.value; render(); });
      document.getElementById('detailTextColor')?.addEventListener('input', (e) => { state.detailTextColor = e.target.value; render(); });
      
      document.getElementById('cardTitle')?.addEventListener('input', (e) => { state.cardTitle = e.target.value; render(); });
      document.getElementById('cardSubtitle')?.addEventListener('input', (e) => { state.cardSubtitle = e.target.value; render(); });
      document.getElementById('cardBgColor')?.addEventListener('input', (e) => { state.cardBgColor = e.target.value; render(); });
      document.getElementById('cardRadius')?.addEventListener('input', (e) => {
        state.cardRadius = parseInt(e.target.value);
        document.getElementById('cardRadiusVal').textContent = state.cardRadius + 'px';
        render();
      });
      document.getElementById('cardTitleColor')?.addEventListener('input', (e) => { state.cardTitleColor = e.target.value; render(); });
      document.getElementById('cardSubtitleColor')?.addEventListener('input', (e) => { state.cardSubtitleColor = e.target.value; render(); });
    }
    
    
    
    
    // 鍒濆鍖杝lotTypes锛屼负姣忎釜妯℃澘浣嶇疆鍒嗛厤榛樿绫诲瀷
    function initSlotTypes() {
      const count = state.templateCount;
      // 榛樿鍒嗛厤绛栫暐锛氫綅缃?=鍦烘櫙鍥撅紝浣嶇疆1=鐧藉簳鍥撅紝浣嶇疆2=濂楄鍥撅紝鍏朵綑=缁嗚妭鍥?
      const defaultTypes = ['scene', 'white', 'set', 'detail'];
      while (state.slotTypes.length < count) {
        const idx = state.slotTypes.length;
        state.slotTypes.push(idx < defaultTypes.length ? defaultTypes[idx] : 'detail');
      }
      state.slotTypes = state.slotTypes.slice(0, count);
    }
    
    // 璁剧疆鏌愪釜浣嶇疆鐨勫浘鐗囩被鍨嬶紝骞剁珛鍗冲簲鐢?
    function setSlotType(slotIndex, type) {
      if (slotIndex < 0 || slotIndex >= state.templateCount) return;
      state.slotTypes[slotIndex] = type;
      applySlotTypes();
    }
    
    // 鏍规嵁 slotTypes 灏嗗搴旂被鍨嬬粍鐨勫浘鐗囧垎閰嶅埌鍚勪綅缃紙鏍稿績鍑芥暟锛?
    function applySlotTypes() {
      const templateCount = state.templateCount;
      initSlotTypes();
      
      // 鎸夌被鍨嬪垎缁勭储寮?
      const typeGroups = { scene: [], white: [], set: [], detail: [], untyped: [] };
      state.images.forEach((img, i) => {
        const t = img.type;
        if (typeGroups[t]) typeGroups[t].push(i);
        else typeGroups.untyped.push(i);
      });
      
      // 涓烘瘡涓猻lot鍒嗛厤鍥剧墖绱㈠紩
      const assigned = [];  // assigned[slotIndex] = imageIndex
      const usedIndices = new Set();
      
      for (let i = 0; i < templateCount; i++) {
        const slotType = state.slotTypes[i];
        let found = -1;
        
        // 浼樺厛浠巗lotType瀵瑰簲鐨勭粍鍙?
        if (slotType && typeGroups[slotType]) {
          for (const idx of typeGroups[slotType]) {
            if (!usedIndices.has(idx)) { found = idx; break; }
          }
        }
        
        // 娌℃壘鍒板垯鎸変紭鍏堢骇浠庡叾浠栫粍鍙?
        if (found === -1) {
          for (const type of ['scene', 'white', 'set', 'detail', 'untyped']) {
            for (const idx of typeGroups[type]) {
              if (!usedIndices.has(idx)) { found = idx; break; }
            }
            if (found !== -1) break;
          }
        }
        
        if (found !== -1) {
          assigned.push(found);
          usedIndices.add(found);
        }
      }
      
      if (assigned.length === 0) { renderImageList(); render(); return; }
      
      // 灏嗗垎閰嶇殑鍥剧墖绉诲埌鍓峃涓綅缃紙淇濈暀鍥剧墖鐨則ype涓嶅彉锛?
      const newImages = [...state.images];
      for (let i = 0; i < assigned.length; i++) {
        const sourceIdx = assigned[i];
        const targetIdx = i;
        if (sourceIdx === targetIdx) continue;
        
        // 鎵惧埌source鍦╪ewImages涓殑褰撳墠浣嶇疆
        let currentPos = -1;
        for (let j = 0; j < newImages.length; j++) {
          if (state.images[sourceIdx] === newImages[j]) { currentPos = j; break; }
        }
        if (currentPos !== -1 && currentPos !== targetIdx) {
          const temp = newImages[targetIdx];
          newImages[targetIdx] = newImages[currentPos];
          newImages[currentPos] = temp;
        }
      }
      
      state.images = newImages;
      updateImageTypeStats();
      renderImageList();
      render();
    }
    
    // 鍦ㄩ瑙堝尯鐐瑰嚮鍥剧墖鏃跺脊鍑虹被鍨嬮€夋嫨鑿滃崟
    function showSlotTypeMenu(slotIndex, mouseEvent) {
      // 绉婚櫎宸叉湁鑿滃崟
      const existing = document.getElementById('slotTypeMenu');
      if (existing) existing.remove();
      
      const typeOptions = [
        { type: 'scene', label: '馃彏 鍦烘櫙鍥?, color: '#10b981' },
        { type: 'white', label: '猬?鐧藉簳鍥?, color: '#6b7280' },
        { type: 'set',   label: '馃摝 濂楄鍥?, color: '#8b5cf6' },
        { type: 'detail',label: '馃攳 缁嗚妭鍥?, color: '#f59e0b' }
      ];
      
      const currentType = state.slotTypes[slotIndex];
      
      const menu = document.createElement('div');
      menu.id = 'slotTypeMenu';
      menu.style.cssText = `position:fixed;z-index:10000;background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:6px;min-width:120px;`;
      menu.style.left = mouseEvent.clientX + 'px';
      menu.style.top = mouseEvent.clientY + 'px';
      
      const title = document.createElement('div');
      title.style.cssText = 'font-size:11px;color:#9ca3af;padding:4px 8px;font-weight:600;';
      title.textContent = `浣嶇疆 ${slotIndex + 1} 浣跨敤鍥剧墖绫诲瀷`;
      menu.appendChild(title);
      
      typeOptions.forEach(opt => {
        const btn = document.createElement('div');
        btn.style.cssText = `padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;transition:background 0.15s;`;
        if (opt.type === currentType) {
          btn.style.background = '#eff6ff';
          btn.style.fontWeight = '600';
        }
        btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${opt.color};flex-shrink:0;"></span>${opt.label}${opt.type === currentType ? ' 鉁? : ''}`;
        btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = opt.type === currentType ? '#eff6ff' : ''; });
        btn.addEventListener('click', () => {
          setSlotType(slotIndex, opt.type);
          menu.remove();
          showToast(`浣嶇疆 ${slotIndex + 1} 宸茶涓?{opt.label}`);
        });
        menu.appendChild(btn);
      });
      
      document.body.appendChild(menu);
      
      // 鐐瑰嚮鍏朵粬鍦版柟鍏抽棴鑿滃崟
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('mousedown', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
    }
    
    function updateImageTypeStats() {
      const counts = { scene: 0, white: 0, set: 0, detail: 0 };
      state.images.forEach(img => {
        const t = img.type;
        if (counts[t] !== undefined) counts[t]++;
      });
      
      document.getElementById('sceneCount').textContent = counts.scene;
      document.getElementById('whiteCount').textContent = counts.white;
      document.getElementById('setCount').textContent = counts.set;
      document.getElementById('detailCount').textContent = counts.detail;
      
      // 鏇存柊 imageTypes 绱㈠紩
      state.imageTypes = { scene: [], white: [], set: [], detail: [] };
      state.images.forEach((img, i) => {
        const t = img.type;
        if (state.imageTypes[t]) state.imageTypes[t].push(i);
      });
      
      // 鎵归噺妯″紡鏃跺悓姝ユ洿鏂拌缃潰鏉?
      if (state.batchMode) renderBatchTypeSettings();
    }
    
    function cycleImageType(index) {
      const types = ['scene', 'white', 'set', 'detail', null];
      const img = state.images[index];
      if (!img) return;
      const currentIdx = types.indexOf(img.type);
      img.type = types[(currentIdx + 1) % types.length];
      updateImageTypeStats();
      renderImageList();
      render();
    }
    
    // 灏嗘煇涓被鍨嬬殑鍥剧墖缁勫簲鐢ㄥ埌妯℃澘浣嶇疆
    function applyTypeGroupToTemplate(type) {
      const typeCount = state.images.filter(img => img.type === type).length;
      if (typeCount === 0) { showToast('璇ョ被鍨嬫病鏈夊浘鐗?, true); return; }
      
      // 鎵€鏈変綅缃兘璁句负璇ョ被鍨?
      state.slotTypes = Array(state.templateCount).fill(type);
      applySlotTypes();
      const name = { scene: '鍦烘櫙鍥?, white: '鐧藉簳鍥?, set: '濂楄鍥?, detail: '缁嗚妭鍥? }[type];
      showToast(`宸插皢鎵€鏈変綅缃涓?{name}`);
    }
    
    // 鏅鸿兘搴旂敤鍥剧墖缁勫埌妯℃澘
    function smartApplyToTemplate() {
      if (state.images.length === 0) { showToast('娌℃湁鍙敤鐨勫浘鐗?, true); return; }
      
      // 鑷姩鎺ㄦ柇slotTypes锛氭牴鎹悇绫诲瀷缁勭殑鏁伴噺鏅鸿兘鍒嗛厤
      const typeGroups = { scene: [], white: [], set: [], detail: [] };
      state.images.forEach((img, i) => {
        if (typeGroups[img.type]) typeGroups[img.type].push(i);
      });
      
      const availableTypes = Object.keys(typeGroups).filter(t => typeGroups[t].length > 0);
      if (availableTypes.length === 0) { showToast('娌℃湁宸插垎绫荤殑鍥剧墖', true); return; }
      
      const templateCount = state.templateCount;
      initSlotTypes();
      
      if (availableTypes.length === 1) {
        // 鍙湁涓€绉嶇被鍨嬶紝鍏ㄩ儴鐢ㄨ绫诲瀷
        state.slotTypes = Array(templateCount).fill(availableTypes[0]);
      } else {
        // 澶氱绫诲瀷锛氭寜榛樿绛栫暐鍒嗛厤锛堝満鏅啋鐧藉簳鈫掑瑁呪啋缁嗚妭锛?
        const priorityOrder = ['scene', 'white', 'set', 'detail'];
        let slotIdx = 0;
        for (const type of priorityOrder) {
          if (typeGroups[type].length > 0 && slotIdx < templateCount) {
            state.slotTypes[slotIdx++] = type;
          }
        }
      }
      
      applySlotTypes();
      const names = [...new Set(state.slotTypes)].map(t => 
        ({ scene: '鍦烘櫙鍥?, white: '鐧藉簳鍥?, set: '濂楄鍥?, detail: '缁嗚妭鍥? })[t] || t
      ).join('銆?);
      showToast(`鏅鸿兘鍒嗛厤锛?{names}`);
    }
    
    function handleFiles(files) {
      const filesToProcess = Array.from(files);
      let processedCount = 0;
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            state.images.push({ 
              src: e.target.result, 
              img: img, 
              name: file.name,
              type: null,  // 涓婁紶鏃朵笉鍖哄垎绫诲瀷锛岀敱AI鑷姩鍒嗙被
              scale: 1,
              offsetX: 0,
              offsetY: 0
            });
            document.getElementById('imageCount').textContent = state.images.length;
            updateImageTypeStats();
            renderImageList();
            render();
            
            processedCount++;
            if (processedCount === filesToProcess.length) {
              // 棣栨涓婁紶鍥剧墖鏃惰嚜鍔ㄥ垎绫伙紝鍚庣画涓婁紶涓嶅啀鑷姩鍒嗙被锛堥伩鍏嶅崱椤匡級
              if (!state.classifiedOnce) {
                state.classifiedOnce = true;
                autoClassifyImages();
              } else {
                // 鍚庣画涓婁紶鍙鏈垎绫诲浘鐗囧垎绫?
                const unclassified = state.images.filter(img => !img.type).length;
                if (unclassified > 0) {
                  autoClassifyImages();
                }
              }
            }
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
    
    // ========== 鍥剧墖鑷姩鍒嗙被 ==========
    
    // 灏嗗浘鐗囩缉灏忓埌鎸囧畾鏈€澶ц竟闀匡紝杩斿洖base64锛堜笉鍚墠缂€锛?
    function resizeImageToBase64(img, maxSize = 500) {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const ratio = Math.min(maxSize / w, maxSize / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // 杩斿洖绾痓ase64锛堝幓鎺塪ata:image/...;base64,鍓嶇紑锛?
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.split(',')[1];
    }
    
    // ===== 鏂囨。鏂囨鐢熸垚 =====
    let copyLang = 'zh';
    let lastCopyData = null; // 缂撳瓨涓婃缁撴灉鐢ㄤ簬璇█鍒囨崲
    
    function setCopyLang(lang) {
      copyLang = lang;
      document.getElementById('langZh').style.background = lang === 'zh' ? '#3b82f6' : 'transparent';
      document.getElementById('langZh').style.color = lang === 'zh' ? '#fff' : '#6b7280';
      document.getElementById('langEn').style.background = lang === 'en' ? '#3b82f6' : 'transparent';
      document.getElementById('langEn').style.color = lang === 'en' ? '#fff' : '#6b7280';
      // 濡傛灉宸叉湁鏂囨锛屽垏鎹㈣瑷€鏃剁洿鎺ュ垏鎹㈡樉绀?
      if (lastCopyData) {
        const list = copyLang === 'en' ? (lastCopyData.copyListEn || lastCopyData.copyList) : lastCopyData.copyList;
        renderAICopyList(list, lastCopyData.source, lastCopyData.productData);
      }
    }
    
    async function generateAICopy(aiOptimize = false) {
      const productName = document.getElementById('aiProductName').value.trim();
      if (!productName) { showToast('璇疯緭鍏ヤ骇鍝佸悕绉?, true); return; }
      
      const productInfo = document.getElementById('aiProductInfo').value.trim();
      const token = getToken();
      if (!token) { showToast('璇峰厛鐧诲綍', true); return; }
      
      const btn = aiOptimize ? document.getElementById('aiOptBtn') : document.getElementById('aiGenBtn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = aiOptimize ? 'AI浼樺寲涓?..' : '鎼滅储涓?..';
      
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
          throw new Error(err.error || '鐢熸垚澶辫触');
        }
        
        const data = await res.json();
        if (data.success && data.copyList) {
          lastCopyData = data;
          const list = copyLang === 'en' ? (data.copyListEn || data.copyList) : data.copyList;
          renderAICopyList(list, data.source, data.productData);
          
          const sourceLabel = data.source === 'document' ? '鏂囨。瑙ｆ瀽' : data.source === 'document+ai' ? '鏂囨。+AI浼樺寲' : data.source === 'ai' ? 'AI鐢熸垚' : '榛樿';
          const fileCount = data.matchedFiles?.length || 0;
          showToast(`${sourceLabel} ${list.length} 缁勬枃妗?{fileCount > 0 ? ' (鍖归厤' + fileCount + '涓枃妗?' : ''}`);
        }
      } catch (e) {
        showToast('鏂囨鐢熸垚澶辫触: ' + e.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
    
    function renderAICopyList(copyList, source, productData) {
      const container = document.getElementById('aiCopyList');
      container.style.display = 'block';
      
      const sourceLabel = source === 'document' ? '馃搫 鏂囨。瑙ｆ瀽' : source === 'document+ai' ? '馃搫+鉁?AI浼樺寲' : source === 'ai' ? '鉁?AI鐢熸垚' : '馃搵 榛樿';
      
      let html = `<div style="font-size:9px;color:#9ca3af;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
        <span>鏉ユ簮: ${sourceLabel}</span>
        <span style="cursor:pointer;color:#3b82f6;" onclick="setCopyLang(copyLang==='zh'?'en':'zh')">${copyLang === 'zh' ? '鍒囨崲鑻辨枃 鈻? : '鈼?鍒囨崲涓枃'}</span>
      </div>`;
      
      // 浜у搧淇℃伅鎽樿
      if (productData && productData.product_name) {
        html += `<div style="font-size:9px;color:#6b7280;margin-bottom:4px;padding:3px 6px;background:#f0f9ff;border-radius:3px;">
          ${productData.product_name}${productData.product_name_en ? ' / ' + productData.product_name_en : ''}
          ${productData.material ? ' 路 ' + productData.material : ''}
        </div>`;
      }
      
      html += copyList.map((item, i) => `
        <div class="ai-copy-item" onclick="applyAICopy(${i})" data-title="${item.title.replace(/"/g, '&quot;')}" data-subtitle="${item.subtitle.replace(/"/g, '&quot;')}" style="padding:5px 8px;margin-bottom:3px;background:#fff;border:1px solid #e5e7eb;border-radius:4px;cursor:pointer;font-size:11px;transition:all 0.15s;">
          <div style="font-weight:600;color:#111827;">${item.title}</div>
          <div style="color:#6b7280;font-size:10px;">${item.subtitle}</div>
        </div>
      `).join('');
      
      container.innerHTML = html;
      
      // 鏄剧ずAI浼樺寲鎸夐挳
      const optBar = document.getElementById('aiOptimizeBar');
      if (source === 'document' || source === 'default') {
        optBar.style.display = 'block';
      } else {
        optBar.style.display = 'none';
      }
      
      // 鎮仠鏁堟灉
      container.querySelectorAll('.ai-copy-item').forEach(el => {
        el.addEventListener('mouseenter', () => { el.style.borderColor = '#3b82f6'; el.style.background = '#eff6ff'; });
        el.addEventListener('mouseleave', () => { el.style.borderColor = '#e5e7eb'; el.style.background = '#fff'; });
      });
    }
    
    function applyAICopy(index) {
      const items = document.querySelectorAll('.ai-copy-item');
      const item = items[index];
      if (!item) return;
      
      const title = item.dataset.title;
      const subtitle = item.dataset.subtitle;
      
      state.mainTitle = title;
      state.subTitle = subtitle;
      document.getElementById('mainTitle').value = title;
      document.getElementById('subTitle').value = subtitle;
      render();
      showToast('鏂囨宸插簲鐢?);
    }
    
    // ===== 閰嶈壊鏂规 =====
    // 鏂规 1-2: 鍩虹淇濈暀 | 鏂规 3-8: 浠庤璁℃ā鏉挎彁鍙?
    const colorSchemes = [
      // === 鍩虹淇濈暀 ===
      { name: '缁忓吀鐧?, accent: '#ffffff', titleColor: '#ffffff', subtitleColor: '#f3f4f6', textBg: true, textBgColor: 'rgba(0,0,0,0.55)', shadow: true, stroke: false, dimColor: '#ffffff', dimTextColor: '#ffffff' },
      { name: '鏋佺畝榛?, accent: '#111827', titleColor: '#111827', subtitleColor: '#4b5563', textBg: false, textBgColor: 'rgba(255,255,255,0.9)', shadow: false, stroke: false, dimColor: '#111827', dimTextColor: '#111827' },
      // === 妯℃澘1 路 娓呮柊缁?(E-commerce Clean) ===
      // 涓昏壊 #059669 | 寮鸿皟 #F97316 | 娓愬彉缁垮簳 | 鑷劧鍋ュ悍
      { name: '娓呮柊缁?, accent: '#059669', titleColor: '#ffffff', subtitleColor: '#d1fae5', textBg: true, textBgColor: 'rgba(0,0,0,0.45)', shadow: true, stroke: false, dimColor: '#059669', dimTextColor: '#059669' },
      // === 妯℃澘2 路 濂㈠崕閲?(E-commerce Luxury) ===
      // 涓昏壊 #1C1917 | 閲戣壊 #CA8A04 | 鏆楄皟濂㈠崕 | 閲戠當璐ㄦ劅
      { name: '濂㈠崕閲?, accent: '#CA8A04', titleColor: '#fef3c7', subtitleColor: '#d4a017', textBg: true, textBgColor: 'rgba(12,10,9,0.6)', shadow: true, stroke: false, dimColor: '#CA8A04', dimTextColor: '#CA8A04' },
      // === 妯℃澘3 路 鏃跺皻绮?(Creative Agency) ===
      // 涓昏壊 #EC4899 | 寮鸿皟 #06B6D4 | Aurora娓愬彉 | 鍓嶅崼娲诲姏
      { name: '鏃跺皻绮?, accent: '#EC4899', titleColor: '#ffffff', subtitleColor: '#fce7f3', textBg: true, textBgColor: 'rgba(131,24,67,0.55)', shadow: true, stroke: false, dimColor: '#EC4899', dimTextColor: '#EC4899' },
      // === 妯℃澘4 路 绉戞妧钃?(SaaS / Tech) ===
      // 涓昏壊 #2563EB | 寮鸿皟 #F97316 | 缃戞牸鍏夋晥 | 涓撲笟鍒涙柊
      { name: '绉戞妧钃?, accent: '#2563EB', titleColor: '#ffffff', subtitleColor: '#93c5fd', textBg: true, textBgColor: 'rgba(30,41,59,0.6)', shadow: true, stroke: false, dimColor: '#3b82f6', dimTextColor: '#3b82f6' },
      // === 妯℃澘5 路 榛戠櫧鏋佺畝 (Minimalism & Swiss Style) ===
      // 绾粦 #000000 / 绾櫧 #FFFFFF | 鍑犱綍鍒嗗壊 | 鏋佽嚧鍑忔硶
      { name: '榛戠櫧鏋佺畝', accent: '#000000', titleColor: '#ffffff', subtitleColor: '#d1d5db', textBg: true, textBgColor: 'rgba(0,0,0,0.55)', shadow: false, stroke: false, dimColor: '#ffffff', dimTextColor: '#ffffff' },
      // === 妯℃澘6 路 楂樼骇鐏?(Neutral Gray / Corporate Trust) ===
      // 鐏板害灞傜骇 #0F172A 鈫?#F8FAFC | 鏌斿拰鍙犲眰 | 娌夌ǔ淇¤禆
      { name: '楂樼骇鐏?, accent: '#64748B', titleColor: '#f1f5f9', subtitleColor: '#94a3b8', textBg: true, textBgColor: 'rgba(15,23,42,0.55)', shadow: true, stroke: false, dimColor: '#94a3b8', dimTextColor: '#94a3b8' },
    ];
    
    function initColorSchemes() {
      const container = document.getElementById('colorSchemes');
      container.innerHTML = colorSchemes.map((scheme, i) => {
        // 棰勮锛氭枃瀛楄儗鏅壊 + 涓诲壇鏍囬棰滆壊 + 寮鸿皟鑹叉爣璇?
        const bg = scheme.textBg ? scheme.textBgColor : 'transparent';
        const border = scheme.textBg ? 'none' : '1px dashed #d1d5db';
        return `<div onclick="applyColorScheme(${i})" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;transition:all 0.15s;width:52px;" 
          onmouseenter="this.style.borderColor='#3b82f6';this.style.transform='scale(1.05)'" 
          onmouseleave="this.style.borderColor='#e5e7eb';this.style.transform='scale(1)'">
          <div style="width:100%;height:28px;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;position:relative;">
            <div style="font-size:9px;font-weight:700;color:${scheme.titleColor};line-height:1;">Aa</div>
            <div style="position:absolute;bottom:2px;left:3px;width:6px;height:6px;border-radius:50%;background:${scheme.accent};"></div>
            <div style="position:absolute;bottom:3px;right:4px;font-size:5px;color:${scheme.subtitleColor};">鍓?/div>
          </div>
          <div style="font-size:8px;color:#6b7280;padding:2px 0;white-space:nowrap;">${scheme.name}</div>
        </div>`;
      }).join('');
    }
    
    function applyColorScheme(index) {
      const scheme = colorSchemes[index];
      if (!scheme) return;

      const accent = scheme.accent || scheme.titleColor;

      // === 涓绘爣棰?鍓爣棰?===
      state.titleColor = scheme.titleColor;
      state.subtitleColor = scheme.subtitleColor;

      // === 鏂囧瓧鏁堟灉 ===
      state.textBg = scheme.textBg;
      state.textBgColor = scheme.textBgColor;
      state.shadow = scheme.shadow;
      state.stroke = scheme.stroke;

      // === 鏍囨敞棰滆壊锛堝叏灞€ + 姣忔潯鏍囨敞锛?===
      state.dimColor = scheme.dimColor;
      state.dimTextColor = scheme.dimTextColor;
      if (state.dimensions) {
        state.dimensions.forEach(d => {
          d.lineColor = scheme.dimColor;
          d.textColor = scheme.dimTextColor;
        });
      }

      // === 涓绘爣棰?鍓爣棰樺姞绮?===
      state.mainTitleWeight = 'bold';
      state.subTitleWeight = 'normal';

      // === 娲剧敓瀛愭牱寮忛鑹?===
      state.detailBgColor = _lighten(accent, 0.88);
      state.detailCardColor = _lighten(accent, 0.70);
      state.detailTitleColor = accent;
      state.detailTextColor = _darken(accent, 0.5);
      state.cardBgColor = _lighten(accent, 0.92);
      state.cardTitleColor = _darken(accent, 0.6);
      state.cardSubtitleColor = _darken(accent, 0.45);
      state.maskBgColor = _darken(accent, 0.25);
      state.maskCardColor = _lighten(accent, 0.35);
      state.maskNumberBg = accent;
      state.maskTextColor = '#ffffff';
      state.useDisplayBgColor = _lighten(accent, 0.90);
      state.useDisplayCardBg = _lighten(accent, 0.78);
      state.useDisplayTitleColor = _darken(accent, 0.55);
      state.useDisplayBorderColor = _lighten(accent, 0.45);
      state.circleBorderColor = '#ffffff';
      state.mainDetailBgColor = _lighten(accent, 0.85);
      state.mainDetailMainBorder = _lighten(accent, 0.5);
      state.mainDetailDetailBorder = _lighten(accent, 0.5);

      // === 鍚屾 UI 鎺т欢 ===
      syncAllColorControls(scheme);

      // === 绔嬪嵆寮哄埗閲嶆柊娓叉煋 ===
      // 1. 娓呴櫎浠讳綍娓叉煋缂撳瓨
      renderCtx = null;
      
      // 2. 濡傛灉鏈夋爣娉紝鍏堟竻绌篕onva灞傞槻姝㈤噸鍙?
      if (konvaStage) {
        konvaStage.destroyChildren();
      }
      
      // 3. 绔嬪嵆鎵цCanvas娓叉煋
      if (typeof render === 'function') {
        render();
      } else {
        console.error('render鍑芥暟鏈畾涔夛紒');
      }
      
      // 4. 濡傛灉鍚敤浜嗘爣娉紝閲嶅缓Konva灞?
      if (state.dimEnabled && state.dimensions && state.dimensions.length > 0) {
        if (typeof initKonvaOverlay === 'function') {
          // 浣跨敤setTimeout纭繚Canvas娓叉煋瀹屾垚鍚庡啀鍒濆鍖朘onva
          setTimeout(() => {
            initKonvaOverlay();
          }, 0);
        } else {
          console.error('initKonvaOverlay鍑芥暟鏈畾涔夛紒');
        }
      }

      showToast(`宸插簲鐢ㄩ厤鑹? ${scheme.name}`);
    }

    // 鎻愬彇 UI 鍚屾涓虹嫭绔嬪嚱鏁?
    function syncAllColorControls(scheme) {
      // 涓绘枃瀛楅鑹?
      document.getElementById('titleColor').value = scheme.titleColor;
      document.getElementById('titleColorText').value = scheme.titleColor;
      document.getElementById('subtitleColor').value = scheme.subtitleColor;
      document.getElementById('subtitleColorText').value = scheme.subtitleColor;

      // 鏍囨敞棰滆壊
      const dimBlock = document.getElementById('dimColorBlock');
      if (dimBlock) dimBlock.style.background = scheme.dimColor;
      const dc = document.getElementById('dimColor');
      if (dc) dc.value = scheme.dimColor;
      const dct = document.getElementById('dimColorText');
      if (dct) dct.value = scheme.dimColor;
      const dtb = document.getElementById('dimTextColorBlock');
      if (dtb) dtb.style.background = scheme.dimTextColor;
      const dtc = document.getElementById('dimTextColor');
      if (dtc) dtc.value = scheme.dimTextColor;
      const dtct = document.getElementById('dimTextColorText');
      if (dtct) dtct.value = scheme.dimTextColor;

      // 鏁堟灉鎸夐挳
      document.querySelectorAll('.style-btn[data-style="shadow"]').forEach(b => b.classList.toggle('active', scheme.shadow));
      document.querySelectorAll('.style-btn[data-style="stroke"]').forEach(b => b.classList.toggle('active', scheme.stroke));
      document.querySelectorAll('.style-btn[data-style="textBg"]').forEach(b => b.classList.toggle('active', scheme.textBg));
      document.querySelectorAll('.style-btn[data-style="bold"]').forEach(b => b.classList.add('active'));

      // 瀛楅噸
      const mw = document.getElementById('mainTitleWeight');
      if (mw) mw.value = 'bold';
      const sw = document.getElementById('subTitleWeight');
      if (sw) sw.value = 'normal';

      // 鏂囧瓧鑳屾櫙閫忔槑搴︽帶鍒?
      const textBgRow = document.getElementById('textBgColorRow');
      if (textBgRow) textBgRow.style.opacity = scheme.textBg ? '1' : '0.35';
      
      const rgbMatch = scheme.textBgColor.match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2,'0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2,'0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2,'0');
        document.getElementById('textBgColorPicker').value = '#' + r + g + b;
        document.getElementById('textBgOpacity').value = Math.round(parseFloat(rgbMatch[4]) * 100);
        document.getElementById('textBgOpacityVal').textContent = Math.round(parseFloat(rgbMatch[4]) * 100) + '%';
      }
      
      // 鏂囧瓧鑳屾櫙鍦嗚
      const textBgRadius = document.getElementById('textBgRadius');
      if (textBgRadius) {
        textBgRadius.value = state.textBgRadius || 16;
        const radiusVal = document.getElementById('textBgRadiusVal');
        if (radiusVal) radiusVal.textContent = (state.textBgRadius || 16) + 'px';
      }

      // 瀛愭牱寮忔帶浠?
      ['detailBgColor','detailCardColor','detailTitleColor','detailTextColor',
       'cardBgColor','cardTitleColor','cardSubtitleColor',
       'maskBgColor','maskCardColor','maskNumberBg','maskTextColor',
       'useDisplayBgColor','useDisplayCardBg','useDisplayTitleColor','useDisplayBorderColor',
       'circleBorderColor','mainDetailBgColor','mainDetailMainBorder','mainDetailDetailBorder'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = state[id] || '#000000';
      });
    }
    
    // 鑷姩鍒嗙被鎵€鏈夋湭鍒嗙被鐨勫浘鐗囷紙涓婁紶鍚庤嚜鍔ㄨ皟鐢級
    async function autoClassifyImages() {
      const token = getToken();
      if (!token) { showToast('璇峰厛鐧诲綍', true); return; }
      
      if (state.images.length === 0) { showToast('璇峰厛涓婁紶鍥剧墖', true); return; }
      
      // 鎵惧嚭鏈垎绫荤殑鍥剧墖
      let toClassify = state.images
        .map((img, i) => ({ img, i }))
        .filter(item => !item.img.type);
      
      if (toClassify.length === 0) {
        showToast('鎵€鏈夊浘鐗囧凡鍒嗙被锛屾棤闇€閲嶅鍒嗙被');
        return;
      }
      
      showToast(`姝ｅ湪AI鍒嗙被 ${toClassify.length} 寮犲浘鐗?..`);
      
      try {
        // 缂╁皬鍥剧墖骞惰浆涓篵ase64
        const base64Images = toClassify.map(item => {
          return resizeImageToBase64(item.img.img || item.img, 500);
        });
        
        const res = await fetch('/api/image-classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ images: base64Images })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '鍒嗙被澶辫触');
        }
        
        const data = await res.json();
        
        if (data.success && data.results) {
          let classifiedCount = 0;
          data.results.forEach((result, idx) => {
            if (toClassify[idx] && result.type) {
              state.images[toClassify[idx].i].type = result.type;
              classifiedCount++;
            }
          });
          
          updateImageTypeStats();
          renderImageList();
          render();
          showToast(`宸茶嚜鍔ㄥ垎绫?${classifiedCount} 寮犲浘鐗嘸);
        }
      } catch (e) {
        console.error('鑷姩鍒嗙被澶辫触:', e);
        showToast('鑷姩鍒嗙被澶辫触: ' + e.message, true);
      }
    }
    
    function renderImageList() {
      const types = ['scene', 'white', 'set', 'detail', null];
      const typeFullNames = { scene: '鍦烘櫙鍥?, white: '鐧藉簳鍥?, set: '濂楄鍥?, detail: '缁嗚妭鍥? };
      
      // 鎸夌被鍨嬪垎缁勬覆鏌?
      types.forEach(type => {
        const listId = type ? `${type}List` : 'untypedList';
        const groupId = type ? `${type}Group` : 'untypedGroup';
        const countId = type ? `${type}Count` : 'untypedCount';
        
        const list = document.getElementById(listId);
        const group = document.getElementById(groupId);
        const countEl = document.getElementById(countId);
        
        if (!list || !group) return;
        
        // 绛涢€夎绫诲瀷鐨勫浘鐗?
        const typeImages = state.images.map((img, i) => ({ img, i })).filter(item => item.img.type === type);
        
        // 鏇存柊璁℃暟
        if (countEl) countEl.textContent = typeImages.length;
        
        // 濮嬬粓鏄剧ず鎵€鏈夊垎绫伙紙鍗充娇涓虹┖锛屾柟渚挎嫋鍏ワ級
        group.style.display = 'block';
        
        // 娓叉煋鍥剧墖缂╃暐鍥?
        list.innerHTML = typeImages.map(({ img, i }) => {
          return `
          <div class="image-item ${state.multiSelectedIndices.includes(i) ? 'selected' : ''}" 
               data-image-index="${i}"
               onclick="onImageListClick(${i}, event)" 
               draggable="true" 
               style="${state.batchMode ? 'padding-bottom:28px;' : ''}">
            <img src="${img.src}" alt="" draggable="false">
            <span class="order">${i + 1}</span>
            ${state.batchMode ? `<div style="position:absolute;bottom:2px;left:2px;right:2px;display:flex;gap:2px;z-index:3;">
              <span style="flex:1;background:#6366f1;color:white;font-size:8px;padding:2px;border-radius:2px;text-align:center;">${TYPE_NAMES[img.type] || '鏈垎绫?}</span>
            </div>` : ''}
            <button class="delete-btn" onclick="event.stopPropagation(); deleteImage(${i})">脳</button>
          </div>
        `}).join('');
      });
      
      // 缁戝畾drop zone浜嬩欢锛堟瘡娆℃覆鏌撳悗閲嶆柊缁戝畾锛?
      bindDropZoneEvents();
      
      // 缁戝畾缂╃暐鍥炬嫋鎷戒簨浠讹紙浜嬩欢濮旀墭锛?
      const imageListByType = document.getElementById('imageListByType');
      if (imageListByType && !imageListByType._dragBound) {
        imageListByType._dragBound = true;
        imageListByType.addEventListener('dragstart', (e) => {
          const item = e.target.closest('.image-item');
          if (!item) return;
          const index = parseInt(item.dataset.imageIndex);
          if (isNaN(index)) return;
          
          let dragIndices = [index];
          if (state.multiSelectedIndices.includes(index) && state.multiSelectedIndices.length > 1) {
            dragIndices = [...state.multiSelectedIndices];
          }
          e.dataTransfer.setData('text/plain', JSON.stringify(dragIndices));
          e.dataTransfer.effectAllowed = 'move';
        });
      }
    }
    
    // 缁戝畾鍒嗙被鎷栨嫿鍖哄煙浜嬩欢
    function bindDropZoneEvents() {
      document.querySelectorAll('.drop-zone').forEach(zone => {
        const targetType = zone.dataset.type;
        
        zone.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          zone.classList.add('drag-over');
        };
        zone.ondragleave = (e) => {
          // 鍙湪鐪熸绂诲紑zone鏃剁Щ闄ゆ牱寮?
          if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove('drag-over');
          }
        };
        zone.ondrop = (e) => {
          e.preventDefault();
          zone.classList.remove('drag-over');
          handleTypeDrop(e, targetType);
        };
      });
      
      // header涔熶綔涓篸rop target
      document.querySelectorAll('.image-type-header[data-type]').forEach(header => {
        const targetType = header.dataset.type;
        const row = header.nextElementSibling;
        
        header.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (row) row.classList.add('drag-over');
        };
        header.ondragleave = (e) => {
          if (row && !row.contains(e.relatedTarget) && e.relatedTarget !== row) {
            row.classList.remove('drag-over');
          }
        };
        header.ondrop = (e) => {
          e.preventDefault();
          if (row) row.classList.remove('drag-over');
          handleTypeDrop(e, targetType);
        };
      });
    }
    
    // ========== 鍥剧墖鍒嗙被鎷栨嫿 ==========
    
    // 鎷栨嫿鏀剧疆鍒板垎绫诲尯鍩?
    function handleTypeDrop(event, targetType) {
      // 绉婚櫎鎵€鏈塪rag-over鏍峰紡
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      
      try {
        const dragIndices = JSON.parse(event.dataTransfer.getData('text/plain'));
        if (!Array.isArray(dragIndices)) return;
        
        // 妫€娴嬫槸鍚︽嫋鎷藉埌浜嗘煇涓缉鐣ュ浘涓婏紙鐢ㄤ簬鍚屽垎绫诲唴鎺掑簭锛?
        const dropTarget = event.target.closest('.image-item');
        const dropTargetIndex = dropTarget ? parseInt(dropTarget.dataset.imageIndex) : -1;
        
        let needReorder = false;
        let reorderTargetIdx = -1;
        
        // 濡傛灉鎷栨嫿鐩爣鍦ㄥ悓鍒嗙被鍐咃紝鎵ц鎺掑簭
        if (dropTargetIndex >= 0 && state.images[dropTargetIndex] && state.images[dropTargetIndex].type === (targetType || null)) {
          // 妫€鏌ユ槸鍚︽墍鏈夋嫋鎷藉浘鐗囬兘鍦ㄥ悓涓€鍒嗙被
          const allSameType = dragIndices.every(idx => state.images[idx] && state.images[idx].type === (targetType || null));
          if (allSameType && dragIndices.length > 0) {
            reorderTargetIdx = dropTargetIndex;
            needReorder = true;
          }
        }
        
        if (needReorder) {
          // 鍚屽垎绫诲唴鎺掑簭锛氬皢鎷栨嫿鍥剧墖绉诲埌鐩爣浣嶇疆
          const targetImg = state.images[reorderTargetIdx];
          const dragImgs = dragIndices.map(idx => state.images[idx]);
          
          // 浠庢暟缁勪腑绉婚櫎鎷栨嫿鍥剧墖锛堜粠鍚庡線鍓嶅垹閬垮厤绱㈠紩鍋忕Щ锛?
          const sortedIndices = [...dragIndices].sort((a, b) => b - a);
          sortedIndices.forEach(idx => state.images.splice(idx, 1));
          
          // 鎵惧埌鐩爣浣嶇疆鐨勬柊绱㈠紩
          let newTargetIdx = state.images.indexOf(targetImg);
          if (newTargetIdx === -1) newTargetIdx = state.images.length;
          
          // 鎻掑叆鎷栨嫿鍥剧墖鍒扮洰鏍囦綅缃?
          dragImgs.forEach((img, i) => {
            state.images.splice(newTargetIdx + i, 0, img);
          });
          
          updateImageTypeStats();
          renderImageList();
          // 閲嶆柊鎸塻lotTypes鍒嗛厤锛岀‘淇濈被鍨嬩笌浣嶇疆瀵瑰簲
          applySlotTypes();
          if (state.batchMode) renderBatchTypeSettings();
          showToast('鍥剧墖椤哄簭宸茶皟鏁?);
          return;
        }
        
        // 璺ㄥ垎绫绘嫋鎷斤細鏀瑰彉鍥剧墖鍒嗙被
        let changed = 0;
        dragIndices.forEach(idx => {
          if (idx >= 0 && idx < state.images.length && state.images[idx].type !== (targetType || null)) {
            state.images[idx].type = targetType || null;
            changed++;
          }
        });
        
        if (changed > 0) {
          updateImageTypeStats();
          renderImageList();
          applySlotTypes();
          if (state.batchMode) renderBatchTypeSettings();
          const typeName = targetType ? ({ scene: '鍦烘櫙鍥?, white: '鐧藉簳鍥?, set: '濂楄鍥?, detail: '缁嗚妭鍥? })[targetType] : '鏈垎绫?;
          showToast(`宸插皢 ${changed} 寮犲浘鐗囩Щ鑷?{typeName}`);
        }
      } catch (e) {
        // ignore
      }
    }
    
    // ========== 鍥剧墖璋冩暣锛堝父椹婚潰鏉匡級 ==========
    
    // 鍥剧墖鍒楄〃鐐瑰嚮锛堟敮鎸丼hift澶氶€夛級
    function onImageListClick(index, event) {
      if (event && event.shiftKey) {
        // Shift+鐐瑰嚮锛氬閫?鍙栨秷閫夋嫨
        const idx = state.multiSelectedIndices.indexOf(index);
        if (idx > -1) {
          state.multiSelectedIndices.splice(idx, 1);
        } else {
          state.multiSelectedIndices.push(index);
        }
        if (state.multiSelectedIndices.length > 0) {
          setActiveImage(state.multiSelectedIndices[state.multiSelectedIndices.length - 1]);
        }
      } else {
        // 鏅€氱偣鍑伙細娓呴櫎澶氶€夛紝璁句负娲昏穬
        state.multiSelectedIndices = [index];
        setActiveImage(index);
      }
      updateImageAdjustPanelForMulti();
      renderImageList();
      render();
    }
    
    // 澶氶€夋椂鏇存柊璋冩暣闈㈡澘鏍囬
    function updateImageAdjustPanelForMulti() {
      const count = state.multiSelectedIndices.length;
      if (count > 1) {
        document.getElementById('adjustImageName').textContent = `(宸查€?{count}寮?`;
      }
    }
    
    // 璁剧疆娲昏穬鍥剧墖
    function setActiveImage(index) {
      if (index < 0 || index >= state.images.length) {
        state.activeImageIndex = -1;
        document.getElementById('imageAdjustPanel').style.display = 'none';
        return;
      }
      state.activeImageIndex = index;
      // 濡傛灉璇ュ浘鐗囦笉鍦ㄥ閫夊垪琛ㄤ腑锛屽皢鍏惰涓哄敮涓€閫変腑
      if (!state.multiSelectedIndices.includes(index)) {
        state.multiSelectedIndices = [index];
      }
      const img = state.images[index];
      const panel = document.getElementById('imageAdjustPanel');
      panel.style.display = 'block';
      
      document.getElementById('adjustImageName').textContent = `(${index + 1}/${state.images.length} ${img.name || ''})`;
      document.getElementById('imgScaleValue').value = Math.round(img.scale * 100);
      document.getElementById('imgScaleDisplay').value = Math.round(img.scale * 100);
      document.getElementById('imgOffsetX').value = img.offsetX || 0;
      document.getElementById('imgOffsetXDisplay').value = img.offsetX || 0;
      document.getElementById('imgOffsetY').value = img.offsetY || 0;
      document.getElementById('imgOffsetYDisplay').value = img.offsetY || 0;
      
      render();
    }
    
    // 鍥剧墖璋冩暣闈㈡澘鍙樺寲鏃?
    function onImageAdjust() {
      const idx = state.activeImageIndex;
      if (idx < 0 || idx >= state.images.length) return;
      
      const scale = parseInt(document.getElementById('imgScaleValue').value) / 100;
      const offsetX = parseInt(document.getElementById('imgOffsetX').value);
      const offsetY = parseInt(document.getElementById('imgOffsetY').value);
      
      document.getElementById('imgScaleDisplay').value = Math.round(scale * 100);
      document.getElementById('imgOffsetXDisplay').value = offsetX;
      document.getElementById('imgOffsetYDisplay').value = offsetY;
      
      // 濡傛灉澶氶€夛紝璋冩暣鎵€鏈夐€変腑鍥剧墖
      if (state.multiSelectedIndices.length > 1) {
        state.multiSelectedIndices.forEach(i => {
          if (i < state.images.length) {
            state.images[i].scale = Math.max(0.1, Math.min(3, scale));
            state.images[i].offsetX = offsetX;
            state.images[i].offsetY = offsetY;
          }
        });
      } else {
        state.images[idx].scale = Math.max(0.1, Math.min(3, scale));
        state.images[idx].offsetX = offsetX;
        state.images[idx].offsetY = offsetY;
      }
      
      renderImageList();
      render();
    }
    
    // 閲嶇疆褰撳墠鍥剧墖璋冩暣
    function resetActiveImageAdjust() {
      if (state.multiSelectedIndices.length > 1) {
        state.multiSelectedIndices.forEach(idx => {
          if (idx < state.images.length) {
            state.images[idx].scale = 1;
            state.images[idx].offsetX = 0;
            state.images[idx].offsetY = 0;
          }
        });
      } else {
        const idx = state.activeImageIndex;
        if (idx < 0 || idx >= state.images.length) return;
        state.images[idx].scale = 1;
        state.images[idx].offsetX = 0;
        state.images[idx].offsetY = 0;
      }
      setActiveImage(state.activeImageIndex);
    }
    
    // 搴旂敤褰撳墠鍥剧墖鐨勮皟鏁村埌鎵€鏈夊浘鐗?
    function applyAdjustToAll() {
      const idx = state.activeImageIndex;
      if (idx < 0 || idx >= state.images.length) return;
      const src = state.images[idx];
      state.images.forEach(img => {
        img.scale = src.scale;
        img.offsetX = src.offsetX;
        img.offsetY = src.offsetY;
      });
      renderImageList();
      render();
      showToast('宸插簲鐢ㄥ埌鍏ㄩ儴鍥剧墖');
    }
    
    function deleteImage(index) {
      const deletedType = state.images[index]?.type;
      state.images.splice(index, 1);
      // 娓呯悊澶氶€夌储寮?
      state.multiSelectedIndices = state.multiSelectedIndices
        .filter(i => i !== index)
        .map(i => i > index ? i - 1 : i);
      if (state.activeImageIndex === index) {
        state.activeImageIndex = -1;
        document.getElementById('imageAdjustPanel').style.display = 'none';
      } else if (state.activeImageIndex > index) {
        state.activeImageIndex--;
      }
      document.getElementById('imageCount').textContent = state.images.length;
      updateImageTypeStats();
      renderImageList();
      // 閲嶆柊鎸塻lotTypes鍒嗛厤鍥剧墖锛岀‘淇濆悓绫诲瀷鍥剧墖浼樺厛濉厖
      applySlotTypes();
      if (state.batchMode) renderBatchTypeSettings();
    }
    
    function handleLogoUpload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const isSvg = file.name.toLowerCase().endsWith('.svg');
        const logoName = file.name.replace(/\.[^.]+$/, '');
        
        if (isSvg) {
          let svgContent = content;
          if (content.startsWith('data:image/svg+xml')) {
            svgContent = decodeURIComponent(content.split(',')[1]);
          }
          // SVG鐢╞ase64 data URI瀛樺偍锛岀‘淇濆吋瀹规€?
          const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
          addLogoToLib(logoName, 'svg', svgBase64);
        } else {
          // 鍥剧墖宸茬粡鏄痓ase64 data URI
          addLogoToLib(logoName, 'image', content);
        }
      };
      
      if (file.name.toLowerCase().endsWith('.svg')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
    
    function updateLogoPreview() {
      const uploadZone = document.getElementById('logoUploadZone');
      const settings = document.getElementById('logoSettings');
      
      if (state.logo) {
        if (state.logo.type === 'svg') {
          const coloredSvg = applySvgColor(state.logo.content, state.logoColor);
          const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          uploadZone.innerHTML = `<img src="${url}" alt="logo" style="width:100%;height:100%;object-fit:contain;">`;
        } else {
          uploadZone.innerHTML = `<img src="${state.logo.src}" alt="logo" style="width:100%;height:100%;object-fit:contain;">`;
        }
        settings.style.display = 'block';
      } else {
        uploadZone.innerHTML = '<span id="logoPreviewText">+ 涓婁紶LOGO</span>';
        settings.style.display = 'none';
      }
    }
    
    function removeLogo() {
      state.logo = null;
      setActiveLogoId(null);
      document.getElementById('logoInput').value = '';
      updateLogoPreview();
      renderLogoLibrary(getLogoLib(), null);
      render();
    }
    
    // LOGO灞傚彲瑙佹€у垏鎹?
    function toggleLogoLayer(visible) {
      state.logoLayerVisible = visible;
      const status = document.getElementById('logoLayerStatus');
      if (status) {
        status.textContent = visible ? '鍙' : '宸查殣钘?;
        status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
      }
      render();
    }
    
    // ========== LOGO绱犳潗搴擄紙localStorage鎸佷箙鍖栵級 ==========
    
    const LOGO_LIB_KEY = 'mainImage_logoLibrary';
    const LOGO_ACTIVE_KEY = 'mainImage_activeLogoId';
    
    function getLogoLib() {
      try {
        return JSON.parse(localStorage.getItem(LOGO_LIB_KEY) || '[]');
      } catch { return []; }
    }
    
    function saveLogoLib(lib) {
      localStorage.setItem(LOGO_LIB_KEY, JSON.stringify(lib));
    }
    
    function getActiveLogoId() {
      return localStorage.getItem(LOGO_ACTIVE_KEY) || null;
    }
    
    function setActiveLogoId(id) {
      if (id) {
        localStorage.setItem(LOGO_ACTIVE_KEY, id);
      } else {
        localStorage.removeItem(LOGO_ACTIVE_KEY);
      }
    }
    
    // 鍔犺浇LOGO绱犳潗搴?
    function loadLogoLibrary() {
      const lib = getLogoLib();
      const activeId = getActiveLogoId();
      renderLogoLibrary(lib, activeId);
      
      // 濡傛灉鏈夋縺娲荤殑LOGO锛岃嚜鍔ㄥ簲鐢?
      if (activeId) {
        const activeLogo = lib.find(l => l.id === activeId);
        if (activeLogo) {
          applyLogoData(activeLogo);
        } else {
          // 婵€娲荤殑LOGO宸茶鍒犻櫎锛屾竻闄?
          setActiveLogoId(null);
        }
      }
    }
    
    // 娓叉煋LOGO绱犳潗搴?
    function renderLogoLibrary(lib, activeId) {
      const container = document.getElementById('logoLibrary');
      const countEl = document.getElementById('logoLibCount');
      const activeNameEl = document.getElementById('activeLogoName');
      if (!container) return;
      
      if (countEl) countEl.textContent = `(${lib.length})`;
      
      if (activeNameEl) {
        const active = lib.find(l => l.id === activeId);
        activeNameEl.textContent = active ? `褰撳墠: ${active.name}` : '';
      }
      
      if (lib.length === 0) {
        container.innerHTML = '<div style="width:100%;text-align:center;color:#9ca3af;font-size:11px;padding:10px 0;">鏆傛棤LOGO锛岃涓婁紶</div>';
        return;
      }
      
      container.innerHTML = lib.map(logo => {
        const isActive = logo.id === activeId;
        const border = isActive ? '2px solid #3b82f6' : '2px solid #e5e7eb';
        const bg = isActive ? '#eff6ff' : '#fff';
        const thumbSrc = logo.type === 'svg' ? logo.data : logo.data;
        return `
          <div class="logo-lib-item" data-id="${logo.id}" 
               title="${isActive ? '鐐瑰嚮鍙栨秷浣跨敤' : '鐐瑰嚮浣跨敤姝OGO'}" 
               style="width:52px;height:52px;border:${border};border-radius:6px;cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${bg};position:relative;transition:all 0.2s;">
            ${isActive ? '<div style="position:absolute;top:2px;left:2px;width:14px;height:14px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:9px;">鉁?/span></div>' : ''}
            <img src="${thumbSrc}" alt="${logo.name}" style="max-width:85%;max-height:85%;object-fit:contain;">
            <div class="logo-del-btn" data-id="${logo.id}" 
                 style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#ef4444;color:#fff;border-radius:50%;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.2s;">脳</div>
          </div>
        `;
      }).join('');
      
      // 缁戝畾浜嬩欢
      container.querySelectorAll('.logo-lib-item').forEach(item => {
        // 鐐瑰嚮閫夋嫨/鍙栨秷
        item.addEventListener('click', (e) => {
          if (e.target.closest('.logo-del-btn')) return;
          const id = item.dataset.id;
          const currentActive = getActiveLogoId();
          if (currentActive === id) {
            // 鍙栨秷閫夋嫨
            setActiveLogoId(null);
            state.logo = null;
            updateLogoPreview();
            render();
            renderLogoLibrary(getLogoLib(), null);
          } else {
            // 閫夋嫨姝OGO
            setActiveLogoId(id);
            const lib = getLogoLib();
            const logo = lib.find(l => l.id === id);
            if (logo) applyLogoData(logo);
            renderLogoLibrary(lib, id);
          }
        });
        // 榧犳爣鎮仠鏄剧ず鍒犻櫎
        item.addEventListener('mouseenter', () => {
          const del = item.querySelector('.logo-del-btn');
          if (del) del.style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
          const del = item.querySelector('.logo-del-btn');
          if (del) del.style.opacity = '0';
        });
      });
      
      // 鍒犻櫎鎸夐挳
      container.querySelectorAll('.logo-del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          deleteLogoFromLib(id);
        });
      });
    }
    
    // 搴旂敤LOGO鏁版嵁鍒皊tate
    function applyLogoData(logo) {
      if (logo.type === 'svg') {
        // 浠巇ata URI涓彁鍙朣VG鏂囨湰
        let svgContent = logo.data;
        if (logo.data.startsWith('data:image/svg+xml,')) {
          svgContent = decodeURIComponent(logo.data.split(',').slice(1).join(','));
        }
        state.logo = {
          type: 'svg',
          content: svgContent,
          originalContent: svgContent
        };
      } else {
        const img = new Image();
        img.onload = () => {
          state.logo = {
            type: 'image',
            img: img,
            src: logo.data
          };
          state.logoLayerVisible = true;
          syncLogoLayerUI();
          updateLogoPreview();
          render();
        };
        img.src = logo.data;
        return; // 寮傛鍔犺浇锛宺ender鍦╫nload涓皟鐢?
      }
      state.logoLayerVisible = true;
      syncLogoLayerUI();
      updateLogoPreview();
      render();
    }
    
    // 涓婁紶LOGO鍚庤嚜鍔ㄤ繚瀛樺埌绱犳潗搴?
    function addLogoToLib(name, type, data) {
      const lib = getLogoLib();
      const id = 'logo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const logo = { id, name, type, data, createdAt: Date.now() };
      lib.push(logo);
      saveLogoLib(lib);
      
      // 鑷姩閫変腑鏂颁笂浼犵殑LOGO
      setActiveLogoId(id);
      applyLogoData(logo);
      renderLogoLibrary(lib, id);
      showToast('LOGO宸蹭繚瀛樺埌绱犳潗搴?);
    }
    
    // 浠庣礌鏉愬簱鍒犻櫎LOGO
    function deleteLogoFromLib(id) {
      let lib = getLogoLib();
      lib = lib.filter(l => l.id !== id);
      saveLogoLib(lib);
      
      // 濡傛灉鍒犻櫎鐨勬槸褰撳墠婵€娲荤殑锛屾竻闄?
      if (getActiveLogoId() === id) {
        setActiveLogoId(null);
        state.logo = null;
        updateLogoPreview();
        render();
      }
      
      renderLogoLibrary(lib, getActiveLogoId());
      showToast('LOGO宸插垹闄?);
    }
    
    // 鍚屾LOGO灞傚彲瑙佹€I
    function syncLogoLayerUI() {
      const el = document.getElementById('logoLayerVisible');
      const status = document.getElementById('logoLayerStatus');
      if (el) el.checked = state.logoLayerVisible;
      if (status) {
        status.textContent = state.logoLayerVisible ? '鍙' : '宸查殣钘?;
        status.className = 'toggle-status ' + (state.logoLayerVisible ? 'visible' : 'hidden');
      }
    }
    
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
    
    // 鏇存柊瀛愭牱寮忓睍寮€闈㈡澘鐨勫彲瑙佹€?
    function updateSubstylePanel() {
      const panel = document.getElementById('templateSubstylePanel');
      if (!panel) return;
      
      // 妫€鏌ユ槸鍚︽湁浠讳綍瀛愰€夐」闇€瑕佹樉绀?
      const circleOpts = document.getElementById('circleOptions');
      const detailOpts = document.getElementById('detailOptions');
      const cardOpts = document.getElementById('cardOptions');
      const irregularOpts = document.getElementById('irregularMaskOptions');
      const useDisplayOpts = document.getElementById('useDisplayOptions');
      const mainDetailOpts = document.getElementById('mainDetailOptions');
      const scenarioDisplayOpts = document.getElementById('scenarioDisplayOptions');
      
      const hasVisible = [circleOpts, detailOpts, cardOpts, irregularOpts, useDisplayOpts, mainDetailOpts, scenarioDisplayOpts]
        .some(el => el && el.style.display !== 'none');
      
      panel.style.display = hasVisible ? 'block' : 'none';
    }
    
    // ========== 鎵归噺鐢熸垚鍔熻兘 ==========
    
    const TYPE_NAMES = { scene: '鍦烘櫙鍥?, white: '鐧藉簳鍥?, set: '濂楄鍥?, detail: '缁嗚妭鍥? };
    const TYPE_ICONS = { scene: '馃彏', white: '猬?, set: '馃摝', detail: '馃攳' };
    const ALL_TYPES = ['scene', 'white', 'set', 'detail'];
    
    function toggleBatchMode() {
      // 鎵归噺妯″紡濮嬬粓寮€鍚紝姝ゅ嚱鏁颁繚鐣欏吋瀹?
      renderBatchTypeSettings();
      renderImageList();
    }
    
    // 鍦ㄧ被鍒唴绉诲姩鍥剧墖椤哄簭
    function moveImageInType(imgIndex, direction) {
      // 鎵惧埌鍚岀被鍨嬬殑鍥剧墖绱㈠紩鍒楄〃
      const sameType = state.images
        .map((img, i) => ({ img, i }))
        .filter(item => item.img.type === state.images[imgIndex].type);
      
      const posInGroup = sameType.findIndex(item => item.i === imgIndex);
      if (posInGroup < 0) return;
      
      const newPos = posInGroup + direction;
      if (newPos < 0 || newPos >= sameType.length) return;
      
      // 浜ゆ崲鍦╯tate.images涓殑浣嶇疆
      const idxA = sameType[posInGroup].i;
      const idxB = sameType[newPos].i;
      const temp = state.images[idxA];
      state.images[idxA] = state.images[idxB];
      state.images[idxB] = temp;
      
      updateImageTypeStats();
      renderImageList();
      render();
      renderBatchTypeSettings();
    }
    
    function renderBatchTypeSettings() {
      const container = document.getElementById('batchTypeSettings');
      if (!container) return;
      
      // 鍩轰簬褰撳墠妯℃澘鐨剆lotTypes璁＄畻
      initSlotTypes();
      const slotTypes = state.slotTypes;
      const templateCount = state.templateCount;
      
      // 缁熻姣忎釜slot绫诲瀷闇€瑕佺殑鍥剧墖鏁伴噺鍜屽彲鐢ㄦ暟閲?
      const slotTypeCounts = {};
      slotTypes.forEach(t => {
        slotTypeCounts[t] = (slotTypeCounts[t] || 0) + 1;
      });
      
      // 璁＄畻鐢熸垚鏁伴噺锛氬彇鎵€鏈塻lot绫诲瀷涓彲鐢ㄥ浘鐗囨暟鐨勬渶灏忓€?
      // 濡傛灉鏌愮被鍨嬪彧鏈?寮狅紝鍒欒绫诲瀷鍥哄畾锛涘寮犲垯寰幆
      let genCount = 1;
      let slotInfo = [];
      
      for (let i = 0; i < templateCount; i++) {
        const type = slotTypes[i];
        const available = state.images.filter(img => img.type === type);
        const untyped = state.images.filter(img => !img.type);
        const total = available.length + (untyped.length > 0 ? 1 : 0); // 鏈垎绫诲彲浣滀负鍚庡
        slotInfo.push({ slot: i, type, available: available.length, total });
        if (available.length > genCount) genCount = available.length;
      }
      
      // 濡傛灉娌℃湁鍥剧墖锛岀敓鎴愭暟閲忎负0
      const hasImages = state.images.length > 0;
      if (!hasImages) genCount = 0;
      
      let html = `<div style="font-size:10px;color:#6b7280;margin-bottom:6px;">褰撳墠妯℃澘: ${templateCount}鍥惧竷灞€</div>`;
      
      // 鏄剧ず姣忎釜slot鐨勭被鍨嬪拰鍙敤鍥剧墖鏁?
      slotInfo.forEach(info => {
        const typeName = TYPE_NAMES[info.type] || info.type;
        const typeIcon = TYPE_ICONS[info.type] || '';
        const color = info.available > 0 ? '#059669' : '#dc2626';
        html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;border-radius:4px;background:#fafafa;border:1px solid #e5e7eb;margin-bottom:3px;">
          <span style="font-size:11px;">${typeIcon} 浣嶇疆${info.slot + 1}: ${typeName}</span>
          <span style="font-size:10px;color:${color};">${info.available}寮犲彲鐢?/span>
        </div>`;
      });
      
      // 鏈垎绫诲浘鐗囨彁绀?
      const untyped = state.images.filter(img => !img.type);
      if (untyped.length > 0) {
        html += `<div style="padding:3px 6px;border-radius:4px;background:#fffbeb;border:1px solid #fde68a;margin-bottom:3px;">
          <span style="font-size:10px;color:#92400e;">馃搵 ${untyped.length}寮犳湭鍒嗙被鍥剧墖涓嶄細鍙備笌鐢熸垚</span>
        </div>`;
      }
      
      html += `<div style="font-size:9px;color:#6b7280;margin-top:4px;">鎸夊浘鐗囬『搴忓搴旂敓鎴愶細绗?寮犫啋绗?缁勶紝绗?寮犫啋绗?缁?..<br>鎷栨嫿鍥剧墖鍙皟鏁撮『搴忓拰鍒嗙被</div>`;
      
      container.innerHTML = html;
      
      // 鏇存柊鐢熸垚鏁伴噺
      const batchCount = document.getElementById('batchCount');
      const batchExportBtn = document.getElementById('batchExportBtn');
      batchCount.textContent = genCount;
      if (batchExportBtn) batchExportBtn.disabled = genCount === 0;
    }
    
    async function executeBatchGenerate() {
      // 鍩轰簬褰撳墠妯℃澘鐨剆lotTypes璁＄畻鐢熸垚鏁伴噺
      initSlotTypes();
      const slotTypes = state.slotTypes;
      const templateCount = state.templateCount;
      
      // 鎸夌被鍨嬪垎缁勫浘鐗?
      const typeImageLists = {};
      ALL_TYPES.forEach(type => {
        typeImageLists[type] = state.images.filter(img => img.type === type);
      });
      
      // 璁＄畻鐢熸垚鏁伴噺锛氭墍鏈塻lot绫诲瀷涓彲鐢ㄥ浘鐗囨暟鐨勬渶澶у€?
      let genCount = 0;
      for (let i = 0; i < templateCount; i++) {
        const type = slotTypes[i];
        const available = typeImageLists[type] || [];
        if (available.length > genCount) genCount = available.length;
      }
      
      if (genCount === 0) {
        showToast('娌℃湁鍙敤鍥剧墖锛岃鍏堜笂浼犲苟鍒嗙被', true);
        return;
      }
      
      const progressEl = document.getElementById('batchProgress');
      const progressBar = document.getElementById('batchProgressBar');
      const progressText = document.getElementById('batchProgressText');
      const resultsEl = document.getElementById('batchResults');
      const resultsList = document.getElementById('batchResultsList');
      const genBtn = document.getElementById('batchExportBtn');
      
      genBtn.disabled = true;
      genBtn.textContent = '鈴?鐢熸垚涓?..';
      progressEl.style.display = 'block';
      resultsEl.style.display = 'none';
      resultsList.innerHTML = '';
      state.batchResults = [];
      
      const exportSize = parseInt(state.exportSize) || 1400;
      
      for (let r = 0; r < genCount; r++) {
        // 鏋勫缓褰撳墠鎵规鐨勫浘鐗囧垪琛細鎸塻lotTypes椤哄簭锛屾瘡涓猻lot鍙栧搴旂被鍨嬬殑绗瑀寮?
        const batchImages = [];
        for (let i = 0; i < templateCount; i++) {
          const type = slotTypes[i];
          const imgs = typeImageLists[type] || [];
          if (imgs.length > 0) {
            batchImages.push(imgs[r % imgs.length]);
          }
        }
        
        if (batchImages.length === 0) continue;
        
        // 鏇存柊杩涘害
        const progress = Math.round(((r + 1) / genCount) * 100);
        progressBar.style.width = progress + '%';
        progressText.textContent = `姝ｅ湪鐢熸垚 ${r + 1}/${genCount}...`;
        
        // 娓叉煋褰撳墠鎵规锛圝PG鏍煎紡锛?
        const dataUrl = await renderBatchImage(batchImages, exportSize, 'image/jpeg', 0.92);
        state.batchResults.push(dataUrl);
        
        // 鑷姩涓嬭浇JPG
        const link = document.createElement('a');
        link.download = `batch_${String(r + 1).padStart(String(genCount).length, '0')}.jpg`;
        link.href = dataUrl;
        link.click();
        
        // 绛夊緟涓€涓嬮伩鍏嶄笅杞借娴忚鍣ㄦ嫤鎴?
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 鏄剧ず缂╃暐鍥?
        const thumb = document.createElement('img');
        thumb.src = dataUrl;
        thumb.style.cssText = 'width:48px;height:48px;border-radius:4px;border:1px solid #d1d5db;object-fit:cover;cursor:pointer;';
        thumb.title = `绗?${r + 1} 寮?(宸蹭笅杞?`;
        resultsList.appendChild(thumb);
      }
      
      progressText.textContent = `瀹屾垚锛佸叡鐢熸垚骞朵笅杞?${genCount} 寮燡PG鍥剧墖`;
      resultsEl.style.display = 'block';
      genBtn.textContent = '馃攧 鎵归噺瀵煎嚭';
      genBtn.disabled = false;
      showToast(`鎵归噺鐢熸垚瀹屾垚锛屽凡涓嬭浇 ${genCount} 寮燡PG`);
    }
    
    function renderBatchImage(batchImageObjs, exportSize, format, quality) {
      return new Promise((resolve) => {
        const EXPORT_SZ = exportSize;
        const SCALE = EXPORT_SZ / 1024;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = EXPORT_SZ;
        tempCanvas.height = EXPORT_SZ;
        const tempCtx = tempCanvas.getContext('2d');
        
        // JPG涓嶆敮鎸侀€忔槑锛屽厛濉厖鐧借壊鑳屾櫙
        if (format === 'image/jpeg') {
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, EXPORT_SZ, EXPORT_SZ);
        }
        
        const origImages = [...state.images];
        const origDisplayScale = displayScale;
        const origDimensions = state.dimensions;
        const origRenderCtx = renderCtx;
        
        state.images = batchImageObjs;
        renderCtx = tempCtx;
        
        tempCtx.save();
        tempCtx.scale(SCALE, SCALE);
        
        state.dimensions = origDimensions.map(d => ({
          ...d,
          x1: d.x1 / origDisplayScale,
          y1: d.y1 / origDisplayScale,
          x2: d.x2 / origDisplayScale,
          y2: d.y2 / origDisplayScale
        }));
        displayScale = 1;
        
        try {
          render();
        } catch (e) {
          console.error('Batch render error:', e);
        }
        
        tempCtx.restore();
        renderCtx = origRenderCtx;
        state.images = origImages;
        state.dimensions = origDimensions;
        displayScale = origDisplayScale;
        
        resolve(tempCanvas.toDataURL(format || 'image/png', quality || 1));
      });
    }
    
    function downloadSingleBatch(dataUrl, index) {
      const link = document.createElement('a');
      link.download = `batch_${index}.jpg`;
      link.href = dataUrl;
      link.click();
    }
    
    function downloadAllBatch() {
      state.batchResults.forEach((dataUrl, i) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.download = `batch_${i + 1}.jpg`;
          link.href = dataUrl;
          link.click();
        }, i * 200);
      });
      showToast(`寮€濮嬩笅杞?${state.batchResults.length} 寮燡PG鍥剧墖`);
    }
    
    function clearCustomTextPos() {
      state.customTextPos = null;
      document.getElementById('clearCustomPosBtn') && (document.getElementById('clearCustomPosBtn').style.display = 'none');
      // 鎭㈠褰撳墠棰勮鐨勯珮浜?
      document.querySelectorAll('.preset-item').forEach(i => {
        i.classList.toggle('active', i.dataset.preset === state.preset);
      });
      render();
    }
    
    // Tab 鍒囨崲
    function switchSidebarTab(tabName) {
      // 鏇存柊 Tab 鎸夐挳鐘舵€?
      document.querySelectorAll('.sidebar-tab').forEach(tab => {
        const isActive = tab.getAttribute('onclick').includes("'" + tabName + "'");
        tab.classList.toggle('active', isActive);
      });
      // 鏇存柊 Tab 鍐呭鏄剧ず
      document.querySelectorAll('.sidebar-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabName);
      });
    }
    
    // 鎶樺彔闈㈡澘鍒囨崲
    function toggleCollapsible(header) {
      header.classList.toggle('collapsed');
      const body = header.nextElementSibling;
      if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = 'none';
      } else {
        // 鍏堣涓哄綋鍓嶉珮搴︼紝鍐嶆姌鍙?
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(() => {
          body.classList.add('collapsed');
        });
      }
    }
    
    // 鏂囧瓧灞傚彲瑙佹€у垏鎹?
    function toggleTextLayer(visible) {
      state.textLayerVisible = visible;
      const status = document.getElementById('textLayerStatus');
      if (status) {
        status.textContent = visible ? '鍙' : '宸查殣钘?;
        status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
      }
      render();
    }
    
    // 鏍囨敞灞傚彲瑙佹€у垏鎹?
    function toggleDimLayer(visible) {
      state.dimLayerVisible = visible;
      const status = document.getElementById('dimLayerStatus');
      if (status) {
        status.textContent = visible ? '鍙' : '宸查殣钘?;
        status.className = 'toggle-status ' + (visible ? 'visible' : 'hidden');
      }
      // 鍚屾Konva瑕嗙洊灞傜殑鍙鎬?
      const konvaOverlay = document.getElementById('konvaOverlay');
      if (konvaOverlay) {
        konvaOverlay.style.display = visible && document.getElementById('dimToggle')?.checked ? '' : 'none';
      }
    }

    // ========== 瀵煎嚭璁剧疆寮圭獥 ==========
    let currentExportFormat = 'png';
    
    function openSettingsModal() {
      const modal = document.getElementById('settingsModal');
      modal.style.display = 'flex';
      // 鍚屾褰撳墠璁剧疆鍒板脊绐?
      const modalSelect = document.getElementById('exportSizeSelectModal');
      if (modalSelect) modalSelect.value = state.exportSize;
    }
    
    function closeSettingsModal() {
      document.getElementById('settingsModal').style.display = 'none';
    }
    
    function updateExportSizeFromModal() {
      const select = document.getElementById('exportSizeSelectModal');
      state.exportSize = parseInt(select.value);
      // 鏇存柊瀵煎嚭鎸夐挳鏂囨湰
      const exportBtn = document.getElementById('exportBtn');
      if (exportBtn) exportBtn.textContent = `馃摲 瀵煎嚭鍥剧墖 (${state.exportSize}脳${state.exportSize})`;
      // 鏇存柊棰勮鏍囬
      const previewTitle = document.getElementById('previewTitle');
      if (previewTitle) previewTitle.textContent = `杈撳嚭灏哄: ${state.exportSize} 脳 ${state.exportSize}`;
    }
    
    function selectExportFormat(format, btn) {
      currentExportFormat = format;
      document.querySelectorAll('.export-format-btn').forEach(b => {
        b.style.borderColor = '#d1d5db';
        b.style.background = '#fff';
        b.style.color = '#374151';
      });
      btn.style.borderColor = '#3b82f6';
      btn.style.background = '#eff6ff';
      btn.style.color = '#1e40af';
      // JPG/WebP鏄剧ず璐ㄩ噺閫夐」
      const qualityRow = document.getElementById('jpgQualityRow');
      qualityRow.style.display = (format === 'jpg' || format === 'webp') ? 'block' : 'none';
    }
    
    function exportFromModal() {
      closeSettingsModal();
      const quality = document.getElementById('exportQuality')?.value || 92;
      exportImage(currentExportFormat, parseInt(quality) / 100);
    }

    function buildTemplateData(name) {
      return {
        name: name,
        timestamp: Date.now(),
        settings: {
          templateCount: state.templateCount,
          preset: state.preset,
          customTextPos: state.customTextPos,
          mainTitle: state.mainTitle,
          subTitle: state.subTitle,
          titleColor: state.titleColor,
          subtitleColor: state.subtitleColor,
          bgColor: state.bgColor,
          titleSize: state.titleSize,
          mainTitleFont: state.mainTitleFont,
          subTitleFont: state.subTitleFont,
          mainTitleWeight: state.mainTitleWeight,
          subTitleWeight: state.subTitleWeight,
          mainTitleItalic: state.mainTitleItalic,
          subTitleItalic: state.subTitleItalic,
          shadow: state.shadow,
          stroke: state.stroke,
          bold: state.bold,
          textBg: state.textBg,
          textBgColor: state.textBgColor,
          textBgRadius: state.textBgRadius,
          textLayerVisible: state.textLayerVisible,
          dimLayerVisible: state.dimLayerVisible,
          imageGap: state.imageGap,
          imageRadius: state.imageRadius,
          twoImageStyle: state.twoImageStyle,
          fiveImageStyle: state.fiveImageStyle,
          sixImageStyle: state.sixImageStyle,
          circlePosition: state.circlePosition,
          circleSize: state.circleSize,
          circleBorderColor: state.circleBorderColor,
          circleBorderWidth: state.circleBorderWidth,
          maskStyle: state.maskStyle,
          maskOffsetX: state.maskOffsetX,
          maskOffsetY: state.maskOffsetY,
          maskScaleW: state.maskScaleW,
          maskScaleH: state.maskScaleH,
          useDisplayTitle: state.useDisplayTitle,
          useDisplayBgColor: state.useDisplayBgColor,
          useDisplayCardBg: state.useDisplayCardBg,
          useDisplayTitleColor: state.useDisplayTitleColor,
          useDisplayBorderColor: state.useDisplayBorderColor,
          mainDetailBgColor: state.mainDetailBgColor,
          mainDetailMainRadius: state.mainDetailMainRadius,
          mainDetailDetailRadius: state.mainDetailDetailRadius,
          mainDetailMainBorder: state.mainDetailMainBorder,
          mainDetailDetailBorder: state.mainDetailDetailBorder,
          maskTitle: state.maskTitle,
          maskTexts: state.maskTexts,
          maskBgColor: state.maskBgColor,
          maskCardColor: state.maskCardColor,
          maskNumberBg: state.maskNumberBg,
          maskTextColor: state.maskTextColor,
          detailTitle: state.detailTitle,
          detailSubtitle: state.detailSubtitle,
          detailText1Title: state.detailText1Title,
          detailText2Title: state.detailText2Title,
          detailText1Desc: state.detailText1Desc,
          detailText2Desc: state.detailText2Desc,
          detailBgColor: state.detailBgColor,
          detailCardColor: state.detailCardColor,
          detailTitleColor: state.detailTitleColor,
          detailTextColor: state.detailTextColor,
          cardTitle: state.cardTitle,
          cardSubtitle: state.cardSubtitle,
          cardBgColor: state.cardBgColor,
          cardRadius: state.cardRadius,
          cardTitleColor: state.cardTitleColor,
          cardSubtitleColor: state.cardSubtitleColor,
          logoColor: state.logoColor,
          logoSize: state.logoSize,
          logoMargin: state.logoMargin,
          logoLayerVisible: state.logoLayerVisible,
          dimColor: state.dimColor,
          dimLineW: state.dimLineW,
          dimFontS: state.dimFontS,
          dimTextColor: state.dimTextColor,
          dimEndStyle: state.dimEndStyle,
          dimTextBg: state.dimTextBg,
          imageSettings: state.images.map(img => ({
            type: img.type || null,
            scale: img.scale || 1,
            offsetX: img.offsetX || 0,
            offsetY: img.offsetY || 0
          }))
        }
      };
    }
    
    function saveTemplate() {
      // 濡傛灉宸插姞杞芥ā鏉匡紝鐩存帴瑕嗙洊淇濆瓨
      if (state.currentTemplateName) {
        const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
        const existingIndex = templates.findIndex(t => t.name === state.currentTemplateName);
        if (existingIndex > -1) {
          templates[existingIndex] = buildTemplateData(state.currentTemplateName);
          localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
          showToast('妯℃澘宸蹭繚瀛?);
          renderTemplateList();
          return;
        }
      }
      // 鍚﹀垯闇€瑕佽緭鍏ュ悕绉颁繚瀛?
      const name = document.getElementById('templateName').value.trim();
      if (!name) {
        showToast('璇疯緭鍏ユā鏉垮悕绉?, true);
        return;
      }
      doSaveTemplate(name);
    }
    
    function saveAsTemplate() {
      const name = document.getElementById('templateName').value.trim();
      if (!name) {
        showToast('璇疯緭鍏ユā鏉垮悕绉?, true);
        return;
      }
      doSaveTemplate(name);
    }
    
    function doSaveTemplate(name) {
      let templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
      const templateData = buildTemplateData(name);
      
      const existingIndex = templates.findIndex(t => t.name === name);
      if (existingIndex > -1) {
        templates[existingIndex] = templateData;
        showToast('妯℃澘宸叉洿鏂?);
      } else {
        templates.push(templateData);
        showToast('妯℃澘淇濆瓨鎴愬姛');
      }
      
      localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
      state.currentTemplateName = name;
      document.getElementById('templateName').value = '';
      updateCurrentTemplateDisplay();
      renderTemplateList();
    }
    
    function loadTemplate(name) {
      const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
      const template = templates.find(t => t.name === name);
      
      if (!template) {
        showToast('妯℃澘涓嶅瓨鍦?, true);
        return;
      }
      
      const settings = template.settings;
      
      state.templateCount = settings.templateCount;
      state.preset = settings.preset;
      state.customTextPos = settings.customTextPos || null;
      state.mainTitle = settings.mainTitle;
      state.subTitle = settings.subTitle;
      state.titleColor = settings.titleColor;
      state.subtitleColor = settings.subtitleColor;
      state.bgColor = settings.bgColor;
      state.titleSize = settings.titleSize;
      state.mainTitleFont = settings.mainTitleFont || 'sans-serif';
      state.subTitleFont = settings.subTitleFont || 'sans-serif';
      state.mainTitleWeight = settings.mainTitleWeight || 'bold';
      state.subTitleWeight = settings.subTitleWeight || 'normal';
      state.mainTitleItalic = settings.mainTitleItalic || false;
      state.subTitleItalic = settings.subTitleItalic || false;
      state.shadow = settings.shadow;
      state.stroke = settings.stroke;
      state.bold = settings.bold;
      state.textBg = settings.textBg;
      state.textBgColor = settings.textBgColor || 'rgba(0,0,0,0.5)';
      state.textBgRadius = settings.textBgRadius !== undefined ? settings.textBgRadius : 16;
      state.textLayerVisible = settings.textLayerVisible !== undefined ? settings.textLayerVisible : true;
      state.dimLayerVisible = settings.dimLayerVisible !== undefined ? settings.dimLayerVisible : true;
      state.imageGap = settings.imageGap;
      state.imageRadius = settings.imageRadius;
      state.twoImageStyle = settings.twoImageStyle;
      state.fiveImageStyle = settings.fiveImageStyle || 'normal';
      state.sixImageStyle = settings.sixImageStyle || 'normal';
      state.circlePosition = settings.circlePosition;
      state.circleSize = settings.circleSize;
      state.circleBorderColor = settings.circleBorderColor;
      state.circleBorderWidth = settings.circleBorderWidth;
      state.maskStyle = settings.maskStyle;
      state.maskOffsetX = settings.maskOffsetX || 0;
      state.maskOffsetY = settings.maskOffsetY || 0;
      state.maskScaleW = settings.maskScaleW || 100;
      state.maskScaleH = settings.maskScaleH || 100;
      state.useDisplayTitle = settings.useDisplayTitle || 'Use Display';
      state.useDisplayBgColor = settings.useDisplayBgColor || '#f5f0e1';
      state.useDisplayCardBg = settings.useDisplayCardBg || '#e8e3d4';
      state.useDisplayTitleColor = settings.useDisplayTitleColor || '#333333';
      state.useDisplayBorderColor = settings.useDisplayBorderColor || '#d4c9a8';
      state.mainDetailBgColor = settings.mainDetailBgColor || '#f5f5f5';
      state.mainDetailMainRadius = settings.mainDetailMainRadius || 16;
      state.mainDetailDetailRadius = settings.mainDetailDetailRadius || 12;
      state.mainDetailMainBorder = settings.mainDetailMainBorder || '#e0e0e0';
      state.mainDetailDetailBorder = settings.mainDetailDetailBorder || '#e0e0e0';
      state.maskTitle = settings.maskTitle;
      state.maskTexts = settings.maskTexts;
      state.maskBgColor = settings.maskBgColor;
      state.maskCardColor = settings.maskCardColor;
      state.maskNumberBg = settings.maskNumberBg;
      state.maskTextColor = settings.maskTextColor;
      state.detailTitle = settings.detailTitle;
      state.detailSubtitle = settings.detailSubtitle;
      state.detailText1Title = settings.detailText1Title;
      state.detailText2Title = settings.detailText2Title;
      state.detailText1Desc = settings.detailText1Desc;
      state.detailText2Desc = settings.detailText2Desc;
      state.detailBgColor = settings.detailBgColor;
      state.detailCardColor = settings.detailCardColor;
      state.detailTitleColor = settings.detailTitleColor;
      state.detailTextColor = settings.detailTextColor;
      state.cardTitle = settings.cardTitle;
      state.cardSubtitle = settings.cardSubtitle;
      state.cardBgColor = settings.cardBgColor;
      state.cardRadius = settings.cardRadius;
      state.cardTitleColor = settings.cardTitleColor;
      state.cardSubtitleColor = settings.cardSubtitleColor;
      state.logoColor = settings.logoColor;
      state.logoSize = settings.logoSize;
      state.logoMargin = settings.logoMargin;
      state.logoLayerVisible = settings.logoLayerVisible !== undefined ? settings.logoLayerVisible : true;
      state.dimColor = settings.dimColor;
      state.dimLineW = settings.dimLineW;
      state.dimFontS = settings.dimFontS;
      state.dimTextColor = settings.dimTextColor;
      state.dimEndStyle = settings.dimEndStyle;
      state.dimTextBg = settings.dimTextBg;
      
      if (settings.imageSettings) {
        state.pendingImageSettings = settings.imageSettings;
        
        if (state.images.length > 0) {
          applyPendingImageSettings();
        }
      } else {
        state.pendingImageSettings = null;
      }
      
      updateUIFromState();
      renderImageList();
      render();
      
      state.currentTemplateName = name;
      updateCurrentTemplateDisplay();
      showToast('妯℃澘鍔犺浇鎴愬姛');
    }
    
    function updateCurrentTemplateDisplay() {
      const label = document.getElementById('currentTemplateLabel');
      const display = document.getElementById('currentTemplateNameDisplay');
      if (label && display) {
        if (state.currentTemplateName) {
          label.style.display = 'inline';
          display.textContent = state.currentTemplateName;
        } else {
          label.style.display = 'none';
        }
      }
    }
    
    function applyPendingImageSettings() {
      if (!state.pendingImageSettings || state.images.length === 0) return;
      
      state.pendingImageSettings.forEach((imgSetting, i) => {
        if (state.images[i]) {
          // 涓嶈鐩栧浘鐗囩殑 type 灞炴€э紝淇濇寔鐢ㄦ埛涓婁紶鏃惰缃殑绫诲瀷
          // state.images[i].type = imgSetting.type || null;
          state.images[i].scale = imgSetting.scale || 1;
          state.images[i].offsetX = imgSetting.offsetX || 0;
          state.images[i].offsetY = imgSetting.offsetY || 0;
        }
      });
      
      updateImageTypeStats();
      
      // 鏇存柊娲昏穬鍥剧墖鐨勮皟鏁撮潰鏉?
      if (state.activeImageIndex >= 0 && state.activeImageIndex < state.images.length) {
        setActiveImage(state.activeImageIndex);
      }
    }
    
    function deleteTemplate(name) {
      if (!confirm(`纭畾鍒犻櫎妯℃澘 "${name}" 鍚楋紵`)) return;
      
      let templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
      templates = templates.filter(t => t.name !== name);
      localStorage.setItem('mainImageTemplates', JSON.stringify(templates));
      
      if (state.currentTemplateName === name) {
        state.currentTemplateName = null;
        updateCurrentTemplateDisplay();
      }
      
      renderTemplateList();
      showToast('妯℃澘宸插垹闄?);
    }
    
    function renderTemplateList() {
      const templates = JSON.parse(localStorage.getItem('mainImageTemplates') || '[]');
      const list = document.getElementById('templateList');
      document.getElementById('savedTemplateCount').textContent = templates.length;
      
      if (templates.length === 0) {
        list.innerHTML = '<span style="font-size:11px;color:#9ca3af;">鏆傛棤妯℃澘</span>';
        return;
      }
      
      // 鎸夊浘鐗囨暟閲忓垎缁?
      const groups = {};
      templates.forEach((t, idx) => {
        const count = t.settings && t.settings.templateCount ? t.settings.templateCount : 0;
        if (!groups[count]) groups[count] = [];
        groups[count].push({ template: t, idx });
      });
      
      // 鎸夊浘鐗囨暟閲忔帓搴?
      const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
      
      let html = '';
      sortedKeys.forEach(key => {
        html += `<div style="margin-bottom:8px;">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px;font-weight:600;">${key} 鍥炬ā鏉?/div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">`;
        groups[key].forEach(({ template, idx }) => {
          html += `
            <span class="template-tag" data-template-idx="${idx}" title="${new Date(template.timestamp).toLocaleString('zh-CN')}">
              ${escapeHtml(template.name)}
              <button class="delete-btn" data-delete-idx="${idx}">脳</button>
            </span>`;
        });
        html += `</div></div>`;
      });
      
      list.innerHTML = html;
      
      list.querySelectorAll('.template-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
          if (e.target.classList.contains('delete-btn')) {
            const idx = e.target.dataset.deleteIdx;
            if (idx !== undefined && templates[idx]) {
              deleteTemplate(templates[idx].name);
            }
          } else {
            const idx = tag.dataset.templateIdx;
            if (idx !== undefined && templates[idx]) {
              loadTemplate(templates[idx].name);
            }
          }
        });
      });
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
      // 鍚屾鏂囧瓧鑳屾櫙棰滆壊鎺т欢
      const rgbMatch = (state.textBgColor || '').match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]).toString(16).padStart(2,'0');
        const g = parseInt(rgbMatch[2]).toString(16).padStart(2,'0');
        const b = parseInt(rgbMatch[3]).toString(16).padStart(2,'0');
        document.getElementById('textBgColorPicker').value = '#' + r + g + b;
        document.getElementById('textBgOpacity').value = Math.round(parseFloat(rgbMatch[4]) * 100);
        document.getElementById('textBgOpacityVal').textContent = Math.round(parseFloat(rgbMatch[4]) * 100) + '%';
      }
      // 鍚屾鏂囧瓧鑳屾櫙鎺т欢鐘舵€?
      if (typeof updateBgControlOpacity === 'function') updateBgControlOpacity();
      // 鍚屾鏂囧瓧鑳屾櫙鍦嗚
      if (document.getElementById('textBgRadius')) {
        document.getElementById('textBgRadius').value = state.textBgRadius;
        document.getElementById('textBgRadiusVal').textContent = state.textBgRadius + 'px';
      }
      if (imageGapEl) imageGapEl.value = state.imageGap;
      if (imageRadiusEl) imageRadiusEl.value = state.imageRadius;
      // 鍚屾鑳屾櫙鑹插潡棰勮
      const bgBlock = document.getElementById('bgColorBlock');
      if (bgBlock) bgBlock.style.background = state.bgColor;
      
      // 鍚屾瀛愭牱寮忛潰鏉匡紙鑳屾櫙鑹?闂磋窛/鍦嗚锛?
      const subBgColorEl = document.getElementById('subBgColor');
      const subImageGapEl = document.getElementById('subImageGap');
      const subImageRadiusEl = document.getElementById('subImageRadius');
      if (subBgColorEl) subBgColorEl.value = state.bgColor;
      if (subImageGapEl) {
        subImageGapEl.value = state.imageGap;
        const gapValEl = document.getElementById('subImageGapVal');
        if (gapValEl) gapValEl.textContent = state.imageGap + 'px';
      }
      if (subImageRadiusEl) {
        subImageRadiusEl.value = state.imageRadius;
        const radiusValEl = document.getElementById('subImageRadiusVal');
        if (radiusValEl) radiusValEl.textContent = state.imageRadius + 'px';
      }
      
      // 鍚屾鏂囧瓧灞傚彲瑙佹€?
      // 同步遮罩偏移和缩放控件
      if (typeof syncMaskControls === 'function') syncMaskControls();
      
      const textLayerVisibleEl = document.getElementById('textLayerVisible');
      const textLayerStatusEl = document.getElementById('textLayerStatus');
      if (textLayerVisibleEl) textLayerVisibleEl.checked = state.textLayerVisible;
      if (textLayerStatusEl) {
        textLayerStatusEl.textContent = state.textLayerVisible ? '鍙' : '宸查殣钘?;
        textLayerStatusEl.className = 'toggle-status ' + (state.textLayerVisible ? 'visible' : 'hidden');
      }
      
      // 鍚屾LOGO灞傚彲瑙佹€?
      const logoLayerVisibleEl = document.getElementById('logoLayerVisible');
      const logoLayerStatusEl = document.getElementById('logoLayerStatus');
      if (logoLayerVisibleEl) logoLayerVisibleEl.checked = state.logoLayerVisible;
      if (logoLayerStatusEl) {
        logoLayerStatusEl.textContent = state.logoLayerVisible ? '鍙' : '宸查殣钘?;
        logoLayerStatusEl.className = 'toggle-status ' + (state.logoLayerVisible ? 'visible' : 'hidden');
      }
      
      // 鍚屾鏍囨敞灞傚彲瑙佹€?
      const dimLayerVisibleEl = document.getElementById('dimLayerVisible');
      const dimLayerStatusEl = document.getElementById('dimLayerStatus');
      if (dimLayerVisibleEl) dimLayerVisibleEl.checked = state.dimLayerVisible;
      if (dimLayerStatusEl) {
        dimLayerStatusEl.textContent = state.dimLayerVisible ? '鍙' : '宸查殣钘?;
        dimLayerStatusEl.className = 'toggle-status ' + (state.dimLayerVisible ? 'visible' : 'hidden');
      }
      
      document.querySelectorAll('.template-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.count) === state.templateCount);
      });
      
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === state.preset);
      });
      
      document.querySelectorAll('.style-btn[data-style="twoImageStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.twoImageStyle);
      });
      
      document.querySelectorAll('.style-btn[data-style="fiveImageStyle"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.fiveImageStyle);
      });
      
      document.querySelectorAll('.style-btn[data-style="sixImageStyle"]').forEach(btn => {
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
      
      document.querySelectorAll('.style-btn[data-style="maskStyle"]').forEach(btn => {
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
      if (useDisplayCardBgEl) useDisplayCardBgEl.value = state.useDisplayCardBg;
      if (useDisplayTitleColorEl) useDisplayTitleColorEl.value = state.useDisplayTitleColor;
      if (useDisplayBorderColorEl) useDisplayBorderColorEl.value = state.useDisplayBorderColor;
      
      const mainDetailOptions = document.getElementById('mainDetailOptions');
      if (mainDetailOptions) mainDetailOptions.style.display = state.maskStyle === 'mainDetail' ? 'block' : 'none';
      const scenarioDisplayOptions = document.getElementById('scenarioDisplayOptions');
      if (scenarioDisplayOptions) scenarioDisplayOptions.style.display = state.maskStyle === 'scenarioDisplay' ? 'block' : 'none';
      
      updateSubstylePanel();
      
      const mainDetailBgColorEl = document.getElementById('mainDetailBgColor');
      const mainDetailMainRadiusEl = document.getElementById('mainDetailMainRadius');
      const mainDetailDetailRadiusEl = document.getElementById('mainDetailDetailRadius');
      const mainDetailMainBorderEl = document.getElementById('mainDetailMainBorder');
      const mainDetailDetailBorderEl = document.getElementById('mainDetailDetailBorder');
      if (mainDetailBgColorEl) mainDetailBgColorEl.value = state.mainDetailBgColor;
      if (mainDetailMainRadiusEl) mainDetailMainRadiusEl.value = state.mainDetailMainRadius;
      if (mainDetailDetailRadiusEl) mainDetailDetailRadiusEl.value = state.mainDetailDetailRadius;
      if (mainDetailMainBorderEl) mainDetailMainBorderEl.value = state.mainDetailMainBorder;
      if (mainDetailDetailBorderEl) mainDetailDetailBorderEl.value = state.mainDetailDetailBorder;
      
      const scenarioBgColorEl = document.getElementById('scenarioBgColor');
      const scenarioCardRadiusEl = document.getElementById('scenarioCardRadius');
      const scenarioImageRadiusEl = document.getElementById('scenarioImageRadius');
      const scenarioLabelBgColorEl = document.getElementById('scenarioLabelBgColor');
      const scenarioTextColorEl = document.getElementById('scenarioTextColor');
      const scenarioText1TitleEl = document.getElementById('scenarioText1Title');
      const scenarioText1DescEl = document.getElementById('scenarioText1Desc');
      const scenarioText2TitleEl = document.getElementById('scenarioText2Title');
      const scenarioText2DescEl = document.getElementById('scenarioText2Desc');
      const scenarioText3TitleEl = document.getElementById('scenarioText3Title');
      const scenarioText3DescEl = document.getElementById('scenarioText3Desc');
      const scenarioText4TitleEl = document.getElementById('scenarioText4Title');
      const scenarioText4DescEl = document.getElementById('scenarioText4Desc');
      if (scenarioBgColorEl) scenarioBgColorEl.value = state.scenarioBgColor;
      if (scenarioCardRadiusEl) scenarioCardRadiusEl.value = state.scenarioCardRadius;
      if (scenarioImageRadiusEl) scenarioImageRadiusEl.value = state.scenarioImageRadius;
      if (scenarioLabelBgColorEl) scenarioLabelBgColorEl.value = state.scenarioLabelBgColor;
      if (scenarioTextColorEl) scenarioTextColorEl.value = state.scenarioTextColor;
      if (scenarioText1TitleEl) scenarioText1TitleEl.value = state.scenarioText1Title;
      if (scenarioText1DescEl) scenarioText1DescEl.value = state.scenarioText1Desc;
      if (scenarioText2TitleEl) scenarioText2TitleEl.value = state.scenarioText2Title;
      if (scenarioText2DescEl) scenarioText2DescEl.value = state.scenarioText2Desc;
      if (scenarioText3TitleEl) scenarioText3TitleEl.value = state.scenarioText3Title;
      if (scenarioText3DescEl) scenarioText3DescEl.value = state.scenarioText3Desc;
      if (scenarioText4TitleEl) scenarioText4TitleEl.value = state.scenarioText4Title;
      if (scenarioText4DescEl) scenarioText4DescEl.value = state.scenarioText4Desc;
    }

    init();
    renderTemplateList();
  </script>
