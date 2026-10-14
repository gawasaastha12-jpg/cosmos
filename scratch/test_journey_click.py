from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('http://localhost:8000/', wait_until='networkidle')
    page.evaluate("() => go('play')")
    page.wait_for_timeout(800)
    page.click('#btn-start-journey')
    page.wait_for_timeout(500)
    page.screenshot(path='scratch/journeys_unlocked.png')
    browser.close()
