import asyncio
import os
import shutil
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto('http://localhost:8000/dist/', wait_until='networkidle')
        await asyncio.sleep(1)
        
        # Scroll to globe section #gs
        await page.evaluate('''() => {
            const gs = document.getElementById('gs');
            if (gs) window.scrollTo(0, gs.offsetTop);
        }''')
        await asyncio.sleep(1)
        
        os.makedirs('scratch/screenshots', exist_ok=True)
        await page.screenshot(path='scratch/screenshots/01_globe_home.png')
        print('Captured 01_globe_home.png')
        
        # Open Sci
        await page.click('button[data-go="sci"]')
        await asyncio.sleep(0.5)
        disp_sci = await page.evaluate('''() => document.getElementById('cv').style.display''')
        print('Sci cv display:', disp_sci)
        await page.screenshot(path='scratch/screenshots/02_sci_view.png')
        print('Captured 02_sci_view.png')
        
        # Open Myth
        await page.click('button[data-go="myth"]')
        await asyncio.sleep(0.5)
        disp_myth = await page.evaluate('''() => document.getElementById('cv').style.display''')
        print('Myth cv display:', disp_myth)
        await page.screenshot(path='scratch/screenshots/03_myth_view.png')
        print('Captured 03_myth_view.png')
        
        # Open Play / Journeys
        await page.click('button[data-go="play"]')
        await asyncio.sleep(0.5)
        disp_play = await page.evaluate('''() => document.getElementById('cv').style.display''')
        print('Play cv display:', disp_play)
        await page.screenshot(path='scratch/screenshots/04_play_view.png')
        print('Captured 04_play_view.png')
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
