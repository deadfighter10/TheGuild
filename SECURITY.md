# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, email the maintainers directly or use GitHub's private vulnerability reporting feature.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: As soon as possible, depending on severity

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x.x | Yes (current development) |

## Security Measures

### Authentication & Authorization

- Firebase Authentication with email/password
- Firestore security rules enforce ownership checks on all write operations
- Server-side rep validation in Firestore rules (users cannot self-assign Rep)
- Admin access via custom claims set through Cloud Functions
- Session management with configurable timeouts

### Input Validation

- **Zod schemas** validate all Firestore document reads at trust boundaries (`src/lib/firestore-schemas.ts`)
- Input length limits enforced in Firestore security rules
- Domain-level validation for all create/edit operations (title length, content length, required fields)
- URL protocol validation (blocks `javascript:` and `data:` protocol injection in profile photo URLs)
- All user input `.trim()`ed before writes

### XSS Prevention

- React's built-in JSX auto-escaping for all rendered text content
- Custom Markdown renderer with `escapeHtml()` for user-generated markdown
- `sanitizeUrl()` blocks dangerous URL protocols in markdown links (falls back to `#`)
- CSP headers configured for production deployment

### Rate Limiting

Three layers of rate limiting prevent abuse:

1. **Client-side cooldown** (Phase 1): 10-second interval between writes per collection
2. **Firestore rules** (Phase 2): Server-side enforcement via `rateLimits` collection timestamps
3. **Hourly/daily counters** (Phase 3): Per-collection limits checked before every create operation

| Collection | Per Hour | Per Day |
|-----------|----------|---------|
| Tree nodes | 10 | 30 |
| Discussion threads | 5 | 20 |
| Discussion replies | 30 | 100 |
| News links | 5 | 20 |
| Library entries | 3 | 10 |
| Content flags | 10 | 30 |

### Content Moderation

- Community flagging system with structured reason categories
- Admin review panel for pending flags
- Audit logging for all moderation actions
- Flag notifications sent to content authors

### Dependency Management

- Dependabot enabled for automated dependency updates
- GitHub Actions CI runs on all PRs (type-check, test, build)

## Scope

This policy covers the web application source code in this repository. Firebase security rules are also in scope. Third-party dependencies are monitored but managed upstream.
