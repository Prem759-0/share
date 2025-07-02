# Send Anywhere Clone - Secure File Transfer Application

## Overview

This is a Flask-based web application that replicates the functionality of Send Anywhere - a secure file sharing service. The application allows users to upload files, generate secure 6-digit codes, and share files temporarily with end-to-end encryption. Files are automatically deleted after 10 minutes or upon first download for security.

## System Architecture

### Backend Architecture
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (configurable to other databases via DATABASE_URL)
- **File Storage**: Local file system with encrypted storage
- **Encryption**: AES-256 encryption using PyCryptodome
- **Background Tasks**: APScheduler for cleanup operations
- **Rate Limiting**: Flask-Limiter with memory storage

### Frontend Architecture
- **UI Framework**: Bootstrap 5 for responsive design
- **File Upload**: Drag-and-drop interface with progress tracking
- **JavaScript**: Vanilla JS for interactive features
- **Icons**: Font Awesome for UI elements

### Security Architecture
- **Encryption**: Files encrypted with AES-256 before storage
- **Access Control**: 6-digit numeric codes for file retrieval
- **Rate Limiting**: 200 requests/day, 50 requests/hour per IP
- **File Sanitization**: Secure filename handling to prevent path traversal
- **Automatic Cleanup**: Files auto-deleted after expiration or download

## Key Components

### Models (models.py)
- **Transfer Model**: Core data structure storing file metadata, encryption keys, and access codes
- **Code Generation**: Secure 6-digit numeric code generation
- **Expiration Management**: 10-minute TTL with automatic expiration checking

### File Handling (utils.py)
- **Encryption Service**: AES-256 file encryption with PBKDF2 key derivation
- **Filename Sanitization**: Security measures against malicious filenames
- **File Storage**: Temporary encrypted file storage system

### Web Routes (routes.py)
- **Upload Endpoint**: File processing with encryption and code generation
- **Download System**: Code-based file retrieval with decryption
- **Static Pages**: Main interface serving

### Application Configuration (app.py)
- **Flask Setup**: Core application configuration with security middleware
- **Database Configuration**: SQLAlchemy setup with connection pooling
- **Rate Limiting**: Request throttling configuration
- **File Upload Limits**: 2GB maximum file size restriction

## Data Flow

1. **File Upload Process**:
   - User uploads file via drag-and-drop or file picker
   - File is temporarily saved and validated (size, security)
   - File is encrypted using AES-256 with random key generation
   - Transfer record created with 6-digit code and expiration time
   - QR code generated for easy sharing

2. **File Download Process**:
   - User enters 6-digit code
   - System validates code and checks expiration
   - File is decrypted and served to user
   - Transfer record marked as downloaded
   - File automatically deleted after download

3. **Cleanup Process**:
   - Background scheduler runs periodic cleanup
   - Expired transfers and associated files are removed
   - Database records cleaned up automatically

## External Dependencies

### Python Libraries
- **Flask**: Web framework and routing
- **SQLAlchemy**: Database ORM and modeling
- **PyCryptodome**: Cryptographic operations for file encryption
- **APScheduler**: Background task scheduling for cleanup
- **Flask-Limiter**: Rate limiting and abuse prevention
- **Werkzeug**: WSGI utilities and security middleware

### Frontend Libraries
- **Bootstrap 5**: CSS framework for responsive UI
- **Font Awesome**: Icon library for enhanced UX
- **Dropzone.js**: Drag-and-drop file upload interface

### System Dependencies
- **SQLite**: Default database (configurable to PostgreSQL/MySQL)
- **File System**: Local storage for encrypted files

## Deployment Strategy

### Environment Configuration
- **DATABASE_URL**: Database connection string (defaults to SQLite)
- **SESSION_SECRET**: Flask session security key
- **Upload Directory**: Configurable file storage location (/tmp/sendanywhere_files)

### Security Considerations
- **Proxy Headers**: ProxyFix middleware for reverse proxy deployment
- **Rate Limiting**: Memory-based rate limiting (configurable to Redis)
- **File Size Limits**: 2GB maximum upload size
- **Automatic Cleanup**: Files never persist beyond 10 minutes

### Scalability Notes
- Database can be upgraded from SQLite to PostgreSQL/MySQL for production
- Rate limiting can be moved to Redis for distributed deployments
- File storage can be moved to cloud storage solutions
- Background tasks can be moved to external job queues

## Deployment Options

### Option 1: Replit Deployment (Full Featured)
The main Flask application with PostgreSQL database, providing:
- Server-side file encryption with AES-256
- Database-backed transfer codes
- Automatic file cleanup
- Rate limiting and security features
- Background task scheduling

### Option 2: Netlify Deployment (Client-Side Only)
A simplified version in the `netlify-version/` folder providing:
- Browser-based peer-to-peer file sharing concept
- No server requirements - pure static hosting
- WebRTC-ready architecture (requires signaling server for full functionality)
- Immediate deployment to Netlify
- Demonstration of UI/UX without backend complexity

## Changelog

```
Changelog:
- July 02, 2025. Initial Flask application setup with full backend
- July 02, 2025. Enhanced UI with user-friendly instructions and animations
- July 02, 2025. Created Netlify-compatible static version for easy deployment
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```