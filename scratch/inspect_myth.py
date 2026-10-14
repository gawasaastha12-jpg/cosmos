from playwright.sync_api import sync_playwright

def inspect_myth():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 1000})
        page.goto('http://localhost:8000/', wait_until='networkidle')
        page.wait_for_timeout(1000)
        page.evaluate('() => go("myth")')
        page.wait_for_timeout(500)
        
        # Take full page screenshot of myth
        page.screenshot(path='scratch/myth_full.png', full_page=True)
        
        # Also take screenshot of play
        page.evaluate('() => go("play")')
        page.wait_for_timeout(500)
        page.screenshot(path='scratch/play_full.png', full_page=True)

        browser.close()
        print("Screenshots captured successfully!")

if __name__ == '__main__':
    inspect_myth()
