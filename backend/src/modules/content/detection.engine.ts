/**
 * Detection Engine - Pattern Matching & Rules
 * Fast deterministic detection layer
 */

import { MODERATION_CATEGORIES } from '../../types/constants';

export interface DetectionSignal {
  category: string;
  score: number; // 0-1
  confidence: number; // 0-1
  evidence: string[];
  detected: boolean;
}

export interface DetectionResult {
  signals: DetectionSignal[];
  overallScore: number;
  flagged: boolean;
  categories: string[];
}

/**
 * Profanity patterns (basic English list for MVP)
 * In production, use comprehensive multilingual lists
 */
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/gi,
  /\bs+h+i+t+/gi,
  /\bb+i+t+c+h+/gi,
  /\ba+s+s+h+o+l+e+/gi,
  /\bd+a+m+n+/gi,
  /\bc+r+a+p+/gi,
  /\bc+u+n+t+/gi,
  /\bp+i+s+s+/gi,
  /\bi+d+i+o+t+/gi,
  /\bs+t+u+p+i+d+/gi,
];

/**
 * Hate speech keywords & patterns
 */
const HATE_PATTERNS = [
  /\bn+i+g+g+e+r+/gi,
  /\bf+a+g+g+o+t+/gi,
  /\br+e+t+a+r+d+/gi,
  /\bk+i+k+e+/gi,
  /\bhate\s+(all\s+)?(jews|blacks|whites|muslims|asians|gays)\b/gi,
  /\b(kill|attack)\s+all\s+(jews|blacks|whites|muslims)\b/gi,
  /\b(fucking\s+)?(jew|kike|nigger)\b/gi,
];

/**
 * Threat patterns
 */
const THREAT_PATTERNS = [
  /\b(kill|murder|shoot|stab|hurt|harm|attack|beat)\s+(you|him|her|them)\b/gi,
  /\bgoing\s+to\s+(kill|hurt|harm|attack)\b/gi,
  /\bi('ll|'m\s+going\s+to)\s+(kill|hurt|harm)\b/gi,
  /\bdie\b.*\b(bitch|fucker|asshole)\b/gi,
];

/**
 * Sexual harassment patterns
 */
const SEXUAL_HARASSMENT_PATTERNS = [
  /\bsend\s+(me\s+)?(nudes|pics|pictures)\b/gi,
  /\bshow\s+(me\s+)?(your|ur)\s+(tits|boobs|pussy|dick|cock)\b/gi,
  /\bwanna\s+(fuck|sex|bang)\b/gi,
];

/**
 * Spam patterns
 */
const SPAM_PATTERNS = [
  /\b(buy|click|visit|check\s+out)\s+.*(now|here|link)\b/gi,
  /\b(earn|make)\s+\$?\d+.*\b(per|a)\s+(day|hour|week)\b/gi,
  /\bfree\s+(money|gift|prize)\b/gi,
];

/**
 * Phishing/Scam patterns
 */
const PHISHING_PATTERNS = [
  /\bverify\s+(your|ur)\s+account\b/gi,
  /\bclick\s+(here|link)\s+to\s+(verify|confirm|unlock)\b/gi,
  /\bsuspended.*account\b/gi,
  /\bwin\s+.*(prize|lottery|sweepstakes)\b/gi,
];

/**
 * Detect profanity/toxicity
 */
export const detectProfanity = (text: string): DetectionSignal => {
  const matches: string[] = [];
  let matchCount = 0;

  for (const pattern of PROFANITY_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matchCount += found.length;
      matches.push(...found);
    }
  }

  const detected = matchCount > 0;
  const score = Math.min(matchCount * 0.3, 1.0);

  return {
    category: MODERATION_CATEGORIES.TOXICITY,
    score,
    confidence: detected ? 0.8 : 0.9,
    evidence: matches.slice(0, 5), // First 5 matches
    detected,
  };
};

/**
 * Detect hate speech
 */
export const detectHateSpeech = (text: string): DetectionSignal => {
  const matches: string[] = [];

  for (const pattern of HATE_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  const detected = matches.length > 0;

  return {
    category: MODERATION_CATEGORIES.HATE_SPEECH,
    score: detected ? 0.95 : 0.0,
    confidence: detected ? 0.9 : 0.95,
    evidence: matches,
    detected,
  };
};

/**
 * Detect threats
 */
export const detectThreats = (text: string): DetectionSignal => {
  const matches: string[] = [];

  for (const pattern of THREAT_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  const detected = matches.length > 0;

  return {
    category: MODERATION_CATEGORIES.THREAT_DIRECT,
    score: detected ? 0.9 : 0.0,
    confidence: detected ? 0.85 : 0.9,
    evidence: matches,
    detected,
  };
};

/**
 * Detect sexual harassment
 */
export const detectSexualHarassment = (text: string): DetectionSignal => {
  const matches: string[] = [];

  for (const pattern of SEXUAL_HARASSMENT_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  const detected = matches.length > 0;

  return {
    category: MODERATION_CATEGORIES.SEXUAL_HARASSMENT,
    score: detected ? 0.85 : 0.0,
    confidence: detected ? 0.8 : 0.9,
    evidence: matches,
    detected,
  };
};

/**
 * Detect spam
 */
export const detectSpam = (text: string, urlCount: number): DetectionSignal => {
  const matches: string[] = [];

  for (const pattern of SPAM_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  // Excessive URLs are spam indicator
  const hasExcessiveUrls = urlCount > 3;
  const detected = matches.length > 0 || hasExcessiveUrls;

  const score = Math.min((matches.length * 0.3) + (hasExcessiveUrls ? 0.4 : 0), 1.0);

  return {
    category: MODERATION_CATEGORIES.SPAM,
    score,
    confidence: detected ? 0.7 : 0.85,
    evidence: hasExcessiveUrls ? [...matches, `${urlCount} URLs detected`] : matches,
    detected,
  };
};

/**
 * Detect phishing/scams
 */
export const detectPhishing = (text: string): DetectionSignal => {
  const matches: string[] = [];

  for (const pattern of PHISHING_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  const detected = matches.length > 0;

  return {
    category: MODERATION_CATEGORIES.PHISHING,
    score: detected ? 0.9 : 0.0,
    confidence: detected ? 0.85 : 0.9,
    evidence: matches,
    detected,
  };
};

/**
 * Run all detectors
 */
export const runDetection = (
  text: string,
  preprocessed: { urlCount: number; hasAllCaps: boolean; hasRepeatedChars: boolean }
): DetectionResult => {
  const normalizedText = text.toLowerCase();

  // Run all detectors
  const signals: DetectionSignal[] = [
    detectProfanity(normalizedText),
    detectHateSpeech(normalizedText),
    detectThreats(normalizedText),
    detectSexualHarassment(normalizedText),
    detectSpam(normalizedText, preprocessed.urlCount),
    detectPhishing(normalizedText),
  ];

  // Filter detected signals
  const detectedSignals = signals.filter(s => s.detected);

  // Calculate overall score (max of all scores)
  const overallScore = detectedSignals.length > 0
    ? Math.max(...detectedSignals.map(s => s.score))
    : 0;

  // Extract categories
  const categories = detectedSignals.map(s => s.category);

  return {
    signals,
    overallScore,
    flagged: overallScore > 0.3,
    categories,
  };
};
