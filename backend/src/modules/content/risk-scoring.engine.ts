/**
 * Risk Scoring Engine
 * Combines detection signals into an overall risk assessment
 */

import { DetectionResult, DetectionSignal } from './detection.engine';
import { SEVERITY_THRESHOLDS, CONFIDENCE_THRESHOLDS } from '../../types/constants';

export interface RiskAssessment {
  riskScore: number; // 0-1
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  requiresHumanReview: boolean;
  categories: string[];
  detectedSignals: DetectionSignal[];
  reasoning: string[];
}

/**
 * Map risk score to severity level
 */
const getSeverity = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
  if (score >= SEVERITY_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= SEVERITY_THRESHOLDS.HIGH) return 'high';
  if (score >= SEVERITY_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
};

/**
 * Determine if human review is required
 * Based on:
 * - High severity (>= 0.7)
 * - Low confidence (< 0.65)
 * - Multiple categories detected
 */
const requiresHumanReview = (
  severity: string,
  confidence: number,
  categoryCount: number
): boolean => {
  if (severity === 'critical' || severity === 'high') {
    return true; // Always review high-risk content
  }

  if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
    return true; // Low confidence needs review
  }

  if (categoryCount >= 3) {
    return true; // Multiple violations need review
  }

  return false;
};

/**
 * Calculate overall risk score from detection result
 */
export const calculateRiskScore = (detectionResult: DetectionResult): RiskAssessment => {
  const { signals, overallScore, categories } = detectionResult;

  // Get detected signals
  const detectedSignals = signals.filter(s => s.detected);

  // Calculate weighted average confidence
  const totalConfidence = detectedSignals.reduce((sum, s) => sum + s.confidence * s.score, 0);
  const totalWeight = detectedSignals.reduce((sum, s) => sum + s.score, 0);
  const avgConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 1.0;

  // Determine severity
  const severity = getSeverity(overallScore);

  // Determine if human review required
  const needsReview = requiresHumanReview(severity, avgConfidence, categories.length);

  // Generate reasoning
  const reasoning: string[] = [];

  if (detectedSignals.length === 0) {
    reasoning.push('No harmful content detected');
  } else {
    reasoning.push(`Detected ${categories.length} violation(s): ${categories.join(', ')}`);

    if (severity === 'critical') {
      reasoning.push('CRITICAL severity - immediate review required');
    } else if (severity === 'high') {
      reasoning.push('HIGH severity - review required');
    }

    if (avgConfidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reasoning.push(`Low confidence (${(avgConfidence * 100).toFixed(0)}%) - needs verification`);
    }

    if (categories.length >= 3) {
      reasoning.push('Multiple violation categories detected');
    }
  }

  return {
    riskScore: overallScore,
    severity,
    confidence: avgConfidence,
    requiresHumanReview: needsReview,
    categories,
    detectedSignals,
    reasoning,
  };
};

/**
 * Determine recommended action based on risk assessment
 */
export const determineAction = (
  risk: RiskAssessment
): 'allow' | 'allow_and_monitor' | 'remove' | 'review' => {
  if (risk.requiresHumanReview) {
    return 'review';
  }

  if (risk.severity === 'critical' || risk.severity === 'high') {
    return 'remove';
  }

  if (risk.severity === 'medium') {
    return 'allow_and_monitor';
  }

  return 'allow';
};
