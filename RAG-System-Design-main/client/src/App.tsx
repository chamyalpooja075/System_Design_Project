import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';

import { ArchitectureNode } from './components/nodes/ArchitectureNode';
import { ShapeNode } from './components/nodes/ShapeNode';
import { TextNode } from './components/nodes/TextNode';
import { DrawNode } from './components/nodes/DrawNode';
import { FrameNode } from './components/nodes/FrameNode';
import { CommentNode } from './components/nodes/CommentNode';
import { ProtocolEdge } from './components/edges/ProtocolEdge';
import { LeftToolRail } from './components/toolbar/LeftToolRail';
import { EdgeConfigToolbar } from './components/toolbar/EdgeConfigToolbar';
import { ComponentSearchModal } from './components/palette/ComponentSearchModal';
import { MetricsInspector } from './components/sidebar/MetricsInspector';
import { MetricsDashboard } from './components/metrics/MetricsDashboard';
import { InterviewModeView } from './components/interview/InterviewModeView';
import { TopNavbar } from './components/navbar/TopNavbar';
import { AuthModal } from './components/auth/AuthModal';
import { AccessDeniedModal } from './components/auth/AccessDeniedModal';
import { NodeConfigDrawer } from './components/inspector/NodeConfigDrawer';
import { CritiqueModal } from './components/critique/CritiqueModal';
import { VersionHistoryModal } from './components/history/VersionHistoryModal';
import { ProjectsModal } from './components/projects/ProjectsModal';
import { authService, projectService, aiService, type UserProfile, type CritiqueResponse } from './services/api';
import { getAnalysisSocket } from './services/socket';
import { calculateArchitectureMetrics, type EvaluatedMetrics, type ArchitectureProblem } from './services/metricsEngine';
import type { ArchitectureNodeData, ProtocolType } from './types/architecture';
import { COMPONENT_CATALOG, type CatalogItem } from './data/componentLibrary';
import { inferProtocol, getProtocolConfig } from './data/protocolCatalog';
import { ChevronsLeft, Activity, Workflow, Plus } from 'lucide-react';

const nodeTypes = {
  architectureNode: ArchitectureNode,
  shapeNode: ShapeNode,
  textNode: TextNode,
  drawNode: DrawNode,
  frameNode: FrameNode,
  commentNode: CommentNode,
};

const edgeTypes = {
  protocolEdge: ProtocolEdge,
};

const initialNodes: Node[] = [
  {
    id: 'client-1',
    type: 'architectureNode',
    position: { x: 80, y: 220 },
    data: {
      label: 'Web Client',
      category: 'client',
      technology: 'Next.js / React',
      catalogId: 'gen-client-web',
      brandColor: '#10b981',
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'gateway-1',
    type: 'architectureNode',
    position: { x: 360, y: 220 },
    data: {
      label: 'API Gateway',
      category: 'gateway',
      technology: 'Kong / Envoy',
      catalogId: 'gen-api-gateway',
      brandColor: '#06b6d4',
      replicas: 2,
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'service-auth',
    type: 'architectureNode',
    position: { x: 660, y: 100 },
    data: {
      label: 'Auth Microservice',
      category: 'service',
      technology: 'Node.js / Express',
      catalogId: 'tech-nodejs',
      brandColor: '#5fa04e',
      replicas: 2,
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'service-orders',
    type: 'architectureNode',
    position: { x: 660, y: 340 },
    data: {
      label: 'Order Processing',
      category: 'service',
      technology: 'Go Microservice',
      catalogId: 'tech-go',
      brandColor: '#00add8',
      replicas: 2,
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'cache-1',
    type: 'architectureNode',
    position: { x: 960, y: 80 },
    data: {
      label: 'Redis Cache',
      category: 'cache',
      technology: 'In-Memory Cache',
      catalogId: 'db-redis',
      brandColor: '#dc382d',
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'db-1',
    type: 'architectureNode',
    position: { x: 960, y: 240 },
    data: {
      label: 'PostgreSQL DB',
      category: 'database',
      technology: 'Relational SQL',
      catalogId: 'db-postgresql',
      brandColor: '#4169e1',
      replicas: 1,
    } satisfies ArchitectureNodeData,
  },
  {
    id: 'queue-1',
    type: 'architectureNode',
    position: { x: 960, y: 400 },
    data: {
      label: 'Apache Kafka',
      category: 'queue',
      technology: 'Event Streaming',
      catalogId: 'queue-kafka',
      brandColor: '#e05353',
    } satisfies ArchitectureNodeData,
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'client-1',
    target: 'gateway-1',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    data: { protocol: 'HTTPS', isAsync: false },
  },
  {
    id: 'e2-3',
    source: 'gateway-1',
    target: 'service-auth',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    data: { protocol: 'gRPC', isAsync: false },
  },
  {
    id: 'e2-4',
    source: 'gateway-1',
    target: 'service-orders',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    data: { protocol: 'HTTPS', isAsync: false },
  },
  {
    id: 'e3-5',
    source: 'service-auth',
    target: 'cache-1',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    data: { protocol: 'TCP', isAsync: false },
  },
  {
    id: 'e4-6',
    source: 'service-orders',
    target: 'db-1',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    data: { protocol: 'SQL', isAsync: false },
  },
  {
    id: 'e4-7',
    source: 'service-orders',
    target: 'queue-1',
    type: 'protocolEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    data: { protocol: 'Pub/Sub', isAsync: true },
  },
];

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

function CanvasWorkspace() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [activeTab, setActiveTab] = useState<'canvas' | 'metrics' | 'interview'>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'metrics' || tabParam === 'interview') return tabParam;
    }
    return 'canvas';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isMetricsSidebarOpen, setIsMetricsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [activeTool, setActiveTool] = useState('select');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Scalable Distributed Architecture');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [accessError, setAccessError] = useState<{
    isOpen: boolean;
    statusCode: 401 | 403 | 404;
    title: string;
    message: string;
  } | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef(false);

  // AI Critique State
  const [isCritiqueOpen, setIsCritiqueOpen] = useState(false);
  const [critiqueData, setCritiqueData] = useState<CritiqueResponse | null>(null);
  const [isCritiqueLoading, setIsCritiqueLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isAsyncQueue, setIsAsyncQueue] = useState(false);

  // Freehand Drawing & Shape Creation State
  const [drawingStroke, setDrawingStroke] = useState<string | null>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  const isShapingRef = useRef(false);
  const shapeStartRef = useRef<{ clientX: number; clientY: number; flowX: number; flowY: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rect' | 'circle';
  } | null>(null);

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // Helper to sync URL parameters without page reload
  const updateUrlParam = useCallback((projectId: string | null, tab: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (projectId) {
      params.set('project', projectId);
    } else {
      params.delete('project');
    }
    if (tab && tab !== 'canvas') {
      params.set('tab', tab);
    } else {
      params.delete('tab');
    }
    const queryString = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', queryString);
  }, []);

  // Update URL tab parameter when activeTab changes
  useEffect(() => {
    updateUrlParam(currentProjectId, activeTab);
  }, [activeTab, currentProjectId, updateUrlParam]);

  // Load project by ID with full 401/403/404 authorization verification
  const loadProjectById = useCallback(async (targetProjectId: string) => {
    if (!authService.hasToken()) {
      setAccessError({
        isOpen: true,
        statusCode: 401,
        title: 'Authentication Required (401)',
        message: 'Direct access to protected project architectures requires an active authenticated session. Please sign in to view this diagram.',
      });
      setIsAuthOpen(true);
      return;
    }

    try {
      const diagramRes = await projectService.getDiagram(targetProjectId);
      if (diagramRes && diagramRes.diagram && diagramRes.diagram.nodes) {
        const loadedNodes = diagramRes.diagram.nodes;
        const loadedEdges = diagramRes.diagram.edges || [];
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setCurrentProjectId(targetProjectId);
        if (diagramRes.project?.name) {
          setCurrentProjectName(diagramRes.project.name);
        }
        setCurrentVersion(diagramRes.diagram.version || 1);
        setHistory([{ nodes: loadedNodes, edges: loadedEdges }]);
        setHistoryIndex(0);
        setIsDirty(false);
        updateUrlParam(targetProjectId, activeTab);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setAccessError({
          isOpen: true,
          statusCode: 403,
          title: 'Access Denied (403 Forbidden)',
          message: 'You do not have authorization to view or modify this architecture project. It belongs to another engineer.',
        });
        setCurrentProjectId(null);
        setCurrentProjectName('Scalable Distributed Architecture');
        updateUrlParam(null, activeTab);
      } else if (status === 404) {
        setAccessError({
          isOpen: true,
          statusCode: 404,
          title: 'Project Not Found (404)',
          message: 'The requested architecture project could not be found or has been deleted.',
        });
        setCurrentProjectId(null);
        setCurrentProjectName('Scalable Distributed Architecture');
        updateUrlParam(null, activeTab);
      } else if (status === 401) {
        setAccessError({
          isOpen: true,
          statusCode: 401,
          title: 'Unauthorized (401)',
          message: 'Your authentication token is invalid or expired. Please sign in again.',
        });
        setIsAuthOpen(true);
      }
    }
  }, [activeTab, updateUrlParam]);

  // Create new project in database with clean blank canvas
  const handleCreateNewProject = useCallback(async (name: string, description?: string) => {
    const newProj = await projectService.create(name, description);
    setCurrentProjectId(newProj.id);
    setCurrentProjectName(newProj.name);
    setNodes([]);
    setEdges([]);
    setCurrentVersion(1);
    setHistory([{ nodes: [], edges: [] }]);
    setHistoryIndex(0);
    setIsDirty(false);
    updateUrlParam(newProj.id, activeTab);
  }, [activeTab, updateUrlParam]);

  // Load authenticated user profile and handle initial direct URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedProject = params.get('project');

    if (authService.hasToken()) {
      authService
        .getProfile()
        .then((res) => {
          setCurrentUser(res.user);
          if (requestedProject) {
            loadProjectById(requestedProject);
          } else {
            projectService.list().then((projects) => {
              if (projects.length > 0) {
                // Returning user with existing projects: load latest saved architecture
                loadProjectById(projects[0].id);
              } else {
                // New user account with 0 projects: start with clean blank canvas
                setNodes([]);
                setEdges([]);
                setHistory([{ nodes: [], edges: [] }]);
                setHistoryIndex(0);
                setCurrentProjectId(null);
                setCurrentProjectName('Untitled Architecture');
                setCurrentVersion(1);
                setIsDirty(false);
                updateUrlParam(null, activeTab);
              }
            });
          }
        })
        .catch(() => {
          authService.logout();
          setCurrentUser(null);
          if (requestedProject) {
            setAccessError({
              isOpen: true,
              statusCode: 401,
              title: 'Session Expired (401)',
              message: 'Your session has expired. Please sign in to access this protected architecture project.',
            });
            setIsAuthOpen(true);
          }
        });
    } else if (requestedProject) {
      // Unauthenticated user attempting direct access to protected project URL
      setAccessError({
        isOpen: true,
        statusCode: 401,
        title: 'Authentication Required (401)',
        message: 'Direct access to protected project architectures requires an active authenticated session. Please sign in or register to view this diagram.',
      });
      setIsAuthOpen(true);
    }
  }, [loadProjectById]);

  // Global listeners for auth session events and browser back/forward navigation
  useEffect(() => {
    const handleUnauthorized = (e: any) => {
      setCurrentUser(null);
      setCurrentProjectId(null);
      setAccessError({
        isOpen: true,
        statusCode: 401,
        title: 'Unauthorized (401)',
        message: e?.detail?.message || 'Your session has expired or is invalid. Please sign in again.',
      });
      setIsAuthOpen(true);
    };

    const handleForbidden = (e: any) => {
      setAccessError({
        isOpen: true,
        statusCode: 403,
        title: 'Forbidden (403)',
        message: e?.detail?.message || 'Access denied: You do not have permission to access this resource.',
      });
    };

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const proj = params.get('project');
      const tab = params.get('tab');
      if (tab === 'canvas' || tab === 'metrics' || tab === 'interview') {
        setActiveTab(tab);
      }
      if (proj && proj !== currentProjectId) {
        loadProjectById(proj);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:forbidden', handleForbidden);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:forbidden', handleForbidden);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentProjectId, loadProjectById]);

  // Helper to push new history snapshot
  const pushHistorySnapshot = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { nodes: newNodes, edges: newEdges }].slice(-30); // keep up to 30 snapshots
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
    setIsDirty(true);
  }, [historyIndex]);

  // Undo implementation
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex - 1;
      const snapshot = history[targetIndex];
      setHistoryIndex(targetIndex);
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Redo implementation
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex + 1;
      const snapshot = history[targetIndex];
      setHistoryIndex(targetIndex);
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Delete Node (Optimistic Update)
  const handleDeleteNode = useCallback((id: string) => {
    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((n) => n.id !== id);
      setEdges((prevEdges) => {
        const nextEdges = prevEdges.filter((e) => e.source !== id && e.target !== id);
        pushHistorySnapshot(nextNodes, nextEdges);
        return nextEdges;
      });
      return nextNodes;
    });
    setSelectedNodeId(null);
  }, [pushHistorySnapshot]);

  // Delete Edge (Optimistic Update)
  const handleDeleteEdge = useCallback((id: string) => {
    setEdges((prevEdges) => {
      const nextEdges = prevEdges.filter((e) => e.id !== id);
      pushHistorySnapshot(nodes, nextEdges);
      return nextEdges;
    });
    setSelectedEdgeId(null);
  }, [nodes, pushHistorySnapshot]);

  // Update Edge Protocol & Properties
  const handleUpdateEdge = useCallback(
    (edgeId: string, protocol: ProtocolType, isAsync?: boolean) => {
      setEdges((prevEdges) => {
        const nextEdges = prevEdges.map((e) => {
          if (e.id === edgeId) {
            const protoCfg = getProtocolConfig(protocol);
            const actualAsync =
              isAsync !== undefined ? isAsync : protoCfg.defaultAsync;
            const markerColor = protoCfg.color;

            return {
              ...e,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: markerColor,
              },
              data: {
                ...e.data,
                protocol,
                isAsync: actualAsync,
              },
            };
          }
          return e;
        });
        pushHistorySnapshot(nodes, nextEdges);
        setIsDirty(true);
        return nextEdges;
      });
    },
    [nodes, pushHistorySnapshot]
  );

  // Keyboard shortcuts listener for Undo/Redo, Tool switching and Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when editing text in inputs/textareas
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete selected node or edge with Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          handleDeleteEdge(selectedEdgeId);
        }
        return;
      }

      // Single-key tool selectors
      if (!isCmdOrCtrl && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
          case 'escape':
            setActiveTool('select');
            break;
          case 'h':
            setActiveTool('pan');
            break;
          case 'r':
            setActiveTool('rect');
            break;
          case 'o':
            setActiveTool('circle');
            break;
          case 'd':
          case 'p':
            setActiveTool('pen');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'f':
            setActiveTool('frame');
            break;
          case 'c':
            setActiveTool('comment');
            break;
          case 'a':
            setActiveTool('arrow');
            break;
          case 'l':
            setActiveTool('line');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, selectedEdgeId, handleDeleteNode, handleDeleteEdge]);

  // Currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Currently selected edge object
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find((e) => e.id === selectedEdgeId) || null;
  }, [edges, selectedEdgeId]);

  const selectedEdgeLabels = useMemo(() => {
    if (!selectedEdge) return { source: '', target: '' };
    const src = nodes.find((n) => n.id === selectedEdge.source);
    const tgt = nodes.find((n) => n.id === selectedEdge.target);
    return {
      source: (src?.data as any)?.label || selectedEdge.source,
      target: (tgt?.data as any)?.label || selectedEdge.target,
    };
  }, [nodes, selectedEdge]);

  // Edges annotated with current selection state and live updater callback
  const displayEdges = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      selected: e.id === selectedEdgeId,
      data: {
        ...e.data,
        onUpdateProtocol: (protocol: ProtocolType, isAsync?: boolean) =>
          handleUpdateEdge(e.id, protocol, isAsync),
      },
    }));
  }, [edges, selectedEdgeId, handleUpdateEdge]);

  // Deterministic Metrics Calculation directly synced with graph state
  const metrics = useMemo<EvaluatedMetrics>(() => {
    return calculateArchitectureMetrics(nodes, edges);
  }, [nodes, edges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const nextNodes = applyNodeChanges(changes, nds);
        // Only mark dirty if node moved or properties changed
        const hasPositionChange = changes.some((c) => c.type === 'position' && (c as any).dragging === false);
        if (hasPositionChange) {
          setIsDirty(true);
        }
        return nextNodes;
      });
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const nextEdges = applyEdgeChanges(changes, eds);
        setIsDirty(true);
        return nextEdges;
      });
    },
    []
  );

  const onConnect: OnConnect = useCallback((connection) => {
    // 1. Identify source and target nodes
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    const sourceCat = (sourceNode?.data as any)?.category;
    const targetCat = (targetNode?.data as any)?.category;
    const targetCatId = (targetNode?.data as any)?.catalogId;
    const targetLabel = (targetNode?.data as any)?.label;

    // 2. Intelligently deduce appropriate protocol based on architectural pattern
    const inferred = inferProtocol(sourceCat, targetCat, targetCatId, targetLabel);

    const newEdge: Edge = {
      ...connection,
      id: `e-${Date.now()}`,
      type: 'protocolEdge',
      markerEnd: { type: MarkerType.ArrowClosed, color: inferred.color },
      data: { protocol: inferred.protocol, isAsync: inferred.isAsync },
    };
    setEdges((eds) => {
      const nextEdges = addEdge(newEdge, eds);
      pushHistorySnapshot(nodes, nextEdges);
      return nextEdges;
    });
  }, [nodes, pushHistorySnapshot]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (activeTool === 'select') {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    }
  }, [activeTool]);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (activeTool === 'select') {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    }
  }, [activeTool]);

  // Pointer Down handler on canvas for drawing and shape creation
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    if (activeTool === 'pen') {
      isDrawingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      currentPointsRef.current = [{ x: e.clientX, y: e.clientY }];
      setDrawingStroke(`M ${relX} ${relY}`);
      return;
    }

    if (activeTool === 'rect' || activeTool === 'circle') {
      isShapingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      shapeStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      };
      return;
    }
  }, [activeTool, screenToFlowPosition]);

  // Pointer Move handler on canvas for drawing and shape creation
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDrawingRef.current && activeTool === 'pen') {
      currentPointsRef.current.push({ x: e.clientX, y: e.clientY });
      const rect = e.currentTarget.getBoundingClientRect();
      const pts = currentPointsRef.current;
      const pathStr = pts.reduce((acc, pt, i) => {
        const relX = pt.x - rect.left;
        const relY = pt.y - rect.top;
        return i === 0 ? `M ${relX} ${relY}` : `${acc} L ${relX} ${relY}`;
      }, '');
      setDrawingStroke(pathStr);
      return;
    }

    if (isShapingRef.current && (activeTool === 'rect' || activeTool === 'circle') && shapeStartRef.current) {
      const start = shapeStartRef.current;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const currentRelX = e.clientX - rect.left;
      const currentRelY = e.clientY - rect.top;
      const startRelX = start.clientX - rect.left;
      const startRelY = start.clientY - rect.top;

      const w = Math.abs(currentRelX - startRelX);
      const h = Math.abs(currentRelY - startRelY);

      if (w > 6 || h > 6) {
        setShapePreview({
          x: Math.min(startRelX, currentRelX),
          y: Math.min(startRelY, currentRelY),
          width: w,
          height: h,
          type: activeTool,
        });
      }
      return;
    }
  }, [activeTool]);

  // Pointer Up handler on canvas for drawing and shape creation
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDrawingRef.current && activeTool === 'pen') {
      isDrawingRef.current = false;
      const screenPts = currentPointsRef.current;

      if (screenPts.length > 2) {
        const flowPts = screenPts.map((p) => screenToFlowPosition({ x: p.x, y: p.y }));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        flowPts.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });

        const padding = 10;
        const originX = minX - padding;
        const originY = minY - padding;
        const width = Math.max(maxX - minX + padding * 2, 40);
        const height = Math.max(maxY - minY + padding * 2, 30);

        const localPath = flowPts.reduce((acc, pt, i) => {
          const relX = pt.x - originX;
          const relY = pt.y - originY;
          return i === 0 ? `M ${relX} ${relY}` : `${acc} L ${relX} ${relY}`;
        }, '');

        const newDrawNode: Node = {
          id: `draw-${Date.now()}`,
          type: 'drawNode',
          position: { x: originX, y: originY },
          data: {
            path: localPath,
            width,
            height,
            strokeColor: '#a855f7',
            strokeWidth: 3,
            isAnnotation: true,
          },
          style: { width, height },
        };

        setNodes((nds) => {
          const next = [...nds, newDrawNode];
          pushHistorySnapshot(next, edges);
          return next;
        });
        setIsDirty(true);
        setSelectedNodeId(newDrawNode.id);
      }

      currentPointsRef.current = [];
      setDrawingStroke(null);
      return;
    }

    if (isShapingRef.current && (activeTool === 'rect' || activeTool === 'circle') && shapeStartRef.current) {
      isShapingRef.current = false;
      const start = shapeStartRef.current;
      const flowEnd = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dragDistance = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);

      let x: number, y: number, width: number, height: number;

      if (dragDistance > 15) {
        x = Math.min(start.flowX, flowEnd.x);
        y = Math.min(start.flowY, flowEnd.y);
        width = Math.max(50, Math.abs(flowEnd.x - start.flowX));
        height = Math.max(40, Math.abs(flowEnd.y - start.flowY));
      } else {
        width = activeTool === 'circle' ? 120 : 180;
        height = activeTool === 'circle' ? 120 : 100;
        x = start.flowX - width / 2;
        y = start.flowY - height / 2;
      }

      const newShapeNode: Node = {
        id: `${activeTool}-${Date.now()}`,
        type: 'shapeNode',
        position: { x, y },
        data: {
          shapeType: activeTool,
          label: activeTool === 'circle' ? 'Service Cluster' : 'Architecture Block',
          color: activeTool === 'circle' ? '#06b6d4' : '#6366f1',
          borderStyle: 'solid',
          isAnnotation: true,
        },
        style: { width, height },
      };

      setNodes((nds) => {
        const next = [...nds, newShapeNode];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setIsDirty(true);
      setSelectedNodeId(newShapeNode.id);
      setActiveTool('select');
      setShapePreview(null);
      shapeStartRef.current = null;
      return;
    }
  }, [activeTool, screenToFlowPosition, edges, pushHistorySnapshot]);

  // Click on Canvas Pane to place Text, Frame, Comment, Connectors
  const handlePaneClick = useCallback((e: React.MouseEvent) => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    // Only trigger placement on primary click
    if (e.button !== 0) return;

    if (activeTool === 'text') {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newTextNode: Node = {
        id: `text-${Date.now()}`,
        type: 'textNode',
        position: { x: flowPos.x - 60, y: flowPos.y - 20 },
        data: {
          text: 'Architecture Title',
          fontSize: 16,
          isBold: false,
          color: '#f8fafc',
          isAnnotation: true,
        },
        style: { width: 180, height: 45 },
      };

      setNodes((nds) => {
        const next = [...nds, newTextNode];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setIsDirty(true);
      setSelectedNodeId(newTextNode.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'frame') {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newFrameNode: Node = {
        id: `frame-${Date.now()}`,
        type: 'frameNode',
        position: { x: flowPos.x - 180, y: flowPos.y - 120 },
        data: {
          label: 'VPC Boundary / Region',
          color: '#3b82f6',
          borderStyle: 'dashed',
          isAnnotation: true,
        },
        style: { width: 360, height: 240, zIndex: -1 },
      };

      setNodes((nds) => {
        const next = [newFrameNode, ...nds];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setIsDirty(true);
      setSelectedNodeId(newFrameNode.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'comment') {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newCommentNode: Node = {
        id: `comment-${Date.now()}`,
        type: 'commentNode',
        position: { x: flowPos.x - 110, y: flowPos.y - 70 },
        data: {
          author: currentUser?.name || 'Architect',
          text: 'Design Note: Review latency budget and failover strategy.',
          color: '#f59e0b',
          isAnnotation: true,
        },
        style: { width: 220, height: 140 },
      };

      setNodes((nds) => {
        const next = [...nds, newCommentNode];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setIsDirty(true);
      setSelectedNodeId(newCommentNode.id);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'arrow' || activeTool === 'line') {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newConnectorNode: Node = {
        id: `connector-${Date.now()}`,
        type: 'shapeNode',
        position: { x: flowPos.x - 70, y: flowPos.y - 35 },
        data: {
          shapeType: activeTool === 'arrow' ? 'arrow' : 'line',
          label: activeTool === 'arrow' ? '→ Flow' : '— Connection',
          color: '#8b5cf6',
          borderStyle: 'solid',
          isAnnotation: true,
        },
        style: { width: 140, height: 70 },
      };

      setNodes((nds) => {
        const next = [...nds, newConnectorNode];
        pushHistorySnapshot(next, edges);
        return next;
      });
      setIsDirty(true);
      setSelectedNodeId(newConnectorNode.id);
      setActiveTool('select');
      return;
    }
  }, [activeTool, screenToFlowPosition, currentUser, edges, pushHistorySnapshot]);

  // Node Configuration (Optimistic Update)
  const handleUpdateNode = useCallback((id: string, updatedData: Partial<ArchitectureNodeData>) => {
    setNodes((nds) => {
      const nextNodes = nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              ...updatedData,
            },
          };
        }
        return n;
      });
      pushHistorySnapshot(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, pushHistorySnapshot]);


  // Duplicate Node (Optimistic Update)
  const handleDuplicateNode = useCallback((sourceNode: Node) => {
    const newId = `${sourceNode.id}-copy-${Date.now()}`;
    const newNode: Node = {
      ...sourceNode,
      id: newId,
      position: {
        x: sourceNode.position.x + 40,
        y: sourceNode.position.y + 40,
      },
      data: {
        ...sourceNode.data,
        label: `${(sourceNode.data as unknown as ArchitectureNodeData)?.label} (Copy)`,
      },
      selected: true,
    };

    const nextNodes = [...nodes.map((n) => ({ ...n, selected: false })), newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    pushHistorySnapshot(nextNodes, edges);
  }, [nodes, edges, pushHistorySnapshot]);

  // Focus and center canvas on a specific node
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      if (activeTab !== 'canvas') {
        setActiveTab('canvas');
      }
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (targetNode) {
        setCenter(targetNode.position.x + 100, targetNode.position.y + 60, {
          zoom: 1.15,
          duration: 600,
        });
      }
    },
    [nodes, activeTab, setCenter]
  );

  // 1-Click Quick-Fix handler for architectural problems
  const handleQuickFix = useCallback(
    (problem: ArchitectureProblem) => {
      if (!problem.quickFix) return;
      const { actionType, targetNodeId, targetNodeIds, targetReplicas, catalogId } = problem.quickFix;

      if (actionType === 'scale_replica') {
        const replicasToSet = targetReplicas && targetReplicas > 0 ? targetReplicas : 2;

        setNodes((prevNodes) => {
          const targetIds = new Set<string>();
          if (targetNodeId) targetIds.add(targetNodeId);
          if (targetNodeIds && Array.isArray(targetNodeIds)) {
            targetNodeIds.forEach((id) => targetIds.add(id));
          }

          // If no specific IDs provided, deduce from problem / title context
          if (targetIds.size === 0) {
            const titleLower = (problem.title || '').toLowerCase();
            const problemLower = (problem.problem || '').toLowerCase();

            if (titleLower.includes('database') || problemLower.includes('database') || titleLower.includes('stateful')) {
              prevNodes.forEach((n) => {
                const cat = (n.data as any)?.category;
                const reps = (n.data as any)?.replicas ?? 1;
                if (cat === 'database' && reps <= 1) {
                  targetIds.add(n.id);
                }
              });
            } else if (titleLower.includes('gateway') || problemLower.includes('gateway') || titleLower.includes('ingress')) {
              prevNodes.forEach((n) => {
                const cat = (n.data as any)?.category;
                const reps = (n.data as any)?.replicas ?? 1;
                if (cat === 'gateway' && reps <= 1) {
                  targetIds.add(n.id);
                }
              });
            } else if (titleLower.includes('service') || problemLower.includes('service')) {
              prevNodes.forEach((n) => {
                const cat = (n.data as any)?.category;
                const reps = (n.data as any)?.replicas ?? 1;
                if (cat === 'service' && reps <= 1) {
                  targetIds.add(n.id);
                }
              });
            }
          }

          // Fallback: If still empty, find any unreplicated database or service node
          if (targetIds.size === 0) {
            prevNodes.forEach((n) => {
              const cat = (n.data as any)?.category;
              const reps = (n.data as any)?.replicas ?? 1;
              if ((cat === 'database' || cat === 'service' || cat === 'gateway') && reps <= 1) {
                targetIds.add(n.id);
              }
            });
          }

          const nextNodes = prevNodes.map((n) => {
            if (targetIds.has(n.id)) {
              const currentData = (n.data || {}) as Record<string, unknown>;
              return {
                ...n,
                data: {
                  ...currentData,
                  replicas: replicasToSet,
                },
              };
            }
            return n;
          });

          pushHistorySnapshot(nextNodes, edges);
          if (targetIds.size > 0) {
            setSelectedNodeId(Array.from(targetIds)[0]);
          }
          return nextNodes;
        });
        setIsDirty(true);
      } else if (actionType === 'focus_node' && targetNodeId) {
        handleFocusNode(targetNodeId);
      } else if (actionType === 'add_component') {
        const targetCatalogId = catalogId || 'db-redis';
        const catalogItem = COMPONENT_CATALOG.find((c) => c.id === targetCatalogId);
        if (catalogItem) {
          const centerPos = screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });

          const newNode: Node = {
            id: `${catalogItem.id}-${Date.now()}`,
            type: 'architectureNode',
            position: {
              x: Math.round(centerPos.x + (Math.random() * 40 - 20)),
              y: Math.round(centerPos.y + (Math.random() * 40 - 20)),
            },
            data: {
              label: catalogItem.name,
              category: catalogItem.category,
              technology: catalogItem.technology || catalogItem.name,
              description: catalogItem.description,
              replicas: catalogItem.defaultReplicas || (catalogItem.category === 'database' ? 1 : 2),
              catalogId: catalogItem.id,
              brandColor: catalogItem.brandColor,
            },
          };

          setNodes((prevNodes) => {
            const nextNodes = [...prevNodes, newNode];
            pushHistorySnapshot(nextNodes, edges);
            return nextNodes;
          });
          setSelectedNodeId(newNode.id);
          setIsDirty(true);
          if (activeTab !== 'canvas') {
            setActiveTab('canvas');
          }
        }
      }
    },
    [edges, pushHistorySnapshot, screenToFlowPosition, activeTab, handleFocusNode]
  );

  // Component Palette Drop
  const handleSelectComponent = useCallback(
    (item: CatalogItem) => {
      const id = `${item.id}-${Date.now()}`;
      const centerPos = screenToFlowPosition({
        x: window.innerWidth / 2 + (Math.random() * 80 - 40),
        y: window.innerHeight / 2 + (Math.random() * 80 - 40),
      });

      const newNode: Node = {
        id,
        type: 'architectureNode',
        position: centerPos,
        data: {
          label: item.name,
          category: item.category,
          technology: item.technology,
          catalogId: item.id,
          brandColor: item.brandColor,
          replicas: item.defaultReplicas || (item.category === 'database' ? 1 : 2),
        } satisfies ArchitectureNodeData,
      };

      const nextNodes = nodes.concat(newNode);
      setNodes(nextNodes);
      setSelectedNodeId(id);
      pushHistorySnapshot(nextNodes, edges);
    },
    [nodes, edges, screenToFlowPosition, pushHistorySnapshot]
  );

  // Canvas Drag Over Handler
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Canvas Drop Handler (drops at exact mouse position)
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow/catalog-item');
      if (!rawData) return;

      try {
        const item: CatalogItem = JSON.parse(rawData);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const id = `${item.id}-${Date.now()}`;
        const newNode: Node = {
          id,
          type: 'architectureNode',
          position,
          data: {
            label: item.name,
            category: item.category,
            technology: item.technology,
            catalogId: item.id,
            brandColor: item.brandColor,
            replicas: item.defaultReplicas || (item.category === 'database' ? 1 : 2),
          } satisfies ArchitectureNodeData,
        };

        const nextNodes = nodes.concat(newNode);
        setNodes(nextNodes);
        setSelectedNodeId(id);
        pushHistorySnapshot(nextNodes, edges);
      } catch (err) {
        console.error('Failed to parse dropped catalog item:', err);
      }
    },
    [nodes, edges, screenToFlowPosition, pushHistorySnapshot]
  );

  // Cloud Persistence (Manual Save)
  const handleSave = useCallback(async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      let projectId = currentProjectId;
      if (!projectId) {
        const newProj = await projectService.create(
          currentProjectName || 'Scalable Distributed Architecture',
          'Primary architecture workspace'
        );
        projectId = newProj.id;
        setCurrentProjectId(projectId);
        setCurrentProjectName(newProj.name);
        updateUrlParam(projectId, activeTab);
      }

      const saveRes = await projectService.saveDiagram(projectId, nodes, edges, metrics);
      setCurrentVersion(saveRes.version || currentVersion + 1);
      setIsDirty(false);
    } catch (err: any) {
      alert(`Failed to save diagram: ${err?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, currentProjectId, currentProjectName, nodes, edges, metrics, currentVersion, activeTab, updateUrlParam]);

  // Background Autosave (3.5-second debounce)
  useEffect(() => {
    if (!isDirty || !currentUser || isSaving) return;

    const timer = setTimeout(async () => {
      let projectId = currentProjectId;
      if (!projectId) {
        try {
          const newProj = await projectService.create(
            currentProjectName || 'Scalable Distributed Architecture',
            'Autosaved workspace'
          );
          projectId = newProj.id;
          setCurrentProjectId(projectId);
          setCurrentProjectName(newProj.name);
          updateUrlParam(projectId, activeTab);
        } catch {
          return;
        }
      }

      setIsSaving(true);
      try {
        const saveRes = await projectService.saveDiagram(projectId, nodes, edges, metrics);
        setCurrentVersion(saveRes.version || currentVersion + 1);
        setIsDirty(false);
      } catch (err) {
        console.warn('Autosave background sync failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isDirty, currentUser, currentProjectId, nodes, edges, metrics, isSaving, currentVersion, activeTab, updateUrlParam]);

  // Restore Historical Version
  const handleRestoreVersion = useCallback((restoredNodes: any[], restoredEdges: any[], version: number) => {
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setCurrentVersion(version);
    setIsDirty(true);
    pushHistorySnapshot(restoredNodes, restoredEdges);
  }, [pushHistorySnapshot]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setCurrentProjectId(null);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setHistory([{ nodes: initialNodes, edges: initialEdges }]);
    setHistoryIndex(0);
    setIsDirty(false);
    updateUrlParam(null, activeTab);
  }, [activeTab, updateUrlParam]);

  // Run AI / Deterministic Critique via Backend API (supports both sync and Redpanda async queue)
  const handleRunCritique = useCallback(async (useAsync = false) => {
    setIsAnalyzing(true);
    setIsCritiqueLoading(true);
    setIsCritiqueOpen(true);
    setIsAsyncQueue(useAsync);
    setActiveJobId(null);

    try {
      const socket = getAnalysisSocket();

      if (useAsync) {
        const job = await aiService.enqueueCritiqueAsync(
          nodes,
          edges,
          'High-concurrency microservices architecture',
          currentProjectId || undefined,
          socket?.id
        );
        setActiveJobId(job.jobId);

        // Safety poll fallback in case WebSocket event is missed
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await aiService.getJobStatus(job.jobId);
            if (statusRes.status === 'COMPLETED' && statusRes.data) {
              clearInterval(pollInterval);
              setCritiqueData(statusRes.data);
              setIsCritiqueLoading(false);
              setIsAnalyzing(false);
            } else if (statusRes.status === 'FAILED') {
              clearInterval(pollInterval);
              setIsCritiqueLoading(false);
              setIsAnalyzing(false);
            }
          } catch {
            clearInterval(pollInterval);
          }
        }, 1500);
      } else {
        const result = await aiService.generateCritique(
          nodes,
          edges,
          'High-concurrency microservices architecture',
          currentProjectId || undefined,
          socket?.id
        );
        setCritiqueData(result);
        setIsCritiqueLoading(false);
        setIsAnalyzing(false);
      }
    } catch {
      // Offline fallback
      setCritiqueData({
        source: 'deterministic-fallback',
        metrics: {
          ...metrics,
          warnings: ['Backend connection offline. Evaluated locally.'],
        },
        analysis: {
          executiveSummary: 'AI analysis unavailable. Showing deterministic analysis based on graph traversal rules.',
          strengths: [`${metrics.services} services configured with ${metrics.fanOut}x average fan-out`],
          spofRisks: metrics.spof.length > 0 ? metrics.spof : ['No single points of failure detected.'],
          scalabilityBottlenecks: ['Ensure in-memory caching exists for read-heavy entities.'],
          recommendations: ['Configure standby replicas for primary databases.'],
        },
        rawCritiqueText: '',
      });
      setIsCritiqueLoading(false);
      setIsAnalyzing(false);
    }
  }, [nodes, edges, metrics, currentProjectId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080b12] text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <TopNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectName={currentProjectName}
        isSaving={isSaving}
        onSave={handleSave}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isDirty={isDirty}
        currentVersion={currentVersion}
        isMetricsOpen={isMetricsSidebarOpen}
        onToggleMetrics={() => setIsMetricsSidebarOpen((prev) => !prev)}
        redundancyScore={metrics.redundancyScore}
      />

      {/* Main Workspace Area */}
      {activeTab === 'canvas' ? (
        <div className="flex flex-1 relative overflow-hidden">
        {/* Left Tool Rail */}
        <LeftToolRail
          isPaletteOpen={isPaletteOpen}
          onTogglePalette={() => setIsPaletteOpen((prev) => !prev)}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onRunAiAssistant={handleRunCritique}
        />

        {/* Floating Component & Icon Catalog */}
        <ComponentSearchModal
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onSelectComponent={handleSelectComponent}
        />

        {/* Center Diagramming Canvas */}
        <main
          className={`flex-1 h-full w-full relative bg-[#090d16] ${
            activeTool === 'pan'
              ? 'cursor-grab active:cursor-grabbing'
              : activeTool === 'pen' || activeTool === 'rect' || activeTool === 'circle'
              ? 'cursor-crosshair'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-default'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Floating Selected Edge Inspector Toolbar */}
          {selectedEdge && (
            <EdgeConfigToolbar
              edgeId={selectedEdge.id}
              sourceLabel={selectedEdgeLabels.source}
              targetLabel={selectedEdgeLabels.target}
              currentProtocol={((selectedEdge.data as any)?.protocol as ProtocolType) || 'HTTPS'}
              isAsync={Boolean((selectedEdge.data as any)?.isAsync)}
              onUpdateProtocol={handleUpdateEdge}
              onDeleteEdge={handleDeleteEdge}
              onClose={() => setSelectedEdgeId(null)}
            />
          )}

          {/* Active Tool Notification Badge */}
          {activeTool !== 'select' && (
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 text-indigo-200 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 sm:gap-2.5 backdrop-blur-md animate-in fade-in duration-150 select-none pointer-events-auto max-w-[calc(100vw-2rem)] truncate">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              <span className="truncate">
                {activeTool === 'pan' && (
                  <>
                    <span className="inline sm:hidden">Pan Tool Active</span>
                    <span className="hidden sm:inline">Hand / Pan Tool Active: Click and drag anywhere to move canvas</span>
                  </>
                )}
                {activeTool === 'pen' && (
                  <>
                    <span className="inline sm:hidden">Pencil Active</span>
                    <span className="hidden sm:inline">Pencil Active: Click and drag to draw freehand lines</span>
                  </>
                )}
                {activeTool === 'rect' && (
                  <>
                    <span className="inline sm:hidden">Rectangle Active</span>
                    <span className="hidden sm:inline">Rectangle Tool Active: Click or drag to create rectangle</span>
                  </>
                )}
                {activeTool === 'circle' && (
                  <>
                    <span className="inline sm:hidden">Oval Active</span>
                    <span className="hidden sm:inline">Oval Tool Active: Click or drag to create oval/circle</span>
                  </>
                )}
                {activeTool === 'text' && (
                  <>
                    <span className="inline sm:hidden">Text Active</span>
                    <span className="hidden sm:inline">Text Tool Active: Click canvas to place text</span>
                  </>
                )}
                {activeTool === 'frame' && (
                  <>
                    <span className="inline sm:hidden">Region Active</span>
                    <span className="hidden sm:inline">Boundary Frame Tool Active: Click to place region</span>
                  </>
                )}
                {activeTool === 'comment' && (
                  <>
                    <span className="inline sm:hidden">Note Active</span>
                    <span className="hidden sm:inline">Comment Note Active: Click to place note</span>
                  </>
                )}
                {(activeTool === 'arrow' || activeTool === 'line') && (
                  <>
                    <span className="inline sm:hidden">Connector Active</span>
                    <span className="hidden sm:inline">Connector Active: Click to place connector</span>
                  </>
                )}
              </span>
              <button
                onClick={() => setActiveTool('select')}
                className="ml-1 sm:ml-2 px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-mono cursor-pointer transition-colors shrink-0"
              >
                Done (Esc)
              </button>
            </div>
          )}

          {/* Live In-Progress Freehand Drawing Stroke Overlay */}
          {drawingStroke && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
              <path
                d={drawingStroke}
                fill="none"
                stroke="#a855f7"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {/* Live In-Progress Shape Drag Preview Overlay */}
          {shapePreview && (
            <div
              className={`absolute pointer-events-none z-50 border-2 border-dashed border-indigo-400 bg-indigo-500/15 ${
                shapePreview.type === 'circle' ? 'rounded-full' : 'rounded-2xl'
              }`}
              style={{
                left: shapePreview.x,
                top: shapePreview.y,
                width: shapePreview.width,
                height: shapePreview.height,
              }}
            />
          )}

          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            panOnDrag={activeTool === 'pan' ? [0, 1, 2] : [1, 2]}
            nodesDraggable={activeTool === 'select'}
            elementsSelectable={activeTool === 'select'}
            nodesConnectable={activeTool === 'select' || activeTool === 'arrow' || activeTool === 'line'}
            selectionOnDrag={false}
            panOnScroll={true}
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              type: 'protocolEdge',
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1.2}
              color="#1e293b"
            />
            <Controls className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !shadow-xl !bottom-20 md:!bottom-4 !left-3" />
            <MiniMap
              className="hidden md:block !bg-slate-950/90 !border !border-slate-800 !rounded-xl"
              nodeColor={(n) => {
                if (n.type !== 'architectureNode') return '#475569';
                const cat = (n.data as unknown as ArchitectureNodeData)?.category;
                switch (cat) {
                  case 'client': return '#10b981';
                  case 'gateway': return '#06b6d4';
                  case 'service': return '#8b5cf6';
                  case 'database': return '#3b82f6';
                  case 'cache': return '#d946ef';
                  case 'queue': return '#f59e0b';
                  default: return '#64748b';
                }
              }}
              maskColor="rgba(8, 11, 18, 0.75)"
            />
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <div className="text-center p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md max-w-sm pointer-events-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mx-auto mb-3 flex items-center justify-center">
                    <Workflow size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">Clean Architecture Canvas</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Your workspace is clean and ready. Click below or open the palette to begin assembling clients, gateways, microservices, and databases.
                  </p>
                  <button
                    onClick={() => setIsPaletteOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Plus size={14} />
                    <span>Add Components</span>
                  </button>
                </div>
              </div>
            )}
          </ReactFlow>
        </main>

        {/* Floating Expand Metrics Button (<<) on right edge when collapsed */}
        {!isMetricsSidebarOpen && (
          <button
            onClick={() => setIsMetricsSidebarOpen(true)}
            className="absolute top-4 right-0 z-30 flex items-center gap-2 px-3 py-2 bg-slate-900/95 hover:bg-slate-800 border-y border-l border-slate-700/80 rounded-l-xl text-slate-200 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all cursor-pointer group animate-in slide-in-from-right duration-150"
            title="Open Metrics Panel (<<)"
            aria-label="Open Metrics Panel"
          >
            <ChevronsLeft size={16} className="text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <Activity size={14} className="text-emerald-400" />
            <span className="font-mono text-emerald-300 font-bold">{metrics.redundancyScore}</span>
            <span className="hidden sm:inline text-slate-200">Metrics</span>
          </button>
        )}

        {/* Right Metrics Inspector Panel */}
        <MetricsInspector
          metrics={metrics}
          onRunCritique={handleRunCritique}
          isAnalyzing={isAnalyzing}
          isOpen={isMetricsSidebarOpen}
          onClose={() => setIsMetricsSidebarOpen(false)}
          onQuickFix={handleQuickFix}
          onFocusNode={handleFocusNode}
        />

        {/* Slide-out Node Inspector Drawer */}
        {selectedNode && selectedNode.type === 'architectureNode' && (
          <NodeConfigDrawer
            selectedNode={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
          />
        )}
      </div>
      ) : activeTab === 'metrics' ? (
        <MetricsDashboard
          metrics={metrics}
          nodes={nodes}
          edges={edges}
          onBackToCanvas={() => setActiveTab('canvas')}
          onRunAiAssistant={handleRunCritique}
          onQuickFix={handleQuickFix}
          onFocusNode={handleFocusNode}
        />
      ) : (
        <InterviewModeView
          metrics={metrics}
          nodes={nodes}
          edges={edges}
          onBackToCanvas={() => setActiveTab('canvas')}
          onRunCritique={handleRunCritique}
        />
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        projectId={currentProjectId}
        currentVersion={currentVersion}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          const params = new URLSearchParams(window.location.search);
          const requestedProj = params.get('project');
          if (requestedProj) {
            loadProjectById(requestedProj);
          } else {
            projectService.list().then((projects) => {
              if (projects.length > 0) {
                // Returning user with existing architectures: load latest
                loadProjectById(projects[0].id);
              } else {
                // Brand new user account: start with clean blank canvas
                setNodes([]);
                setEdges([]);
                setHistory([{ nodes: [], edges: [] }]);
                setHistoryIndex(0);
                setCurrentProjectId(null);
                setCurrentProjectName('Untitled Architecture');
                setCurrentVersion(1);
                setIsDirty(false);
                updateUrlParam(null, activeTab);
              }
            }).catch(console.error);
          }
        }}
      />

      {/* Projects Switcher Modal */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => loadProjectById(id)}
        onCreateNewProject={handleCreateNewProject}
      />

      {/* Access Denied / 401 / 403 / 404 Modal */}
      <AccessDeniedModal
        isOpen={Boolean(accessError?.isOpen)}
        statusCode={accessError?.statusCode || 401}
        title={accessError?.title || 'Access Denied'}
        message={accessError?.message || 'Access to this resource requires appropriate authorization.'}
        onClose={() => setAccessError(null)}
        onAction={() => {
          setAccessError(null);
          if (accessError?.statusCode === 401) {
            setIsAuthOpen(true);
          } else {
            // Load user's own projects
            if (currentUser) {
              projectService.list().then((projects) => {
                if (projects.length > 0) {
                  loadProjectById(projects[0].id);
                }
              });
            }
          }
        }}
        actionText={accessError?.statusCode === 401 ? 'Sign In Now' : 'Load My Projects'}
      />

      {/* AI Critique Modal Dialog */}
      <CritiqueModal
        isOpen={isCritiqueOpen}
        onClose={() => setIsCritiqueOpen(false)}
        data={critiqueData}
        isLoading={isCritiqueLoading}
        jobId={activeJobId}
        isAsyncQueue={isAsyncQueue}
        onAsyncComplete={(result) => {
          setCritiqueData(result);
          setIsCritiqueLoading(false);
          setIsAnalyzing(false);
        }}
        onQuickFix={handleQuickFix}
        onFocusNode={handleFocusNode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <CanvasWorkspace />
    </ReactFlowProvider>
  );
}
