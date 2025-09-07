# Testing and QA

## Backend
- Run `npm test` inside the `backend` directory to execute Jest unit tests.
- Key areas covered: authentication, stock movements, and MRP calculations.
- Acceptance criteria: all tests pass without errors.

## Frontend
- Run `npm test` inside the `frontend` directory for Jest-based unit tests.
- Run `npm run test:ui` for Vitest suites located in `frontend/tests`.
- Acceptance criteria: both commands complete successfully.

## QA Procedures
1. Install dependencies in both `backend` and `frontend` using `npm install`.
2. Run backend and frontend tests as noted above.
3. Review test coverage for critical paths.
4. Any failing test must be resolved before release.
