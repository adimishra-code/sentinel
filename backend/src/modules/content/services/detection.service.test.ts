import { describe, it, expect } from 'vitest';
import { runDetection } from '../detection.engine';
import { preprocessContent } from '../preprocessing.utils';

describe('DetectionEngine', () => {
  describe('preprocessContent', () => {
    it('should normalize whitespace', () => {
      const result = preprocessContent('  hello    world  ');
      expect(result.normalizedText).toBe('hello world');
    });

    it('should detect language', () => {
      const result = preprocessContent('Hello world');
      expect(result.detectedLanguage).toBe('en');
    });

    it('should extract URLs', () => {
      const result = preprocessContent('Check out https://example.com and http://test.com');
      expect(result.extractedUrls).toContain('https://example.com');
      expect(result.extractedUrls).toContain('http://test.com');
      expect(result.urlCount).toBe(2);
    });

    it('should detect repeated characters', () => {
      const result = preprocessContent('Hellloooo world');
      expect(result.hasRepeatedChars).toBe(true);
    });

    it('should detect all caps', () => {
      const result = preprocessContent('THIS IS SHOUTING');
      expect(result.hasAllCaps).toBe(true);
    });

    it('should handle empty text', () => {
      const result = preprocessContent('');
      expect(result.normalizedText).toBe('');
      expect(result.urlCount).toBe(0);
    });
  });

  describe('runDetection', () => {
    it('should return all categories with detected: false for empty text', () => {
      const preprocessed = preprocessContent('');
      const result = runDetection('', preprocessed);
      expect(result.signals).toHaveLength(6);
      expect(result.signals.every(s => s.detected === false)).toBe(true);
      expect(result.overallScore).toBe(0);
      expect(result.flagged).toBe(false);
    });

    it('should detect profanity (toxicity)', () => {
      const preprocessed = preprocessContent('This is fucking bad');
      const result = runDetection('This is fucking bad', preprocessed);
      const toxicitySignal = result.signals.find(s => s.category === 'toxicity');
      expect(toxicitySignal?.detected).toBe(true);
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should detect hate speech', () => {
      const preprocessed = preprocessContent('I hate all jews');
      const result = runDetection('I hate all jews', preprocessed);
      const hateSignal = result.signals.find(s => s.category === 'hate_speech');
      expect(hateSignal?.detected).toBe(true);
    });

    it('should detect threats (threat_direct)', () => {
      const preprocessed = preprocessContent('I will kill you');
      const result = runDetection('I will kill you', preprocessed);
      const threatSignal = result.signals.find(s => s.category === 'threat_direct');
      expect(threatSignal?.detected).toBe(true);
    });

    it('should detect sexual harassment', () => {
      const preprocessed = preprocessContent('Send me nudes');
      const result = runDetection('Send me nudes', preprocessed);
      const harassmentSignal = result.signals.find(s => s.category === 'sexual_harassment');
      expect(harassmentSignal?.detected).toBe(true);
    });

    it('should detect spam patterns', () => {
      const preprocessed = preprocessContent('Buy now! Click here! Limited offer! http://spam.com http://spam2.com');
      const result = runDetection('Buy now! Click here! Limited offer! http://spam.com http://spam2.com', preprocessed);
      const spamSignal = result.signals.find(s => s.category === 'spam');
      expect(spamSignal?.detected).toBe(true);
    });

    it('should detect phishing', () => {
      const preprocessed = preprocessContent('Verify your account now or it will be closed. Click here to login.');
      const result = runDetection('Verify your account now or it will be closed. Click here to login.', preprocessed);
      const phishingSignal = result.signals.find(s => s.category === 'phishing');
      expect(phishingSignal?.detected).toBe(true);
    });

    it('should extract evidence correctly', () => {
      const preprocessed = preprocessContent('You are a stupid idiot');
      const result = runDetection('You are a stupid idiot', preprocessed);
      const toxicitySignal = result.signals.find(s => s.category === 'toxicity');
      expect(toxicitySignal?.evidence).toContain('stupid');
      expect(toxicitySignal?.evidence).toContain('idiot');
    });

    it('should handle multiple categories', () => {
      const preprocessed = preprocessContent('You fucking jew, I will kill you');
      const result = runDetection('You fucking jew, I will kill you', preprocessed);
      const categories = result.signals.filter(s => s.detected).map(s => s.category);
      expect(categories).toContain('toxicity');
      expect(categories).toContain('hate_speech');
      expect(categories).toContain('threat_direct');
    });
  });
});