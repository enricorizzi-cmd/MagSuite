# Team Guide

This document describes how the team works with MagSuite.

## Branching Policy

- `main` holds the latest stable code.
- `staging` aggregates features for validation before release.
- `production` mirrors the live deployment.
- create feature branches from `main` using the pattern `feature/<short-description>` and merge them through pull requests.

## Environments

- **Local**: run services with `./start.sh` or the individual backend and frontend commands.
- **Staging**: code merged into `staging` is automatically built and pushed as container images.
- **Production**: code on `production` is deployed to the live environment.

## CI/CD

GitHub Actions run linting and automated tests for the backend, frontend and Python package. Every pull request must pass the workflow before merging.
