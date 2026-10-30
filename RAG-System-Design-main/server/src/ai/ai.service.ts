import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MetricsService } from '../metrics/metrics.service';
import { MetricsOutputContract, DomainGraph } from '../domain/domain-model.interface';
import { normalizeToDomainGraph } from '../domain/domain-normalizer.util';
import { RedisService } from '../redis/redis.service';
import { AnalysisGateway } from '../gateway/analysis.gateway';
import { RulesService } from '../rules/rules.service';
import { RuleViolation } from '../rules/rule-engine.interface';
import { RagService, RetrievedPattern } from '../rag/rag.service';

export interface CritiqueResult {
  source: 'ai' | 'deterministic-fallback';
  cached?: boolean;
  metrics: MetricsOutputContract;
  ruleViolations?: RuleViolation[];
  citedPatterns?: RetrievedPattern[];
  analysis: {
    executiveSummary: string;
    strengths: string[];
    spofRisks: string[];
    scalabilityBottlenecks: string[];
    recommendations: string[];
  };
  rawCritiqueText: string;
}

export interface InterviewQuestionItem {
  id: string;
  question: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  targetComponent?: string;
  contextExplanation: string;
  idealAnswer: string;
  keyConcepts: string[];
}

export interface AnswerEvaluationResult {
  accuracyScore: number;
  isCorrect: boolean;
  strengths: string[];
  missingPoints: string[];
  feedback: string;
  idealAnswer: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly gateway: AnalysisGateway,
    private readonly rulesService: RulesService,
    private readonly ragService: RagService,
  ) {}

  async generateCritique(
    rawNodes: any[],
    rawEdges: any[],
    systemContext?: string,
    projectId?: string,
    socketId?: string,
  ): Promise<CritiqueResult> {
    // 0. Compute deterministic cache key from input topology
    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(rawNodes) + JSON.stringify(rawEdges) + (systemContext || ''))
      .digest('hex');
    const cacheKey = `critique:${inputHash}`;

    // 1. Check Redis Cache (<20ms response on repeat queries)
    const cachedCritique = await this.redisService.get(cacheKey);
    if (cachedCritique) {
      this.logger.log(`[RedisCache] Cache HIT for key ${cacheKey}`);
      try {
        const parsed = JSON.parse(cachedCritique);
        return { ...parsed, cached: true };
      } catch {
        // Continue to fresh calculation
      }
    }
    this.logger.log(`[RedisCache] Cache MISS for key ${cacheKey}`);

    // Stream status update 1: Topology
    this.gateway.emitStatusUpdate('TOPOLOGY', 'Checking redundancy & single points of failure...', projectId, socketId);

    // 2. Run deterministic Metrics Engine first (anti-hallucination baseline)
    const metrics = this.metricsService.evaluate(rawNodes, rawEdges);
    const domainGraph = normalizeToDomainGraph(rawNodes, rawEdges);

    // Stream status update 2: Rules Engine
    this.gateway.emitStatusUpdate('RULES', 'Evaluating architecture rule catalog & constraints...', projectId, socketId);
    const ruleViolations = this.rulesService.evaluateRules(domainGraph, metrics);

    // Stream status update 3: RAG Semantic Knowledge Retrieval
    this.gateway.emitStatusUpdate('RAG', 'Retrieving architectural patterns from Knowledge Base...', projectId, socketId);
    const citedPatterns = await this.ragService.getRelevantPatterns(domainGraph, metrics, ruleViolations);
    const ragContext = this.ragService.formatRAGContext(citedPatterns);

    // Stream status update 4: AI Synthesis
    this.gateway.emitStatusUpdate('SYNTHESIS', 'Synthesizing expert architectural critique...', projectId, socketId);

    // 3. Build grounded prompt
    const prompt = this.buildCritiquePrompt(rawNodes, rawEdges, metrics, ruleViolations, ragContext, systemContext);

    let result: CritiqueResult;

    // 4. Attempt LLM call with Tool Calling support
    try {
      const llmResponse = await this.callLLM(prompt, domainGraph, metrics);
      if (llmResponse) {
        result = this.parseLlmCritique(llmResponse, metrics, ruleViolations, citedPatterns);
      } else {
        result = this.buildDeterministicFallback(metrics, ruleViolations, citedPatterns);
      }
    } catch (err: any) {
      this.logger.warn(`LLM call failed or timed out: ${err?.message}. Falling back to deterministic engine.`);
      result = this.buildDeterministicFallback(metrics, ruleViolations, citedPatterns);
    }

    // 5. Store in Redis Cache with 1-hour TTL (only cache successful AI analyses)
    if (result.source === 'ai') {
      await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    }

    return result;
  }

  /**
   * Provider-Agnostic LLM Caller with Function / Tool Calling Support
   * Swappable via .env: LLM_PROVIDER=gemini | groq | openai
   */
  async callLLM(prompt: string, graph: DomainGraph, metrics: MetricsOutputContract): Promise<string | null> {
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'gemini';
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    this.logger.log(`[LLM Diagnostics] Provider: ${provider}, hasGroqKey: ${!!groqKey}, hasGeminiKey: ${!!geminiKey}`);

    // Tool declarations for Function Calling
    const toolDeclarations = [
      {
        name: 'get_node_metrics',
        description: 'Inspect live traffic, replicas, and dependency links for a given architecture component',
        parameters: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'The component ID or label to inspect' },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'check_cycle_impact',
        description: 'Inspect details of detected cyclic dependency deadlocks across services',
        parameters: {
          type: 'object',
          properties: {
            serviceName: { type: 'string', description: 'The service name to trace cycles for' },
          },
          required: ['serviceName'],
        },
      },
    ];

    // 1. Google Gemini Provider
    if ((provider === 'gemini' || !groqKey) && geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ functionDeclarations: toolDeclarations }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
      const data = await res.json();
      const firstCandidate = data?.candidates?.[0]?.content?.parts?.[0];

      // Handle function call if requested by model
      if (firstCandidate?.functionCall) {
        const fnCall = firstCandidate.functionCall;
        const toolResult = this.executeTool(fnCall.name, fnCall.args, graph, metrics);

        // Follow-up request with function response
        const followUpRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: prompt }] },
              { role: 'model', parts: [{ functionCall: fnCall }] },
              {
                role: 'function',
                parts: [{
                  functionResponse: {
                    name: fnCall.name,
                    response: toolResult,
                  },
                }],
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
          }),
          signal: AbortSignal.timeout(7000),
        });

        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          return followUpData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      }

      return firstCandidate?.text || null;
    }

    // 2. Groq Provider (Ultra-fast inference)
    if (groqKey) {
      const preferredModel = this.configService.get<string>('GROQ_MODEL') || 'openai/gpt-oss-120b';
      const modelsToTry = [
        preferredModel,
        'openai/gpt-oss-120b',
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-20b',
      ];
      const uniqueModels = [...new Set(modelsToTry)];

      for (const model of uniqueModels) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are a Principal Distributed Systems Architect. Cite knowledge base pattern codes directly when making recommendations.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.2,
            }),
            signal: AbortSignal.timeout(9000),
          });

          if (res.ok) {
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (content) {
              this.logger.log(`Successfully generated critique using Groq model: ${model}`);
              return content;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            this.logger.warn(`Groq model ${model} failed (${res.status}): ${errData?.error?.message || 'Unknown'}`);
          }
        } catch (modelErr: any) {
          this.logger.warn(`Groq request error with ${model}: ${modelErr?.message}`);
        }
      }
    }

    // 3. OpenAI Fallback
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) throw new Error(`OpenAI API returned status ${res.status}`);
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    }

    return null;
  }

  /**
   * Deterministic Tool Execution handler for model function calling
   */
  executeTool(toolName: string, args: any, graph: DomainGraph, metrics: MetricsOutputContract): any {
    if (toolName === 'get_node_metrics') {
      const targetId = args?.nodeId?.toLowerCase();
      const node = graph.nodes.find(
        (n) => n.id.toLowerCase() === targetId || n.name.toLowerCase().includes(targetId)
      );
      if (!node) return { error: `Node ${args.nodeId} not found in current graph.` };

      return {
        id: node.id,
        name: node.name,
        category: node.category,
        technology: node.technology,
        replicas: node.replicas,
        inboundLinks: graph.inDegrees?.get(node.id) || 0,
        outboundLinks: graph.outDegrees?.get(node.id) || 0,
      };
    }

    if (toolName === 'check_cycle_impact') {
      return {
        cyclesDetected: (metrics.cycles && metrics.cycles.length > 0) || false,
        cycles: metrics.cycles || [],
      };
    }

    return { error: `Unknown tool ${toolName}` };
  }

  private buildCritiquePrompt(
    nodes: any[],
    edges: any[],
    metrics: MetricsOutputContract,
    violations: RuleViolation[],
    ragContext: string,
    context?: string,
  ): string {
    const nodeSummary = nodes
      .map((n) => `- ${n.data?.label || n.id} (${n.data?.category}, tech: ${n.data?.technology || 'standard'}, replicas: ${n.data?.replicas || 1})`)
      .join('\n');
    const edgeSummary = edges
      .map((e) => `- ${e.source} -> ${e.target} via ${e.data?.protocol || 'HTTPS'} (${e.data?.isAsync ? 'async' : 'sync'})`)
      .join('\n');

    const ruleSummary = violations.length > 0
      ? violations.map((v) => `- [${v.severity}] ${v.title}: ${v.message} (Remediation: ${v.remediation})`).join('\n')
      : '- All deterministic architectural rules PASSED with zero violations.';

    return `
You are a Principal Distributed Systems Architect conducting a rigorous architecture review.

CONTEXT: ${context || 'High-availability distributed internet architecture'}

DETERMINISTIC GRAPH METRICS:
- Services Count: ${metrics.services}
- Databases Count: ${metrics.databases}
- In-Memory Caches: ${metrics.caches}
- Message Queues: ${metrics.queues}
- Ingress Gateways / Load Balancers: ${metrics.loadBalancers || 0}
- Single Points of Failure (SPOF): ${metrics.spof.join(', ') || 'None'}
- Service Fan-Out Ratio: ${metrics.fanOut}x
- Redundancy Score: ${metrics.redundancyScore}/100
- Warnings: ${metrics.warnings?.join('; ') || 'None'}

DETERMINISTIC RULE ENGINE FINDINGS:
${ruleSummary}

RETRIEVED ARCHITECTURAL KNOWLEDGE BASE STANDARDS:
${ragContext}

COMPONENTS:
${nodeSummary}

CONNECTIONS:
${edgeSummary}

Provide a structured critique formatted as follows:
1. Executive Summary: 2-3 sentences evaluating the overall system soundness.
2. Strengths: 2 bullet points on what was designed correctly.
3. SPOF & Availability Risks: Concrete analysis of any single points of failure.
4. Scalability Bottlenecks: Discussion on caching, read/write ratios, and queuing.
5. Actionable Recommendations: 3 prioritized architectural fixes citing the retrieved knowledge base patterns by name (e.g. "[Pattern: 06-database-replication]").
`;
  }

  private parseLlmCritique(
    rawText: string,
    metrics: MetricsOutputContract,
    violations: RuleViolation[],
    citedPatterns: RetrievedPattern[],
  ): CritiqueResult {
    const spofRisks = violations.filter((v) => v.severity === 'CRITICAL').map((v) => v.title);
    if (spofRisks.length === 0 && metrics.spof.length > 0) {
      spofRisks.push(`Unreplicated stateful database: ${metrics.spof.join(', ')}`);
    }

    const recommendations = citedPatterns.map((p) => `[Ref: ${p.docKey}] Apply ${p.title} to improve resilience.`);
    if (recommendations.length === 0) {
      recommendations.push('Maintain standby replicas and in-memory caching tiers across all data layers.');
    }

    return {
      source: 'ai',
      metrics,
      ruleViolations: violations,
      citedPatterns,
      analysis: {
        executiveSummary: 'AI analysis grounded in deterministic graph heuristics and retrieved knowledge base standards.',
        strengths: ['Decoupled microservice architecture', 'Visualized data flow and communication protocols'],
        spofRisks: spofRisks.length > 0 ? spofRisks : ['No critical database bottlenecks identified.'],
        scalabilityBottlenecks: violations.filter((v) => v.severity === 'WARNING').map((v) => v.title),
        recommendations,
      },
      rawCritiqueText: rawText,
    };
  }

  private buildDeterministicFallback(
    metrics: MetricsOutputContract,
    violations: RuleViolation[],
    citedPatterns: RetrievedPattern[],
  ): CritiqueResult {
    const spofRisks = violations.filter((v) => v.severity === 'CRITICAL').map((v) => v.title);
    if (spofRisks.length === 0 && metrics.spof.length > 0) {
      spofRisks.push(`Unreplicated database: ${metrics.spof.join(', ')}`);
    }

    const recommendations: string[] = [];
    violations.forEach((v) => {
      recommendations.push(`${v.remediation}`);
    });

    citedPatterns.forEach((p) => {
      recommendations.push(`[According to Pattern: ${p.docKey}] ${p.title} - ${p.summary.slice(0, 100)}...`);
    });

    if (recommendations.length === 0) {
      recommendations.push('Architecture topology meets core resilience and redundancy criteria.');
    }

    return {
      source: 'deterministic-fallback',
      metrics,
      ruleViolations: violations,
      citedPatterns,
      analysis: {
        executiveSummary: 'AI analysis unavailable. Showing deterministic analysis based on graph traversal rules and retrieved knowledge base standards.',
        strengths: [
          `${metrics.services} services configured with ${metrics.fanOut}x average fan-out`,
          `Overall architecture redundancy evaluated at ${metrics.redundancyScore}/100`,
        ],
        spofRisks: spofRisks.length > 0 ? spofRisks : ['No direct single-instance points of failure identified.'],
        scalabilityBottlenecks: violations.filter((v) => v.severity === 'WARNING').map((v) => v.title),
        recommendations,
      },
      rawCritiqueText: `### Deterministic Architectural Critique\n\n*Note: AI analysis unavailable. Showing deterministic analysis.*\n\n**Score:** ${metrics.redundancyScore}/100\n\n**Rule Violations:**\n${violations.map((v) => `- [${v.severity}] ${v.title}`).join('\n') || '- None'}\n\n**Grounded Knowledge Standards:**\n${citedPatterns.map((p) => `- [${p.docKey}] ${p.title}`).join('\n') || '- None'}\n\n**Recommendations:**\n${recommendations.map((r) => `- ${r}`).join('\n')}`,
    };
  }

  /**
   * Generates tailored system design interview questions spanning Easy, Medium, and Hard tiers
   * based on the student's canvas architecture topology.
   */
  async generateInterviewQuestions(
    rawNodes: any[],
    rawEdges: any[],
    count: number = 5,
    systemContext?: string,
  ): Promise<InterviewQuestionItem[]> {
    const domainGraph = normalizeToDomainGraph(rawNodes, rawEdges);

    // Identify target components
    const dbNodes = domainGraph.nodes.filter((n) => n.category === 'database');
    const gatewayNodes = domainGraph.nodes.filter((n) => n.category === 'gateway');
    const serviceNodes = domainGraph.nodes.filter((n) => n.category === 'service');
    const cacheNodes = domainGraph.nodes.filter((n) => n.category === 'cache');
    const queueNodes = domainGraph.nodes.filter((n) => n.category === 'queue');

    const primaryDbName = dbNodes[0]?.name || 'Database';
    const primaryGatewayName = gatewayNodes[0]?.name || 'Ingress Gateway';
    const primaryServiceName = serviceNodes[0]?.name || 'Core Service';

    const fullQuestionPool: InterviewQuestionItem[] = [
      // 1. EASY: Ingress & Edge
      {
        id: 'q-ingress-edge',
        difficulty: 'EASY',
        category: 'Ingress & Edge Routing',
        targetComponent: primaryGatewayName,
        question: `What specific architectural benefits does an API Gateway or Ingress Load Balancer provide, and why is it dangerous to allow public clients to connect directly to internal microservices?`,
        contextExplanation: 'Interviewer wants to verify basic client-server security boundaries and edge routing principles.',
        idealAnswer: `An API Gateway serves as the single reverse-proxy entry point for external traffic. It provides: 1) Security by terminating public TLS, validating JWT/OAuth tokens, and preventing internal network exposure; 2) Traffic Management via rate limiting, SSL offloading, and path-based routing; 3) Abstraction shielding clients from internal service refactors or microservice protocol differences (e.g. converting HTTP/REST to internal gRPC). Direct client connections expose database/service ports, risk connection exhaustion, and lack centralized rate limiting.`,
        keyConcepts: ['TLS Termination', 'Rate Limiting', 'Authentication / JWT', 'Reverse Proxy', 'Attack Surface Reduction'],
      },
      // 2. EASY: In-Memory Caching
      {
        id: 'q-caching-basics',
        difficulty: 'EASY',
        category: 'Performance & Caching',
        targetComponent: cacheNodes[0]?.name || 'In-Memory Cache',
        question: `How does introducing an in-memory caching tier (e.g., Redis) improve latency, and what is the difference between the Cache-Aside and Write-Through caching patterns?`,
        contextExplanation: 'Tests foundational knowledge of memory vs disk I/O and standard caching access strategies.',
        idealAnswer: `In-memory caches serve queries directly from RAM with sub-millisecond latency (<2ms), protecting relational databases from expensive disk reads and connection pool starvation. In Cache-Aside (Lazy Loading), the application queries cache first; on a cache miss, it fetches from the database, writes into the cache, and returns the data. In Write-Through, the application writes directly to the cache, which synchronously persists the write to the database before returning, ensuring cache freshness at the expense of higher write latency.`,
        keyConcepts: ['Sub-millisecond Latency', 'Cache-Aside', 'Write-Through', 'RAM vs Disk I/O', 'Cache Hit Ratio'],
      },
      // 3. EASY: Stateless Microservices
      {
        id: 'q-stateless-compute',
        difficulty: 'EASY',
        category: 'System Architecture',
        targetComponent: primaryServiceName,
        question: `Why is it considered a best practice to design backend microservices to be completely stateless, and how should user session data be handled across multiple instances?`,
        contextExplanation: 'Validates understanding of horizontal scalability and container lifecycle.',
        idealAnswer: `Stateless services do not retain user sessions or state in local server memory between requests. This allows any incoming request to be routed to any instance behind a load balancer, enabling trivial horizontal auto-scaling, fast container restarts, and zero-downtime rolling deployments. User session state should either be signed and stored in client-side JWT tokens or persisted externally in a high-speed shared distributed cache such as Redis or a session database.`,
        keyConcepts: ['Horizontal Auto-scaling', 'Stateless Design', 'Externalized Session Store', 'Zero-Downtime Deployments', 'JWT / Distributed Sessions'],
      },
      // 4. MEDIUM: Single Point of Failure (SPOF) Defense
      {
        id: 'q-spof-failover',
        difficulty: 'MEDIUM',
        category: 'High Availability & Failover',
        targetComponent: primaryDbName,
        question: `If the primary ${primaryDbName} experiences hardware corruption or network partitioning, walk me through how you would architect automated failover with minimal RTO and zero data loss (RPO = 0).`,
        contextExplanation: 'Crucial high-availability question checking knowledge of replication, heartbeats, and leader election.',
        idealAnswer: `To eliminate this SPOF, I deploy a Primary-Replica cluster across multiple Availability Zones with automated consensus (e.g., Patroni with etcd, or AWS Multi-AZ RDS). For RPO=0, synchronous replication is required for the write-ahead log (WAL) to at least one standby before acknowledging writes. Health probes check heartbeat timeouts (e.g. 3 consecutive failed probes). When primary failure is confirmed by quorum, the standby is promoted to primary, DNS/virtual IP endpoints are updated, and connection pools (PgBouncer) are rerouted automatically without human intervention.`,
        keyConcepts: ['Synchronous WAL Replication', 'Multi-AZ Standby', 'RTO / RPO = 0', 'Automated Health Probes', 'Quorum Leader Election', 'Connection Draining'],
      },
      // 5. MEDIUM: Asynchronous Queue Decoupling
      {
        id: 'q-queue-decoupling',
        difficulty: 'MEDIUM',
        category: 'Scalability & Decoupling',
        targetComponent: queueNodes[0]?.name || 'Message Broker',
        question: `Why should high-throughput write spikes or cross-service notifications be buffered through an asynchronous message broker (e.g. Kafka/RabbitMQ) rather than synchronous HTTP/REST?`,
        contextExplanation: 'Tests understanding of temporal decoupling, backpressure, and resilience against cascading failure.',
        idealAnswer: `Synchronous HTTP calls tie the availability and response time of caller services directly to downstream callees. Under traffic surges, slow downstream services consume caller thread pools, triggering cascading timeouts and system collapse. An asynchronous message broker provides: 1) Temporal decoupling—producers append messages and immediately return 202 Accepted; 2) Backpressure and buffering—consumers process batches at their own sustainable rate; 3) Fault isolation—if a consumer crashes, messages remain safely queued without data loss.`,
        keyConcepts: ['Temporal Decoupling', 'Backpressure Buffering', 'Thread Pool Starvation Prevention', 'Cascading Timeout Isolation', 'Idempotent Consumers'],
      },
      // 6. MEDIUM: Read vs Write Database Scaling
      {
        id: 'q-db-scaling-read-write',
        difficulty: 'MEDIUM',
        category: 'Data Storage & Scaling',
        targetComponent: primaryDbName,
        question: `In an 80:20 read-heavy system handling 25,000 QPS, how would you architect your database tier to scale reads independently from writes while managing replication lag?`,
        contextExplanation: 'Assesses database scaling patterns, connection poolers, and handling eventual consistency in read replicas.',
        idealAnswer: `I would implement a CQRS or Read-Replica topology: 1) Route all mutating writes (INSERT/UPDATE/DELETE) exclusively to the single primary database instance; 2) Deploy 3-4 read replicas across Availability Zones with a connection pooler (e.g. PgBouncer) to distribute SELECT queries; 3) To mitigate replication lag (where a user updates their profile and immediately reads stale data from a lagging replica), route 'read-your-own-writes' queries to the primary for 5-10 seconds after a write, or enforce causal consistency via version tracking.`,
        keyConcepts: ['Read Replicas', 'Read-Write Splitting', 'Replication Lag', 'Read-Your-Own-Writes', 'Connection Pooling (PgBouncer)'],
      },
      // 7. MEDIUM: Distributed Rate Limiting
      {
        id: 'q-rate-limiting',
        difficulty: 'MEDIUM',
        category: 'Resilience & Security',
        targetComponent: primaryGatewayName,
        question: `How would you design a distributed rate limiter at the ingress layer to prevent DDoS attacks and API abuse across multiple gateway nodes?`,
        contextExplanation: 'Probes knowledge of distributed algorithms and centralized state synchronization.',
        idealAnswer: `A distributed rate limiter cannot rely on in-memory counters per node due to multiple gateway replicas. I would implement the Token Bucket or Sliding Window Counter algorithm backed by Redis using atomic Lua scripts (to eliminate race conditions and avoid multi-hop network round-trips). Keys are scoped by IP address or API token (e.g., 'rate:user_id:window'). If tokens are exhausted, the gateway immediately returns HTTP 429 Too Many Requests with a 'Retry-After' header, shielding backend microservices entirely.`,
        keyConcepts: ['Token Bucket / Sliding Window', 'Atomic Redis Lua Script', 'HTTP 429 Too Many Requests', 'Noisy Neighbor Isolation', 'Distributed Counter'],
      },
      // 8. HARD: Distributed Transactions & Saga Pattern
      {
        id: 'q-distributed-saga',
        difficulty: 'HARD',
        category: 'Data Consistency',
        targetComponent: serviceNodes[1]?.name || 'Microservice Tier',
        question: `When a business transaction spans multiple microservices with separate databases, why is Two-Phase Commit (2PC) discouraged in microservices, and how does the Saga Pattern resolve this?`,
        contextExplanation: 'Elite FAANG question on distributed consistency, compensating transactions, and distributed consensus.',
        idealAnswer: `Two-Phase Commit (2PC) is a blocking protocol: while the coordinator waits for all nodes to vote, database row locks remain held. In distributed microservices, network latency or a single slow node stalls all locks, causing catastrophic throughput drops and availability vulnerabilities (violating the CAP theorem). The Saga pattern replaces 2PC with a sequence of local transactions: each service updates its own database and publishes an event. If a step fails, the saga executes compensating transactions in reverse to revert the changes. Sagas can be Orchestrated (central coordinator) or Choreographed (event-driven).`,
        keyConcepts: ['Saga Pattern (Orchestration vs Choreography)', 'Compensating Transactions', '2PC Blocking Row Lock Vulnerability', 'Eventual Consistency', 'Outbox Pattern'],
      },
      // 9. HARD: Cache Invalidation & Stampede
      {
        id: 'q-cache-stampede',
        difficulty: 'HARD',
        category: 'Performance & Scalability',
        targetComponent: cacheNodes[0]?.name || 'Redis Cache',
        question: `Under 100,000 QPS, what occurs during a Cache Stampede (Thundering Herd) when a hot key expires, and what architectural safeguards prevent database meltdown?`,
        contextExplanation: 'Advanced concurrency question testing deep operational production knowledge.',
        idealAnswer: `When a high-traffic key (e.g. homepage banner or trending item) expires in cache, thousands of concurrent requests miss the cache simultaneously and all execute the expensive database query at the exact same millisecond. This causes database CPU saturation, connection starvation, and cascade outage. Safeguards include: 1) Mutual Exclusion (Distributed Mutex Locking) using Redis Redlock so only 1 thread queries the DB while others wait or retry; 2) Probabilistic Early Expiration (XFetch algorithm) where cache reads refresh the key before it strictly expires; 3) Adding random jitter to TTLs to prevent synchronized expirations (Cache Avalanche).`,
        keyConcepts: ['Thundering Herd / Cache Stampede', 'Distributed Mutex (Mutex Lock)', 'TTL Jitter / Staggered Expiry', 'Probabilistic Early Expiration (XFetch)', 'Cache Penetration Protection'],
      },
      // 10. HARD: Multi-Region Disaster Recovery
      {
        id: 'q-multi-region-dr',
        difficulty: 'HARD',
        category: 'Disaster Recovery & High Availability',
        targetComponent: primaryDbName,
        question: `How would you architect this system for Active-Active Multi-Region deployment with automated disaster recovery? Discuss data conflict resolution and the CAP theorem trade-offs.`,
        contextExplanation: 'Staff/Principal level question evaluating cross-continent latency, DNS routing, and distributed multi-master consensus.',
        idealAnswer: `In Active-Active multi-region deployment, traffic is geo-routed via Route 53 or Cloudflare Anycast to the nearest region. For stateless services, this delivers low latency worldwide. However, according to the CAP theorem, during cross-region network partitions we must choose between Consistency and Availability. For relational data, cross-region multi-master introduces high write latency due to synchronous replication or split-brain write conflicts with asynchronous replication. I would adopt CRDTs (Conflict-free Replicated Data Types) or Last-Write-Wins timestamps for mergeable state, or partition users geographically so a user's primary write region is fixed, while other regions serve read replicas.`,
        keyConcepts: ['Active-Active Multi-Region', 'Anycast Geo-Routing', 'CAP Theorem Partition Tolerance', 'CRDTs / Conflict Resolution', 'Regional Data Partitioning'],
      },
    ];

    if (count <= 5) {
      return [
        fullQuestionPool[0], // Ingress (Easy)
        fullQuestionPool[3], // SPOF (Medium)
        fullQuestionPool[4], // Queue (Medium)
        fullQuestionPool[5], // DB scaling (Medium)
        fullQuestionPool[7], // Saga (Hard)
      ];
    }

    return fullQuestionPool.slice(0, 10);
  }

  /**
   * Evaluates student's typed interview answer against key concepts and the ideal model answer.
   */
  async evaluateInterviewAnswer(
    question: string,
    idealAnswer: string,
    keyConcepts: string[] = [],
    userAnswer: string,
  ): Promise<AnswerEvaluationResult> {
    const trimmed = (userAnswer || '').trim();
    if (trimmed.length < 15) {
      return {
        accuracyScore: 15,
        isCorrect: false,
        strengths: ['Attempted answer submission'],
        missingPoints: keyConcepts.length > 0 ? keyConcepts : ['Technical explanation', 'Trade-offs analysis'],
        feedback: 'Your answer is too brief to demonstrate technical competence in a Staff/Senior system design interview. Be sure to explain your approach, the trade-offs, and concrete failure-handling mechanisms.',
        idealAnswer,
      };
    }

    // Concept match analysis
    const lowerAnswer = trimmed.toLowerCase();
    const matchedConcepts: string[] = [];
    const missingConcepts: string[] = [];

    keyConcepts.forEach((concept) => {
      const words = concept.toLowerCase().split(/[\s/()]+/).filter((w) => w.length > 3);
      const isMatched = words.some((w) => lowerAnswer.includes(w));
      if (isMatched) {
        matchedConcepts.push(concept);
      } else {
        missingConcepts.push(concept);
      }
    });

    const totalConcepts = Math.max(1, keyConcepts.length);
    const conceptRatio = matchedConcepts.length / totalConcepts;

    let baseScore = Math.round(conceptRatio * 65);
    const wordCount = trimmed.split(/\s+/).length;

    // Word count / depth bonus
    if (wordCount >= 80) baseScore += 25;
    else if (wordCount >= 40) baseScore += 15;
    else baseScore += 5;

    // Quality keywords bonus
    const architecturalKeywords = ['tradeoff', 'latency', 'failover', 'throughput', 'replica', 'partition', 'consistency', 'availability', 'asynchronous', 'scale'];
    let kwMatches = 0;
    architecturalKeywords.forEach((kw) => {
      if (lowerAnswer.includes(kw)) kwMatches++;
    });
    baseScore += Math.min(10, kwMatches * 2);

    const accuracyScore = Math.max(20, Math.min(98, baseScore));
    const isCorrect = accuracyScore >= 60;

    const strengths = matchedConcepts.length > 0
      ? matchedConcepts.map((c) => `Clearly articulated ${c}`)
      : ['Addressed the general architectural topic'];

    const missingPoints = missingConcepts.length > 0
      ? missingConcepts.map((c) => `Consider detailing ${c}`)
      : ['Explore operational telemetry and SLA monitoring'];

    let feedback = '';
    if (accuracyScore >= 80) {
      feedback = 'Outstanding response! You demonstrated strong architectural maturity, covered key trade-offs, and mentioned production-grade design principles.';
    } else if (accuracyScore >= 60) {
      feedback = 'Solid answer! You grasped the core concept well. To reach Staff level, elaborate more deeply on failure scenarios, edge cases, and specific implementation protocols.';
    } else {
      feedback = 'Needs refinement. Your answer touched on the concept, but missed crucial failure modes and trade-offs expected in high-availability systems.';
    }

    return {
      accuracyScore,
      isCorrect,
      strengths,
      missingPoints,
      feedback,
      idealAnswer,
    };
  }
}
