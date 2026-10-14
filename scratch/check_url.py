from playwright.sync_api import sync_playwright

def verify(url, prefix):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: print(f'[{prefix}] Console {m.type}: {m.text}') if m.type == 'error' else None)
        
        page.goto(url, wait_until='networkidle')
        page.wait_for_timeout(1000)
        
        # 1. Home page
        home_myth_cnt = page.evaluate('() => document.querySelectorAll("#ml button").length')
        page.screenshot(path=f'scratch/{prefix}_01_home.png')
        
        # 2. Myth page
        page.evaluate('() => go("myth")')
        page.wait_for_timeout(500)
        myth_story_title = page.evaluate('() => document.querySelector("#m-t") ? document.querySelector("#m-t").textContent : ""')
        myth_cards_cnt = page.evaluate('() => document.querySelectorAll("#ml button").length')
        page.screenshot(path=f'scratch/{prefix}_02_myth.png')
        
        # 3. Journeys (Play) page
        page.evaluate('() => go("play")')
        page.wait_for_timeout(500)
        q_cnt = page.evaluate('() => document.querySelectorAll("#qs button").length')
        g1_present = page.evaluate('() => document.querySelector("#g1 button") !== null')
        g2_present = page.evaluate('() => document.querySelector("#g2 button") !== null')
        page.screenshot(path=f'scratch/{prefix}_03_journeys.png')

        # 4. Sci page
        page.evaluate('() => go("sci")')
        page.wait_for_timeout(500)
        page.screenshot(path=f'scratch/{prefix}_04_sci.png')

        print(f"=== Results for {url} ===")
        print(f"Page errors: {errors}")
        print(f"Myth cards count: {myth_cards_cnt}")
        print(f"Myth active title: '{myth_story_title}'")
        print(f"Journeys quest buttons: {q_cnt}")
        print(f"Game 1 present: {g1_present}, Game 2 present: {g2_present}")
        browser.close()

if __name__ == '__main__':
    verify('http://localhost:8000/', 'root')
    verify('http://localhost:8000/dist/', 'dist')
