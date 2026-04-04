-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Threads (user conversations)
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '新对话',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads (user_id);

-- Papers (global, deduplicated by content hash)
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT UNIQUE NOT NULL,
  file_ext TEXT,
  lang TEXT,
  chunks INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_papers_hash ON papers (hash);

-- Per-user paper links with independent titles
CREATE TABLE IF NOT EXISTS user_papers (
  user_id TEXT NOT NULL,
  paper_id UUID NOT NULL REFERENCES papers(id),
  title TEXT NOT NULL DEFAULT '新资料',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paper_id)
);
CREATE INDEX IF NOT EXISTS idx_user_papers_user_id ON user_papers (user_id);

-- RAG document chunks with embeddings (pgvector)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  paper_id UUID REFERENCES papers(id),
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_paper_id ON documents (paper_id);

-- Create HNSW index for fast vector search
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
  USING hnsw (embedding vector_cosine_ops);

-- Create storage bucket for papers
INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Users can upload papers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'papers');

-- Storage policy: service role can do everything
CREATE POLICY "Service role full access" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'papers');
