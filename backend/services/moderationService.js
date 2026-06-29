// moderationService.js — Core AI analysis logic.
// Provides two analysis modes:
//   - Real: sends image to Google Gemini and parses its JSON response
//   - Mock: generates realistic-looking random results (used when MOCK_AI=true)
// Also exports the verdict determination logic used by submissionController.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');

// The 6 fixed moderation categories used across the entire system.
// Exported so other files (Policy model, policyController) can import the same list.
const CATEGORIES = [
  'Graphic Violence',
  'Hate Symbols',
  'Self-Harm',
  'Extremist Propaganda',
  'Weapons & Contraband',
  'Harassment & Humiliation',
];

// The prompt sent to Gemini along with the image.
// Defines each category precisely and instructs the model to return strict JSON only.
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

// analyzeWithGemini — sends the image to the Gemini API and parses the JSON response.
// Steps:
//   1. Read the image file from disk into a Buffer.
//   2. Convert to base64 string (Gemini requires inline image data, not a file path).
//   3. Determine the correct MIME type from the file extension.
//   4. Send the prompt + image to the Gemini model.
//   5. Extract the JSON array from the response text (strip any extra text Gemini adds).
//   6. Normalize the field names and return the 6-element array.
const analyzeWithGemini = async (imagePath) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  // Read file and encode as base64 — Gemini accepts images as inline base64 data
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Map file extension to MIME type for the API request
  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
  };

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: base64Image, mimeType: mediaTypeMap[ext] || 'image/jpeg' } },
  ]);

  const text = result.response.text().trim();

  // Use regex to extract the JSON array in case Gemini includes any surrounding text
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Gemini returned invalid response format');

  const parsed = JSON.parse(jsonMatch[0]);

  // Normalize field names: Gemini may return 'reasoning' but our DB schema expects 'reason'
  return parsed.map((item) => ({
    category:   item.category,
    detected:   item.detected,
    confidence: item.confidence,
    reason:     item.reasoning || item.reason || '',
  }));
};

// Pre-written realistic reasons for each category used by the mock service
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

// mockAnalyzeImage — generates random but realistic-looking moderation results.
// Used in development (MOCK_AI=true) to avoid API quota issues.
// Each category has a ~15% chance of being flagged, with confidence scores that
// reflect a real-world distribution (higher when detected, lower when clean).
const mockAnalyzeImage = () => {
  return CATEGORIES.map((category) => {
    const roll     = Math.random();
    const detected = roll > 0.85; // approximately 15% detection rate per category

    const confidence = detected
      ? Math.floor(Math.random() * 35) + 55  // 55–90% when a violation is detected
      : Math.floor(Math.random() * 25) + 2;  // 2–27% when the image is clean

    const reasons = MOCK_REASONS[category];
    // Pick the "detected" reason [1] or randomly pick a "clean" reason [0] or [2]
    const reason = detected
      ? reasons[1]
      : reasons[Math.floor(Math.random() * 2) === 0 ? 0 : 2] || reasons[0];

    return { category, detected, confidence, reason };
  });
};

// analyzeImage — public entry point called by submissionController for each uploaded image.
// Decides whether to use the real Gemini API or the mock service based on environment variables.
// Falls back to mock if GEMINI_API_KEY is not set, so the app works out of the box.
const analyzeImage = async (imagePath) => {
  const useMock = process.env.MOCK_AI === 'true' || !process.env.GEMINI_API_KEY;

  if (useMock) {
    console.log('[Moderation] Using mock AI (set MOCK_AI=false and add GEMINI_API_KEY to use real AI)');
    return mockAnalyzeImage();
  }

  return analyzeWithGemini(imagePath);
};

// determineVerdict — converts the 6 AI category results into a single overall verdict.
// Logic:
//   - Start with "Approved" (innocent until proven otherwise).
//   - For each category result, check if:
//       a) The category's policy is enabled.
//       b) The AI confidence is at or above the policy threshold.
//       c) The category was actually detected.
//   - If action is "Auto-Block": immediately return "Blocked" (no need to check further).
//   - If action is "Flag for Review": upgrade verdict to "Flagged for Review" and continue.
//   - If nothing triggers: return "Approved".
const determineVerdict = (categoryResults, policies) => {
  let verdict = 'Approved'; // default — only changes if a policy rule is triggered

  for (const result of categoryResults) {
    // Find the matching policy for this category
    const policy = policies.find((p) => p.category === result.category);

    if (!policy || !policy.enabled) continue;           // skip if policy is disabled
    if (result.confidence < policy.threshold) continue;  // skip if AI confidence is too low
    if (!result.detected) continue;                      // skip if category was not detected

    // The most severe action wins — Auto-Block short-circuits the loop entirely
    if (policy.action === 'Auto-Block') return 'Blocked';
    if (policy.action === 'Flag for Review') verdict = 'Flagged for Review';
  }

  return verdict;
};

module.exports = { analyzeImage, determineVerdict, CATEGORIES };
