# Contributing to RenderDoc Debug Agent

Thank you for your interest in contributing to RenderDoc Debug Agent! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/Renderdoc-Debug-Agent.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit and push
7. Create a pull request

## Development Setup

### Prerequisites

- Python 3.8 or higher
- Git
- (Optional) RenderDoc with Python bindings
- (Optional) OpenAI API key

### Setup Instructions

```bash
# Clone the repository
git clone https://github.com/haolange/Renderdoc-Debug-Agent.git
cd Renderdoc-Debug-Agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest black flake8 pylint mypy

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run tests
python -m unittest test_agent.py
```

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check if the issue already exists
- Collect information about the bug
- Provide steps to reproduce

When submitting a bug report, include:
- Clear, descriptive title
- Detailed description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, etc.)
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- Clear, descriptive title
- Detailed description of the proposed functionality
- Use cases and examples
- Any relevant mockups or diagrams

### Code Contributions

We welcome contributions in the following areas:

1. **Bug Fixes**: Fix existing issues
2. **Features**: Implement new features
3. **Documentation**: Improve documentation
4. **Tests**: Add or improve tests
5. **Performance**: Optimize existing code
6. **Refactoring**: Improve code quality

## Coding Standards

### Python Style Guide

We follow PEP 8 with some modifications:

- Line length: 100 characters (instead of 80)
- Use 4 spaces for indentation
- Use meaningful variable names
- Add docstrings to all functions and classes

### Code Formatting

Use `black` for code formatting:

```bash
black app.py renderdoc_analyzer.py ai_analyzer.py
```

### Linting

Use `flake8` for linting:

```bash
flake8 --max-line-length=100 *.py
```

### Type Hints

Add type hints where appropriate:

```python
def analyze_capture(filepath: str) -> Dict[str, Any]:
    """Analyze a capture file."""
    pass
```

### Documentation

- Use docstrings for all public functions, classes, and modules
- Follow Google style docstrings
- Keep README and other docs up to date

Example:

```python
def analyze_file(filepath: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Analyze a RenderDoc capture file.
    
    Args:
        filepath: Path to the .rdc file
        options: Optional analysis options
        
    Returns:
        Dictionary containing analysis results
        
    Raises:
        FileNotFoundError: If the file doesn't exist
        ValueError: If the file format is invalid
    """
    pass
```

## Testing

### Running Tests

```bash
# Run all tests
python -m unittest test_agent.py -v

# Run specific test
python -m unittest test_agent.TestRenderDocAnalyzer.test_mock_analysis

# Run with pytest (if installed)
pytest test_agent.py -v
```

### Writing Tests

- Add tests for all new features
- Ensure existing tests pass
- Aim for high code coverage
- Use descriptive test names

Example:

```python
class TestNewFeature(unittest.TestCase):
    """Test the new feature."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = Analyzer()
    
    def test_feature_works(self):
        """Test that the feature works as expected."""
        result = self.analyzer.new_feature()
        self.assertIsNotNone(result)
    
    def test_feature_handles_error(self):
        """Test error handling."""
        with self.assertRaises(ValueError):
            self.analyzer.new_feature(invalid_input)
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git merge main
   ```

2. **Run tests**:
   ```bash
   python -m unittest test_agent.py
   ```

3. **Format code**:
   ```bash
   black *.py
   ```

4. **Lint code**:
   ```bash
   flake8 --max-line-length=100 *.py
   ```

5. **Update documentation** if needed

### Submitting a Pull Request

1. Push your branch to your fork
2. Create a pull request from your branch to main
3. Fill in the PR template with:
   - Description of changes
   - Related issue number (if applicable)
   - Type of change (bug fix, feature, docs, etc.)
   - Checklist of completed items

### PR Template

```markdown
## Description
[Describe your changes]

## Related Issue
Fixes #[issue number]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Checklist
- [ ] Tests pass
- [ ] Code is formatted (black)
- [ ] Code is linted (flake8)
- [ ] Documentation updated
- [ ] New tests added (if applicable)
- [ ] No breaking changes
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited

## Development Guidelines

### Project Structure

When adding new features, maintain the project structure:

```
Renderdoc-Debug-Agent/
├── app.py                  # Main Flask app - HTTP endpoints
├── renderdoc_analyzer.py   # RenderDoc integration
├── ai_analyzer.py          # AI analysis logic
├── templates/              # HTML templates
├── static/                 # Static files (if added)
├── tests/                  # Test files
└── docs/                   # Documentation
```

### Adding New Features

1. **Plan**: Discuss major features in an issue first
2. **Implement**: Write clean, documented code
3. **Test**: Add comprehensive tests
4. **Document**: Update relevant documentation
5. **Submit**: Create a pull request

### Adding New Dependencies

- Add to `requirements.txt`
- Document why the dependency is needed
- Ensure it's compatible with existing dependencies
- Check the license is compatible

### Error Handling

- Use specific exception types
- Provide helpful error messages
- Log errors appropriately
- Handle edge cases

Example:

```python
try:
    result = risky_operation()
except FileNotFoundError as e:
    logger.error(f"File not found: {e}")
    return {"error": "File not found", "details": str(e)}
except Exception as e:
    logger.exception("Unexpected error in operation")
    return {"error": "Internal error", "details": str(e)}
```

## Specific Contribution Areas

### Improving RenderDoc Integration

- Add support for more RenderDoc API features
- Improve capture file parsing
- Add support for different graphics APIs

### Enhancing AI Analysis

- Improve analysis prompts
- Add new issue detection patterns
- Support for additional AI models
- Better shader fix suggestions

### Web Interface

- Improve UI/UX
- Add new visualizations
- Enhance mobile responsiveness
- Add internationalization

### Documentation

- Improve existing docs
- Add tutorials
- Create video guides
- Translate to other languages

## Questions?

If you have questions:
- Check existing issues and discussions
- Open a new issue for questions
- Tag with "question" label

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub insights

Thank you for contributing to RenderDoc Debug Agent!
