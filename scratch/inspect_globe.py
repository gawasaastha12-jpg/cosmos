from playwright.sync_api import sync_playwright

def inspect_globe_and_chart():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto('http://localhost:8000/', wait_until='networkidle')
        page.wait_for_timeout(1000)
        
        # Scroll directly to #gs or .gstage
        page.evaluate('() => document.querySelector(".gstage").scrollIntoView({behavior: "instant", block: "center"})')
        page.wait_for_timeout(1000)
        page.screenshot(path='scratch/stage_planisphere.png')
        
        # Click "3D globe"
        page.click('button[data-view="globe"]')
        page.wait_for_timeout(1000)
        page.screenshot(path='scratch/stage_globe.png')
        
        globe_info = page.evaluate('() => ({ globeVisible: W.visible, globeScale: W.scale.x, labelsVisible: document.querySelector("#lbs").style.display })')
        print("Globe info when 3D globe clicked:", globe_info)

        browser.close()

if __name__ == '__main__':
    inspect_globe_and_chart()
