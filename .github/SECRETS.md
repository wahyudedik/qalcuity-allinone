# GitHub Actions Secrets

Required secrets for CI/CD pipeline:

## VPS Deployment (deploy.yml)
- `VPS_HOST` — VPS IP address or hostname
- `VPS_USERNAME` — SSH username (e.g., root)
- `VPS_SSH_KEY` — Private SSH key for authentication

## Optional
- `CODECOV_TOKEN` — For code coverage reporting (future)
