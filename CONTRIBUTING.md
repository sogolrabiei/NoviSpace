# Contributing to NoviSpace

Thank you for your interest in contributing to NoviSpace! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/novispace.git
   cd novispace
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites
- Node.js >= 20
- npm >= 10
- Google Gemini API key ([get one here](https://ai.google.dev))

### Local Development

**Backend**:
```bash
cd backend
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` to test your changes.

## Code Style

- **JavaScript/TypeScript**: Follow existing code style (we use Prettier/ESLint)
- **Commits**: Use clear, descriptive commit messages
- **Comments**: Add comments for complex logic, but prefer self-documenting code

## Pull Request Process

1. **Test your changes thoroughly** in local development
2. **Update documentation** if you've changed functionality
3. **Create a pull request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Screenshots/videos for UI changes
   - Link to any related issues

4. **Wait for review** - maintainers will review and provide feedback

## Reporting Bugs

Use GitHub Issues with the bug report template. Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable
- Environment details (browser, OS, etc.)

## Feature Requests

We welcome feature ideas! Use GitHub Issues with the feature request template. Include:
- Clear description of the feature
- Use case / problem it solves
- Proposed implementation (optional)

## Questions?

Feel free to open a GitHub Discussion or Issue for questions about the codebase.

## License

By contributing to NoviSpace, you agree that your contributions will be licensed under the MIT License.
