# Changelog

All notable changes to this project will be documented in this file.

### Added

- PPTX file support with slide and speaker notes extraction
- ASCII tree format backend structure documentation (STRUCTURE.md)
- Comprehensive error management system with custom exceptions
- Global exception handlers for FastAPI application
- Centralized logging system with loguru
- File validation with magic-bytes checking for PDF and PPTX
- PDF security checks (page limits, file size, encryption detection)
- PPTX security checks (slide limits, file size)
- Parallel/batched embedding generation with OpenAI API
- File cleanup policies for failed uploads and expired guest files
- SHA256 file hashing for upload tracking
- Null-byte cleaning for extracted text
- Environment-based configuration (development/production modes)
- Configurable logging levels (DEBUG/INFO/WARNING/ERROR)

### Changed

- Upload endpoint now supports both PDF and PPTX formats (.pdf, .pptx)
- Embedding generation uses batched concurrent processing (batch size: 10)
- File validation enhanced with magic-bytes verification
- Vector database now stores file type and hash information
- Status flow improved with proper enum handling (UPLOADED/ANALYZING/COMPLETED/FAILED)

### Security

- Added file type validation using magic bytes (prevents extension spoofing)
- Implemented file size limits (50 MB)
- Added page/slide count limits for PDF and PPTX
- Encryption detection for PDF files
- Text sanitization to remove null bytes and control characters

### Developer Experience

- Added structured backend documentation (STRUCTURE.md)
- Environment variables clearly documented in config.py
- Custom exceptions for better error tracking
- Comprehensive logging for debugging

## [0.1.0] - Initial Release

### Added

- FastAPI backend with async SQLAlchemy
- PostgreSQL database with pgvector extension
- OpenAI embeddings integration (text-embedding-3-small)
- PDF upload and text extraction
- User authentication with JWT tokens
- Basic RAG (Retrieval-Augmented Generation) pipeline
- Docker and docker-compose setup
- Database models for Presentation and Slide entities

### Infrastructure

- Docker containerization for backend and database
- PostgreSQL with pgvector for vector similarity search
- Environment-based configuration management
- Initial database schema and migrations

---

## Future Releases (Planned)

### Phase 8 - Production Hardening

- Redis-based distributed rate limiting
- Monitoring and alerting system
- Storage optimization and migration
- API Gateway integration
- Enhanced test coverage for PPTX upload flow
- Performance profiling and optimization

---

## Notes

- **Breaking Changes**: None yet (pre-1.0.0 development phase)
- **Dependencies**: See `backend/requirements.txt` for current Python packages
- **Migration Guide**: For upgrading from earlier commits, run `docker-compose up --build` to include new dependencies
