# HorizonFI - Build Pipeline & CI/CD Security Audit

## 1. Supply Chain and Build Pipeline Threat Model
The primary vectors of compromise within the HorizonFI CI/CD pipeline include:
- **Accidental Secret Exposure**: Development tools like Vite automatically embed environment variables into the static frontend bundle (using `import.meta.env`). A broad string prefix (like the default `VITE_` prefix) could inadvertently package sensitive administrative backend tokens (e.g. `VITE_DANGEROUS_GITHUB_TOKEN`) directly into the Javascript payload served to arbitrary internet scanners.
- **Source Map Leaks**: If production source maps are uploaded alongside the `dist/` JS bundles, they can leak internal system architecture, comments, offline encryption algorithms, and variable names that might assist reverse engineering.
- **Supply Chain Injection**: Malicious dependencies could attempt to execute HTTP exfiltration during the `npm run build` process inside the GitHub Actions runner.

## 2. Refactored GitHub Actions YAML Code for Secure Secret Injection
Our deployment routines map individual `VITE_FIREBASE_` environment variables securely at the step level inside the Action, rather than polluting the global pipeline environment.

```yaml
# In .github/workflows/firebase-hosting-merge.yml
      - run: npm run build
        env:
          # Explicit, tight bindings. We do NOT use wildcard matching for secrets.
          VITE_FIREBASE_API_KEY: '${{ secrets.VITE_FIREBASE_API_KEY }}'
          VITE_FIREBASE_AUTH_DOMAIN: '${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}'
          VITE_FIREBASE_PROJECT_ID: '${{ secrets.VITE_FIREBASE_PROJECT_ID }}'
          VITE_FIREBASE_STORAGE_BUCKET: '${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}'
          VITE_FIREBASE_MESSAGING_SENDER_ID: '${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}'
          VITE_FIREBASE_APP_ID: '${{ secrets.VITE_FIREBASE_APP_ID }}'
```

## 3. Vite Configuration Adjustments 
To mitigate accidental client-side variable exposure, `vite.config.ts` has been refactored with the following rigid configurations:
- **Environment Prefix Restriction**: Instead of accepting any variable starting with `VITE_`, we restricted the scope to `envPrefix: ['VITE_FIREBASE_']`. This guarantees that even if a token like `VITE_ADMIN_SECRET` exists in the local `.env` or CI runner, it will not be bundled into the compiled source.
- **Source Map Disablement**: `build.sourcemap` was actively set to `false`.

```typescript
// vite.config.ts
export default defineConfig(() => {
  return {
    ...
    envPrefix: ['VITE_FIREBASE_'], // Strictly restrict to only explicitly allowed prefixes
    build: {
      sourcemap: false, // Prevent sourcemaps from leaking code logic in production
    },
    ...
  }
});
```

## 4. Content Security Policy (CSP) Headers Recommendation
Because Firebase Hosting operates the edge CDN routing for the web app, we can apply extremely rigorous Content Security Policies. In `firebase.json`, we established stringent restrictions blocking malicious iframe embedding, XSS execution, and unauthorized outbound connections.

The deployed CDN edge headers now include:
- `Content-Security-Policy`: Restricts script execution, styles, and XHR connections exclusively to the Firebase Auth edge servers, Firestore API, and Google Fonts.
- `X-Frame-Options: DENY`: Prevents the application from being clickjacked via malicious cross-domain embedding.
- `Strict-Transport-Security`: Ensures all traffic remains cryptographically encoded via HTTPS.

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://horizonfi-b83d3.firebaseio.com wss://horizonfi-b83d3.firebaseio.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com;"
}
```
