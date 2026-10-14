import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        
        page.on('console', lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: print(f"[ERROR] {err}"))
        
        await page.goto('http://localhost:8000/index.html', wait_until='networkidle')
        await asyncio.sleep(1)
        
        info = await page.evaluate('''() => {
            const cv = document.getElementById('cv');
            return {
                cvFound: !!cv,
                cvWidth: cv ? cv.width : null,
                cvHeight: cv ? cv.height : null,
                cvClientWidth: cv ? cv.clientWidth : null,
                cvClientHeight: cv ? cv.clientHeight : null,
                cvDisplay: cv ? getComputedStyle(cv).display : null,
                cvOpacity: cv ? getComputedStyle(cv).opacity : null,
                cvZIndex: cv ? getComputedStyle(cv).zIndex : null,
                threeLoaded: typeof THREE !== 'undefined',
                sceneInitialized: typeof sceneInitialized !== 'undefined' ? sceneInitialized : null,
                layerVisible: typeof layer !== 'undefined' && layer ? layer.visible : null,
                pmOpacity: typeof pm !== 'undefined' && pm ? pm.opacity : null,
                lmOpacity: typeof lm !== 'undefined' && lm ? lm.opacity : null,
                starsCount: typeof S !== 'undefined' && S ? S.children.length : 0,
                skyVisible: typeof sky !== 'undefined' && sky ? sky.visible : null,
                globeVisible: typeof globe !== 'undefined' && globe ? globe.visible : null,
                WVisible: typeof W !== 'undefined' && W ? W.visible : null,
                cameraZ: typeof C !== 'undefined' && C ? C.position.z : null,
                P: typeof P !== 'undefined' ? P : null,
                tp: typeof tp !== 'undefined' ? tp : null,
                page: typeof page !== 'undefined' ? page : null
            };
        }''')
        print("HOME CANVAS DIAGNOSTICS:", info)
        
        # Check non-transparent pixels on #cv
        pixel_stats = await page.evaluate('''() => {
            const cv = document.getElementById('cv');
            if (!cv) return 'No canvas';
            // Create a 2D canvas and draw WebGL canvas into it to check pixels
            const c2d = document.createElement('canvas');
            c2d.width = 100;
            c2d.height = 100;
            const ctx = c2d.getContext('2d');
            try {
                ctx.drawImage(cv, 0, 0, 100, 100);
                const data = ctx.getImageData(0, 0, 100, 100).data;
                let nonZero = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) nonZero++;
                }
                return { nonZeroPixelsInSample100x100: nonZero };
            } catch (e) {
                return { error: e.message };
            }
        }''')
        print("PIXEL STATS:", pixel_stats)
        
        await page.screenshot(path='scratch/home_initial_view.png')
        print("Saved scratch/home_initial_view.png")
        await browser.close()

asyncio.run(run())
