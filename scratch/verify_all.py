from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for env, base_url in [('Root', 'http://localhost:8000/'), ('Dist', 'http://localhost:8000/dist/')]:
            page = browser.new_page(viewport={'width': 1280, 'height': 850})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: print(f'[{env}] Console Error:', m.text) if m.type == 'error' else None)
            
            page.goto(base_url, wait_until='networkidle')
            page.wait_for_timeout(1000)
            
            # 1. Check Home
            page.screenshot(path=f'scratch/{env.lower()}_home.png')
            
            # Scroll to globe & switch view to globe
            page.evaluate('''() => {
                const gs = document.querySelector('#gs');
                window.scrollTo(0, gs.offsetTop + 450);
                window.dispatchEvent(new Event('scroll'));
            }''')
            page.wait_for_timeout(800)
            page.evaluate("() => document.querySelector('button[data-view=\"globe\"]').click()")
            page.wait_for_timeout(1000)
            page.screenshot(path=f'scratch/{env.lower()}_globe.png')

            # 2. Check Myth
            page.evaluate("() => go('myth')")
            page.wait_for_timeout(1000)
            page.screenshot(path=f'scratch/{env.lower()}_myth.png')

            # 3. Check Journeys
            page.evaluate("() => go('play')")
            page.wait_for_timeout(1000)
            page.screenshot(path=f'scratch/{env.lower()}_journeys_modal.png')
            
            # Click Begin Journey
            page.evaluate("() => { const b = document.querySelector('.onboarding-modal button'); if (b) b.click(); }")
            page.wait_for_timeout(600)
            page.screenshot(path=f'scratch/{env.lower()}_journeys_trail.png')

            # 4. Check Sci
            page.evaluate("() => go('sci')")
            page.wait_for_timeout(800)
            page.screenshot(path=f'scratch/{env.lower()}_sci.png')

            print(f"=== {env} Build Results ===")
            print(f"Errors count: {len(errors)}")
            if errors:
                print("Errors:", errors)
            
            page.close()
        browser.close()

if __name__ == '__main__':
    run_tests()
