from playwright.sync_api import sync_playwright
import sys, json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    logs = []
    page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))
    
    page.goto('http://localhost:3000/main-image-template.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    
    # Check LOGO panel structure
    result = page.evaluate('''() => {
        const panel = document.getElementById('logoSettingsPanel');
        const header = panel?.querySelector('.collapsible-header');
        const body = panel?.querySelector('.collapsible-body');
        const layerToggle = document.getElementById('logoLayerVisible');
        const layerStatus = document.getElementById('logoLayerStatus');
        const library = document.getElementById('logoLibrary');
        const libCount = document.getElementById('logoLibCount');
        return {
            panelExists: !!panel,
            headerExists: !!header,
            bodyExists: !!body,
            layerToggleExists: !!layerToggle,
            layerToggleChecked: layerToggle?.checked,
            layerStatusText: layerStatus?.textContent,
            libraryExists: !!library,
            libCountText: libCount?.textContent,
            logoLayerVisible: state.logoLayerVisible,
            saveBtnExists: !!document.querySelector('[onclick="saveLogoToLib()"]')
        };
    }''')
    print(f'LOGO panel: {json.dumps(result, ensure_ascii=False)}')
    
    # Test hide LOGO layer
    page.evaluate('toggleLogoLayer(false)')
    page.wait_for_timeout(200)
    
    after_hide = page.evaluate('''() => ({
        logoLayerVisible: state.logoLayerVisible,
        layerStatusText: document.getElementById('logoLayerStatus')?.textContent
    })''')
    print(f'After hide: {json.dumps(after_hide, ensure_ascii=False)}')
    
    # Test show LOGO layer
    page.evaluate('toggleLogoLayer(true)')
    page.wait_for_timeout(200)
    
    after_show = page.evaluate('''() => ({
        logoLayerVisible: state.logoLayerVisible,
        layerStatusText: document.getElementById('logoLayerStatus')?.textContent
    })''')
    print(f'After show: {json.dumps(after_show, ensure_ascii=False)}')
    
    # Check for errors
    errors = [log for log in logs if 'error' in log.lower()]
    if errors:
        print(f'\nErrors: {errors[:5]}')
    else:
        print('\nNo errors.')
    
    browser.close()
