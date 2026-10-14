from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('http://localhost:8000/', wait_until='networkidle')
    page.evaluate("() => go('play')")
    page.wait_for_timeout(500)
    page.click('#btn-start-journey')
    page.wait_for_timeout(300)
    
    # Scroll #g1 into view
    page.evaluate("() => document.querySelector('#g1').scrollIntoView()")
    page.wait_for_timeout(400)
    page.screenshot(path='scratch/journeys_mini_games.png')
    
    # Scroll #fm into view
    page.evaluate("() => document.querySelector('#fm').scrollIntoView()")
    page.wait_for_timeout(400)
    page.screenshot(path='scratch/journeys_field_missions.png')
    
    browser.close()
