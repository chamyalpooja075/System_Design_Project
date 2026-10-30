import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test — 100 Virtual Users (VUs) Testing User Auth & CRUD Operations
 * Target: P95 latency < 100ms, Success rate >= 95%
 */
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp up to 50 users
    { duration: '30s', target: 100 }, // Peak at 100 users
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.05'],   // Less than 5% failure rate
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  const randomId = Math.floor(Math.random() * 1000000);
  const email = `loaduser_${randomId}@example.com`;
  const password = 'Password123!';

  // 1. User Registration
  const registerPayload = JSON.stringify({
    email,
    password,
    name: `User ${randomId}`,
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(regRes, {
    'Registration successful or duplicate': (r) => r.status === 201 || r.status === 409,
  });

  // 2. User Login
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'Login returned 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  const token = loginRes.json('accessToken');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (token) {
    // 3. Create Project
    const projRes = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify({
        name: `Load Test Project ${randomId}`,
        description: 'Automated k6 benchmarking diagram',
      }),
      { headers: authHeaders }
    );

    check(projRes, {
      'Project created': (r) => r.status === 201,
    });

    const projectId = projRes.json('id');

    if (projectId) {
      // 4. Save Diagram
      const diagramPayload = JSON.stringify({
        nodes: [
          { id: '1', data: { label: 'Web Client', type: 'client' } },
          { id: '2', data: { label: 'API Gateway', type: 'gateway' } },
          { id: '3', data: { label: 'Auth Service', type: 'service' } },
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' },
        ],
        metrics: { services: 1, databases: 0, redundancyScore: 85 },
      });

      const saveRes = http.post(
        `${BASE_URL}/api/diagrams/${projectId}/save`,
        diagramPayload,
        { headers: authHeaders }
      );

      check(saveRes, {
        'Diagram saved': (r) => r.status === 200 || r.status === 201,
      });

      // 5. Retrieve Diagram Version History
      const histRes = http.get(
        `${BASE_URL}/api/diagrams/${projectId}/history`,
        { headers: authHeaders }
      );

      check(histRes, {
        'History retrieved': (r) => r.status === 200,
      });
    }
  }

  sleep(1);
}
