from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=200)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    
    page.goto('http://localhost:3000/main-image-template.html')
    page.wait_for_load_state('networkidle')
    
    # Test: All AI copy elements exist
    r = page.evaluate('''() => {
        return JSON.stringify({
            nameInput: !!document.getElementById('aiProductName'),
            infoInput: !!document.getElementById('aiProductInfo'),
            genBtn: !!document.getElementById('aiGenBtn'),
            langZh: !!document.getElementById('langZh'),
            langEn: !!document.getElementById('langEn'),
            copyList: !!document.getElementById('aiCopyList'),
            presets: document.querySelectorAll('.text-preset-btn').length
        });
    }''')
    print('UI elements:', r)
    
    # Test: Language toggle
    r2 = page.evaluate('''() => {
        setCopyLang('en');
        const enBg = document.getElementById('langEn').style.background;
        setCopyLang('zh');
        return enBg;
    }''')
    print('Language toggle works:', r2 != 'transparent')
    
    if errors:
        # Filter out 404 errors for resources
        real_errors = [e for e in errors if '404' not in e]
        if real_errors:
            print('Console errors:', real_errors[:5])
        else:
            print('No significant console errors')
    else:
        print('No console errors')
    
    browser.close()
    print('Done')
