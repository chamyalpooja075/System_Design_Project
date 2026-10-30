import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { DomainGraph, MetricsOutputContract } from '../domain/domain-model.interface';
import { RuleViolation } from '../rules/rule-engine.interface';

export interface RetrievedPattern {
  docKey: string;
  title: string;
  topic: string;
  similarity: number;
  summary: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Performs semantic vector search across ingested knowledge base docs.
   */
  async search(query: string, limit = 3): Promise<RetrievedPattern[]> {
    try {
      const queryVector = await this.embeddingService.generateEmbedding(query);
      const docs = await this.prisma.knowledgeDoc.findMany();

      if (!docs || docs.length === 0) {
        return [];
      }

      const scored = docs.map((doc) => {
        let docVector: number[] = [];
        try {
          docVector = JSON.parse(doc.embedding);
        } catch {
          docVector = [];
        }

        const similarity = this.embeddingService.cosineSimilarity(queryVector, docVector);
        // Extract 2-sentence summary from markdown content
        const summary = doc.content
          .split('\n')
          .filter((line) => line.trim().length > 0 && !line.startsWith('#') && !line.startsWith('---'))
          .slice(0, 3)
          .join(' ')
          .slice(0, 240);

        return {
          docKey: doc.docKey,
          title: doc.title,
          topic: doc.topic,
          similarity: Number(similarity.toFixed(4)),
          summary: `${summary}...`,
        };
      });

      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, limit);
    } catch (err: any) {
      this.logger.warn(`Semantic search failed: ${err?.message}`);
      return [];
    }
  }

  /**
   * Analyzes system design diagram, metrics, and rule violations to retrieve
   * the top authoritative knowledge base reference documents.
   */
  async getRelevantPatterns(
    graph: DomainGraph,
    metrics: MetricsOutputContract,
    violations: RuleViolation[]
  ): Promise<RetrievedPattern[]> {
    const queryParts: string[] = [];

    // 1. Add rule violation topics
    violations.forEach((v) => {
      queryParts.push(`${v.title} ${v.remediation}`);
    });

    // 2. Add structural node signals
    graph.nodes.forEach((n) => {
      queryParts.push(`${n.category} ${n.technology}`);
    });

    if (metrics.spof.length > 0) {
      queryParts.push('database replication failover high availability single point of failure standby');
    }
    if (metrics.databases > 0 && metrics.caches === 0) {
      queryParts.push('redis caching patterns cache-aside latency memory eviction');
    }
    if (metrics.services >= 3 && metrics.queues === 0) {
      queryParts.push('kafka event streaming asynchronous messaging pub sub decoupling');
    }

    const aggregatedQuery = queryParts.join(' ');
    const results = await this.search(aggregatedQuery, 3);
    this.logger.debug(`Retrieved ${results.length} relevant RAG knowledge patterns`);
    return results;
  }

  /**
   * Formats retrieved patterns for injection into LLM prompts with standard citation keys.
   */
  formatRAGContext(patterns: RetrievedPattern[]): string {
    if (!patterns || patterns.length === 0) {
      return 'No specific architectural knowledge patterns retrieved.';
    }

    return patterns
      .map(
        (p, idx) =>
          `[Pattern ${idx + 1}: ${p.docKey}] "${p.title}" (Topic: ${p.topic}, Relevance: ${(p.similarity * 100).toFixed(0)}%)\nGuideline Summary: ${p.summary}`
      )
      .join('\n\n');
  }
}
