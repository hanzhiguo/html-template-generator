from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    
    page.goto('http://localhost:3000/main-image-template.html')
    page.wait_for_load_state('networkidle')
    
    # Setup test images: 2 scene, 1 detail
    page.evaluate('''() => {
        const canvas = document.createElement('canvas');
        canvas.width = 100; canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff4444'; ctx.fillRect(0, 0, 100, 100);
        const dataUrl = canvas.toDataURL('image/png');
        const img1 = new Image(); img1.src = dataUrl;
        const img2 = new Image(); img2.src = dataUrl;
        const img3 = new Image(); img3.src = dataUrl;
        state.images = [
            { src: dataUrl, img: img1, name: 'scene1.png', type: 'scene', scale: 1, offsetX: 0, offsetY: 0 },
            { src: dataUrl, img: img2, name: 'scene2.png', type: 'scene', scale: 1, offsetX: 0, offsetY: 0 },
            { src: dataUrl, img: img3, name: 'detail1.png', type: 'detail', scale: 1, offsetX: 0, offsetY: 0 },
        ];
        state.slotTypes = ['scene'];
        updateImageTypeStats();
        renderImageList();
        applySlotTypes();
    }''')
    page.wait_for_timeout(300)
    
    # Test 1: Delete first scene image - should show second scene
    r1_before = page.evaluate('''() => JSON.stringify({
        images: state.images.map(img => ({ name: img.name, type: img.type })),
        slotTypes: state.slotTypes
    })''')
    print('Before delete:', r1_before)
    
    page.evaluate('''() => deleteImage(0)''')
    page.wait_for_timeout(300)
    
    r1_after = page.evaluate('''() => JSON.stringify({
        images: state.images.map(img => ({ name: img.name, type: img.type })),
        slotTypes: state.slotTypes,
        firstImgType: state.images[0]?.type
    })''')
    print('Test 1 - After delete first scene:', r1_after)
    
    # Test 2: Export button is below preview
    r2 = page.evaluate('''() => {
        const exportBtn = document.getElementById('exportBtn');
        const batchExportBtn = document.getElementById('batchExportBtn');
        const previewCanvas = document.getElementById('previewCanvas');
        if (!exportBtn || !previewCanvas) return JSON.stringify({ error: 'missing elements' });
        const canvasRect = previewCanvas.getBoundingClientRect();
        const btnRect = exportBtn.getBoundingClientRect();
        const batchRect = batchExportBtn?.getBoundingClientRect();
        return JSON.stringify({
            btnBelowCanvas: btnRect.top > canvasRect.bottom,
            batchBtnBelowCanvas: batchRect ? batchRect.top > canvasRect.bottom : false,
            btnText: exportBtn.textContent,
            batchText: batchExportBtn?.textContent
        });
    }''')
    print('Test 2 - Export buttons below preview:', r2)
    
    # Test 3: No export button in sidebar
    r3 = page.evaluate('''() => {
        const sidebar = document.querySelector('.sidebar');
        const sidebarExportBtns = sidebar?.querySelectorAll('#exportBtn');
        return JSON.stringify({ sidebarExportCount: sidebarExportBtns?.length || 0 });
    }''')
    print('Test 3 - No export in sidebar:', r3)
    
    if errors:
        print('Console errors:', errors[:5])
    else:
        print('No console errors')
    
    browser.close()
    print('All tests done')
