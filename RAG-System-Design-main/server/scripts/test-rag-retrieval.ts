import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../src/rag/embedding.service';
import { RagService } from '../src/rag/rag.service';
import { ConfigService } from '@nestjs/config';
import { normalizeToDomainGraph } from '../src/domain/domain-normalizer.util';
import { analyzeArchitectureGraph } from '../src/metrics/graph-traversal.util';
import { RulesService } from '../src/rules/rules.service';

async function verifyPipeline() {
  console.log('--- 1. Testing Deterministic Normalizer & Metrics Engine ---');
  // Sample Architecture: Client -> Node.js Service -> Single PostgreSQL (Unreplicated, no cache)
  const sampleNodes = [
    { id: '1', data: { label: 'Web Client', category: 'client' } },
    { id: '2', data: { label: 'Order Service', category: 'service', replicas: 1, technology: 'nodejs' } },
    { id: '3', data: { label: 'Primary DB', category: 'database', replicas: 1, technology: 'postgresql' } },
  ];

  const sampleEdges = [
    { id: 'e1', source: '1', target: '2', data: { protocol: 'HTTPS', isAsync: false } },
    { id: 'e2', source: '2', target: '3', data: { protocol: 'SQL', isAsync: false } },
  ];

  const domainGraph = normalizeToDomainGraph(sampleNodes, sampleEdges);
  const metrics = analyzeArchitectureGraph(domainGraph);

  console.log(`Services: ${metrics.services}, DBs: ${metrics.databases}, Caches: ${metrics.caches}`);
  console.log(`SPOF list:`, metrics.spof);
  console.log(`Redundancy Score: ${metrics.redundancyScore}/100`);

  console.log('\n--- 2. Testing Deterministic Rules Engine ---');
  const rulesService = new RulesService();
  const violations = rulesService.evaluateRules(domainGraph, metrics);
  console.log(`Violations Found: ${violations.length}`);
  violations.forEach((v) => {
    console.log(`  [${v.severity}] ${v.title} -> ${v.remediation}`);
  });

  console.log('\n--- 3. Testing RAG Semantic Retrieval from Database ---');
  const prisma = new PrismaClient();
  const config = new ConfigService({});
  const embeddingService = new EmbeddingService(config);
  const ragService = new RagService(prisma as any, embeddingService);

  const retrievedPatterns = await ragService.getRelevantPatterns(domainGraph, metrics, violations);
  console.log(`Retrieved ${retrievedPatterns.length} Patterns:`);
  retrievedPatterns.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.docKey}] ${p.title} (Similarity: ${(p.similarity * 100).toFixed(1)}%)`);
    console.log(`     Summary: ${p.summary.slice(0, 100)}...`);
  });

  const formattedContext = ragService.formatRAGContext(retrievedPatterns);
  console.log('\n--- 4. Formatted RAG Prompt Context ---');
  console.log(formattedContext);

  await prisma.$disconnect();
}

verifyPipeline().catch((e) => {
  console.error('Pipeline check failed:', e);
  process.exit(1);
});
