---
name: security-audit
description: >-
  Audits Express API backend and frontend code for security vulnerabilities including Path Traversal,
  CORS misconfigurations, Unsafe Stream Piping, Missing Input Validations, Insecure Error Exposure, and XSS risks.
---

# Security Audit (SAST) Skill

## Purpose
Performs Static Application Security Testing (SAST) and code review across backend routes, filesystem interactions, streaming endpoints, and frontend components to eliminate potential attack vectors.

## Key Security Audit Checklist
1. **Path Traversal & Safe Path Resolution**:
   - Check all file upload, download, and streaming endpoints (`/api/stream`, `/api/download`, `/api/upload`).
   - Validate that filenames and IDs cannot traverse outside designated upload / root directories (`..`, absolute paths, null-byte injection).
2. **CORS & Network Security**:
   - Verify CORS origin handling (prevent wildcard access with credentials or restrict to safe origins).
3. **Input Sanitization & Safe Typing**:
   - Validate JSON request bodies and query parameters.
   - Prevent command injection, prototype pollution, and uncontrolled resource consumption.
4. **Header & Error Information Disclosure**:
   - Ensure stack traces and internal server paths are not leaked to external clients.
