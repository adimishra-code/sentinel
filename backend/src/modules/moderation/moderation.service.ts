/**
 * Moderation Service
 * Orchestrates content moderation pipeline
 */

import { Content } from '../content/content.model';
import { preprocessContent } from '../content/preprocessing.utils';
import { runDetection } from '../content/detection.engine';
import { calculateRiskScore, determineAction } from '../content/risk-scoring.engine';
import { ContentType } from '../../types';
import logger from '../../utils/logger';

export interface ModerateContentInput {
  contentType: ContentType;
  text?: string;
  imageUrls?: string[];
  urls?: string[];
  authorId?: string;
  targetId?: string;
  conversationId?: string;
  sourcePlatform?: string;
  metadata?: Record<string, unknown>;
}

export interface ModerationResult {
  contentId: string;
  decision: 'allow' | 'allow_and_monitor' | 'remove' | 'review';
  riskScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  categories: string[];
  requiresHumanReview: boolean;
  reasoning: string[];
  processedAt: Date;
}

/**
 * Moderate content
 */
export const moderateContent = async (
  organizationId: string,
  input: ModerateContentInput
): Promise<ModerationResult> => {
  const startTime = Date.now();

  // Validate content type
  if (input.contentType === 'text' && !input.text) {
    throw new Error('Text content required for text type');
  }

  // Preprocess text content
  let preprocessed;
  if (input.text) {
    preprocessed = preprocessContent(input.text);
  }

  // Store content in database
  const content = await Content.create({
    organizationId,
    contentType: input.contentType,
    text: input.text,
    imageUrls: input.imageUrls || [],
    urls: input.urls || [],
    authorId: input.authorId,
    targetId: input.targetId,
    conversationId: input.conversationId,
    sourcePlatform: input.sourcePlatform,
    metadata: input.metadata || {},
    language: preprocessed?.detectedLanguage,
    preprocessed: preprocessed ? {
      normalizedText: preprocessed.normalizedText,
      detectedLanguage: preprocessed.detectedLanguage,
      urlCount: preprocessed.urlCount,
      hasRepeatedChars: preprocessed.hasRepeatedChars,
      hasAllCaps: preprocessed.hasAllCaps,
      wordCount: preprocessed.wordCount,
    } : undefined,
  });

  // Run detection (text only for Phase 2)
  let detectionResult;
  let riskAssessment;
  let action: 'allow' | 'allow_and_monitor' | 'remove' | 'review' = 'allow';

  if (input.text && preprocessed) {
    // Run fast detection
    detectionResult = runDetection(preprocessed.normalizedText, {
      urlCount: preprocessed.urlCount,
      hasAllCaps: preprocessed.hasAllCaps,
      hasRepeatedChars: preprocessed.hasRepeatedChars,
    });

    // Calculate risk score
    riskAssessment = calculateRiskScore(detectionResult);

    // Determine action
    action = determineAction(riskAssessment);
  } else {
    // Non-text content - placeholder for Phase 2+
    riskAssessment = {
      riskScore: 0,
      severity: 'low' as const,
      confidence: 1.0,
      requiresHumanReview: false,
      categories: [],
      detectedSignals: [],
      reasoning: ['Image/URL moderation will be implemented in Phase 2+'],
    };
  }

  const latencyMs = Date.now() - startTime;

  logger.info('Content moderated', {
    contentId: content._id,
    organizationId,
    decision: action,
    riskScore: riskAssessment.riskScore,
    severity: riskAssessment.severity,
    latencyMs,
  });

  return {
    contentId: content._id.toString(),
    decision: action,
    riskScore: riskAssessment.riskScore,
    severity: riskAssessment.severity,
    confidence: riskAssessment.confidence,
    categories: riskAssessment.categories,
    requiresHumanReview: riskAssessment.requiresHumanReview,
    reasoning: riskAssessment.reasoning,
    processedAt: new Date(),
  };
};

/**
 * Get content by ID
 */
export const getContent = async (contentId: string, organizationId: string) => {
  const content = await Content.findOne({ _id: contentId, organizationId });

  if (!content) {
    throw new Error('Content not found');
  }

  return {
    id: content._id.toString(),
    organizationId: content.organizationId.toString(),
    contentType: content.contentType,
    text: content.text,
    imageUrls: content.imageUrls,
    urls: content.urls,
    authorId: content.authorId,
    targetId: content.targetId,
    conversationId: content.conversationId,
    sourcePlatform: content.sourcePlatform,
    language: content.language,
    preprocessed: content.preprocessed,
    createdAt: content.createdAt,
  };
};

/**
 * List content (paginated)
 */
export const listContent = async (
  organizationId: string,
  options: {
    page?: number;
    limit?: number;
    authorId?: string;
    contentType?: ContentType;
  } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = { organizationId };
  if (options.authorId) filter.authorId = options.authorId;
  if (options.contentType) filter.contentType = options.contentType;

  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  return {
    items: items.map(item => ({
      id: item._id.toString(),
      contentType: item.contentType,
      text: item.text?.substring(0, 200), // Truncate for list view
      authorId: item.authorId,
      language: item.language,
      createdAt: item.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
