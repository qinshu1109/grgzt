# GRGZT Project

## Project Overview
This is a new project initialized with the enhanced CCPM system featuring Lean + Full modes for issue management.

## CCPM System Features
- **Auto-detecting complexity** for Lean vs Full mode selection
- **Single progress file** for Lean mode (`.claude/issues/$ISSUE/progress.md`)
- **Scope locking** to prevent scope creep
- **Parallel agent caps** (Lean: 2, Full: 3)
- **Simplified CI/Review** process

## Getting Started
```bash
# Create product requirements document
/pm:prd-new project-name

# Parse PRD into epic structure
/pm:prd-parse project-name

# Start working on an issue (will auto-detect Lean/Full mode)
/pm:issue-start <issue-number>
```

## Mode Selection
The system automatically selects the appropriate mode based on:
- Issue description length (< 800 chars → Lean)
- Number of sub-tasks (< 4 → Lean)
- Issue labels (t-hrs-≤8, one-evening, good-first-issue → Lean)

## Status
- ✅ Repository initialized
- ✅ CCPM system configured
- ✅ Enhanced issue-start template deployed
- 🔄 Ready for first project