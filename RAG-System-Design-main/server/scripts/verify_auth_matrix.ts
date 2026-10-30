import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface TestResult {
  category: string;
  test: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes?: string;
}

async function runAuthSecurityMatrix() {
  console.log('='.repeat(75));
  console.log('  STARTING SYSTEM DESIGN AUTHENTICATION & ACCESS CONTROL AUDIT');
  console.log('='.repeat(75));

  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3000 : address.port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Running ephemeral audit server at ${baseUrl}\n`);

  const results: TestResult[] = [];

  const recordResult = (
    category: string,
    test: string,
    expectedStatus: number,
    actualStatus: number,
    notes?: string
  ) => {
    const passed = expectedStatus === actualStatus;
    results.push({ category, test, expectedStatus, actualStatus, passed, notes });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} | [${category}] ${test} -> Expected: ${expectedStatus}, Received: ${actualStatus}${notes ? ` (${notes})` : ''}`);
  };

  try {
    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'fallback-secret-key-system-design';

    // -------------------------------------------------------------
    // SECTION 1: Unauthenticated Requests (Every protected URL returns 401)
    // -------------------------------------------------------------
    console.log('--- 1. Testing Direct Protected URL Access Without Login (Must return 401) ---');
    const protectedEndpoints = [
      { method: 'GET', path: '/api/projects' },
      { method: 'POST', path: '/api/projects', body: { name: 'Hacked Project' } },
      { method: 'GET', path: '/api/projects/proj-123' },
      { method: 'DELETE', path: '/api/projects/proj-123' },
      { method: 'GET', path: '/api/diagrams/proj-123' },
      { method: 'POST', path: '/api/diagrams/proj-123/save', body: { nodes: [], edges: [] } },
      { method: 'GET', path: '/api/diagrams/proj-123/history' },
      { method: 'GET', path: '/api/diagrams/proj-123/version/1' },
      { method: 'GET', path: '/api/auth/me' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      recordResult(
        'Unauthenticated Access',
        `${ep.method} ${ep.path}`,
        401,
        res.status,
        res.status === 401 ? 'Blocked correctly' : 'SECURITY LEAK'
      );
    }

    // -------------------------------------------------------------
    // SECTION 2: Expired and Malformed Tokens (Must return 401)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Expired & Invalid Tokens (Must return 401) ---');

    // 2a. Malformed token
    const malformedRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: 'Bearer totally-invalid-token-string' },
    });
    recordResult('Invalid Token', 'GET /api/projects with malformed token', 401, malformedRes.status);

    // 2b. Expired token (issued 2 hours ago, expired 1 hour ago)
    const expiredToken = jwtService.sign(
      { sub: 'some-user-id', email: 'test@domain.com', isAdmin: false },
      { secret: jwtSecret, expiresIn: '-1h' }
    );
    const expiredRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    recordResult('Expired Token', 'GET /api/projects with expired JWT', 401, expiredRes.status);

    // 2c. Token signed with wrong secret
    const wrongSecretToken = jwtService.sign(
      { sub: 'some-user-id', email: 'test@domain.com', isAdmin: false },
      { secret: 'wrong-and-untrusted-secret' }
    );
    const wrongSecretRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${wrongSecretToken}` },
    });
    recordResult('Untrusted Secret', 'GET /api/projects with foreign-signed JWT', 401, wrongSecretRes.status);

    // -------------------------------------------------------------
    // SECTION 3: Cross-User Resource Isolation (Must return 403 Forbidden)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Cross-User Resource Authorization (Must return 403 Forbidden) ---');

    // Register User A
    const rand = Math.floor(Math.random() * 100000);
    const userAReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `alice_${rand}@security.test`, password: 'Password123!', name: 'Alice' }),
    });
    const userAData = await userAReg.json();
    const tokenA = userAData.accessToken;

    // Register User B
    const userBReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `bob_${rand}@security.test`, password: 'Password123!', name: 'Bob' }),
    });
    const userBData = await userBReg.json();
    const tokenB = userBData.accessToken;

    // User B creates a private architecture project
    const createProjectBRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: "Bob's Secret Infrastructure", description: 'Confidential architecture' }),
    });
    const projectB = await createProjectBRes.json();
    const projectBId = projectB.id;

    // User B saves a diagram version
    await fetch(`${baseUrl}/api/diagrams/${projectBId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        nodes: [{ id: 'secret-db', type: 'architectureNode', position: { x: 0, y: 0 }, data: { label: 'Secret DB' } }],
        edges: [],
      }),
    });

    console.log(`  User A (Alice: ${userAData.user.id}) attempting to access User B (Bob's Project: ${projectBId})...`);

    // User A attempts to READ User B's project details
    const userA_GetProjB = await fetch(`${baseUrl}/api/projects/${projectBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Cross-User Isolation', 'User A -> GET /api/projects/{UserB_ProjectId}', 403, userA_GetProjB.status);

    // User A attempts to READ User B's diagram
    const userA_GetDiagB = await fetch(`${baseUrl}/api/diagrams/${projectBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Cross-User Isolation', 'User A -> GET /api/diagrams/{UserB_ProjectId}', 403, userA_GetDiagB.status);

    // User A attempts to READ User B's version history
    const userA_GetHistoryB = await fetch(`${baseUrl}/api/diagrams/${projectBId}/history`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Cross-User Isolation', 'User A -> GET /api/diagrams/{UserB_ProjectId}/history', 403, userA_GetHistoryB.status);

    // User A attempts to READ a specific historical version of User B's diagram
    const userA_GetVersionB = await fetch(`${baseUrl}/api/diagrams/${projectBId}/version/1`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Cross-User Isolation', 'User A -> GET /api/diagrams/{UserB_ProjectId}/version/1', 403, userA_GetVersionB.status);

    // User A attempts to OVERWRITE / SAVE User B's diagram
    const userA_SaveDiagB = await fetch(`${baseUrl}/api/diagrams/${projectBId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        nodes: [{ id: 'compromised-node', type: 'architectureNode', position: { x: 0, y: 0 }, data: { label: 'Compromised' } }],
        edges: [],
      }),
    });
    recordResult('Cross-User Isolation', 'User A -> POST /api/diagrams/{UserB_ProjectId}/save', 403, userA_SaveDiagB.status);

    // User A attempts to DELETE User B's project
    const userA_DeleteProjB = await fetch(`${baseUrl}/api/projects/${projectBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Cross-User Isolation', 'User A -> DELETE /api/projects/{UserB_ProjectId}', 403, userA_DeleteProjB.status);

    // -------------------------------------------------------------
    // SECTION 4: Parameter Tampering & Random IDs (Must return 404)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing URL Parameter Tampering / Non-Existent IDs ---');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const fakeProjRes = await fetch(`${baseUrl}/api/projects/${fakeId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Parameter Tampering', `User A -> GET /api/projects/${fakeId}`, 404, fakeProjRes.status);

    const fakeDiagRes = await fetch(`${baseUrl}/api/diagrams/${fakeId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult('Parameter Tampering', `User A -> GET /api/diagrams/${fakeId}`, 404, fakeDiagRes.status);

    // -------------------------------------------------------------
    // SECTION 5: Legitimate Owner Access (Must return 200 OK)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Authorized Owner Access ---');
    const userB_GetOwnProj = await fetch(`${baseUrl}/api/projects/${projectBId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    recordResult('Authorized Access', 'User B -> GET /api/projects/{Own_ProjectId}', 200, userB_GetOwnProj.status);

    const userB_GetOwnDiag = await fetch(`${baseUrl}/api/diagrams/${projectBId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    recordResult('Authorized Access', 'User B -> GET /api/diagrams/{Own_ProjectId}', 200, userB_GetOwnDiag.status);

    // Verify Bob's diagram still has original content and was not corrupted by Alice
    const diagData = await userB_GetOwnDiag.json();
    const hasSecretDb = diagData.diagram?.nodes?.some((n: any) => n.id === 'secret-db');
    const hasCompromised = diagData.diagram?.nodes?.some((n: any) => n.id === 'compromised-node');
    const integrityPassed = hasSecretDb && !hasCompromised;
    recordResult(
      'Data Integrity',
      "Verify Bob's diagram was NOT modified by unauthorized attempts",
      200,
      integrityPassed ? 200 : 500,
      integrityPassed ? 'Intact' : 'CORRUPTED'
    );

  } finally {
    await app.close();
  }

  // Summary
  console.log('\n' + '='.repeat(75));
  console.log('  SECURITY AUDIT SUMMARY REPORT');
  console.log('='.repeat(75));
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`  Total Checks Executed : ${total}`);
  console.log(`  Checks Passed         : ${passed}`);
  console.log(`  Checks Failed         : ${failed}`);

  if (failed > 0) {
    console.error('\n❌ CRITICAL SECURITY VULNERABILITIES DETECTED!');
    process.exit(1);
  } else {
    console.log('\n✅ ALL AUTHENTICATION & ACCESS CONTROL CHECKS PASSED EMPIRICALLY!');
    process.exit(0);
  }
}

runAuthSecurityMatrix().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
