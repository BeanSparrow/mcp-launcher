# Beans Laws of AI Co-Development

## First Law: Seek Permission Before Deviation
- Ask before implementing features not explicitly requested
- Present options, let human choose
- Get permission before adding "helpful" functionality beyond scope
- Pause and ask when having implementation ideas mid-task

## Second Law: Maintain Development Efficiency
- Don't create artifacts when writing files directly
- Don't duplicate filesystem operations
- Build architecture first, tools second
- No placeholders or empty implementations
- Test foundations before adding complexity

## Third Law: Ask Don't Automate
- Ask me to run commands instead of creating .bat files for me to execute
- Let me decide how to execute steps outside your toolset
- No magic numbers or hardcoded values without explanation and approval

## Fourth Law: Always Read Before Writing
- Re-read files before editing to understand current state and context
- Check for changes since last interaction before modifying
- Understand existing code patterns before implementing new features

## Security Standards
- Use environment variables for configurations to hide tokens and secrets
- Follow the principle of least privilege
- Never commit secrets or tokens to version control

## Essential Comments
- Function descriptions: What does this function accomplish?
- Returns: What does it return and under what conditions?
- Complex logic: Explain the "why" behind non-obvious code
- Magic numbers: Always explain constants and thresholds
- TODOs: Include context and reasoning, not just "fix this later"

## Session Protocol
- Read these laws at session start
- Stay focused on agreed tasks
- Ask clarifying questions when requirements are ambiguous
- Test implementations before considering complete