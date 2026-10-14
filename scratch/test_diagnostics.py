import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        
        errors = []
        page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err}"))
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}") if msg.type in ['error', 'warn'] else None)

        print("Navigating to http://localhost:8000/index.html...")
        await page.goto("http://localhost:8000/index.html", wait_until="networkidle")
        await asyncio.sleep(1)

        # 1. Test Canvas Particle Hover
        print("\n--- TEST 1: Star Particles & Constellations Hover Effect ---")
        for x in range(300, 800, 40):
            for y in range(200, 600, 40):
                await page.mouse.move(x, y)
                await asyncio.sleep(0.01)

        p_state = await page.evaluate("""() => {
            return {
                sceneInitialized: typeof sceneInitialized !== 'undefined' ? sceneInitialized : null,
                layerVisible: typeof layer !== 'undefined' && layer ? layer.visible : null,
                pmOpacity: typeof pm !== 'undefined' && pm ? pm.opacity : null,
                lmOpacity: typeof lm !== 'undefined' && lm ? lm.opacity : null,
                lgDrawCount: typeof lg !== 'undefined' && lg ? lg.drawRange.count : null,
            };
        }""")
        print(f"Particles state: {p_state}")
        print(f"Hover Page Errors: {errors}")
        assert len(errors) == 0, f"Expected 0 errors during hover, got {errors}"
        assert p_state['sceneInitialized'] is True, "Scene should be initialized"
        assert p_state['lgDrawCount'] > 0, "Constellation lines should be actively drawn during hover!"
        print("[PASS] Star particles hover constellation lines active and error-free!")

        # 2. Test Compare Modal
        print("\n--- TEST 2: Compare Cultural Sky Lore Modal ---")
        await page.click('button[data-go="myth"]')
        await asyncio.sleep(0.5)

        cmp_btn = await page.query_selector('#btn-compare-myth')
        assert cmp_btn is not None, "#btn-compare-myth should exist"
        await cmp_btn.click()
        await asyncio.sleep(0.5)
        
        dlg_open = await page.evaluate("() => document.querySelector('#dlg').open")
        print(f"Dialog open after clicking button: {dlg_open}")
        assert dlg_open is True, "Compare dialog should be open"

        close_btn = await page.query_selector('#dlg [data-x]')
        btn_box = await close_btn.bounding_box()
        dlg_box = await (await page.query_selector('#dlg')).bounding_box()
        print(f"Close button width: {btn_box['width']:.1f}px, Dialog width: {dlg_box['width']:.1f}px")
        assert btn_box['width'] < dlg_box['width'] * 0.6, f"Close button should not stretch across dialog! {btn_box['width']} vs {dlg_box['width']}"

        # Click close button
        await close_btn.click()
        await asyncio.sleep(0.5)
        dlg_open_after = await page.evaluate("() => document.querySelector('#dlg').open")
        print(f"Dialog open after close: {dlg_open_after}")
        assert dlg_open_after is False, "Compare dialog should close when clicking Close button!"
        print("[PASS] Compare Cultural Sky Lore modal close button works perfectly and is sized appropriately!")

        # Also test header ✕ button
        await cmp_btn.click()
        await asyncio.sleep(0.3)
        header_x = await page.query_selector('#dlg .btn-close')
        assert header_x is not None, "Header ✕ close button should exist"
        await header_x.click()
        await asyncio.sleep(0.3)
        dlg_open_after_x = await page.evaluate("() => document.querySelector('#dlg').open")
        assert dlg_open_after_x is False, "Compare dialog should close when clicking ✕ header button!"
        print("[PASS] Compare Cultural Sky Lore modal X header button works perfectly!")

        # 3. Test Journeys & Achievements Modal
        print("\n--- TEST 3: Journeys & Achievements Modal ---")
        await page.click('nav button[data-go="play"]')
        await asyncio.sleep(1)

        # If onboarding dialog opened, test closing it!
        is_open = await page.evaluate("() => document.querySelector('#dlg').open")
        if is_open:
            print("Onboarding modal opened automatically on first visit. Testing its close button...")
            onboard_close = await page.query_selector('#dlg [data-x]')
            assert onboard_close is not None, "Onboarding modal must have a close button"
            await onboard_close.click()
            await asyncio.sleep(0.5)
            assert await page.evaluate("() => document.querySelector('#dlg').open") is False, "Onboarding modal should close"
            print("[PASS] Onboarding modal close button works!")

        ach_btn = await page.query_selector('#btn-achieve')
        assert ach_btn is not None
        await ach_btn.click()
        await asyncio.sleep(0.5)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is True
        close_btn = await page.query_selector('#dlg .modal-actions [data-x]')
        await close_btn.click()
        await asyncio.sleep(0.5)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is False
        print("[PASS] Achievements modal opens and closes reliably!")

        # 4. Test Settings Modal
        print("\n--- TEST 4: Settings Modal ---")
        set_btn = await page.query_selector('#btn-settings')
        await set_btn.click()
        await asyncio.sleep(0.5)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is True
        close_btn = await page.query_selector('#dlg .modal-actions [data-x]')
        await close_btn.click()
        await asyncio.sleep(0.5)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is False
        print("[PASS] Settings modal opens and closes reliably!")

        # 5. Test Quick Quiz Modal
        print("\n--- TEST 5: Quick Quiz Modal ---")
        await page.evaluate("() => { const d = document.querySelector('#qs')?.closest('details'); if (d) d.open = true; }")
        await asyncio.sleep(0.3)
        q_btn = await page.query_selector('#qs button.q')
        if q_btn and await q_btn.is_visible():
            await q_btn.click()
            await asyncio.sleep(0.5)
            assert await page.evaluate("() => document.querySelector('#dlg').open") is True
            close_btn = await page.query_selector('#dlg [data-x]')
            await close_btn.click()
            await asyncio.sleep(0.5)
            assert await page.evaluate("() => document.querySelector('#dlg').open") is False
            print("[PASS] Quick Quiz modal opens and closes reliably!")
        else:
            print("[INFO] Quick Quiz button skipped or not visible in current view")

        # 6. Test Backdrop Clicking
        print("\n--- TEST 6: Modal Backdrop Click ---")
        await set_btn.click()
        await asyncio.sleep(0.3)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is True
        # Click outside at top-left corner (10, 10)
        await page.mouse.click(10, 10)
        await asyncio.sleep(0.5)
        assert await page.evaluate("() => document.querySelector('#dlg').open") is False
        print("[PASS] Clicking modal backdrop closes the dialog reliably!")

        # Take screenshot of home page with particles
        await page.click('button[data-go="home"]')
        await asyncio.sleep(1)
        for x in range(400, 700, 30):
            await page.mouse.move(x, 350)
            await asyncio.sleep(0.02)
        await page.screenshot(path="scratch/verified_cosmic_particles.png")
        print("[PASS] Saved screenshot to scratch/verified_cosmic_particles.png")

        # Take screenshot of Compare modal
        await page.click('button[data-go="myth"]')
        await asyncio.sleep(0.5)
        cmp_btn = await page.query_selector('#btn-compare-myth')
        if cmp_btn:
            await cmp_btn.click()
            await asyncio.sleep(0.5)
            await page.screenshot(path="scratch/verified_compare_modal.png")
            print("[PASS] Saved screenshot to scratch/verified_compare_modal.png")

        await browser.close()
        print("\n==========================================")
        print("ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED")
        print("==========================================")

asyncio.run(run())
