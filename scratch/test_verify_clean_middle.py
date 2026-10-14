from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 850})
    page.goto('http://127.0.0.1:8000/audio.html', wait_until='networkidle')
    page.wait_for_timeout(500)
    
    # Click Hindi chip
    page.click("button[data-lang='hi']")
    page.wait_for_timeout(400)
    
    page.screenshot(path='scratch/verified_no_black_line.png')
    print("Screenshot saved to scratch/verified_no_black_line.png")
    browser.close()
