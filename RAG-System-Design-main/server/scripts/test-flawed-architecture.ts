import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../src/rag/embedding.service';
import { RagService } from '../src/rag/rag.service';
import { ConfigService } from '@nestjs/config';
import { normalizeToDomainGraph } from '../src/domain/domain-normalizer.util';
import { analyzeArchitectureGraph } from '../src/metrics/graph-traversal.util';
import { RulesService } from '../src/rules/rules.service';

async function testFlawedArchitecture() {
  // A deliberately flawed architecture:
  // 1. Mobile App connects DIRECTLY to Postgres Database (Security Critical Violation!)
  // 2. Order Service -> Payment Service -> Inventory Service -> Order Service (Circular Dependency / Deadlock Cycle!)
  // 3. 4 microservices calling each other synchronously via HTTPS with 0 message queues
  // 4. Primary DB has replicas: 1 (SPOF)
  // 5. 0 Redis caches despite multiple DB calls
  // 6. Deep fan-out from Order Service
  const nodes = [
    { id: 'client-1', data: { label: 'Mobile App', category: 'client' } },
    { id: 'svc-order', data: { label: 'Order Service', category: 'service', replicas: 1, technology: 'nodejs' } },
    { id: 'svc-payment', data: { label: 'Payment Service', category: 'service', replicas: 1, technology: 'java' } },
    { id: 'svc-inventory', data: { label: 'Inventory Service', category: 'service', replicas: 1, technology: 'python' } },
    { id: 'svc-shipping', data: { label: 'Shipping Service', category: 'service', replicas: 1, technology: 'golang' } },
    { id: 'db-main', data: { label: 'Postgres Primary', category: 'database', replicas: 1, technology: 'postgresql' } },
  ];

  const edges = [
    // Flaw 1: Direct Client to DB
    { id: 'e-leak', source: 'client-1', target: 'db-main', data: { protocol: 'SQL', isAsync: false } },
    // Client to Order Service
    { id: 'e0', source: 'client-1', target: 'svc-order', data: { protocol: 'HTTPS', isAsync: false } },
    // Flaw 2: Circular Dependency: Order -> Payment -> Inventory -> Order
    { id: 'e1', source: 'svc-order', target: 'svc-payment', data: { protocol: 'HTTPS', isAsync: false } },
    { id: 'e2', source: 'svc-payment', target: 'svc-inventory', data: { protocol: 'HTTPS', isAsync: false } },
    { id: 'e3', source: 'svc-inventory', target: 'svc-order', data: { protocol: 'HTTPS', isAsync: false } },
    // Flaw 3: Deep Fanout: Order also calls shipping
    { id: 'e4', source: 'svc-order', target: 'svc-shipping', data: { protocol: 'HTTPS', isAsync: false } },
    // Services talking to unreplicated DB
    { id: 'e5', source: 'svc-order', target: 'db-main', data: { protocol: 'SQL', isAsync: false } },
    { id: 'e6', source: 'svc-inventory', target: 'db-main', data: { protocol: 'SQL', isAsync: false } },
  ];

  const domainGraph = normalizeToDomainGraph(nodes, edges);
  const metrics = analyzeArchitectureGraph(domainGraph);

  console.log('=== DETERMINISTIC METRICS ===');
  console.log('Services:', metrics.services);
  console.log('Databases:', metrics.databases);
  console.log('Caches:', metrics.caches);
  console.log('Queues:', metrics.queues);
  console.log('Fan-out Ratio:', metrics.fanOut);
  console.log('Redundancy Score:', metrics.redundancyScore);
  console.log('SPOFs:', metrics.spof);
  console.log('Cycles Detected:', metrics.cycles);
  console.log('Warnings:', metrics.warnings);

  console.log('\n=== DETERMINISTIC RULE ENGINE ===');
  const rulesService = new RulesService();
  const violations = rulesService.evaluateRules(domainGraph, metrics);
  violations.forEach((v) => {
    console.log(`- [${v.severity}] ${v.title}: ${v.message}`);
    console.log(`  Impact: ${v.impact}`);
    console.log(`  Remediation: ${v.remediation}`);
  });

  console.log('\n=== RAG KNOWLEDGE RETRIEVAL ===');
  const prisma = new PrismaClient();
  const config = new ConfigService({});
  const embeddingService = new EmbeddingService(config);
  const ragService = new RagService(prisma as any, embeddingService);

  const patterns = await ragService.getRelevantPatterns(domainGraph, metrics, violations);
  patterns.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.docKey}] "${p.title}" (Relevance: ${(p.similarity * 100).toFixed(1)}%)`);
    console.log(`   Summary: ${p.summary.slice(0, 120)}...`);
  });

  await prisma.$disconnect();
}

testFlawedArchitecture().catch(console.error);
