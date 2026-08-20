/**
 * Content preprocessing utilities
 */

/**
 * Normalize text for analysis
 * - Trim whitespace
 * - Normalize Unicode
 * - Collapse multiple spaces
 */
export const normalizeText = (text: string): string => {
  return text
    .trim()
    .normalize('NFKC') // Unicode normalization
    .replace(/\s+/g, ' '); // Collapse multiple spaces
};

/**
 * Detect language (simple heuristic for MVP)
 * Returns: 'en', 'hi', 'hi-en' (Hinglish), or 'unknown'
 */
export const detectLanguage = (text: string): string => {
  const devanagariPattern = /[ऀ-ॿ]/;
  const latinPattern = /[a-zA-Z]/;

  const hasDevanagari = devanagariPattern.test(text);
  const hasLatin = latinPattern.test(text);

  if (hasDevanagari && hasLatin) {
    return 'hi-en'; // Hinglish (mixed script)
  } else if (hasDevanagari) {
    return 'hi'; // Hindi
  } else if (hasLatin) {
    return 'en'; // English
  }

  return 'unknown';
};

/**
 * Extract URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  return text.match(urlPattern) || [];
};

/**
 * Detect repeated characters (e.g., "heeeeelp")
 */
export const hasRepeatedChars = (text: string): boolean => {
  return /(.)\1{3,}/.test(text); // 4+ repeated chars
};

/**
 * Detect all caps (excluding short words)
 */
export const hasAllCaps = (text: string): boolean => {
  const words = text.split(/\s+/).filter(w => w.length > 3);
  if (words.length === 0) return false;

  const capsWords = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w));
  return capsWords.length / words.length > 0.5; // >50% all caps
};

/**
 * Count words
 */
export const countWords = (text: string): number => {
  return text.split(/\s+/).filter(w => w.length > 0).length;
};

/**
 * Preprocess content and return analysis
 */
export interface PreprocessedContent {
  normalizedText: string;
  detectedLanguage: string;
  urlCount: number;
  extractedUrls: string[];
  hasRepeatedChars: boolean;
  hasAllCaps: boolean;
  wordCount: number;
}

export const preprocessContent = (text: string): PreprocessedContent => {
  const normalizedText = normalizeText(text);
  const extractedUrls = extractUrls(normalizedText);

  return {
    normalizedText,
    detectedLanguage: detectLanguage(normalizedText),
    urlCount: extractedUrls.length,
    extractedUrls,
    hasRepeatedChars: hasRepeatedChars(normalizedText),
    hasAllCaps: hasAllCaps(normalizedText),
    wordCount: countWords(normalizedText),
  };
};
