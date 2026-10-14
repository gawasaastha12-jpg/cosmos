from playwright.sync_api import sync_playwright

def inspect_scroll():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto('http://localhost:8000/', wait_until='networkidle')
        page.wait_for_timeout(1000)
        
        # Scroll to globe section
        # Globe is in .gstage or chapter with globe
        page.evaluate('() => window.scrollTo(0, 1200)')
        page.wait_for_timeout(1000)
        page.screenshot(path='scratch/scroll_1200.png')
        
        page.evaluate('() => window.scrollTo(0, 2200)')
        page.wait_for_timeout(1000)
        page.screenshot(path='scratch/scroll_2200.png')
        
        # Check if W and globe exist in Three.js scene
        globe_info = page.evaluate('() => ({ sceneInitialized: typeof sceneInitialized !== "undefined" ? sceneInitialized : false, globeScale: typeof W !== "undefined" && W ? W.scale.x : 0, globeVisible: typeof W !== "undefined" && W ? W.visible : false })')
        print("Globe info at 2200px:", globe_info)
        
        browser.close()

if __name__ == '__main__':
    inspect_scroll()
