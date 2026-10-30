import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test — Asynchronous Analysis Queue (Redpanda / Worker Queue)
 * Tests queuing throughput, non-blocking HTTP 202 responses, and job polling.
 */
export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of enqueue operations must take <150ms
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    nodes: [
      { id: '1', data: { label: 'Web Client', type: 'client' } },
      { id: '2', data: { label: 'API Gateway', type: 'gateway' } },
      { id: '3', data: { label: 'Payment Service', type: 'service' } },
      { id: '4', data: { label: 'Order DB', type: 'database', replicas: 2 } },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
    ],
    systemContext: 'High concurrency checkout system with 10k RPS target',
    async: true,
  });

  const res = http.post(`${BASE_URL}/api/ai/critique/async`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const isAccepted = check(res, {
    'Status is 202 Accepted': (r) => r.status === 202,
    'Returns jobId': (r) => r.json('jobId') !== undefined,
    'Returns QUEUED status': (r) => r.json('status') === 'QUEUED',
  });

  if (isAccepted) {
    const jobId = res.json('jobId');

    // Poll job status once after brief sleep
    sleep(0.5);
    const pollRes = http.get(`${BASE_URL}/api/ai/jobs/${jobId}`);
    check(pollRes, {
      'Poll status is 200': (r) => r.status === 200,
      'Valid job status': (r) => ['QUEUED', 'PROCESSING', 'COMPLETED'].includes(r.json('status')),
    });
  }

  sleep(1);
}
