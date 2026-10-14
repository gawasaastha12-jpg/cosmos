from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('http://localhost:8000/', wait_until='networkidle')
    page.wait_for_timeout(500)
    
    # Scroll to center the globe in .gstage
    page.evaluate('''() => {
        const gs = document.querySelector('#gs');
        window.scrollTo(0, gs.offsetTop + 450);
        window.dispatchEvent(new Event('scroll'));
    }''')
    page.wait_for_timeout(1500)
    
    # Click 3D globe button
    page.evaluate("() => document.querySelector('button[data-view=\"globe\"]').click()")
    page.wait_for_timeout(1000)
    
    page.screenshot(path='scratch/test_globe_centered.png')
    browser.close()
