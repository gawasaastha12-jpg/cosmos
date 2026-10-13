/**
 * generate-audio.js
 * 
 * Synthesizes audio files for Cosmic Mythology Explorer audio stories.
 * Reads story scripts from data/audio-stories.json and outputs MP3 files into audio/
 * with metadata recorded in audio/manifest.json.
 * 
 * Environment variables supported (DO NOT COMMIT SECRETS):
 * - GOOGLE_TTS_API_KEY: Google Cloud Text-to-Speech API key
 * - AZURE_SPEECH_KEY: Azure Cognitive Services Speech key
 * - AZURE_SPEECH_REGION: Azure Speech region (e.g. 'centralindia', 'eastus')
 * 
 * Command line flags:
 * - --placeholder: Explicitly permit generating timing-calibrated synthetic placeholder frames
 *   when cloud API credentials are not provided.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const STORIES_PATH = path.join(__dirname, '..', 'data', 'audio-stories.json');
const AUDIO_DIR = path.join(__dirname, '..', 'audio');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'manifest.json');

const GOOGLE_KEY = process.env.GOOGLE_TTS_API_KEY || '';
const AZURE_KEY = process.env.AZURE_SPEECH_KEY || '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'centralindia';
const ALLOW_PLACEHOLDER = process.argv.includes('--placeholder');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function computeChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Creates valid compliant MPEG-1 Layer 3 silent/ambient audio buffer of given duration
 */
function createCompliantMp3Buffer(durationSec) {
  const frameHeader = Buffer.from([0xFF, 0xFB, 0x90, 0x64]);
  const sideInfo = Buffer.alloc(32);
  const mainData = Buffer.alloc(417 - 4 - 32);
  const frame = Buffer.concat([frameHeader, sideInfo, mainData]);

  const frameDuration = 0.026122;
  const numFrames = Math.max(1, Math.round(durationSec / frameDuration));
  const totalBuffer = Buffer.alloc(frame.length * numFrames);
  for (let i = 0; i < numFrames; i++) {
    frame.copy(totalBuffer, i * frame.length);
  }
  return totalBuffer;
}

/**
 * Synthesize via Google Cloud Text-to-Speech
 */
function synthesizeGoogleTTS(text, langCode, apiKey) {
  return new Promise((resolve, reject) => {
    const voiceMap = {
      en: { languageCode: 'en-IN', name: 'en-IN-Neural2-A', ssmlGender: 'FEMALE' },
      hi: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A', ssmlGender: 'FEMALE' },
      mr: { languageCode: 'mr-IN', name: 'mr-IN-Wavenet-A', ssmlGender: 'FEMALE' },
      ta: { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A', ssmlGender: 'FEMALE' }
    };
    const voice = voiceMap[langCode] || voiceMap.en;

    const payload = JSON.stringify({
      input: { text },
      voice: voice,
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 }
    });

    const options = {
      hostname: 'texttospeech.googleapis.com',
      path: `/v1/text:synthesize?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.audioContent) {
            resolve(Buffer.from(json.audioContent, 'base64'));
          } else {
            reject(new Error(json.error ? json.error.message : 'Unknown Google TTS error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- Cosmic Mythology Audio Generation ---');
  if (!fs.existsSync(STORIES_PATH)) {
    console.error(`Error: Stories file not found at ${STORIES_PATH}`);
    process.exit(1);
  }

  const hasCloudKey = Boolean(GOOGLE_KEY || AZURE_KEY);
  if (!hasCloudKey && !ALLOW_PLACEHOLDER) {
    console.warn('\nNotice: Cloud TTS API key (GOOGLE_TTS_API_KEY / AZURE_SPEECH_KEY) is not set.');
    console.warn('generate-audio.js will NOT write placeholder MP3 files unless --placeholder is explicitly passed.');
    console.warn('The application player will use device Web Speech synthesis directly.\n');
    return;
  }

  const stories = JSON.parse(fs.readFileSync(STORIES_PATH, 'utf-8'));
  console.log(`Loaded ${stories.length} stories from ${STORIES_PATH}`);

  let existingManifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch (_) {}
  }

  const updatedManifest = { ...existingManifest };
  let generatedCount = 0;
  let cloudSynthesized = 0;

  for (const story of stories) {
    for (const [lang, ldata] of Object.entries(story.languages)) {
      const fileName = `${story.id}.${lang}.mp3`;
      const filePath = path.join(AUDIO_DIR, fileName);
      const fullText = ldata.sentences.map(s => s.text).join(' ');
      const targetDuration = ldata.duration || 30.0;

      let audioBuffer = null;
      let voiceUsed = 'Offline Synthetic Timing Placeholder (Compliant MPEG-1 L3)';
      let isPlaceholder = true;

      if (GOOGLE_KEY) {
        try {
          console.log(`Cloud synthesizing ${fileName} using Google TTS...`);
          audioBuffer = await synthesizeGoogleTTS(fullText, lang, GOOGLE_KEY);
          voiceUsed = `Google Cloud TTS (${lang})`;
          isPlaceholder = false;
          cloudSynthesized++;
        } catch (err) {
          console.warn(`Google TTS failed for ${fileName} (${err.message}).`);
        }
      }

      if (!audioBuffer && ALLOW_PLACEHOLDER) {
        audioBuffer = createCompliantMp3Buffer(targetDuration);
        isPlaceholder = true;
      }

      if (audioBuffer) {
        fs.writeFileSync(filePath, audioBuffer);
        const checksum = computeChecksum(audioBuffer);

        updatedManifest[fileName] = {
          storyId: story.id,
          title: ldata.title,
          lang: lang,
          duration: targetDuration,
          sentencesCount: ldata.sentences.length,
          voice: voiceUsed,
          placeholder: isPlaceholder,
          needsNativeReview: lang !== 'en',
          checksum: checksum,
          updatedAt: new Date().toISOString()
        };
        generatedCount++;
      }
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2), 'utf-8');
  console.log(`\nSuccessfully processed ${generatedCount} audio tracks across 4 languages.`);
  console.log(`Cloud synthesized: ${cloudSynthesized}`);
  console.log(`Updated manifest saved to: ${MANIFEST_PATH}`);
}

run().catch(err => {
  console.error('Fatal audio generation error:', err);
  process.exit(1);
});
