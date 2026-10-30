import assert from 'node:assert';
import { calculateArchitectureMetrics } from '../client/src/services/metricsEngine';
import type { Node, Edge } from '@xyflow/react';

console.log('--- Starting Metrics Engine Verification Tests ---');

// Test 1: Empty Architecture
{
  const metrics = calculateArchitectureMetrics([], []);
  assert.strictEqual(metrics.services, 0);
  assert.strictEqual(metrics.databases, 0);
  assert.strictEqual(metrics.caches, 0);
  assert.strictEqual(metrics.queues, 0);
  assert.strictEqual(metrics.loadBalancers, 0);
  assert.strictEqual(metrics.fanOut, 0);
  assert.strictEqual(metrics.spof.length, 0);
  assert.strictEqual(metrics.redundancyScore, 100);
  assert.strictEqual(metrics.cycles.length, 0);
  console.log('✓ Test 1: Empty Architecture passed');
}

// Test 2: Non-architectural shapes/annotations are ignored
{
  const nodes: Node[] = [
    { id: 'shape-1', type: 'shapeNode', position: { x: 0, y: 0 }, data: { isAnnotation: true, label: 'Box' } },
    { id: 'text-1', type: 'textNode', position: { x: 0, y: 0 }, data: { isAnnotation: true, text: 'Hello' } },
    { id: 'draw-1', type: 'drawNode', position: { x: 0, y: 0 }, data: { isAnnotation: true } },
    { id: 'frame-1', type: 'frameNode', position: { x: 0, y: 0 }, data: { isAnnotation: true } },
    { id: 'srv-1', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'service', label: 'API', replicas: 2 } },
  ];
  const edges: Edge[] = [
    { id: 'e1', source: 'shape-1', target: 'srv-1' },
  ];

  const metrics = calculateArchitectureMetrics(nodes, edges);
  assert.strictEqual(metrics.services, 1, 'Only architectureNode should be counted as service');
  assert.strictEqual(metrics.fanOut, 0, 'Edges connected to annotations must be ignored');
  console.log('✓ Test 2: Annotation sanitization passed');
}

// Test 3: Standard 3-Tier Architecture
{
  const nodes: Node[] = [
    { id: 'c1', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'client', label: 'Web Client' } },
    { id: 'gw1', type: 'architectureNode', position: { x: 100, y: 0 }, data: { category: 'gateway', label: 'Kong Gateway', replicas: 2 } },
    { id: 's1', type: 'architectureNode', position: { x: 200, y: 0 }, data: { category: 'service', label: 'Order Service', replicas: 3 } },
    { id: 'db1', type: 'architectureNode', position: { x: 300, y: 0 }, data: { category: 'database', label: 'Postgres DB', replicas: 2 } },
    { id: 'cache1', type: 'architectureNode', position: { x: 300, y: 100 }, data: { category: 'cache', label: 'Redis Cluster' } },
    { id: 'q1', type: 'architectureNode', position: { x: 300, y: 200 }, data: { category: 'queue', label: 'Kafka' } },
  ];
  const edges: Edge[] = [
    { id: 'e1', source: 'c1', target: 'gw1' },
    { id: 'e2', source: 'gw1', target: 's1' },
    { id: 'e3', source: 's1', target: 'db1' },
    { id: 'e4', source: 's1', target: 'cache1' },
    { id: 'e5', source: 's1', target: 'q1' },
  ];

  const metrics = calculateArchitectureMetrics(nodes, edges);
  assert.strictEqual(metrics.services, 1);
  assert.strictEqual(metrics.loadBalancers, 1);
  assert.strictEqual(metrics.databases, 1);
  assert.strictEqual(metrics.caches, 1);
  assert.strictEqual(metrics.queues, 1);
  assert.strictEqual(metrics.spof.length, 0, 'All components replicated, no SPOFs');
  assert.strictEqual(metrics.cycles.length, 0, 'No cycles');
  // gw1 has 1 outgoing, s1 has 3 outgoing -> (1 + 3) / 2 = 2.0
  assert.strictEqual(metrics.fanOut, 2.0);
  assert.strictEqual(metrics.redundancyScore, 100);
  console.log('✓ Test 3: High-availability 3-Tier Architecture metrics passed');
}

// Test 4: Single Point of Failure (SPOF) Detection
{
  const nodes: Node[] = [
    { id: 'gw1', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'gateway', label: 'Solo Ingress', replicas: 1 } },
    { id: 's1', type: 'architectureNode', position: { x: 100, y: 0 }, data: { category: 'service', label: 'Auth Service', replicas: 1 } },
    { id: 's2', type: 'architectureNode', position: { x: 100, y: 100 }, data: { category: 'service', label: 'Payment Service', replicas: 2 } },
    { id: 's3', type: 'architectureNode', position: { x: 100, y: 200 }, data: { category: 'service', label: 'Order Service', replicas: 2 } },
    { id: 'db1', type: 'architectureNode', position: { x: 200, y: 0 }, data: { category: 'database', label: 'MySQL Primary', replicas: 1 } },
  ];
  const edges: Edge[] = [
    // Solo Ingress receives traffic from client
    { id: 'e0', source: 's2', target: 'gw1' }, // traffic to gw
    { id: 'e1', source: 's2', target: 's1' }, // consumer 1 -> auth
    { id: 'e2', source: 's3', target: 's1' }, // consumer 2 -> auth
    { id: 'e3', source: 's1', target: 'db1' }, // auth -> db1
  ];

  const metrics = calculateArchitectureMetrics(nodes, edges);
  assert.ok(metrics.spof.some((s) => s.includes('Solo Ingress')), 'Solo Ingress must be flagged as SPOF');
  assert.ok(metrics.spof.some((s) => s.includes('Auth Service')), 'Unreplicated service with >1 consumers must be flagged as SPOF');
  assert.ok(metrics.spof.some((s) => s.includes('MySQL Primary')), 'Unreplicated database with incoming traffic must be flagged as SPOF');
  assert.ok(metrics.redundancyScore < 60, 'Redundancy score must drop due to multiple SPOFs');
  console.log('✓ Test 4: SPOF detection passed');
}

// Test 5: Cycle Detection (Circular Dependency)
{
  const nodes: Node[] = [
    { id: 'sA', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'service', label: 'Service A' } },
    { id: 'sB', type: 'architectureNode', position: { x: 100, y: 0 }, data: { category: 'service', label: 'Service B' } },
    { id: 'sC', type: 'architectureNode', position: { x: 200, y: 0 }, data: { category: 'service', label: 'Service C' } },
  ];
  const edges: Edge[] = [
    { id: 'e1', source: 'sA', target: 'sB' },
    { id: 'e2', source: 'sB', target: 'sC' },
    { id: 'e3', source: 'sC', target: 'sA' }, // cycle!
  ];

  const metrics = calculateArchitectureMetrics(nodes, edges);
  assert.strictEqual(metrics.cycles.length, 1);
  assert.ok(metrics.warnings.some((w) => w.includes('Circular Dependency Detected')));
  console.log('✓ Test 5: Circular Dependency cycle detection passed');
}

// Test 6: Security Alert (Client directly connected to Database)
{
  const nodes: Node[] = [
    { id: 'c1', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'client', label: 'Mobile App' } },
    { id: 'db1', type: 'architectureNode', position: { x: 100, y: 0 }, data: { category: 'database', label: 'User DB', replicas: 2 } },
  ];
  const edges: Edge[] = [
    { id: 'e1', source: 'c1', target: 'db1' },
  ];

  const metrics = calculateArchitectureMetrics(nodes, edges);
  assert.ok(metrics.warnings.some((w) => w.includes('Security Alert: Mobile App is directly connected to User DB')));
  console.log('✓ Test 6: Client -> Database Security Alert passed');
}

// Test 7: Dynamic Graph Mutation (Add, Edit Replicas, Connect, Delete)
{
  // Step A: Start with 1 service and 1 db (replicas: 1)
  let testNodes: Node[] = [
    { id: 'svc-1', type: 'architectureNode', position: { x: 0, y: 0 }, data: { category: 'service', label: 'API', replicas: 2 } },
    { id: 'db-1', type: 'architectureNode', position: { x: 100, y: 0 }, data: { category: 'database', label: 'Postgres', replicas: 1 } },
  ];
  let testEdges: Edge[] = [
    { id: 'e-1', source: 'svc-1', target: 'db-1' },
  ];

  let m1 = calculateArchitectureMetrics(testNodes, testEdges);
  assert.strictEqual(m1.databases, 1);
  assert.strictEqual(m1.spof.length, 1, 'Postgres should be SPOF initially');

  // Step B: Edit Node Replicas -> Set replicas to 2 (resolving SPOF)
  testNodes = testNodes.map((n) =>
    n.id === 'db-1' ? { ...n, data: { ...n.data, replicas: 2 } } : n
  );
  let m2 = calculateArchitectureMetrics(testNodes, testEdges);
  assert.strictEqual(m2.spof.length, 0, 'Increasing replicas to 2 must resolve SPOF immediately');
  assert.ok(m2.redundancyScore > m1.redundancyScore);

  // Step C: Add a Redis Cache and Connect it
  testNodes = [
    ...testNodes,
    { id: 'cache-1', type: 'architectureNode', position: { x: 200, y: 0 }, data: { category: 'cache', label: 'Redis' } },
  ];
  testEdges = [
    ...testEdges,
    { id: 'e-2', source: 'svc-1', target: 'cache-1' },
  ];
  let m3 = calculateArchitectureMetrics(testNodes, testEdges);
  assert.strictEqual(m3.caches, 1);
  assert.strictEqual(m3.fanOut, 2.0, 'API service now connects to DB and Cache -> fanOut is 2.0');

  // Step D: Delete the Edge connecting API to Cache
  testEdges = testEdges.filter((e) => e.id !== 'e-2');
  let m4 = calculateArchitectureMetrics(testNodes, testEdges);
  assert.strictEqual(m4.fanOut, 1.0, 'Deleting edge updates fanOut back to 1.0 immediately');

  // Step E: Delete the Cache Node
  testNodes = testNodes.filter((n) => n.id !== 'cache-1');
  let m5 = calculateArchitectureMetrics(testNodes, testEdges);
  assert.strictEqual(m5.caches, 0, 'Deleting cache updates cache count to 0 immediately');

  console.log('✓ Test 7: Dynamic Graph Mutations (Add/Edit/Connect/Delete) passed');
}

console.log('All 7 Metrics Engine test suites passed successfully!');
