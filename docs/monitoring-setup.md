# Monitoring Setup

## Client Error Tracking (#32)

Error tracking is implemented via `src/lib/error-tracking.ts`:

- **Global handlers**: `setupGlobalErrorHandlers()` in `main.tsx` captures unhandled errors and promise rejections
- **ErrorBoundary integration**: `ErrorBoundary.tsx` reports caught errors via `errorTracker.captureException()`
- **Current backend**: Console logging (development)
- **Production upgrade**: Replace `createConsoleTracker()` with Sentry SDK initialization:
  ```ts
  import * as Sentry from "@sentry/react"
  Sentry.init({ dsn: "...", environment: "production" })
  ```

## Cloud Function Monitoring (#33)

Configure in Firebase Console > Cloud Functions:

1. **Error rate alert**: Alert when error rate exceeds 1% over 5 minutes
2. **Latency alert**: Alert when p95 latency exceeds 5 seconds
3. **Cold start monitoring**: Track cold start frequency via Cloud Monitoring

Firebase Console path: `Monitoring > Alerting > Create Policy`

Recommended alert policies:
- `cloud_function/execution_count` with `status=error` > 1% of total
- `cloud_function/execution_times` p95 > 5000ms
- `cloud_function/active_instances` sudden spikes > 10x normal

## Firestore Usage Alerts (#34)

Configure in Google Cloud Console > Budgets & Alerts:

1. Set monthly budget alert at 80% of free tier limits:
   - Reads: 50,000/day (alert at 40,000)
   - Writes: 20,000/day (alert at 16,000)
   - Deletes: 20,000/day (alert at 16,000)

2. Cloud Monitoring custom metrics:
   - `firestore.googleapis.com/document/read_count` — spike detection
   - `firestore.googleapis.com/document/write_count` — spike detection

Firebase Console path: `Usage and billing > Budget alerts`

## Uptime Monitoring (#35)

Options (choose one):

### Firebase Hosting (built-in)
Firebase Hosting automatically serves from CDN with high availability.

### Google Cloud Uptime Checks
1. Go to Cloud Monitoring > Uptime Checks
2. Create check for production URL: `https://<project>.web.app/`
3. Check interval: 1 minute
4. Alert on downtime > 2 minutes
5. Notification channel: Email or Slack webhook

### External (free tier options)
- UptimeRobot: 5-minute checks, free tier
- Better Uptime: 3-minute checks, free tier

## Alert Channels

Configure notification channels in Google Cloud Console > Monitoring > Notification Channels:
- Email: Project owner email
- Slack: Webhook to #alerts channel (if applicable)
