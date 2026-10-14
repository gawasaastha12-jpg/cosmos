from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('http://localhost:8000/', wait_until='networkidle')
    page.evaluate("() => go('play')")
    page.wait_for_timeout(500)
    page.click('#btn-start-journey')
    page.wait_for_timeout(300)
    
    # Open details
    page.evaluate("() => document.querySelector('#play details').open = true")
    page.wait_for_timeout(300)
    
    # Scroll to audio storytelling
    page.evaluate("() => document.querySelector('#play .hub').scrollIntoView()")
    page.wait_for_timeout(400)
    page.screenshot(path='scratch/journeys_audio_and_games.png')
    
    browser.close()
