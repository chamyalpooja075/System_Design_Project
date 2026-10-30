import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquareCode,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileQuestion,
  BookOpen,
  Award,
  TrendingUp,
  RotateCcw,
  Send,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { EvaluatedMetrics } from '../../services/metricsEngine';
import { interviewService, type InterviewQuestionItem, type AnswerEvaluationResult } from '../../services/api';

interface InterviewModeViewProps {
  metrics: EvaluatedMetrics;
  nodes: Node[];
  edges: Edge[];
  onBackToCanvas: () => void;
  onRunCritique: () => void;
}

interface QuestionSubmissionRecord {
  question: InterviewQuestionItem;
  userAnswer: string;
  evaluation: AnswerEvaluationResult;
}

export const InterviewModeView: React.FC<InterviewModeViewProps> = ({
  metrics,
  nodes,
  edges,
  onBackToCanvas,
  onRunCritique,
}) => {
  // Session Configuration & State
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(true);

  // Answering & Evaluation State
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluationResult | null>(null);
  const [hasCopiedIdeal, setHasCopiedIdeal] = useState<boolean>(false);

  // Session History & Results
  const [sessionResults, setSessionResults] = useState<QuestionSubmissionRecord[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const archNodes = useMemo(
    () => nodes.filter((n) => !(n.data as any)?.isAnnotation && n.type === 'architectureNode'),
    [nodes]
  );

  // Client-side fallback questions if backend network fails
  const fallbackQuestions = useMemo<InterviewQuestionItem[]>(() => {
    const dbNodes = archNodes.filter((n) => (n.data as any)?.category === 'database');
    const gatewayNodes = archNodes.filter((n) => (n.data as any)?.category === 'gateway');
    const serviceNodes = archNodes.filter((n) => (n.data as any)?.category === 'service');
    const cacheNodes = archNodes.filter((n) => (n.data as any)?.category === 'cache');
    const queueNodes = archNodes.filter((n) => (n.data as any)?.category === 'queue');

    const dbName = dbNodes[0]?.data?.label as string || 'Database';
    const gwName = gatewayNodes[0]?.data?.label as string || 'API Gateway';
    const svcName = serviceNodes[0]?.data?.label as string || 'Core Microservice';
    const cacheName = cacheNodes[0]?.data?.label as string || 'Redis Cache';
    const qName = queueNodes[0]?.data?.label as string || 'Event Queue';

    const pool: InterviewQuestionItem[] = [
      {
        id: 'fb-ingress-edge',
        difficulty: 'EASY',
        category: 'Ingress & Edge Routing',
        targetComponent: gwName,
        question: `What specific architectural benefits does an API Gateway or Ingress Load Balancer provide, and why is it dangerous to allow public clients to connect directly to internal microservices?`,
        contextExplanation: 'Interviewer evaluates client-server security boundaries, TLS offloading, and centralized ingress routing.',
        idealAnswer: `An API Gateway serves as the single reverse-proxy entry point for external traffic. It provides: 1) Security by terminating public TLS, validating JWT/OAuth tokens, and preventing internal network port exposure; 2) Traffic Management via rate limiting, SSL offloading, and path-based routing; 3) Abstraction shielding clients from internal service refactors or microservice protocol differences (e.g. converting HTTP/REST to internal gRPC). Direct client connections expose database/service ports, risk connection exhaustion, and lack centralized rate limiting.`,
        keyConcepts: ['TLS Termination', 'Rate Limiting', 'Authentication / JWT', 'Reverse Proxy', 'Attack Surface Reduction'],
      },
      {
        id: 'fb-caching-basics',
        difficulty: 'EASY',
        category: 'Performance & Caching',
        targetComponent: cacheName,
        question: `How does introducing an in-memory caching tier (e.g., Redis) improve latency, and what is the operational difference between Cache-Aside and Write-Through caching patterns?`,
        contextExplanation: 'Tests foundational knowledge of memory vs disk I/O and caching consistency patterns.',
        idealAnswer: `In-memory caches serve queries directly from RAM with sub-millisecond latency (<2ms), protecting relational databases from expensive disk reads and connection pool starvation. In Cache-Aside (Lazy Loading), the application queries cache first; on a cache miss, it fetches from the database, writes into the cache, and returns the data. In Write-Through, the application writes directly to the cache, which synchronously persists the write to the database before returning, ensuring cache freshness at the expense of higher write latency.`,
        keyConcepts: ['Sub-millisecond Latency', 'Cache-Aside', 'Write-Through', 'RAM vs Disk I/O', 'Cache Hit Ratio'],
      },
      {
        id: 'fb-stateless-compute',
        difficulty: 'EASY',
        category: 'System Architecture',
        targetComponent: svcName,
        question: `Why is it considered a fundamental best practice to design backend microservices to be completely stateless, and how should user session data be handled across multiple instances?`,
        contextExplanation: 'Validates understanding of horizontal scalability, autoscaling, and container lifecycles.',
        idealAnswer: `Stateless services do not retain user sessions or state in local server memory between requests. This allows any incoming request to be routed to any instance behind a load balancer, enabling trivial horizontal auto-scaling, fast container restarts, and zero-downtime rolling deployments. User session state should either be signed and stored in client-side JWT tokens or persisted externally in a high-speed shared distributed cache such as Redis or a session database.`,
        keyConcepts: ['Horizontal Auto-scaling', 'Stateless Design', 'Externalized Session Store', 'Zero-Downtime Deployments', 'JWT / Distributed Sessions'],
      },
      {
        id: 'fb-spof-failover',
        difficulty: 'MEDIUM',
        category: 'High Availability & Failover',
        targetComponent: dbName,
        question: `If the primary ${dbName} experiences hardware corruption or network partitioning, walk me through how you would architect automated failover with minimal RTO and zero data loss (RPO = 0).`,
        contextExplanation: 'Crucial high-availability question checking knowledge of replication, heartbeats, and automated leader election.',
        idealAnswer: `To eliminate this SPOF, I deploy a Primary-Replica cluster across multiple Availability Zones with automated consensus (e.g., Patroni with etcd, or AWS Multi-AZ RDS). For RPO=0, synchronous replication is required for the write-ahead log (WAL) to at least one standby before acknowledging writes. Health probes check heartbeat timeouts (e.g. 3 consecutive failed probes). When primary failure is confirmed by quorum, the standby is promoted to primary, DNS/virtual IP endpoints are updated, and connection pools (PgBouncer) are rerouted automatically without human intervention.`,
        keyConcepts: ['Synchronous WAL Replication', 'Multi-AZ Standby', 'RTO / RPO = 0', 'Automated Health Probes', 'Quorum Leader Election', 'Connection Draining'],
      },
      {
        id: 'fb-queue-decoupling',
        difficulty: 'MEDIUM',
        category: 'Scalability & Decoupling',
        targetComponent: qName,
        question: `Why should high-throughput write spikes or cross-service notifications be buffered through an asynchronous message broker (e.g. Kafka/RabbitMQ) rather than synchronous HTTP/REST?`,
        contextExplanation: 'Tests understanding of temporal decoupling, backpressure, and resilience against cascading failure.',
        idealAnswer: `Synchronous HTTP calls tie the availability and response time of caller services directly to downstream callees. Under traffic surges, slow downstream services consume caller thread pools, triggering cascading timeouts and system collapse. An asynchronous message broker provides: 1) Temporal decoupling—producers append messages and immediately return 202 Accepted; 2) Backpressure and buffering—consumers process batches at their own sustainable rate; 3) Fault isolation—if a consumer crashes, messages remain safely queued without data loss.`,
        keyConcepts: ['Temporal Decoupling', 'Backpressure Buffering', 'Thread Pool Starvation Prevention', 'Cascading Timeout Isolation', 'Idempotent Consumers'],
      },
      {
        id: 'fb-db-scaling-read-write',
        difficulty: 'MEDIUM',
        category: 'Data Storage & Scaling',
        targetComponent: dbName,
        question: `In an 80:20 read-heavy system handling 25,000 QPS, how would you architect your database tier to scale reads independently from writes while managing replication lag?`,
        contextExplanation: 'Assesses database scaling patterns, connection poolers, and handling eventual consistency in read replicas.',
        idealAnswer: `I would implement a CQRS or Read-Replica topology: 1) Route all mutating writes (INSERT/UPDATE/DELETE) exclusively to the single primary database instance; 2) Deploy 3-4 read replicas across Availability Zones with a connection pooler (e.g. PgBouncer) to distribute SELECT queries; 3) To mitigate replication lag (where a user updates their profile and immediately reads stale data from a lagging replica), route 'read-your-own-writes' queries to the primary for 5-10 seconds after a write, or enforce causal consistency via version tracking.`,
        keyConcepts: ['Read Replicas', 'Read-Write Splitting', 'Replication Lag', 'Read-Your-Own-Writes', 'Connection Pooling (PgBouncer)'],
      },
      {
        id: 'fb-rate-limiting',
        difficulty: 'MEDIUM',
        category: 'Resilience & Security',
        targetComponent: gwName,
        question: `How would you design a distributed rate limiter at the ingress layer to prevent DDoS attacks and API abuse across multiple gateway nodes?`,
        contextExplanation: 'Probes knowledge of distributed algorithms and centralized state synchronization.',
        idealAnswer: `A distributed rate limiter cannot rely on in-memory counters per node due to multiple gateway replicas. I would implement the Token Bucket or Sliding Window Counter algorithm backed by Redis using atomic Lua scripts (to eliminate race conditions and avoid multi-hop network round-trips). Keys are scoped by IP address or API token (e.g., 'rate:user_id:window'). If tokens are exhausted, the gateway immediately returns HTTP 429 Too Many Requests with a 'Retry-After' header, shielding backend microservices entirely.`,
        keyConcepts: ['Token Bucket / Sliding Window', 'Atomic Redis Lua Script', 'HTTP 429 Too Many Requests', 'Noisy Neighbor Isolation', 'Distributed Counter'],
      },
      {
        id: 'fb-distributed-saga',
        difficulty: 'HARD',
        category: 'Data Consistency',
        targetComponent: svcName,
        question: `When a business transaction spans multiple microservices with separate databases, why is Two-Phase Commit (2PC) discouraged in microservices, and how does the Saga Pattern resolve this?`,
        contextExplanation: 'Elite FAANG question on distributed consistency, compensating transactions, and distributed consensus.',
        idealAnswer: `Two-Phase Commit (2PC) is a blocking protocol: while the coordinator waits for all nodes to vote, database row locks remain held. In distributed microservices, network latency or a single slow node stalls all locks, causing catastrophic throughput drops and availability vulnerabilities (violating the CAP theorem). The Saga pattern replaces 2PC with a sequence of local transactions: each service updates its own database and publishes an event. If a step fails, the saga executes compensating transactions in reverse to revert the changes. Sagas can be Orchestrated (central coordinator) or Choreographed (event-driven).`,
        keyConcepts: ['Saga Pattern (Orchestration vs Choreography)', 'Compensating Transactions', '2PC Blocking Row Lock Vulnerability', 'Eventual Consistency', 'Outbox Pattern'],
      },
      {
        id: 'fb-cache-stampede',
        difficulty: 'HARD',
        category: 'Performance & Scalability',
        targetComponent: cacheName,
        question: `Under 100,000 QPS, what occurs during a Cache Stampede (Thundering Herd) when a hot key expires, and what architectural safeguards prevent database meltdown?`,
        contextExplanation: 'Advanced concurrency question testing deep operational production knowledge.',
        idealAnswer: `When a high-traffic key (e.g. homepage banner or trending item) expires in cache, thousands of concurrent requests miss the cache simultaneously and all execute the expensive database query at the exact same millisecond. This causes database CPU saturation, connection starvation, and cascade outage. Safeguards include: 1) Mutual Exclusion (Distributed Mutex Locking) using Redis Redlock so only 1 thread queries the DB while others wait or retry; 2) Probabilistic Early Expiration (XFetch algorithm) where cache reads refresh the key before it strictly expires; 3) Adding random jitter to TTLs to prevent synchronized expirations (Cache Avalanche).`,
        keyConcepts: ['Thundering Herd / Cache Stampede', 'Distributed Mutex (Mutex Lock)', 'TTL Jitter / Staggered Expiry', 'Probabilistic Early Expiration (XFetch)', 'Cache Penetration Protection'],
      },
      {
        id: 'fb-multi-region-dr',
        difficulty: 'HARD',
        category: 'Disaster Recovery & High Availability',
        targetComponent: dbName,
        question: `How would you architect this system for Active-Active Multi-Region deployment with automated disaster recovery? Discuss data conflict resolution and the CAP theorem trade-offs.`,
        contextExplanation: 'Staff/Principal level question evaluating cross-continent latency, DNS routing, and distributed multi-master consensus.',
        idealAnswer: `In Active-Active multi-region deployment, traffic is geo-routed via Route 53 or Cloudflare Anycast to the nearest region. For stateless services, this delivers low latency worldwide. However, according to the CAP theorem, during cross-region network partitions we must choose between Consistency and Availability. For relational data, cross-region multi-master introduces high write latency due to synchronous replication or split-brain write conflicts with asynchronous replication. I would adopt CRDTs (Conflict-free Replicated Data Types) or Last-Write-Wins timestamps for mergeable state, or partition users geographically so a user's primary write region is fixed, while other regions serve read replicas.`,
        keyConcepts: ['Active-Active Multi-Region', 'Anycast Geo-Routing', 'CAP Theorem Partition Tolerance', 'CRDTs / Conflict Resolution', 'Regional Data Partitioning'],
      },
    ];

    return pool;
  }, [archNodes]);

  // Load questions on mount or count change
  const loadQuestions = useCallback(async (count: number) => {
    setIsLoadingQuestions(true);
    setCurrentIndex(0);
    setUserAnswer('');
    setCurrentEvaluation(null);
    setSessionResults([]);
    setIsSessionComplete(false);

    try {
      const fetched = await interviewService.getQuestions(nodes, edges, count);
      if (fetched && fetched.length > 0) {
        setQuestions(fetched.slice(0, count));
      } else {
        setQuestions(fallbackQuestions.slice(0, count));
      }
    } catch {
      // Deterministic graceful degradation
      setQuestions(fallbackQuestions.slice(0, count));
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [nodes, edges, fallbackQuestions]);

  useEffect(() => {
    void loadQuestions(selectedCount);
  }, [selectedCount, loadQuestions]);

  // Active question
  const currentQuestion: InterviewQuestionItem | undefined = questions[currentIndex];

  // Local evaluate answer fallback
  const evaluateAnswerLocally = (
    question: InterviewQuestionItem,
    answer: string
  ): AnswerEvaluationResult => {
    const trimmed = answer.trim();
    if (trimmed.length < 15) {
      return {
        accuracyScore: 18,
        isCorrect: false,
        strengths: ['Attempted answer submission'],
        missingPoints: question.keyConcepts.length > 0 ? question.keyConcepts : ['Technical trade-offs', 'Failure modes'],
        feedback: 'Your answer is too brief to demonstrate technical competence in a Staff/Senior system design interview. Be sure to explain your approach, the trade-offs, and concrete failure-handling mechanisms.',
        idealAnswer: question.idealAnswer,
      };
    }

    const lowerAnswer = trimmed.toLowerCase();
    const matchedConcepts: string[] = [];
    const missingConcepts: string[] = [];

    question.keyConcepts.forEach((concept) => {
      const words = concept.toLowerCase().split(/[\s/()]+/).filter((w) => w.length > 3);
      const isMatched = words.some((w) => lowerAnswer.includes(w));
      if (isMatched) {
        matchedConcepts.push(concept);
      } else {
        missingConcepts.push(concept);
      }
    });

    const totalConcepts = Math.max(1, question.keyConcepts.length);
    const conceptRatio = matchedConcepts.length / totalConcepts;
    let baseScore = Math.round(conceptRatio * 65);
    const wordCount = trimmed.split(/\s+/).length;

    if (wordCount >= 80) baseScore += 25;
    else if (wordCount >= 40) baseScore += 15;
    else baseScore += 5;

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
      idealAnswer: question.idealAnswer,
    };
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let evalResult: AnswerEvaluationResult;

    try {
      evalResult = await interviewService.evaluateAnswer({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        idealAnswer: currentQuestion.idealAnswer,
        keyConcepts: currentQuestion.keyConcepts,
        userAnswer: userAnswer.trim(),
        nodes,
        edges,
      });
    } catch {
      evalResult = evaluateAnswerLocally(currentQuestion, userAnswer);
    } finally {
      setIsSubmitting(false);
    }

    setCurrentEvaluation(evalResult);

    // Save record to session results
    setSessionResults((prev) => [
      ...prev,
      {
        question: currentQuestion,
        userAnswer: userAnswer.trim(),
        evaluation: evalResult,
      },
    ]);
  };

  // Move to Next Question or Final Summary
  const handleProceedNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer('');
      setCurrentEvaluation(null);
      setHasCopiedIdeal(false);
    } else {
      setIsSessionComplete(true);
    }
  };

  // Restart Session
  const handleRestartSession = (count: number = selectedCount) => {
    setSelectedCount(count);
    loadQuestions(count);
  };

  // Word count calculation
  const wordCount = useMemo(() => {
    const trimmed = userAnswer.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [userAnswer]);

  // Overall Scorecard Stats
  const totalQuestions = sessionResults.length;
  const passedQuestions = sessionResults.filter((r) => r.evaluation.isCorrect).length;
  const failedQuestions = totalQuestions - passedQuestions;
  const averageAccuracy = totalQuestions > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.evaluation.accuracyScore, 0) / totalQuestions)
    : 0;

  // Aggregated Improvement Areas across session
  const areasForImprovement = useMemo(() => {
    const missing: string[] = [];
    sessionResults.forEach((res) => {
      if (res.evaluation.accuracyScore < 80) {
        res.evaluation.missingPoints.forEach((pt) => {
          if (!missing.includes(pt)) missing.push(pt);
        });
      }
    });
    return missing;
  }, [sessionResults]);

  // Aggregated Mastered Strengths
  const masteredStrengths = useMemo(() => {
    const strengths: string[] = [];
    sessionResults.forEach((res) => {
      res.evaluation.strengths.forEach((s) => {
        if (!strengths.includes(s)) strengths.push(s);
      });
    });
    return strengths;
  }, [sessionResults]);

  // Copy ideal answer helper
  const handleCopyIdeal = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedIdeal(true);
    setTimeout(() => setHasCopiedIdeal(false), 2000);
  };

  const getDifficultyBadge = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    switch (difficulty) {
      case 'EASY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            EASY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            MEDIUM
          </span>
        );
      case 'HARD':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            HARD
          </span>
        );
    }
  };

  const getAccuracyBadge = (score: number) => {
    if (score >= 80) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="font-bold text-sm font-mono">{score}% Accuracy</span>
          <span className="text-xs text-emerald-400/80">(Staff Ready)</span>
        </div>
      );
    }
    if (score >= 60) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span className="font-bold text-sm font-mono">{score}% Accuracy</span>
          <span className="text-xs text-cyan-400/80">(Senior Ready)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
        <AlertTriangle size={16} className="text-amber-400" />
        <span className="font-bold text-sm font-mono">{score}% Accuracy</span>
        <span className="text-xs text-amber-400/80">(Needs Refinement)</span>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#070a12] text-slate-100 p-3.5 sm:p-6 md:p-8 2xl:p-12 select-text">
      <div className="max-w-5xl 2xl:max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        
        {/* Navigation & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 sm:pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={onBackToCanvas}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Return to Architecture Canvas"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <MessageSquareCode size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="truncate">System Design Mock Interview</span>
                  <span className="text-[10px] sm:text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Live Defense Mode
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Type your answers to Staff-level questions. Receive instant accuracy scores, missing trade-offs, and ideal model answers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Session Mode Selector */}
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
              <button
                onClick={() => handleRestartSession(5)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedCount === 5 && !isSessionComplete
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                5 Questions
              </button>
              <button
                onClick={() => handleRestartSession(10)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedCount === 10 && !isSessionComplete
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                10 Questions
              </button>
            </div>

            <button
              onClick={onRunCritique}
              className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-medium shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">AI Critique</span>
            </button>
          </div>
        </div>

        {/* Architecture Baseline Context */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono font-bold text-base sm:text-lg shrink-0">
              {metrics.redundancyScore}/100
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">System Architecture Readiness</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {archNodes.length} nodes · {edges.length} edges · {metrics.spof.length} SPOFs · {metrics.fanOut.toFixed(1)}x Fan-Out
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            {metrics.spof.length === 0 ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                <span>Zero SPOFs</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <span>{metrics.spof.length} SPOFs to Defend</span>
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW A: FINAL SESSION SUMMARY REPORT                     */}
        {/* ======================================================== */}
        {isSessionComplete ? (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Main Scorecard Header */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-800/90 bg-gradient-to-br from-[#0c101a] via-[#101626] to-[#0d1222] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    <Award size={14} />
                    <span>Interview Performance Scorecard</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Session Completed: {passedQuestions} of {totalQuestions} Passed
                  </h2>
                  <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {passedQuestions === totalQuestions
                      ? 'Exceptional performance! You demonstrated Staff/Principal architectural command across failover, scaling, transactions, and edge security.'
                      : passedQuestions >= Math.ceil(totalQuestions * 0.7)
                      ? 'Strong engineering foundation! You cleared the Senior engineering bar. Focus on deep-diving into specific edge failure modes and distributed transaction semantics.'
                      : 'Good effort. System design defense requires sharp articulation of failure recovery, data consistency trade-offs, and scaling mechanisms.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md shrink-0">
                  <div className="text-center px-3 border-r border-slate-800">
                    <div className="text-3xl font-mono font-black text-indigo-400">
                      {averageAccuracy}%
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                      Avg Accuracy
                    </div>
                  </div>
                  <div className="text-center px-3 border-r border-slate-800">
                    <div className="text-3xl font-mono font-black text-emerald-400">
                      {passedQuestions}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                      Correct
                    </div>
                  </div>
                  <div className="text-center px-3">
                    <div className="text-3xl font-mono font-black text-amber-400">
                      {failedQuestions}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                      Incorrect
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Aggregated Strengths & Areas for Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Areas for Improvement */}
              <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/20 bg-amber-950/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <AlertTriangle size={18} />
                  <span>Key Areas for Improvement ({areasForImprovement.length})</span>
                </div>
                <p className="text-xs text-slate-400">
                  Focus on studying these mechanisms and failure strategies before your next interview round:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {areasForImprovement.length > 0 ? (
                    areasForImprovement.map((area, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span>{area}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3">
                      No critical improvement gaps detected. Flawless coverage across all topics!
                    </div>
                  )}
                </div>
              </div>

              {/* Concepts Mastered */}
              <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck size={18} />
                  <span>Architectural Strengths Mastered ({masteredStrengths.length})</span>
                </div>
                <p className="text-xs text-slate-400">
                  You demonstrated solid engineering fluency in these topics:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {masteredStrengths.length > 0 ? (
                    masteredStrengths.map((str, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                      >
                        <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{str}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3">
                      Submit more detailed answers in future rounds to earn concept mastery badges.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Per-Question Review List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  <BookOpen size={16} />
                  <span>Question-by-Question Detailed Review</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {totalQuestions} questions reviewed
                </span>
              </div>

              <div className="space-y-3">
                {sessionResults.map((item, idx) => {
                  const isExpanded = expandedReviewId === item.question.id;
                  return (
                    <div
                      key={item.question.id}
                      className="rounded-2xl border border-slate-800 bg-[#0c101a] overflow-hidden transition-all shadow-md"
                    >
                      <button
                        onClick={() =>
                          setExpandedReviewId(isExpanded ? null : item.question.id)
                        }
                        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getDifficultyBadge(item.question.difficulty)}
                              <span className="text-xs font-medium text-slate-400 truncate">
                                {item.question.category}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white truncate">
                              {item.question.question}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                              item.evaluation.accuracyScore >= 80
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.evaluation.accuracyScore >= 60
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {item.evaluation.accuracyScore}%
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-4 text-xs leading-relaxed">
                          {/* Your Answer */}
                          <div>
                            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                              Your Answer
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                              {item.userAnswer}
                            </div>
                          </div>

                          {/* Ideal Answer */}
                          <div>
                            <div className="text-[11px] font-mono text-purple-400 uppercase tracking-wider mb-1">
                              Staff/Principal Benchmark Answer
                            </div>
                            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200">
                              {item.question.idealAnswer}
                            </div>
                          </div>

                          {/* Strengths & Missing Points */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1.5">
                              <span className="font-semibold text-emerald-400">Strengths:</span>
                              <ul className="list-disc list-inside space-y-1 text-slate-300">
                                {item.evaluation.strengths.map((s, sIdx) => (
                                  <li key={sIdx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1.5">
                              <span className="font-semibold text-amber-400">Missing Points:</span>
                              <ul className="list-disc list-inside space-y-1 text-slate-300">
                                {item.evaluation.missingPoints.map((m, mIdx) => (
                                  <li key={mIdx}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
              <button
                onClick={onBackToCanvas}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                <span>Return to Canvas</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRestartSession(5)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Start 5-Question Mock</span>
                </button>
                <button
                  onClick={() => handleRestartSession(10)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <TrendingUp size={14} />
                  <span>Start 10-Question Comprehensive</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW B: ACTIVE INTERVIEW ROUND (QUESTION & ANSWERING)    */
          /* ======================================================== */
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Progress Bar & Status */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-400 font-bold">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">
                    {sessionResults.length} Answered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Target Session:</span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {selectedCount} Questions
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round(((currentIndex + (currentEvaluation ? 1 : 0)) / questions.length) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            {isLoadingQuestions ? (
              <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#0c101a] space-y-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  Analyzing architecture graph and composing interview defense questions...
                </p>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                <div className="p-5 sm:p-7 rounded-2xl border border-slate-800/90 bg-[#0c101a]/95 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {getDifficultyBadge(currentQuestion.difficulty)}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                        {currentQuestion.category}
                      </span>
                    </div>

                    {currentQuestion.targetComponent && (
                      <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-3 py-0.5 rounded-full">
                        Focus: {currentQuestion.targetComponent}
                      </div>
                    )}
                  </div>

                  {/* Question Heading */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed flex items-start gap-3">
                      <FileQuestion size={22} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{currentQuestion.question}</span>
                    </h3>
                  </div>

                  {/* What Interviewer is evaluating */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                    <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-300">Interviewer Context: </span>
                      <span>{currentQuestion.contextExplanation}</span>
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* STATE 1: TYPING CONSOLE (BEFORE ANSWER SUBMISSION)       */}
                {/* ======================================================== */}
                {!currentEvaluation ? (
                  <div className="p-5 sm:p-6 rounded-2xl border border-slate-800/90 bg-[#0c101a]/90 backdrop-blur-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <span>Your System Design Defense</span>
                        <span className="text-[10px] font-normal text-slate-400 lowercase">
                          (Text typing only)
                        </span>
                      </label>
                      <div className="text-xs font-mono text-slate-400">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'} · {userAnswer.length} chars
                      </div>
                    </div>

                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your architectural response here... Mention specific technologies, trade-offs (e.g. latency vs consistency), failover mechanisms, and concrete failure-handling protocols..."
                      rows={7}
                      className="w-full p-4 rounded-xl bg-[#080c14] border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-xs sm:text-sm font-sans leading-relaxed resize-y transition-all"
                      disabled={isSubmitting}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-400">
                        Tip: Aim for 40+ words discussing trade-offs, SPOF mitigations, and protocols.
                      </div>

                      <div className="flex items-center gap-2.5">
                        {userAnswer.length > 0 && (
                          <button
                            onClick={() => setUserAnswer('')}
                            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs transition-colors cursor-pointer"
                            disabled={isSubmitting}
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={isSubmitting || userAnswer.trim().length === 0}
                          className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            isSubmitting || userAnswer.trim().length === 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Evaluating Accuracy...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>Submit Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* STATE 2: INSTANT EVALUATION & REAL MODEL ANSWER DISPLAY  */
                  /* ======================================================== */
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Accuracy Banner */}
                    <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-[#0c101a] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                          Evaluated Response
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-white">
                          Candidate Accuracy & Technical Coverage
                        </h4>
                      </div>

                      <div>{getAccuracyBadge(currentEvaluation.accuracyScore)}</div>
                    </div>

                    {/* Feedback & Trade-off Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                          <CheckCircle2 size={16} />
                          <span>Demonstrated Strengths</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-200">
                          {currentEvaluation.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Missing Points */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                          <AlertTriangle size={16} />
                          <span>Missing Critical Points</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-200">
                          {currentEvaluation.missingPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Coaching Feedback Note */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                      <Sparkles size={16} className="text-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-white">Interviewer Note: </span>
                        <span>{currentEvaluation.feedback}</span>
                      </div>
                    </div>

                    {/* Real Model / Ideal Answer Block */}
                    <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-purple-950/15 backdrop-blur-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                          <Award size={16} className="text-purple-400" />
                          <span>Staff / Principal Engineer Benchmark Answer</span>
                        </div>

                        <button
                          onClick={() => handleCopyIdeal(currentQuestion.idealAnswer)}
                          className="px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/30 hover:bg-purple-800/40 text-purple-200 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Copy ideal answer"
                        >
                          {hasCopiedIdeal ? <Check size={12} /> : <Copy size={12} />}
                          <span>{hasCopiedIdeal ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-[#080c14] border border-purple-500/20 text-slate-100 text-xs sm:text-sm font-sans leading-relaxed">
                        {currentQuestion.idealAnswer}
                      </div>

                      {/* Key technical concepts badges */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          Target Technical Concepts:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentQuestion.keyConcepts.map((concept, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={handleProceedNext}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>
                          {currentIndex + 1 < questions.length
                            ? 'Next Question'
                            : 'View Final Summary Report'}
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
