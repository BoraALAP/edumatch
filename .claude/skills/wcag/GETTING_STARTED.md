# WCAG Audit Skill - Quick Start Guide

## What You Got

Your new WCAG audit skill includes:

1. **Automated audit script** (`audit_wcag.py`) - Scans HTML/JSX/TSX files for common accessibility issues
2. **WCAG patterns reference** - Accessible code examples for React/Next.js
3. **Compliance checklist** - Manual testing guide for comprehensive audits

## Installation

1. Download the `wcag-audit.skill` file
2. In Claude.ai, go to Settings → Skills → Upload Skill
3. Upload the `.skill` file
4. The skill will now be available in all your conversations

## Quick Usage Examples

### Example 1: Audit a Single File

```
Can you audit this React component for accessibility issues?

[paste your component code]
```

Claude will use the WCAG audit skill to:
- Identify accessibility violations
- Reference specific WCAG guidelines
- Provide code suggestions for fixes

### Example 2: Fix Accessibility Issues

```
I'm getting WCAG errors about missing alt text on these images. How do I fix them?

[paste your code]
```

Claude will:
- Explain the WCAG requirement
- Show correct implementation patterns
- Provide working code examples

### Example 3: Implement Accessible Component

```
I need to build an accessible modal dialog in Next.js. Can you help?
```

Claude will:
- Use patterns from the WCAG reference
- Show proper ARIA implementation
- Include keyboard navigation and focus management

### Example 4: Review Before Deployment

```
Can you do a final accessibility check on my landing page before I deploy?

[paste your code or provide file path]
```

Claude will:
- Run comprehensive accessibility audit
- Prioritize issues by severity
- Suggest quick wins for immediate improvement

## What the Skill Covers

### WCAG 2.1 Level A & AA Compliance
- ✅ Images and alt text
- ✅ Form labels and validation
- ✅ Keyboard navigation
- ✅ Color contrast
- ✅ Interactive elements (buttons, links, modals)
- ✅ Semantic HTML
- ✅ ARIA best practices
- ✅ Focus management
- ✅ Screen reader compatibility

### Framework Support
- React
- Next.js
- Plain HTML/JavaScript
- TypeScript/JSX/TSX

## Pro Tips

1. **Start with automated scan**: Let Claude run the audit script first to catch obvious issues

2. **Use checklist for manual review**: After fixing automated issues, ask Claude to walk through the manual checklist

3. **Reference patterns when building**: When creating new components, ask Claude to reference the WCAG patterns guide

4. **Test as you go**: Ask Claude about keyboard navigation and screen reader compatibility during development

5. **Integration**: Add Claude's audit recommendations to your PR template or CI/CD pipeline

## Common Requests

- "Audit this component for WCAG compliance"
- "How do I make this form accessible?"
- "Fix the alt text on these images"
- "Show me how to implement an accessible dropdown"
- "Check keyboard navigation on this component"
- "What's the proper ARIA label for this button?"
- "Review color contrast on this design"

## Need More Help?

The skill includes extensive reference materials. Just ask Claude:
- "Show me accessible button patterns"
- "What are the WCAG requirements for forms?"
- "Give me the compliance checklist"
- "How do I test with a screen reader?"

## Your Background

As a product designer and indie developer with Next.js and React Native experience, this skill will help you:
- Build accessible products from the start
- Catch accessibility issues during design/development
- Learn accessibility best practices for React/Next.js
- Ensure your apps work for all users

Enjoy building more accessible web applications! 🎉
