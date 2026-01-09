SELECT 'CREATE DATABASE presentation_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'presentation_db')\gexec

\c presentation_db;
CREATE EXTENSION IF NOT EXISTS vector;