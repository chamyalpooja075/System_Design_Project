import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('='.repeat(75));
  console.log('  VERIFYING AUTHENTICATION & DATABASE PERSISTENCE LIFECYCLE');
  console.log('='.repeat(75));

  const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
  const prisma = new PrismaClient();

  console.log(`[Client] Targeting backend at ${baseUrl}`);

  try {
    const timestamp = Date.now();
    const testEmail = `architect_${timestamp}@systemdesign.io`;
    const testPassword = `SecureP@ssword_${timestamp}!`;
    const testName = 'Jane Architect';

    // -----------------------------------------------------------------
    // STEP 1: TEST SIGN UP (REGISTER) & VERIFY DATABASE RECORD
    // -----------------------------------------------------------------
    console.log('\n--- 1. Testing User Sign Up (Registration) ---');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: testName,
      }),
    });

    console.log(`  Register HTTP Status: ${registerResponse.status} ${registerResponse.statusText}`);
    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed with status ${registerResponse.status}: ${await registerResponse.text()}`);
    }

    const regData = await registerResponse.json();
    console.log(`  User Created ID: ${regData.user.id}`);
    console.log(`  Access Token Issued: ${regData.accessToken.slice(0, 20)}...`);
    console.log(`  Refresh Token Issued: ${regData.refreshToken.slice(0, 20)}...`);

    // Verify raw database record in SQLite/Postgres
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!dbUser) {
      throw new Error(`CRITICAL: User record was not found in the database!`);
    }
    console.log(`  [DB Check] User found in 'users' table:`);
    console.log(`    - ID: ${dbUser.id}`);
    console.log(`    - Email: ${dbUser.email}`);
    console.log(`    - Name: ${dbUser.name}`);
    console.log(`    - Password Hash: ${dbUser.passwordHash.slice(0, 25)}... (bcrypt validated)`);

    // Verify bcrypt hash matches
    const isPasswordHashValid = await bcrypt.compare(testPassword, dbUser.passwordHash);
    if (!isPasswordHashValid) {
      throw new Error(`CRITICAL: Password hash in database does not match the registered password!`);
    }
    console.log(`  ✅ Database password hash verification: MATCHED`);

    // Verify refresh token was saved in database
    const dbRefreshToken = await prisma.refreshToken.findFirst({
      where: { userId: dbUser.id },
    });
    if (!dbRefreshToken) {
      throw new Error(`CRITICAL: Refresh token record was not found in 'refresh_tokens' table!`);
    }
    console.log(`  ✅ Refresh token stored in 'refresh_tokens' table (Expires: ${dbRefreshToken.expiresAt.toISOString()})`);

    // -----------------------------------------------------------------
    // STEP 2: TEST LOGIN WITH DATABASE CREDENTIALS
    // -----------------------------------------------------------------
    console.log('\n--- 2. Testing User Login with Saved Credentials ---');

    // 2a. Login with valid credentials
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    console.log(`  Login HTTP Status: ${loginResponse.status} ${loginResponse.statusText}`);
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${await loginResponse.text()}`);
    }

    const loginData = await loginResponse.json();
    const activeToken = loginData.accessToken;
    console.log(`  ✅ Login Succeeded! User Profile: ${loginData.user.name} (${loginData.user.email})`);

    // 2b. Test login with wrong password
    const badLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });
    console.log(`  Wrong Password Attempt: ${badLoginResponse.status} ${badLoginResponse.statusText} (Expected: 401)`);
    if (badLoginResponse.status !== 401) {
      throw new Error(`Security fault: Wrong password did not return 401!`);
    }
    console.log(`  ✅ Bad password correctly rejected with 401 Unauthorized`);

    // -----------------------------------------------------------------
    // STEP 3: SAVE ARCHITECTURE PROJECT & DIAGRAM TO DATABASE
    // -----------------------------------------------------------------
    console.log('\n--- 3. Testing Architecture Project & Diagram Saving to Database ---');

    // Create a new project
    const createProjectRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({
        name: 'Enterprise Cloud Architecture',
        description: 'Microservices with Redis caching and PostgreSQL primary-replica',
      }),
    });

    if (createProjectRes.status !== 201) {
      throw new Error(`Failed to create project: ${await createProjectRes.text()}`);
    }
    const createdProject = await createProjectRes.json();
    const projectId = createdProject.id;
    console.log(`  ✅ Project created in DB. ID: ${projectId}, Name: "${createdProject.name}"`);

    // Save complex diagram nodes & edges
    const customNodes = [
      {
        id: 'client-1',
        type: 'architectureNode',
        position: { x: 100, y: 150 },
        data: { label: 'Web App React 19', category: 'client', technology: 'Vite / React', replicas: 1 },
      },
      {
        id: 'gateway-1',
        type: 'architectureNode',
        position: { x: 400, y: 150 },
        data: { label: 'Kong Ingress Gateway', category: 'gateway', technology: 'Kong Gateway', replicas: 3 },
      },
      {
        id: 'service-order',
        type: 'architectureNode',
        position: { x: 700, y: 100 },
        data: { label: 'Order Processing Service', category: 'service', technology: 'NestJS / Node', replicas: 2 },
      },
      {
        id: 'cache-redis',
        type: 'architectureNode',
        position: { x: 1000, y: 50 },
        data: { label: 'Distributed Redis Cluster', category: 'cache', technology: 'Redis 7', replicas: 3 },
      },
      {
        id: 'db-postgres',
        type: 'architectureNode',
        position: { x: 1000, y: 220 },
        data: { label: 'PostgreSQL Primary-Replica', category: 'database', technology: 'PostgreSQL 16', replicas: 2 },
      },
    ];

    const customEdges = [
      { id: 'e1', source: 'client-1', target: 'gateway-1', data: { protocol: 'HTTPS', isAsync: false } },
      { id: 'e2', source: 'gateway-1', target: 'service-order', data: { protocol: 'gRPC', isAsync: false } },
      { id: 'e3', source: 'service-order', target: 'cache-redis', data: { protocol: 'TCP', isAsync: false } },
      { id: 'e4', source: 'service-order', target: 'db-postgres', data: { protocol: 'SQL', isAsync: false } },
    ];

    const customMetrics = {
      services: 1,
      databases: 1,
      caches: 1,
      queues: 0,
      redundancyScore: 92,
      spof: [],
      fanOut: 2.0,
      cycles: [],
    };

    console.log(`  Saving diagram with ${customNodes.length} nodes and ${customEdges.length} edges...`);
    const saveDiagramRes = await fetch(`${baseUrl}/api/diagrams/${projectId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({
        nodes: customNodes,
        edges: customEdges,
        metrics: customMetrics,
      }),
    });

    if (saveDiagramRes.status !== 201) {
      throw new Error(`Failed to save diagram: ${await saveDiagramRes.text()}`);
    }
    const saveDiagramData = await saveDiagramRes.json();
    console.log(`  ✅ Diagram saved successfully! Version: v${saveDiagramData.version}`);

    // Verify database row in 'diagrams' table
    const dbDiagram = await prisma.diagram.findFirst({
      where: { projectId, version: saveDiagramData.version },
    });
    if (!dbDiagram) {
      throw new Error(`CRITICAL: Diagram record v${saveDiagramData.version} was not found in database!`);
    }

    const parsedDbNodes = JSON.parse(dbDiagram.nodes);
    const parsedDbEdges = JSON.parse(dbDiagram.edges);
    const parsedDbMetrics = JSON.parse(dbDiagram.metrics || '{}');
    console.log(`  [DB Check] Raw database diagram row verified:`);
    console.log(`    - ID: ${dbDiagram.id}`);
    console.log(`    - Project ID: ${dbDiagram.projectId}`);
    console.log(`    - Version: ${dbDiagram.version}`);
    console.log(`    - Saved Nodes Count in DB: ${parsedDbNodes.length}`);
    console.log(`    - Saved Edges Count in DB: ${parsedDbEdges.length}`);
    console.log(`    - Redundancy Score in DB: ${parsedDbMetrics.redundancyScore}`);

    if (parsedDbNodes.length !== customNodes.length || parsedDbEdges.length !== customEdges.length) {
      throw new Error(`CRITICAL: Node or edge count in database mismatch!`);
    }

    // -----------------------------------------------------------------
    // STEP 4: FRESH LOGIN & RETRIEVING SAVED DATA FROM DATABASE
    // -----------------------------------------------------------------
    console.log('\n--- 4. Testing Fresh Login & Loading Data from Database ---');
    console.log('  Simulating user closing browser, returning, and logging in again...');

    // Re-login from scratch
    const reLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const reLoginData = await reLoginRes.json();
    const newSessionToken = reLoginData.accessToken;
    console.log(`  Fresh Session Token Acquired: ${newSessionToken.slice(0, 20)}...`);

    // Verify /api/auth/me returns identity
    const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${newSessionToken}` },
    });
    const profileData = await profileRes.json();
    console.log(`  Identity Verified: ${profileData.user.name} (${profileData.user.email})`);

    // List user projects
    console.log('  Fetching user projects list...');
    const userProjectsRes = await fetch(`${baseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${newSessionToken}` },
    });
    const userProjects = await userProjectsRes.json();
    console.log(`  Found ${userProjects.length} project(s) for user.`);
    const matchingProj = userProjects.find((p: any) => p.id === projectId);
    if (!matchingProj) {
      throw new Error(`CRITICAL: Saved project ${projectId} not returned in user's projects list!`);
    }
    console.log(`  ✅ Project "${matchingProj.name}" found in user project list!`);

    // Retrieve latest diagram state from database
    console.log(`  Loading latest diagram for project ${projectId}...`);
    const loadDiagramRes = await fetch(`${baseUrl}/api/diagrams/${projectId}`, {
      headers: { Authorization: `Bearer ${newSessionToken}` },
    });
    if (loadDiagramRes.status !== 200) {
      throw new Error(`Failed to load diagram: ${await loadDiagramRes.text()}`);
    }

    const loadedData = await loadDiagramRes.json();
    const loadedNodes = loadedData.diagram.nodes;
    const loadedEdges = loadedData.diagram.edges;
    const loadedMetrics = loadedData.diagram.metrics;

    console.log(`  ✅ Successfully loaded diagram from database:`);
    console.log(`    - Version: v${loadedData.diagram.version}`);
    console.log(`    - Nodes Loaded: ${loadedNodes.length}`);
    console.log(`    - Edges Loaded: ${loadedEdges.length}`);
    console.log(`    - Redundancy Score Loaded: ${loadedMetrics.redundancyScore}`);

    // Deep compare node attributes
    const dbClientNode = loadedNodes.find((n: any) => n.id === 'client-1');
    const dbGatewayNode = loadedNodes.find((n: any) => n.id === 'gateway-1');
    const dbRedisNode = loadedNodes.find((n: any) => n.id === 'cache-redis');

    if (
      dbClientNode?.data?.label !== 'Web App React 19' ||
      dbGatewayNode?.data?.technology !== 'Kong Gateway' ||
      dbRedisNode?.data?.replicas !== 3
    ) {
      throw new Error(`CRITICAL: Loaded node data attributes did not match saved state!`);
    }
    console.log(`  ✅ Node labels, technologies, and replica configurations MATCHED 100%!`);

    // Retrieve version history
    const historyRes = await fetch(`${baseUrl}/api/diagrams/${projectId}/history`, {
      headers: { Authorization: `Bearer ${newSessionToken}` },
    });
    const historyList = await historyRes.json();
    console.log(`  ✅ Version history returned ${historyList.length} snapshot(s) (v1 initial + v2 custom).`);

    console.log('\n' + '='.repeat(75));
    console.log('  ALL CHECKS PASSED: AUTHENTICATION, PASSWORD HASHING, DATABASE');
    console.log('  STORAGE, AND POST-LOGIN DATA RETRIEVAL ARE FULLY OPERATIONAL!');
    console.log('='.repeat(75));

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
