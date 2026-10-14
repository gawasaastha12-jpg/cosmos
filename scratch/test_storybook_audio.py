import sys
import io

# Ensure UTF-8 output for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

def run():
    errors = []
    logs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 850})
        
        page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        
        print("Navigating to http://127.0.0.1:8000/audio.html...")
        page.goto('http://127.0.0.1:8000/audio.html', wait_until='networkidle')
        page.wait_for_timeout(600)
        
        # Check title & language chips
        chips = page.query_selector_all('#lang-bar button')
        chip_texts = [c.inner_text().strip() for c in chips]
        print(f"Available Language Chips ({len(chips)}): {chip_texts}")
        assert 'ಕನ್ನಡ' in chip_texts, "Kannada chip missing!"
        assert 'മലയാളം' in chip_texts, "Malayalam chip missing!"
        
        # 1. Switch to Kannada
        print("\nTesting Kannada selection...")
        kn_chip = page.query_selector("button[data-lang='kn']")
        kn_chip.click()
        page.wait_for_timeout(400)
        
        kn_title = page.inner_text('#story-title')
        kn_sentences = page.query_selector_all('#sentence-container .story-sentence')
        print(f"Kannada Title: {kn_title}")
        print(f"Kannada Sentences count: {len(kn_sentences)}")
        print(f"First sentence: {kn_sentences[0].inner_text()}")
        
        # Capture screenshot of Kannada Illuminated Storybook
        page.screenshot(path='scratch/storybook_kannada.png')
        print("Saved scratch/storybook_kannada.png")
        
        # Test Playback in Kannada
        print("Testing play button in Kannada...")
        play_btn = page.query_selector('#btn-play')
        play_btn.click()
        page.wait_for_timeout(1000)
        
        is_playing = page.evaluate("() => isPlaying")
        active_sentence = page.query_selector('.story-sentence.active')
        active_text = active_sentence.inner_text() if active_sentence else "None"
        voice_badge = page.inner_text('#voice-badge')
        mode_txt = page.inner_text('#engine-mode-txt')
        cur_time = page.inner_text('#cur-time')
        print(f"Is Playing: {is_playing}, Active Sentence: {active_text[:35]}...")
        print(f"Voice Badge: {voice_badge}, Engine: {mode_txt}, Current Time: {cur_time}")
        
        # Wait a couple seconds to verify sentence pacing (no fastforwarding / no skipping)
        page.wait_for_timeout(2500)
        cur_sentence_idx = page.evaluate("() => curSentenceIdx")
        print(f"After 3.5s playback, curSentenceIdx is: {cur_sentence_idx} (Smooth paced playback, no skipping!)")
        assert cur_sentence_idx in [0, 1], f"Expected index 0 or 1, but got {cur_sentence_idx} (was skipped or fastforwarded?)"
        
        # Pause
        play_btn.click()
        page.wait_for_timeout(300)
        
        # 2. Switch to Malayalam
        print("\nTesting Malayalam selection...")
        ml_chip = page.query_selector("button[data-lang='ml']")
        ml_chip.click()
        page.wait_for_timeout(400)
        
        ml_title = page.inner_text('#story-title')
        ml_sentences = page.query_selector_all('#sentence-container .story-sentence')
        print(f"Malayalam Title: {ml_title}")
        print(f"Malayalam Sentences count: {len(ml_sentences)}")
        print(f"First sentence: {ml_sentences[0].inner_text()}")
        
        # Capture screenshot of Malayalam Illuminated Storybook
        page.screenshot(path='scratch/storybook_malayalam.png')
        print("Saved scratch/storybook_malayalam.png")
        
        # Test Playback in Malayalam
        print("Testing play button in Malayalam...")
        play_btn.click()
        page.wait_for_timeout(1000)
        
        is_playing_ml = page.evaluate("() => isPlaying")
        active_ml = page.query_selector('.story-sentence.active')
        print(f"Is Playing ML: {is_playing_ml}, Active: {active_ml.inner_text()[:35] if active_ml else 'None'}...")
        page.wait_for_timeout(2500)
        cur_sentence_idx_ml = page.evaluate("() => curSentenceIdx")
        print(f"After 3.5s playback in ML, curSentenceIdx is: {cur_sentence_idx_ml} (Smooth paced playback, no skipping!)")
        assert cur_sentence_idx_ml in [0, 1], f"Expected index 0 or 1, but got {cur_sentence_idx_ml}"
        
        # Pause
        play_btn.click()
        
        # 3. Chapter navigation test
        print("\nTesting Next Chapter navigation...")
        next_btn = page.query_selector('#btn-next-page')
        next_btn.click()
        page.wait_for_timeout(500)
        ch2_title = page.inner_text('#story-title')
        ch2_indicator = page.inner_text('#page-indicator')
        print(f"Chapter 2 Title: {ch2_title}")
        print(f"Indicator: {ch2_indicator}")
        
        print("\nConsole errors:", errors)
        assert len(errors) == 0, f"Page errors found: {errors}"
        
        browser.close()
        print("\n✔ ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run()
