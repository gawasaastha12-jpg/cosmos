// Application State
let stories = [];
let curIdx = 0;
let curLang = 'en';
let curSentenceIdx = 0;
let isPlaying = false;
let playbackSpeed = 1.0;
let simulatedElapsed = 0;
let totalDuration = 30;
let sentenceTimer = null;
let fallbackTimer = null;
let speechToken = 0;
let audioCtx = null;

const LANG_LABELS = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം'
};

const SPEECH_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN'
};

const I18N = {
  en: {
    chapter: 'Chapter',
    of: 'of',
    scienceLabel: 'Observational Astrophysics:',
    prevChapter: '← Previous Chapter',
    nextChapter: 'Next Chapter →',
    browseChapters: '📚 Browse All Chapters',
    defaultScience: 'Explored through observational astronomy and stellar mapping.',
    engineModeSpeech: 'Speech Narration',
    engineModeCelestial: 'Celestial Narration',
    voiceNative: 'Native Voice',
    voiceDevanagari: 'Devanagari Engine',
    voicePhonetic: 'Phonetic Voice',
    voiceCelestial: 'Harmonic Timer',
    traditions: {
      'Indian & Greek': 'Indian & Greek Lore',
      'Vedic Lore': 'Vedic Sky Lore',
      'Greek Mythology': 'Greco-Roman Sky Lore',
      'East Asian': 'East Asian Astronomy',
      'Arabic': 'Arabic Sky Lore',
      'default': 'Ancient Sky Lore'
    }
  },
  hi: {
    chapter: 'अध्याय',
    of: 'का',
    scienceLabel: 'खगोल भौतिकी व तारकीय विज्ञान:',
    prevChapter: '← पिछला अध्याय',
    nextChapter: 'अगला अध्याय →',
    browseChapters: '📚 सभी अध्याय देखें',
    defaultScience: 'खगोलीय वेधशाला और तारकीय नकाशानुसार वैज्ञानिक दृष्टिकोण।',
    engineModeSpeech: 'ध्वनि वाचन',
    engineModeCelestial: 'खगोलीय स्वर वाचन',
    voiceNative: 'स्थानीय स्वर',
    voiceDevanagari: 'देवनागरी इंजन',
    voicePhonetic: 'ध्वन्यात्मक स्वर',
    voiceCelestial: 'खगोलीय समयपाल',
    traditions: {
      'Indian & Greek': 'भारतीय और ग्रीक परंपरा',
      'Vedic Lore': 'वैदिक खगोल परंपरा',
      'Greek Mythology': 'ग्रीक खगोल परंपरा',
      'East Asian': 'पूर्व एशियाई खगोल ज्ञान',
      'Arabic': 'अरबी खगोल परंपरा',
      'default': 'प्राचीन खगोल ज्ञान'
    }
  },
  mr: {
    chapter: 'प्रकरण',
    of: 'पैकी',
    scienceLabel: 'खगोल भौतिकी व तारकीय निरीक्षण:',
    prevChapter: '← मागील प्रकरण',
    nextChapter: 'पुढील प्रकरण →',
    browseChapters: '📚 सर्व प्रकरणे पहा',
    defaultScience: 'खगोलीय वेधशाळा आणि तारकीय नकाशांद्वारे शास्त्रीय अभ्यास व निरीक्षण.',
    engineModeSpeech: 'मराठी वाचन',
    engineModeCelestial: 'खगोलीय स्वर वाचन',
    voiceNative: 'मराठी मूळ स्वर',
    voiceDevanagari: 'देवनागरी ध्वनी इंजन',
    voicePhonetic: 'ध्वन्यात्मक स्वर',
    voiceCelestial: 'खगोलीय समयपाल',
    traditions: {
      'Indian & Greek': 'भारतीय व ग्रीक परंपरा',
      'Vedic Lore': 'वैदिक खगोल परंपरा',
      'Greek Mythology': 'ग्रीक खगोल परंपरा',
      'East Asian': 'पूर्व आशियाई खगोल ज्ञान',
      'Arabic': 'अरबी खगोल परंपरा',
      'default': 'प्राचीन आकाशीय ज्ञान'
    }
  },
  te: {
    chapter: 'అధ్యాయం',
    of: 'లో',
    scienceLabel: 'ఖగోళ భౌతిక శాస్త్ర వివరణ:',
    prevChapter: '← మునుపటి అధ్యాయం',
    nextChapter: 'తదుపరి అధ్యాయం →',
    browseChapters: '📚 అన్ని అధ్యాయాలు చూడండి',
    defaultScience: 'ఖగోళ పరిశీలనలు మరియు నక్షత్ర పటాల ద్వారా సమగ్ర వైజ్ఞానిక అధ్యయనం.',
    engineModeSpeech: 'తెలుగు శ్రవణం',
    engineModeCelestial: 'దివ్య శ్రవణ నాదం',
    voiceNative: 'తెలుగు సహజ స్వరం',
    voiceDevanagari: 'భారతీయ స్వరం',
    voicePhonetic: 'ధ్వన్యాత్మక స్వరం',
    voiceCelestial: 'ఖగోళ కాలమానం',
    traditions: {
      'Indian & Greek': 'భారతీయ & గ్రీకు పురాణాలు',
      'Vedic Lore': 'వైదిక ఖగోళ సంప్రదాయం',
      'Greek Mythology': 'గ్రీకు పురాణ జ్ఞానం',
      'East Asian': 'తూర్పు ఆసియా ఖగోళం',
      'Arabic': 'అరబిక్ ఖగోళ సంప్రదాయం',
      'default': 'పురాతన ఆకాశ జ్ఞానం'
    }
  },
  ta: {
    chapter: 'அத்தியாயம்',
    of: 'இல்',
    scienceLabel: 'வானியற்பியல் விளக்கம்:',
    prevChapter: '← முந்தைய அத்தியாயம்',
    nextChapter: 'அடுத்த அத்தியாயம் →',
    browseChapters: '📚 அனைத்து அத்தியாயங்களும்',
    defaultScience: 'வானியல் கண்காணிப்பு மற்றும் விண்மீன் வரைபடங்கள் மூலம் ஆய்வு.',
    engineModeSpeech: 'ஒலி வாசிப்பு',
    engineModeCelestial: 'வான் ஒலி வாசிப்பு',
    voiceNative: 'தமிழ் சொந்தக் குரல்',
    voiceDevanagari: 'பாரதிய குரல்',
    voicePhonetic: 'ஒலிபெயர்ப்பு குரல்',
    voiceCelestial: 'வான் நேர அளவீடு',
    traditions: {
      'Indian & Greek': 'இந்திய & கிரேக்க பாரம்பரியம்',
      'Vedic Lore': 'வேத வானியல் பாரம்பரியம்',
      'Greek Mythology': 'கிரேக்க பாரம்பரியம்',
      'East Asian': 'கிழக்காசிய வானியல்',
      'Arabic': 'அரேபிய வானியல்',
      'default': 'பண்டைய விண்மீன் அறிவு'
    }
  },
  kn: {
    chapter: 'ಅಧ್ಯಾಯ',
    of: 'ರ',
    scienceLabel: 'ಖಗೋಳ ಭೌತಶಾಸ್ತ್ರದ ವಿವರಣೆ:',
    prevChapter: '← ಹಿಂದಿನ ಅಧ್ಯಾಯ',
    nextChapter: 'ಮುಂದಿನ ಅಧ್ಯಾಯ →',
    browseChapters: '📚 ಎಲ್ಲಾ ಅಧ್ಯಾಯಗಳನ್ನು ನೋಡಿ',
    defaultScience: 'ಖಗೋಳ ವೀಕ್ಷಣೆ ಮತ್ತು ನಕ್ಷತ್ರ ನಕ್ಷೆಗಳ ಮೂಲಕ ವೈಜ್ಞಾನಿಕ ಅಧ್ಯಯನ.',
    engineModeSpeech: 'ಕನ್ನಡ ವಾಚನ',
    engineModeCelestial: 'ಖಗೋಳ ದಿವ್ಯ ಶ್ರವಣ',
    voiceNative: 'ಕನ್ನಡ ಧ್ವನಿ',
    voiceDevanagari: 'ಭಾರತೀಯ ಧ್ವನಿ',
    voicePhonetic: 'ಧ್ವನ್ಯಾತ್ಮಕ ಧ್ವನಿ',
    voiceCelestial: 'ಖಗೋಳ ಕಾಲಮಾಪಕ',
    traditions: {
      'Indian & Greek': 'ಭಾರತೀಯ ಮತ್ತು ಗ್ರೀಕ್ ಪುರಾಣ',
      'Vedic Lore': 'ವೈದಿಕ ಖಗೋಳ ಪರಂಪರೆ',
      'Greek Mythology': 'ಗ್ರೀಕ್ ಪುರಾಣ ಪರಂಪರೆ',
      'East Asian': 'ಪೂರ್ವ ಏಷ್ಯಾದ ಖಗೋಳ',
      'Arabic': 'ಅರೇಬಿಕ್ ಖಗೋಳ ಪರಂಪರೆ',
      'default': 'ಪ್ರಾಚೀನ ಆಕಾಶ ಜ್ಞಾನ'
    }
  },
  ml: {
    chapter: 'അദ്ധ്യായം',
    of: '-ൽ',
    scienceLabel: 'ജ്യോതിർഭൗതിക നിരീക്ഷണം:',
    prevChapter: '← മുൻപത്തെ അദ്ധ്യായം',
    nextChapter: 'അടുത്ത അദ്ധ്യായം →',
    browseChapters: '📚 എല്ലാ അദ്ധ്യായങ്ങളും കാണുക',
    defaultScience: 'ജ്യോതിശാസ്ത്ര നിരീക്ഷണങ്ങളിലൂടെയും നക്ഷത്ര മാപ്പുകളിലൂടെയും നടത്തിയ പഠനം.',
    engineModeSpeech: 'മലയാള വായന',
    engineModeCelestial: 'ആകാശ ശബ്ദ ശ്രവണം',
    voiceNative: 'മലയാള തനത് ശബ്ദം',
    voiceDevanagari: 'ഭാരതീയ ശബ്ദം',
    voicePhonetic: 'ഉച്ചാരണ ശബ്ദം',
    voiceCelestial: 'ആകാശ സമയപാലകൻ',
    traditions: {
      'Indian & Greek': 'ഭാരതീയ-ഗ്രീക്ക് പാരമ്പര്യം',
      'Vedic Lore': 'വേദ ജ്യോതിഷ പാരമ്പര്യം',
      'Greek Mythology': 'ഗ്രീക്ക് പുരാണ വിജ്ഞാനം',
      'East Asian': 'കിഴക്കൻ ഏഷ്യൻ വാനശാസ്ത്രം',
      'Arabic': 'അറബിക് ജ്യോതിഷ പാരമ്പര്യം',
      'default': 'പുരാതന വാനശാസ്ത്രം'
    }
  }
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Standalone fallback stories for offline use (populated dynamically by builder)
/* __FALLBACK_STORIES_INJECTION__ */

// --- Web Audio Celestial Chime Generator ---
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playCelestialChime(freq = 528) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.6);

    // Subtle celestial shimmer that doesn't mask the narrator voice
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  } catch (_) {}
}

// --- Indic Script to Spoken Phonetic Transliteration ---
// Allows standard English voices (e.g. on Windows default) to articulate Indic words cleanly
function indicToPhonetic(str) {
  if (!str) return '';
  const devaVowels = {'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au','अं':'am','अः':'ah'};
  const devaMatras = {'ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h'};
  const devaCons = {
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh',
    'ष':'sh','स':'s','ह':'h','ळ':'l','क्ष':'ksh','ज्ञ':'gya'
  };

  const telVowels = {'అ':'a','ఆ':'aa','ఇ':'i','ఈ':'ee','ఉ':'u','ఊ':'oo','ఋ':'ri','ఎ':'e','ఏ':'e','ఐ':'ai','ఒ':'o','ఓ':'o','ఔ':'au','అం':'am','అః':'ah'};
  const telMatras = {'ా':'aa','ి':'i','ీ':'ee','ు':'u','ూ':'oo','ృ':'ri','ె':'e','ే':'e','ై':'ai','ొ':'o','ో':'o','ౌ':'au','ం':'m','ః':'h'};
  const telCons = {
    'క':'k','ఖ':'kh','గ':'g','ఘ':'gh','ఙ':'ng','చ':'ch','ఛ':'chh','జ':'j','ఝ':'jh','ఞ':'ny',
    'ట':'t','ఠ':'th','డ':'d','ఢ':'dh','ణ':'n','త':'t','థ':'th','ద':'d','ధ':'dh','న':'n',
    'ప':'p','ఫ':'ph','బ':'b','భ':'bh','మ':'m','య':'y','ర':'r','ల':'l','వ':'v','శ':'sh',
    'ష':'sh','స':'s','హ':'h','ళ':'l','క్ష':'ksh','ఱ':'r'
  };

  const tamVowels = {
    'அ':'a','ஆ':'aa','இ':'i','ஈ':'ee','உ':'u','ஊ':'oo',
    'எ':'e','ஏ':'ae','ஐ':'ai','ஒ':'o','ஓ':'oo','ஔ':'au','ஃ':'h'
  };
  const tamMatras = {
    'ா':'aa','ி':'i','ீ':'ee','ு':'u','ூ':'oo',
    'ெ':'e','ே':'ae','ை':'ai','ொ':'o','ோ':'oo','ௌ':'au'
  };
  const tamCons = {
    'க':'k','ங':'ng','ச':'ch','ஞ':'ny','ட':'t','ண':'n',
    'த':'th','ந':'n','ப':'p','ம':'m','ய':'y','ர':'r',
    'ல':'l','வ':'v','ழ':'zh','ள':'l','ற':'r','ன':'n',
    'ஜ':'j','ஷ':'sh','ஸ':'s','ஹ':'h','க்ஷ':'ksh'
  };

  const knVowels = {'ಅ':'a','ಆ':'aa','ಇ':'i','ಈ':'ee','ಉ':'u','ಊ':'oo','ಋ':'ri','ಎ':'e','ಏ':'e','ಐ':'ai','ಒ':'o','ಓ':'o','ಔ':'au'};
  const knMatras = {'ಾ':'aa','ಿ':'i','ೀ':'ee','ು':'u','ೂ':'oo','ೃ':'ri','ೆ':'e','ೇ':'e','ೈ':'ai','ೊ':'o','ೋ':'o','ೌ':'au','ಂ':'m','ಃ':'h'};
  const knCons = {
    'ಕ':'k','ಖ':'kh','ಗ':'g','ಘ':'gh','ಙ':'ng','ಚ':'ch','ಛ':'chh','ಜ':'j','ಝ':'jh','ಞ':'ny',
    'ಟ':'t','ಠ':'th','ಡ':'d','ಢ':'dh','ಣ':'n','ತ':'th','ಥ':'th','ದ':'d','ಧ':'dh','ನ':'n',
    'ಪ':'p','ಫ':'ph','ಬ':'b','ಭ':'bh','ಮ':'m','ಯ':'y','ರ':'r','ಲ':'l','ವ':'v','ಶ':'sh',
    'ಷ':'sh','ಸ':'s','ಹ':'h','ಳ':'l','ಕ್ಷ':'ksh','ಱ':'r'
  };

  const mlVowels = {'അ':'a','ആ':'aa','ഇ':'i','ഈ':'ee','ഉ':'u','ഊ':'oo','ഋ':'ri','എ':'e','ഏ':'e','ഐ':'ai','ഒ':'o','ഓ':'o','ഔ':'au'};
  const mlMatras = {'ാ':'aa','ി':'i','ീ':'ee','ു':'u','ൂ':'oo','ൃ':'ri','െ':'e','േ':'e','ൈ':'ai','ൊ':'o','ോ':'o','ൌ':'au','ൗ':'au','ം':'m','ഃ':'h'};
  const mlCons = {
    'ക':'k','ഖ':'kh','ഗ':'g','ഘ':'gh','ങ':'ng','ച':'ch','ഛ':'chh','ജ':'j','ഝ':'jh','ഞ':'ny',
    'ട':'t','ഠ':'th','ഡ':'d','ഢ':'dh','ണ':'n','ത':'th','ഥ':'th','ദ':'d','ധ':'dh','ന':'n',
    'പ':'p','ഫ':'ph','ബ':'b','ഭ':'bh','മ':'m','യ':'y','ര':'r','ല':'l','വ':'v','ശ':'sh',
    'ഷ':'sh','സ':'s','ഹ':'h','ള':'l','ഴ':'zh','റ':'r','ക്ഷ':'ksh'
  };
  const mlChillus = {'ൺ':'n','ൻ':'n','ർ':'r','ൽ':'l','ൾ':'l','ൿ':'k'};

  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i+1];

    // Devanagari (Hindi, Marathi)
    if (devaCons[ch]) {
      if (next === '्') { out += devaCons[ch]; i++; }
      else if (devaMatras[next]) { out += devaCons[ch] + devaMatras[next]; i++; }
      else { out += devaCons[ch] + 'a'; }
    } else if (devaVowels[ch]) {
      out += devaVowels[ch];
    } else if (devaMatras[ch]) {
      out += devaMatras[ch];
    }
    // Telugu
    else if (telCons[ch]) {
      if (next === '్') { out += telCons[ch]; i++; }
      else if (telMatras[next]) { out += telCons[ch] + telMatras[next]; i++; }
      else { out += telCons[ch] + 'a'; }
    } else if (telVowels[ch]) {
      out += telVowels[ch];
    } else if (telMatras[ch]) {
      out += telMatras[ch];
    }
    // Tamil
    else if (tamCons[ch]) {
      if (next === '்') { out += tamCons[ch]; i++; }
      else if (tamMatras[next]) { out += tamCons[ch] + tamMatras[next]; i++; }
      else { out += tamCons[ch] + 'a'; }
    } else if (tamVowels[ch]) {
      out += tamVowels[ch];
    } else if (tamMatras[ch]) {
      out += tamMatras[ch];
    }
    // Kannada
    else if (knCons[ch]) {
      if (next === '\u0CCD') { out += knCons[ch]; i++; }
      else if (knMatras[next]) { out += knCons[ch] + knMatras[next]; i++; }
      else { out += knCons[ch] + 'a'; }
    } else if (knVowels[ch]) {
      out += knVowels[ch];
    } else if (knMatras[ch]) {
      out += knMatras[ch];
    }
    // Malayalam
    else if (mlCons[ch]) {
      if (next === '\u0D4D') { out += mlCons[ch]; i++; }
      else if (mlMatras[next]) { out += mlCons[ch] + mlMatras[next]; i++; }
      else { out += mlCons[ch] + 'a'; }
    } else if (mlVowels[ch]) {
      out += mlVowels[ch];
    } else if (mlChillus[ch]) {
      out += mlChillus[ch];
    } else if (mlMatras[ch]) {
      out += mlMatras[ch];
    }
    // Passthrough spaces, numbers, punctuation, symbols
    else {
      out += ch;
    }
  }
  return out;
}

// --- Voice Resolver with Tiered Fallback ---
function resolveVoiceForLang(lang) {
  if (!('speechSynthesis' in window)) return { mode: 'timer' };
  const voices = window.speechSynthesis.getVoices() || [];

  // Tier 1: Direct native match (e.g. kn-IN, ml-IN, mr-IN, te-IN, hi-IN, ta-IN)
  const native = voices.find(v => {
    const vl = (v.lang || '').toLowerCase().replace('_', '-');
    const vn = (v.name || '').toLowerCase();
    if (lang === 'kn') return vl.startsWith('kn') || vn.includes('kannada');
    if (lang === 'ml') return vl.startsWith('ml') || vn.includes('malayalam');
    if (lang === 'te') return vl.startsWith('te') || vn.includes('telugu');
    if (lang === 'ta') return vl.startsWith('ta') || vn.includes('tamil');
    if (lang === 'hi') return vl.startsWith('hi') || vn.includes('hindi');
    if (lang === 'mr') return vl.startsWith('mr') || vn.includes('marathi');
    return vl.startsWith(lang);
  });
  if (native) {
    return { voice: native, mode: 'native', langCode: native.lang };
  }

  // Tier 2: Marathi uses Devanagari script; a Hindi voice synthesizes it with high fluency
  if (lang === 'mr') {
    const hi = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('hi'));
    if (hi) {
      return { voice: hi, mode: 'devanagari', langCode: hi.lang };
    }
  }

  // Tier 3: Indian English voice with phonetic syllable synthesis (great for Indic phonetics)
  const inEn = voices.find(v => (v.lang && v.lang.toLowerCase() === 'en-in') || /india|heera|ravi|neerja|prabhat/i.test(v.name));
  if (inEn) {
    return { voice: inEn, mode: 'phonetic', langCode: inEn.lang };
  }

  // Tier 4: Default system voice (e.g. Microsoft David / Zira / Google US English) using phonetic transliteration
  const def = voices.find(v => v.default) || voices[0] || null;
  if (def) {
    return { voice: def, mode: 'phonetic', langCode: def.lang || 'en-US' };
  }

  return { mode: 'timer' };
}

// Load Stories Data (prefer public subset)
async function initStories() {
  try {
    const res = await fetch('data/audio-stories.public.json').catch(() => fetch('data/audio-stories.json'));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        stories = data;
      }
    }
  } catch (e) {
    console.warn('Using bundled audio stories fallback:', e);
  }

  if (!stories || stories.length === 0) {
    stories = FALLBACK_STORIES;
  }

  // Populate Table of Contents
  $('#chapter-count').textContent = stories.length;
  renderTOC();

  // Check URL hash for direct story link
  const hash = location.hash.replace('#', '');
  const idx = stories.findIndex(s => s.id === hash);
  if (idx >= 0) curIdx = idx;

  renderCurrentStory();
}

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  const idx = stories.findIndex(s => s.id === hash);
  if (idx >= 0 && idx !== curIdx) {
    curIdx = idx;
    if (typeof stopNarration === 'function') stopNarration();
    renderCurrentStory();
  }
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    const resolved = resolveVoiceForLang(curLang);
    const dict = I18N[curLang] || I18N.en;
    const badge = $('#voice-badge');
    if (badge) {
      badge.textContent = resolved.mode === 'native' ? dict.voiceNative
        : resolved.mode === 'devanagari' ? dict.voiceDevanagari
        : resolved.mode === 'phonetic' ? dict.voicePhonetic
        : dict.voiceCelestial;
    }
  };
}

// --- Storybook Page Rendering ---
function renderTOC() {
  const menu = $('#toc-menu');
  menu.innerHTML = stories.map((s, i) => `
    <button class="toc-item ${i === curIdx ? 'active' : ''}" data-idx="${i}">
      <span>${s.glyph || '✦'}</span>
      <span><b>Ch. ${i + 1}</b> · ${s.title}</span>
    </button>
  `).join('');

  menu.onclick = e => {
    const btn = e.target.closest('[data-idx]');
    if (btn) {
      curIdx = +btn.dataset.idx;
      stopNarration();
      location.hash = stories[curIdx].id;
      renderCurrentStory();
      menu.classList.remove('open');
      $('#btn-toc').setAttribute('aria-expanded', 'false');
      $('#toc-arrow').textContent = '▼';
    }
  };
}

function renderCurrentStory() {
  const s = stories[curIdx];
  if (!s) return;

  // Update URL hash without extra history entries
  history.replaceState(null, '', '#' + s.id);

  const chNum = curIdx + 1;
  const dict = I18N[curLang] || I18N.en;

  // Ensure curLang is supported by this story
  const availLangs = s.languages ? Object.keys(s.languages) : ['en'];
  if (!availLangs.includes(curLang)) {
    curLang = availLangs[0] || 'en';
  }

  // Update Language Bar
  const langBar = $('#lang-bar');
  langBar.innerHTML = availLangs.map(l => `
    <button class="lang-chip ${l === curLang ? 'active' : ''}" data-lang="${l}">
      ${LANG_LABELS[l] || l.toUpperCase()}
    </button>
  `).join('');

  langBar.onclick = e => {
    const chip = e.target.closest('[data-lang]');
    if (chip && chip.dataset.lang !== curLang) {
      curLang = chip.dataset.lang;
      stopNarration();
      renderCurrentStory();
    }
  };

  // Story Content & Localized Titles
  const langData = (s.languages && s.languages[curLang]) || (s.languages && s.languages.en) || {};
  const localizedTitle = langData.title || (s.subtitles && s.subtitles[curLang]) || s.title;
  const chTitle = localizedTitle;

  const tradName = (dict.traditions && dict.traditions[s.tradition]) || s.tradition;
  const localizedSubtitle = (s.subtitles && s.subtitles[curLang]) || langData.title || s.title;

  $('#story-title').textContent = chTitle;
  $('#player-title').textContent = chTitle;
  $('#plate-glyph').textContent = s.glyph || '✦';
  $('#plate-constellation').textContent = s.constellation || 'Constellation';
  $('#plate-subtitle').textContent = localizedSubtitle;
  $('#tradition-badge').textContent = tradName;

  // Observational Astrophysics Callout
  const sciBoxBold = $('#science-box b');
  if (sciBoxBold) sciBoxBold.textContent = dict.scienceLabel;
  
  const localizedScience = (s.scienceLocalized && s.scienceLocalized[curLang]) || s.science || dict.defaultScience;
  $('#science-text').textContent = localizedScience;

  // Eyebrow and Page Indicator
  const eyeEl = $('#chapter-eyebrow');
  if (curLang === 'mr') {
    eyeEl.textContent = `${dict.chapter} ${chNum} ${dict.of} ${stories.length} · ${chTitle}`;
  } else if (curLang === 'ml') {
    eyeEl.textContent = `${stories.length}${dict.of} ${dict.chapter} ${chNum} · ${chTitle}`;
  } else if (curLang === 'ta') {
    eyeEl.textContent = `${stories.length}-${dict.of} ${dict.chapter} ${chNum} · ${chTitle}`;
  } else {
    eyeEl.textContent = `${dict.chapter} ${chNum} ${dict.of} ${stories.length} · ${chTitle}`;
  }

  $('#page-indicator').textContent = `${dict.chapter} ${chNum} ${dict.of} ${stories.length}`;
  $('#btn-prev-page').textContent = dict.prevChapter;
  $('#btn-next-page').textContent = dict.nextChapter;

  const tocBtnTxt = $('#btn-toc span:first-child');
  if (tocBtnTxt) {
    tocBtnTxt.innerHTML = `${dict.browseChapters} (<span id="chapter-count">${stories.length}</span>)`;
  }

  // Populate Story Sentences with click-to-seek
  const sentences = langData.sentences || [{ text: s.story || 'Celestial story lore.', start: 0, end: 15 }];
  totalDuration = langData.duration || (sentences[sentences.length - 1] ? sentences[sentences.length - 1].end : 30);
  $('#dur-time').textContent = formatTime(totalDuration);

  // Latin script (English) uses traditional drop-cap.
  // Indic scripts (Kannada, Malayalam, Telugu, Marathi, Hindi, Tamil) hide drop-cap
  // to avoid severing composite aksharas, matras, and viramas.
  const dropCapEl = $('#drop-cap');
  const container = $('#sentence-container');

  if (curLang === 'en') {
    dropCapEl.style.display = 'block';
    const fullText = sentences[0] ? sentences[0].text : '';
    const firstChar = fullText.charAt(0);
    dropCapEl.textContent = firstChar;

    container.innerHTML = sentences.map((sent, i) => {
      let txt = sent.text;
      if (i === 0 && txt.startsWith(firstChar)) {
        txt = txt.slice(1);
      }
      return `<span class="story-sentence ${i === curSentenceIdx ? 'active' : ''}" data-sidx="${i}">${txt}</span> `;
    }).join('');
  } else {
    dropCapEl.style.display = 'none';
    container.innerHTML = sentences.map((sent, i) => `
      <span class="story-sentence ${i === curSentenceIdx ? 'active' : ''}" data-sidx="${i}">${sent.text}</span>
    `).join(' ');
  }

  container.onclick = e => {
    const span = e.target.closest('[data-sidx]');
    if (span) {
      const idx = +span.dataset.sidx;
      curSentenceIdx = idx;
      highlightSentence(idx);
      if (isPlaying) {
        playSentenceFrom(idx);
      } else {
        playNarration();
      }
    }
  };

  // Update engine mode in ribbon
  const resolved = resolveVoiceForLang(curLang);
  $('#voice-badge').textContent = resolved.mode === 'native' ? dict.voiceNative
    : resolved.mode === 'devanagari' ? dict.voiceDevanagari
    : resolved.mode === 'phonetic' ? dict.voicePhonetic
    : dict.voiceCelestial;
  $('#engine-mode-txt').textContent = resolved.mode === 'timer' ? dict.engineModeCelestial : dict.engineModeSpeech;

  curSentenceIdx = 0;
  updateScrubber(0);
}

function highlightSentence(idx) {
  $$('.story-sentence').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  const s = stories[curIdx];
  const langData = (s.languages && s.languages[curLang]) || {};
  const sentences = langData.sentences || [];
  if (sentences[idx]) {
    updateScrubber(sentences[idx].start);
  }
}

function updateScrubber(seconds) {
  simulatedElapsed = seconds;
  const pct = Math.min(100, Math.max(0, (seconds / (totalDuration || 1)) * 100));
  $('#scrubber').value = pct;
  $('#cur-time').textContent = formatTime(seconds);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function clearPlaybackTimers() {
  if (sentenceTimer) { clearTimeout(sentenceTimer); sentenceTimer = null; }
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
}

// --- Narration Engine via Web Speech & Celestial Tone Fallback ---
function playNarration() {
  clearPlaybackTimers();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isPlaying = true;
  updatePlayButton(true);
  playSentenceFrom(curSentenceIdx);
}

function playSentenceFrom(idx) {
  clearPlaybackTimers();

  const s = stories[curIdx];
  const langData = (s.languages && s.languages[curLang]) || {};
  const sentences = langData.sentences || [];

  if (idx >= sentences.length) {
    stopNarration();
    return;
  }

  curSentenceIdx = idx;
  highlightSentence(idx);

  const sent = sentences[idx];
  const rawDuration = (sent.end - sent.start) || 4.5;
  const sentDuration = Math.max(3.5, rawDuration) / playbackSpeed;

  // Soft ambient celestial chime on sentence arrival
  playCelestialChime(440 + (idx % 6) * 55);

  const resolved = resolveVoiceForLang(curLang);
  const dict = I18N[curLang] || I18N.en;

  // Update badge in player ribbon
  const badge = $('#voice-badge');
  const modeTxt = $('#engine-mode-txt');
  if (resolved.mode === 'native') {
    badge.textContent = dict.voiceNative;
    modeTxt.textContent = dict.engineModeSpeech;
  } else if (resolved.mode === 'devanagari') {
    badge.textContent = dict.voiceDevanagari;
    modeTxt.textContent = dict.engineModeSpeech;
  } else if (resolved.mode === 'phonetic') {
    badge.textContent = dict.voicePhonetic;
    modeTxt.textContent = dict.engineModeSpeech;
  } else {
    badge.textContent = dict.voiceCelestial;
    modeTxt.textContent = dict.engineModeCelestial;
  }

  // If speech synthesis is not supported or resolved to timer:
  if (!('speechSynthesis' in window) || resolved.mode === 'timer') {
    playSentenceTimerFallback(idx, sentDuration);
    return;
  }

  try {
    speechToken++;
    const curToken = speechToken;

    // Cancel previous utterance
    window.speechSynthesis.cancel();

    let spokenText = sent.text;
    // If system voice doesn't know Indic script, speak phonetic transliteration
    if (resolved.mode === 'phonetic' && curLang !== 'en') {
      spokenText = indicToPhonetic(sent.text);
    }

    // Delay ~60ms between cancel and speak to avoid Chromium / Windows speech IPC drop
    setTimeout(() => {
      if (curToken !== speechToken || !isPlaying) return;

      const utter = new SpeechSynthesisUtterance(spokenText);
      window.__activeUtterance = utter; // Retain active reference to prevent garbage collection cut-off
      utter.rate = playbackSpeed * (curLang === 'en' ? 1.0 : 0.92);
      utter.pitch = 1.0;
      utter.volume = 1.0;
      if (resolved.voice) utter.voice = resolved.voice;
      utter.lang = resolved.langCode || SPEECH_CODES[curLang] || 'en-IN';

      let handled = false;

      utter.onend = () => {
        if (handled || curToken !== speechToken) return;
        handled = true;
        clearPlaybackTimers();
        window.__activeUtterance = null;
        if (isPlaying) {
          if (curSentenceIdx + 1 < sentences.length) {
            sentenceTimer = setTimeout(() => {
              if (curToken === speechToken && isPlaying) {
                playSentenceFrom(curSentenceIdx + 1);
              }
            }, 350);
          } else {
            stopNarration();
          }
        }
      };

      utter.onerror = (e) => {
        if (handled || curToken !== speechToken) return;
        // Ignore normal cancel/interrupted events when stopping or switching
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
          return;
        }
        console.warn('Speech synthesis note:', e ? (e.error || e) : 'error');
        handled = true;
        clearPlaybackTimers();
        window.__activeUtterance = null;
        if (isPlaying) {
          playSentenceTimerFallback(curSentenceIdx, sentDuration);
        }
      };

      // Watchdog timer: ensure story smoothly continues if browser engine stalls silently,
      // but NEVER cut off an actively speaking voice!
      const watchdogDelay = Math.max(5000, (sentDuration + 3.0) * 1000);
      fallbackTimer = setTimeout(function checkWatchdog() {
        if (handled || curToken !== speechToken || !isPlaying) return;
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          fallbackTimer = setTimeout(checkWatchdog, 1000);
          return;
        }
        handled = true;
        window.__activeUtterance = null;
        if (curSentenceIdx + 1 < sentences.length) {
          playSentenceFrom(curSentenceIdx + 1);
        } else {
          stopNarration();
        }
      }, watchdogDelay);

      window.speechSynthesis.speak(utter);
    }, 60);

  } catch (err) {
    console.warn('Speech invocation error, falling back to timer pacing:', err);
    playSentenceTimerFallback(idx, sentDuration);
  }
}

function playSentenceTimerFallback(idx, durationSec) {
  clearPlaybackTimers();
  const s = stories[curIdx];
  const langData = (s.languages && s.languages[curLang]) || {};
  const sentences = langData.sentences || [];

  const dict = I18N[curLang] || I18N.en;
  $('#voice-badge').textContent = dict.voiceCelestial;
  $('#engine-mode-txt').textContent = dict.engineModeCelestial;

  const startTime = performance.now();
  const startSec = sentences[idx] ? sentences[idx].start : 0;
  const endSec = sentences[idx] ? sentences[idx].end : (startSec + durationSec);

  function stepProgress() {
    if (!isPlaying || curSentenceIdx !== idx) return;
    const elapsed = (performance.now() - startTime) / 1000;
    const progressFrac = Math.min(1, elapsed / durationSec);
    const currentSec = startSec + progressFrac * (endSec - startSec);
    updateScrubber(currentSec);

    if (progressFrac < 1) {
      sentenceTimer = setTimeout(stepProgress, 100);
    } else {
      if (curSentenceIdx + 1 < sentences.length) {
        playSentenceFrom(curSentenceIdx + 1);
      } else {
        stopNarration();
      }
    }
  }

  stepProgress();
}

function stopNarration() {
  speechToken++;
  isPlaying = false;
  clearPlaybackTimers();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  window.__activeUtterance = null;
  updatePlayButton(false);
}

function updatePlayButton(playing) {
  $('#btn-play').textContent = playing ? '❚❚' : '▶';
  $('#btn-play').setAttribute('aria-label', playing ? 'Pause narration' : 'Play narration');
  $('#eq-bars').classList.toggle('playing', playing);
}

// --- Event Listeners ---
$('#btn-play').onclick = () => {
  if (isPlaying) stopNarration();
  else playNarration();
};

$('#btn-prev-page').onclick = () => {
  if (curIdx > 0) {
    curIdx--;
    stopNarration();
    renderCurrentStory();
  }
};

$('#btn-next-page').onclick = () => {
  if (curIdx < stories.length - 1) {
    curIdx++;
    stopNarration();
    renderCurrentStory();
  }
};

$('#btn-toc').onclick = () => {
  const menu = $('#toc-menu');
  const open = menu.classList.toggle('open');
  $('#btn-toc').setAttribute('aria-expanded', String(open));
  $('#toc-arrow').textContent = open ? '▲' : '▼';
};

const SPEEDS = [0.8, 1.0, 1.25];
$('#btn-speed').onclick = () => {
  let cur = SPEEDS.indexOf(playbackSpeed);
  playbackSpeed = SPEEDS[(cur + 1) % SPEEDS.length];
  $('#btn-speed').textContent = `${playbackSpeed}x`;
  if (isPlaying) {
    playSentenceFrom(curSentenceIdx);
  }
};

$('#scrubber').oninput = e => {
  const pct = +e.target.value;
  const targetSec = (pct / 100) * totalDuration;
  updateScrubber(targetSec);
  const s = stories[curIdx];
  const langData = (s.languages && s.languages[curLang]) || {};
  const sentences = langData.sentences || [];
  const bestIdx = sentences.findIndex(sent => targetSec >= sent.start && targetSec <= sent.end);
  if (bestIdx >= 0) {
    curSentenceIdx = bestIdx;
    highlightSentence(bestIdx);
    if (isPlaying) playSentenceFrom(bestIdx);
  }
};

// Keyboard shortcuts: Space for play/pause, Left/Right arrows for chapters
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') {
    e.preventDefault();
    $('#btn-play').click();
  } else if (e.code === 'ArrowLeft') {
    $('#btn-prev-page').click();
  } else if (e.code === 'ArrowRight') {
    $('#btn-next-page').click();
  }
});

initStories();
