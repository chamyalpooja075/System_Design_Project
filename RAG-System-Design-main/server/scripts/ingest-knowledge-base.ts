import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Simple frontmatter parser without external dependencies
function parseFrontmatter(fileContent: string): { data: Record<string, any>; content: string } {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: fileContent };
  }

  const rawYaml = match[1];
  const content = match[2];
  const data: Record<string, any> = {};

  rawYaml.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value: any = line.slice(colonIdx + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((item: string) => item.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        value = value.replace(/^['"]|['"]$/g, '');
      }
      data[key] = value;
    }
  });

  return { data, content };
}

// Local Semantic Vector Generator (matching EmbeddingService)
function generateLocalVector(text: string): number[] {
  const vectorDim = 64;
  const vector = new Array(vectorDim).fill(0);
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);

  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % vectorDim;
    vector[index] += 1;

    const secondaryIndex = (index + (token.length % 7) + 1) % vectorDim;
    vector[secondaryIndex] += 0.5;
  }

  let sumSquares = 0;
  for (let i = 0; i < vectorDim; i++) {
    sumSquares += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude > 0) {
    for (let i = 0; i < vectorDim; i++) {
      vector[i] = Number((vector[i] / magnitude).toFixed(6));
    }
  }

  return vector;
}

async function ingestKnowledgeBase() {
  const prisma = new PrismaClient();
  const kbDir = path.resolve(__dirname, '../../docs/knowledge-base');

  console.log(`[RAG Ingestion] Scanning directory: ${kbDir}`);

  if (!fs.existsSync(kbDir)) {
    console.error(`Knowledge base directory not found at: ${kbDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
  console.log(`[RAG Ingestion] Found ${files.length} architectural knowledge documents.`);

  let ingestedCount = 0;

  for (const file of files) {
    const filePath = path.join(kbDir, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = parseFrontmatter(rawContent);

    const docKey = path.basename(file, '.md');
    const title = frontmatter.title || docKey;
    const topic = frontmatter.topic || 'General Distributed Systems';
    const keywords = JSON.stringify(frontmatter.keywords || []);

    // Combine title, topic, keywords, and content for embedding
    const textToEmbed = `${title} ${topic} ${(frontmatter.keywords || []).join(' ')} ${content}`;
    const embedding = JSON.stringify(generateLocalVector(textToEmbed));

    await prisma.knowledgeDoc.upsert({
      where: { docKey },
      update: {
        title,
        topic,
        content,
        keywords,
        embedding,
      },
      create: {
        docKey,
        title,
        topic,
        content,
        keywords,
        embedding,
      },
    });

    ingestedCount++;
    console.log(`  ✓ Ingested: [${docKey}] ${title} (${topic})`);
  }

  console.log(`\n[RAG Ingestion Complete] Successfully embedded and saved ${ingestedCount} documents to database.`);
  await prisma.$disconnect();
}

ingestKnowledgeBase().catch((err) => {
  console.error('[RAG Ingestion Error]', err);
  process.exit(1);
});
