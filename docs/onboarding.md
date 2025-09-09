# Onboarding Manual

This manual helps new company members start working with MagSuite.

## Account Setup
- Request access to the repository and project management tools.
- Join the team communication channels.
- Configure two-factor authentication on all services.

## Development Environment
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/example/MagSuite.git
   cd MagSuite
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. Set up environment variables in `backend/.env` and `frontend/.env` if needed.
3. Launch services for the first time:
   ```bash
   ./start.sh
   ```

## First Tasks
- Run the test suites to ensure the environment works:
  ```bash
  cd backend && npm test
  cd ../frontend && npm test
  ```
- Import the sample inventory and navigate the UI.
- Review the [usage guide](usage.md) for common workflows.

## Support
If any issues arise, ask in the support channel or open an issue in the repository.
