---
name: dependency-check
description: >-
  Audits project npm dependencies for known Common Vulnerabilities and Exposures (CVEs),
  supply chain risks, deprecated packages, and insecure versions using npm audit and package health checks.
---

# Dependency Security Check Skill

## Purpose
Inspects project dependencies (`package.json`, `package-lock.json`, `node_modules`) to identify, report, and remediate known vulnerabilities and supply chain security risks.

## Audit Workflow
1. **Vulnerability Assessment**:
   - Execute `npm audit` to check all transitive and direct dependencies against the npm security advisory database.
2. **Remediation**:
   - Apply fixes (`npm audit fix` / package version bumps).
   - Review breaking changes and ensure build integrity (`npm run build`).
