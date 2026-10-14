import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('console', lambda msg: print(f"[BROWSER LOG] {msg.type}: {msg.text}"))
        page.on('pageerror', lambda err: print(f"[BROWSER ERROR] {err}"))
        await page.goto('http://localhost:8000/dist/index.html', wait_until='networkidle')
        await asyncio.sleep(2)
        
        # Test 1: Particles hover
        for x in range(400, 700, 40):
            await page.mouse.move(x, 350)
            await asyncio.sleep(0.02)
        p_state = await page.evaluate('''() => ({
            sceneInitialized: typeof sceneInitialized !== 'undefined' ? sceneInitialized : false,
            lgDrawCount: typeof lg !== 'undefined' && lg ? lg.drawRange.count : 0
        })''')
        print('Dist Particles state:', p_state)
        
        # Test 2: Compare modal
        await page.click('button[data-go="myth"]')
        await asyncio.sleep(0.5)
        cmp_btn = await page.query_selector('#btn-compare-myth')
        await cmp_btn.click()
        await asyncio.sleep(0.5)
        dlg_open = await page.evaluate("() => document.querySelector('#dlg').open")
        close_btn = await page.query_selector('#dlg [data-x]')
        btn_box = await close_btn.bounding_box()
        dlg_box = await (await page.query_selector('#dlg')).bounding_box()
        print(f"Dist Close button: {btn_box['width']:.1f}px, Dialog: {dlg_box['width']:.1f}px")
        await close_btn.click()
        await asyncio.sleep(0.3)
        dlg_open_after = await page.evaluate("() => document.querySelector('#dlg').open")
        print(f"Dist Dialog open after close: {dlg_open_after}")
        
        await browser.close()
        assert dlg_open_after is False, "Dialog should be closed"
        assert p_state['lgDrawCount'] > 0, "Constellations should be drawn"
        print("ALL DIST TESTS PASSED SUCCESSFULLY!")

asyncio.run(run())
