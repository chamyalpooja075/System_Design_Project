/**
 * Automated Load Testing Suite using Autocannon
 * Simulates 100 concurrent connections against core CRUD and async queue endpoints.
 * 
 * Target Metrics:
 * - Throughput: >= 200 req/sec
 * - Latency (P95): < 100ms for CRUD / metrics
 * - Error Rate: <= 5%
 */
const autocannon = require('autocannon');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function runBenchmark(title, options) {
  console.log(`\n========================================`);
  console.log(` Starting Benchmark: ${title}`);
  console.log(` Target: ${options.url}`);
  console.log(` Connections: ${options.connections}, Duration: ${options.duration}s`);
  console.log(`========================================\n`);

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        ...options,
        pipelining: 1,
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }

        console.log(`\n--- Results for ${title} ---`);
        console.log(`Requests/sec:  ${result.requests.average}`);
        console.log(`Throughput:    ${(result.throughput.average / (1024 * 1024)).toFixed(2)} MB/s`);
        console.log(`Latency (P50): ${result.latency.p50} ms`);
        console.log(`Latency (P95): ${result.latency.p95} ms`);
        console.log(`Latency (P99): ${result.latency.p99} ms`);
        console.log(`2xx Responses: ${result['2xx']}`);
        console.log(`Non-2xx / Err: ${result.non2xx + result.errors}`);
        console.log(`Success Rate:  ${(((result['2xx']) / (result.requests.total || 1)) * 100).toFixed(1)}%`);

        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log('Starting Phase 5 Asynchronous Architecture Load Test Suite');

  try {
    // 1. Health / Baseline Benchmark
    await runBenchmark('Baseline Health Check Endpoint', {
      url: `${BASE_URL}/api`,
      connections: 100,
      duration: 5,
    });

    // 2. Deterministic Metrics Evaluation Benchmark
    const mockDiagramPayload = JSON.stringify({
      nodes: [
        { id: '1', data: { label: 'Web Client', type: 'client' } },
        { id: '2', data: { label: 'API Gateway', type: 'gateway' } },
        { id: '3', data: { label: 'Order Service', type: 'service' } },
        { id: '4', data: { label: 'PostgreSQL DB', type: 'database', replicas: 2 } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
      ],
    });

    await runBenchmark('Deterministic Metrics Engine Under Concurrent Load', {
      url: `${BASE_URL}/api/metrics/evaluate`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: mockDiagramPayload,
      connections: 100,
      duration: 5,
    });

    // 3. Asynchronous Queue Endpoint Benchmark
    await runBenchmark('Asynchronous Analysis Queue Ingestion (Redpanda / Worker Queue)', {
      url: `${BASE_URL}/api/ai/critique/async`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: mockDiagramPayload,
      connections: 50,
      duration: 5,
    });

    console.log('\n[SUCCESS] All load testing scenarios completed successfully!\n');
  } catch (err) {
    console.error('[ERROR] Benchmark run encountered error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
