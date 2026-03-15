# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in NoviSpace, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email the security report to: [Add your security email here]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

### API Key Management

- **NEVER** commit `.env` files or API keys to the repository
- Use environment variables for all sensitive configuration
- For Google Cloud deployment, use Secret Manager
- Rotate API keys regularly

### Cloud Run Security

- Backend service uses IAM-based secret access (no hardcoded keys)
- Secrets are stored in Google Cloud Secret Manager
- Service accounts have minimal required permissions
- CORS is configured to allow only the frontend domain

### Frontend Security

- All WebSocket connections use WSS (encrypted) in production
- No sensitive data stored in localStorage except session reports (client-side only)
- Camera/microphone permissions follow browser security model
- No XSS vulnerabilities (React auto-escapes by default)

### Dependencies

- Run `npm audit` regularly to check for vulnerable dependencies
- Keep dependencies updated
- Review security advisories for `@google/genai` and other critical packages

## Known Limitations

- The application requires camera and microphone access - users must grant permissions
- Session data is stored in browser localStorage (not encrypted at rest)
- WebSocket connections are stateful and not load-balanced across multiple backend instances

## Security Features

✅ No hardcoded secrets in codebase  
✅ Environment-based configuration  
✅ Google Cloud Secret Manager integration  
✅ HTTPS/WSS encryption in production  
✅ CORS protection  
✅ Service account least-privilege access  
✅ No PII collected or stored server-side
