const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  'Graphic Violence',
  'Hate Symbols',
  'Self-Harm',
  'Extremist Propaganda',
  'Weapons & Contraband',
  'Harassment & Humiliation',
];

const PROMPT = `You are an AI Content Moderation System.

Analyze the provided image against ALL of the following moderation categories. Carefully inspect the entire image, including people, objects, symbols, text, signs, banners, logos, weapons, gestures, and background elements.

Category Definitions:

Graphic Violence
Detect visible blood, gore, severe injuries, dead bodies, physical assault, torture, mutilation, or graphic harm to humans or animals.

Hate Symbols
Detect hate symbols, extremist symbols, racist symbols, hate speech, offensive slurs, discriminatory text, or imagery associated with hate groups or terrorist organizations.

Self-Harm
Detect visual content depicting, encouraging, glorifying, or demonstrating self-inflicted injury, suicide attempts, cutting, burning, or other forms of self-harm.

Extremist Propaganda
Detect content that promotes, recruits for, glorifies, supports, or encourages violent extremist movements, terrorism, radicalization, or extremist ideologies. Peaceful protests alone should NOT be classified as extremist propaganda.

Weapons & Contraband
Detect firearms, illegal weapons, explosives, drug production, drug trafficking, illegal substances, smuggling-related content, or criminal contraband.

Harassment & Humiliation
Detect content intended to degrade, threaten, bully, intimidate, shame, or publicly humiliate an identifiable individual or group.

Instructions:
- Evaluate each category independently.
- Use only evidence visible in the image.
- Do not assume facts that are not visible.
- If evidence is weak or unclear, return detected=false with a lower confidence score.
- Confidence must be an integer from 0 to 100.
- Reasoning should be concise (1-2 sentences maximum).
- Return valid JSON only.
- Do not include markdown, code blocks, or explanations outside the JSON.

Return a JSON array with exactly 6 objects in this order:
[
  {"category": "Graphic Violence", "detected": false, "confidence": 5, "reasoning": "No violence visible."},
  {"category": "Hate Symbols", "detected": false, "confidence": 3, "reasoning": "No hate symbols present."},
  {"category": "Self-Harm", "detected": false, "confidence": 2, "reasoning": "No self-harm content."},
  {"category": "Extremist Propaganda", "detected": false, "confidence": 1, "reasoning": "No extremist content."},
  {"category": "Weapons & Contraband", "detected": false, "confidence": 4, "reasoning": "No weapons visible."},
  {"category": "Harassment & Humiliation", "detected": false, "confidence": 2, "reasoning": "No harassment content."}
]`;

// ─── Real Gemini analysis ────────────────────────────────────────────────────

const analyzeWithGemini = async (imagePath) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: base64Image, mimeType: mediaTypeMap[ext] || 'image/jpeg' } },
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Gemini returned invalid response format');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.map((item) => ({
    category: item.category,
    detected: item.detected,
    confidence: item.confidence,
    reason: item.reasoning || item.reason || '',
  }));
};

// ─── Mock analysis (used when MOCK_AI=true or no API key) ────────────────────
// Produces realistic-looking results for development and demo purposes.

const MOCK_REASONS = {
  'Graphic Violence': [
    'No visible blood, injury, or physical harm detected in the image.',
    'Image contains depictions of physical injury with visible gore.',
    'Minor action content present but below violence threshold.',
  ],
  'Hate Symbols': [
    'No extremist symbols, insignia, or hate imagery detected.',
    'Possible extremist iconography detected in the background.',
    'Image is free of any hate-related visual content.',
  ],
  'Self-Harm': [
    'No self-harm depictions or glorification detected.',
    'Content appears to reference self-harm behaviour.',
    'Image contains no indicators of self-inflicted injury.',
  ],
  'Extremist Propaganda': [
    'No propaganda, recruitment material, or extremist messaging found.',
    'Text or imagery may be associated with extremist movements.',
    'No violent extremist content present.',
  ],
  'Weapons & Contraband': [
    'No weapons, illegal substances, or contraband visible.',
    'Firearm or weapon-like object detected in the image.',
    'Image appears to depict controlled substances.',
  ],
  'Harassment & Humiliation': [
    'No content intended to degrade or humiliate any individual.',
    'Image context suggests targeted humiliation of an identifiable person.',
    'No harassment indicators found in the image.',
  ],
};

const mockAnalyzeImage = () => {
  // Simulate a mostly-clean image with occasional low-level flags
  return CATEGORIES.map((category) => {
    const roll = Math.random();
    const detected = roll > 0.85; // ~15% chance of detection per category
    const confidence = detected
      ? Math.floor(Math.random() * 35) + 55  // 55–90 when detected
      : Math.floor(Math.random() * 25) + 2;  // 2–27 when clean

    const reasons = MOCK_REASONS[category];
    const reason = detected ? reasons[1] : reasons[Math.floor(Math.random() * 2) === 0 ? 0 : 2] || reasons[0];

    return { category, detected, confidence, reason };
  });
};

// ─── Public analyzeImage — switches between real and mock ────────────────────

const analyzeImage = async (imagePath) => {
  const useMock = process.env.MOCK_AI === 'true' || !process.env.GEMINI_API_KEY;

  if (useMock) {
    console.log('[Moderation] Using mock AI (set MOCK_AI=false and add GEMINI_API_KEY to use real AI)');
    return mockAnalyzeImage();
  }

  return analyzeWithGemini(imagePath);
};

// ─── Verdict logic ────────────────────────────────────────────────────────────

const determineVerdict = (categoryResults, policies) => {
  let verdict = 'Approved';

  for (const result of categoryResults) {
    const policy = policies.find((p) => p.category === result.category);

    if (!policy || !policy.enabled) continue;
    if (result.confidence < policy.threshold) continue;
    if (!result.detected) continue;

    if (policy.action === 'Auto-Block') return 'Blocked';
    if (policy.action === 'Flag for Review') verdict = 'Flagged for Review';
  }

  return verdict;
};

module.exports = { analyzeImage, determineVerdict, CATEGORIES };
