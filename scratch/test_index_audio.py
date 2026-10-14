import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1280, 'height': 850})
    page.goto('http://127.0.0.1:8000/', wait_until='networkidle')
    page.evaluate("() => { document.querySelectorAll('dialog').forEach(d => d.close()); go('play'); }")
    page.wait_for_timeout(500)
    
    # Check language tabs in index.html
    lg_buttons = page.query_selector_all('#lg button')
    lg_texts = [b.inner_text().strip() for b in lg_buttons]
    print('index.html #lg tabs:', lg_texts)
    assert 'ಕನ್ನಡ' in lg_texts, 'Kannada missing in index.html'
    assert 'മലയാളം' in lg_texts, 'Malayalam missing in index.html'
    
    # Click Kannada in #lg using evaluate
    page.evaluate("() => document.querySelector(\"button[data-l='kn']\").click()")
    page.wait_for_timeout(300)
    story_text = page.inner_text('#ac')
    print('Kannada story text:', story_text[:60])
    
    # Click Malayalam in #lg using evaluate
    page.evaluate("() => document.querySelector(\"button[data-l='ml']\").click()")
    page.wait_for_timeout(300)
    story_text_ml = page.inner_text('#ac')
    print('Malayalam story text:', story_text_ml[:60])
    
    # Open audio theater modal
    page.evaluate("() => audioPlayer.openForStory('Orion and the Celestial Deer', 'Orion')")
    page.wait_for_timeout(500)
    
    modal_chips = page.query_selector_all('#audio-lang-chips button')
    modal_texts = [b.inner_text().strip() for b in modal_chips]
    print('Cosmic Audio Theater modal chips:', modal_texts)
    assert 'ಕನ್ನಡ' in modal_texts, 'Kannada missing in modal'
    assert 'മലയാളം' in modal_texts, 'Malayalam missing in modal'
    
    page.screenshot(path='scratch/index_audio_theater.png')
    print('Saved scratch/index_audio_theater.png')
    browser.close()
    print('ALL INDEX TESTS PASSED!')
