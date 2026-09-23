import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '../risk-scoring.engine';

describe('RiskScoringEngine', () => {
  describe('calculateRiskScore', () => {
    it('should return low risk for empty signals', () => {
      const result = calculateRiskScore({ signals: [], overallScore: 0, flagged: false, categories: [] });
      expect(result.riskScore).toBe(0);
      expect(result.severity).toBe('low');
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should calculate max score from signals', () => {
      const detectionResult = {
        signals: [
          { category: 'hate_speech', score: 0.8, confidence: 0.9, evidence: [], detected: true },
          { category: 'harassment', score: 0.6, confidence: 0.8, evidence: [], detected: true },
        ],
        overallScore: 0.8,
        flagged: true,
        categories: ['hate_speech', 'harassment'],
      };
      const result = calculateRiskScore(detectionResult);
      expect(result.riskScore).toBe(0.8);
    });

    it('should recommend review for critical signals', () => {
      const detectionResult = {
        signals: [
          { category: 'threats', score: 0.95, confidence: 0.9, evidence: [], detected: true },
        ],
        overallScore: 0.95,
        flagged: true,
        categories: ['threats'],
      };
      const result = calculateRiskScore(detectionResult);
      expect(result.severity).toBe('critical');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should recommend review when confidence is low', () => {
      const detectionResult = {
        signals: [
          { category: 'spam', score: 0.7, confidence: 0.5, evidence: [], detected: true },
        ],
        overallScore: 0.7,
        flagged: true,
        categories: ['spam'],
      };
      const result = calculateRiskScore(detectionResult);
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should recommend review when multiple categories detected', () => {
      const detectionResult = {
        signals: [
          { category: 'hate_speech', score: 0.6, confidence: 0.8, evidence: [], detected: true },
          { category: 'harassment', score: 0.5, confidence: 0.7, evidence: [], detected: true },
          { category: 'threats', score: 0.4, confidence: 0.6, evidence: [], detected: true },
        ],
        overallScore: 0.6,
        flagged: true,
        categories: ['hate_speech', 'harassment', 'threats'],
      };
      const result = calculateRiskScore(detectionResult);
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should calculate weighted confidence correctly', () => {
      const detectionResult = {
        signals: [
          { category: 'hate_speech', score: 0.8, confidence: 0.9, evidence: [], detected: true },
          { category: 'harassment', score: 0.6, confidence: 0.8, evidence: [], detected: true },
        ],
        overallScore: 0.8,
        flagged: true,
        categories: ['hate_speech', 'harassment'],
      };
      const result = calculateRiskScore(detectionResult);
      // Weighted avg: (0.8*0.9 + 0.6*0.8) / (0.8+0.6) = 1.2 / 1.4 = 0.857
      expect(result.confidence).toBeCloseTo(0.857, 2);
    });

    it('should return critical severity for score >= 0.9', () => {
      const result = calculateRiskScore({
        signals: [{ category: 'test', score: 0.95, confidence: 0.9, evidence: [], detected: true }],
        overallScore: 0.95,
        flagged: true,
        categories: ['test'],
      });
      expect(result.severity).toBe('critical');
    });

    it('should return high severity for score >= 0.7', () => {
      const result = calculateRiskScore({
        signals: [{ category: 'test', score: 0.85, confidence: 0.9, evidence: [], detected: true }],
        overallScore: 0.85,
        flagged: true,
        categories: ['test'],
      });
      expect(result.severity).toBe('high');
    });

    it('should return medium severity for score >= 0.5', () => {
      const result = calculateRiskScore({
        signals: [{ category: 'test', score: 0.65, confidence: 0.9, evidence: [], detected: true }],
        overallScore: 0.65,
        flagged: true,
        categories: ['test'],
      });
      expect(result.severity).toBe('medium');
    });

    it('should return low severity for score < 0.5', () => {
      const result = calculateRiskScore({
        signals: [{ category: 'test', score: 0.4, confidence: 0.9, evidence: [], detected: true }],
        overallScore: 0.4,
        flagged: true,
        categories: ['test'],
      });
      expect(result.severity).toBe('low');
    });
  });
});