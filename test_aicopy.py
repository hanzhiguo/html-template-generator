from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    
    page.goto('http://localhost:3000/main-image-template.html')
    page.wait_for_load_state('networkidle')
    
    # Test 1: AI copy section is visible
    r1 = page.evaluate('''() => {
        const nameInput = document.getElementById('aiProductName');
        const infoInput = document.getElementById('aiProductInfo');
        const genBtn = document.getElementById('aiGenBtn');
        const langZh = document.getElementById('langZh');
        const langEn = document.getElementById('langEn');
        const copyList = document.getElementById('aiCopyList');
        return JSON.stringify({
            hasNameInput: !!nameInput,
            hasInfoInput: !!infoInput,
            hasGenBtn: !!genBtn,
            hasLangZh: !!langZh,
            hasLangEn: !!langEn,
            hasCopyList: !!copyList,
            genBtnText: genBtn?.textContent
        });
    }''')
    print('Test 1 - AI copy UI elements:', r1)
    
    # Test 2: Language toggle works
    r2 = page.evaluate('''() => {
        setCopyLang('en');
        const enActive = document.getElementById('langEn').style.background;
        const zhInactive = document.getElementById('langZh').style.background;
        setCopyLang('zh'); // reset
        return JSON.stringify({
            enActive: enActive,
            zhInactive: zhInactive
        });
    }''')
    print('Test 2 - Language toggle:', r2)
    
    # Test 3: Preset buttons still work
    r3 = page.evaluate('''() => {
        const btns = document.querySelectorAll('.text-preset-btn');
        return JSON.stringify({ presetCount: btns.length });
    }''')
    print('Test 3 - Presets still exist:', r3)
    
    if errors:
        print('Console errors:', errors[:5])
    else:
        print('No console errors')
    
    browser.close()
    print('Done')
