# Contributing to Tabora

Thank you for your interest in contributing to Tabora. This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Git configured on your machine
- Chrome or Chromium-based browser for testing
- Basic understanding of JavaScript, HTML, and CSS

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tabora.git
   cd tabora
   ```
3. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Load the extension in Chrome for testing:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

## Types of Contributions

### Bug Reports

If you encounter a bug, please create an issue with:

- Clear, descriptive title
- Step-by-step reproduction instructions
- Expected vs. actual behavior
- Screenshots or screen recordings if applicable
- Your browser version and OS
- Extension version number

### Feature Requests

Submit feature ideas through issues with:

- Clear description of the requested functionality
- Use cases and benefits
- Proposed implementation approach if you have ideas
- Any alternative solutions you've considered

### Code Contributions

#### Small Changes (Bug Fixes, Minor Features)

1. Create a feature branch from `main`
2. Make focused, atomic commits with clear messages
3. Test thoroughly in Chrome
4. Submit a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Testing instructions
   - Any breaking changes clearly marked

#### Larger Features

Before starting significant development:

1. Open an issue describing the feature
2. Discuss the approach and get feedback from maintainers
3. Wait for approval before investing extensive time
4. This prevents duplicate work and ensures alignment

### Documentation

Improvements to documentation are valuable contributions:

- Clarify existing documentation
- Add examples or use cases
- Improve code comments
- Create guides for common tasks
- Fix typos and grammar

### Tests

Improve test coverage by:

- Adding tests for new features
- Adding tests for bug fixes
- Improving existing test quality
- Testing edge cases

## Development Workflow

### Code Style

Follow these conventions:

- Use consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and modular
- Use const/let instead of var

### JavaScript Standards

- Use modern JavaScript (ES6+)
- Avoid global variables
- Use arrow functions where appropriate
- Handle errors and edge cases
- Use async/await for asynchronous operations

### Commit Messages

Write clear commit messages:

```
Type: Brief description (50 chars max)

Longer explanation of the change if needed.
Explain why the change was made, not just what.

Fixes #123 (if applicable)
```

Types: `feat:` `fix:` `docs:` `style:` `refactor:` `test:` `chore:`

### Testing

Before submitting:

1. Test manually in Chrome and ensure no errors in console
2. Test in incognito mode
3. Test with sample data and edge cases
4. Run existing tests:
   ```bash
   npm test
   ```
5. Add tests for new functionality

## Pull Request Process

1. Update documentation and README if needed
2. Add or update tests for your changes
3. Ensure all tests pass
4. Update CHANGELOG.md with your changes
5. Submit PR with clear description
6. Address review feedback promptly
7. Maintain a clean commit history

### PR Guidelines

- One feature or fix per PR when possible
- Clear title and description
- Reference related issues
- Include screenshots for UI changes
- Be responsive to review comments
- No merging your own PRs

## Code Review

All submissions require code review. Reviews may focus on:

- Code correctness and quality
- Performance implications
- Security considerations
- Documentation completeness
- Test coverage
- Adherence to project standards

Reviewers will provide constructive feedback. Be open to suggestions and willing to iterate.

## Project Structure Guidelines

### Adding New Features

1. Keep feature-specific code in appropriate modules
2. Add new utility functions to shared.js if general-purpose
3. Update state schema version if data structure changes
4. Update manifest.json if new permissions needed
5. Document new settings in shared.js defaults

### Modifying State Management

- Schema version must be incremented
- Migration code must be added to shared.js
- Backward compatibility is required
- Document changes clearly

### Adding UI Elements

- Keep styles organized in styles.css
- Use consistent naming conventions
- Test responsiveness
- Ensure accessibility (keyboard navigation, screen readers)
- Test in both light and dark themes

## Testing Guidelines

### Manual Testing Checklist

- Test in normal and incognito windows
- Test save operations (tab, window, board)
- Test delete and restore from trash
- Test undo functionality
- Test all themes and wallpapers
- Test keyboard shortcuts
- Test with no data and with lots of data
- Test export/import workflow

### Automated Tests

- Unit tests for utility functions
- Integration tests for state management
- Smoke tests for critical user flows
- All tests must pass before PR approval

## Documentation

### When to Document

- New features require documentation
- API changes require updates
- Complex logic needs code comments
- Non-obvious decisions should be explained

### Documentation Standards

- Use clear, concise language
- Provide examples where helpful
- Keep docs up-to-date with code
- Include before/after for process changes

## Performance Considerations

- Minimize storage access operations
- Batch updates when possible
- Avoid unnecessary re-renders
- Profile for performance regressions
- Consider mobile performance implications

## Security

- Never store sensitive data in plain text
- Validate and sanitize user input
- Be careful with storage access
- Follow Chrome Extension security best practices
- Report security issues privately

## Communication

- Be respectful and professional
- Assume good intent in discussions
- Ask clarifying questions
- Provide constructive feedback
- Celebrate contributions

## Release Process

Releases follow semantic versioning:

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Maintainers handle release tagging and Chrome Web Store submission.

## Getting Help

- Check existing issues and documentation
- Ask in discussions if available
- Comment on related issues
- Reach out to maintainers for guidance

## Recognition

Contributors are recognized through:

- Git history and commit attribution
- README acknowledgments section
- Release notes mentions
- Community appreciation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Create an issue or discussion if you have questions about the contribution process or project guidelines.

---

Thank you for helping make Tabora better for everyone.
