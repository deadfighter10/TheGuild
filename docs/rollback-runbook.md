# Rollback Runbook

## Firebase Hosting Rollback

Hosting deploys are immutable versions. To rollback:

1. Go to Firebase Console > Hosting
2. Click "Release history"
3. Find the previous working release
4. Click the three-dot menu > "Rollback to this release"

Or via CLI:
```bash
# List recent deploys
firebase hosting:channel:list --project <PROJECT_ID>

# Redeploy from a previous commit
git checkout <GOOD_COMMIT>
bun run build
firebase deploy --only hosting --project <PROJECT_ID>
git checkout master
```

## Cloud Functions Rollback

Functions are deployed per-commit. To rollback:

```bash
git checkout <GOOD_COMMIT>
cd functions && npm ci && npm run build
firebase deploy --only functions --project <PROJECT_ID>
git checkout master
```

Or via Firebase Console:
1. Go to Cloud Functions
2. Each function shows its deployment history
3. Note: Console does not support direct rollback; redeploy from git

## Firestore Rules Rollback

Security rules are versioned in git (`firestore.rules`):

```bash
git checkout <GOOD_COMMIT> -- firestore.rules
firebase deploy --only firestore:rules --project <PROJECT_ID>
```

Or via Firebase Console:
1. Go to Firestore > Rules
2. View "Rules history"
3. Copy previous rules version
4. Paste and publish

## Verification After Rollback

1. Visit the production URL and verify the home page loads
2. Check Firebase Console > Hosting for the active release
3. Check Cloud Functions logs for errors
4. Run a quick manual smoke test: login, navigate advancements, create a test node
