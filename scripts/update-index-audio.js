const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');

// 1. Update LANG definition in index.html
const oldLangPattern = /const LANG=\{en:\['English'[\s\S]*?ml:\['മലയാളം','ml-IN',\[.*?\]\]\};|const LANG=\{en:\['English'[\s\S]*?ta:\['தமிழ்','ta-IN',\[.*?\]\]\};/;
const newLangCode = `const LANG={en:['English','en-IN',['Look up. The sky has told stories for ten thousand years.','Cities drown the stars and clouds hide the rest.','Here, the sky comes to you, through any ceiling, in any light.']],
hi:['हिन्दी','hi-IN',['ऊपर देखिए। आसमान दस हज़ार सालों से कहानियाँ सुना रहा है।','आसमान हर किसी के लिए है, चाहे बादल हों, शहर की रोशनी हो, या दिन का उजाला।']],
mr:['मराठी','mr-IN',['वर पाहा. आकाश हजारो वर्षे गोष्टी सांगत आहे.','आकाश सर्वांसाठी आहे, ढग असोत, शहराचे दिवे असोत किंवा दिवसाचा प्रकाश.']],
te:['తెలుగు','te-IN',['పైకి చూడండి. ఆకాశం పదివేల సంవత్సరాలుగా కథలు చెబుతోంది.','నగర వెలుగులు నక్షత్రాలను దాచవచ్చు, కాని ఇక్కడ ఆకాశం మీ ముందుకు వస్తుంది.']],
ta:['தமிழ்','ta-IN',['மேலே பாருங்கள். வானம் ஆயிரமாண்டுகளாகக் கதை சொல்கிறது.','வானம் எல்லோருக்கும் சொந்தம், மேகங்கள் இருந்தாலும் பகலிலும்.']],
kn:['ಕನ್ನಡ','kn-IN',['ಮೇಲಕ್ಕೆ ನೋಡಿ. ಆಕಾಶವು ಹತ್ತು ಸಾವಿರ ವರ್ಷಗಳಿಂದ ಕಥೆಗಳನ್ನು ಹೇಳುತ್ತಿದೆ.','ನಗರದ ದೀಪಗಳು ನಕ್ಷತ್ರಗಳನ್ನು ಮರೆಮಾಚಬಹುದು, ಆದರೆ ಇಲ್ಲಿ ಆಕಾಶವು ನಿಮ್ಮ ಬಳಿಗೇ ಬರುತ್ತದೆ.']],
ml:['മലയാളം','ml-IN',['മുകളിലേക്ക് നോക്കൂ. ആകാശം പതിനായിരം വർഷങ്ങളായി കഥകൾ പറയുകയാണ്.','നഗര വെളിച്ചങ്ങൾ നക്ഷത്രങ്ങളെ മറച്ചേക്കാം, എന്നാൽ ഇവിടെ ആകാശം നിങ്ങളുടെ അരികിലേക്ക് എത്തുന്നു.']]};`;

if (oldLangPattern.test(indexHtml)) {
  indexHtml = indexHtml.replace(oldLangPattern, newLangCode);
  console.log('✔ Updated LANG dictionary in index.html');
}

// 2. Update TALES in index.html
indexHtml = indexHtml.replace(
  "intro:['Intro',{en:LANG.en[2],hi:LANG.hi[2],mr:LANG.mr[2],ta:LANG.ta[2]}]",
  "intro:['Intro',{en:LANG.en[2],hi:LANG.hi[2],mr:LANG.mr[2],te:LANG.te[2],ta:LANG.ta[2],kn:LANG.kn[2],ml:LANG.ml[2]}]"
);

indexHtml = indexHtml.replace(
  "ta:['சப்தரிஷி என்பது ஏழு விண்மீன்கள்.','அவை துருவ நட்சத்திரத்தைச் சுற்றி வருவதாகக் கூறப்படுகிறது.']}]",
  "ta:['சப்தரிஷி என்பது ஏழு விண்மீன்கள்.','அவை துருவ நட்சத்திரத்தைச் சுற்றி வருவதாகக் கூறப்படுகிறது.'],kn:['ಸಪ್ತರ್ಷಿ ಮಂಡಲವು ಏಳು ಪ್ರಕಾಶಮಾನ ನಕ್ಷತ್ರಗಳ ಸಮೂಹವಾಗಿದೆ.','ಇವು ಅಚಲ ನಿಷ್ಠೆಯ ಸಂಕೇತವಾದ ಧ್ರುವ ನಕ್ಷತ್ರದ ಸುತ್ತ ನಿರಂತರ ಪ್ರದಕ್ಷಿಣೆ ಮಾಡುತ್ತವೆ.'],ml:['സപ്തർഷി മണ്ഡലം വടക്കൻ ആകാശത്തിലെ ഏഴ് പ്രകാശമാനമായ നക്ഷത്രങ്ങളാണ്.','അചഞ്ചല ഭക്തിയുടെ പ്രതീകമായ ധ്രുവനക്ഷത്രത്തിന് ചുറ്റും ഈ ജ്ഞാനികൾ സദാ വലംവെക്കുന്നു.']}]"
);

// 3. Update targetMap and langLabels in CosmicAudioEngine
if (!indexHtml.includes("kn: ['kn-IN', 'kn']")) {
  indexHtml = indexHtml.replace(
    `    const targetMap = {
      en: ['en-IN', 'en-GB', 'en-US', 'en'],
      hi: ['hi-IN', 'hi'],
      mr: ['mr-IN', 'mr', 'hi-IN'],
      ta: ['ta-IN', 'ta']
    };`,
    `    const targetMap = {
      en: ['en-IN', 'en-GB', 'en-US', 'en'],
      hi: ['hi-IN', 'hi'],
      mr: ['mr-IN', 'mr', 'hi-IN'],
      te: ['te-IN', 'te'],
      ta: ['ta-IN', 'ta'],
      kn: ['kn-IN', 'kn'],
      ml: ['ml-IN', 'ml']
    };`
  );
}

if (!indexHtml.includes("kn: 'ಕನ್ನಡ'")) {
  indexHtml = indexHtml.replace(
    "const langLabels = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', ta: 'தமிழ்' };",
    "const langLabels = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', te: 'తెలుగు', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം' };"
  );
}

fs.writeFileSync(INDEX_PATH, indexHtml, 'utf-8');
console.log('✔ Successfully updated index.html with Kannada and Malayalam audio story capabilities!');
