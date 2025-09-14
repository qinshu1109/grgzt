---
allowed-tools: Bash, Read, Write, LS, Task
---

# Issue Start (Lean + Full Mode)

Begin work on a GitHub issue with smart parallel agents based on issue complexity.

## Usage
```
/pm:issue-start <issue_number> [options]
```

**Options:**
- `--mode auto|lean|full` - Execution mode (default: auto)
- `--parallel N` - Max parallel streams (default: 2 in lean, 3 in full)
- `--child-agents N` - Max child agents (default: same as parallel)
- `--no-worktree` - Skip worktree requirement (default: true in lean)
- `--single-log` - Use single progress file (default: true in lean)
- `--analyze` - Force analysis creation in full mode

## Quick Check

### 1. Complexity Gate (Auto-detect mode)
```bash
# Try to get issue details, fallback to local mode if fails
body=$(gh issue view $ARGUMENTS --json body -q .body 2>/dev/null || echo "")
len=${#body}
subs=$(printf "%s" "$body" | grep -E "^- |^\\* " | wc -l | tr -d ' ')

# Determine mode based on complexity
MODE="full"
if [ "$MODE_ARG" = "lean" ] || [ "$len" -lt 800 -a "$subs" -lt 4 ] || grep -qiE "(tiny|small|good-first-issue|one-evening|t-hrs-≤8)" <<< "$(gh issue view $ARGUMENTS --json labels -q '.labels[].name' 2>/dev/null)"; then
  MODE="lean"
fi

# Set caps based on mode
if [ "$MODE" = "lean" ]; then
  PARALLEL=${PARALLEL_ARG:-2}
  CHILD=${CHILD_ARG:-2}
  USE_WORKTREE=${USE_WORKTREE_ARG:-false}
  SINGLE_LOG=${SINGLE_LOG_ARG:-true}
else
  PARALLEL=${PARALLEL_ARG:-3}
  CHILD=${CHILD_ARG:-3}
  USE_WORKTREE=${USE_WORKTREE_ARG:-true}
  SINGLE_LOG=${SINGLE_LOG_ARG:-false}
fi
```

### 2. Issue Details (with fallback)
```bash
# Get issue details
if ! gh issue view $ARGUMENTS --json state,title,labels,body >/dev/null 2>&1; then
  echo "⚠️ Cannot access GitHub, working in local mode"
  # Try to find local task file or create minimal one
  if [ ! -f ".claude/epics/*/$ARGUMENTS.md" ]; then
    echo "ℹ️ No local task file, creating minimal one from available info"
  fi
fi
```

### 3. Task File & Analysis Check
```bash
# Find local task file
task_file=""
if [ -f ".claude/epics/*/$ARGUMENTS.md" ]; then
  task_file=$(find .claude/epics -name "$ARGUMENTS.md" | head -1)
elif [ -f ".claude/epics/*/$ARGUMENTS.md" ]; then
  task_file=$(find .claude/epics -name "*$ARGUMENTS*.md" | grep -v analysis | head -1)
fi

# Check for analysis (optional in lean mode)
analysis_file=$(find .claude/epics -name "$ARGUMENTS-analysis.md" | head -1)

if [ "$MODE" = "lean" ]; then
  echo "ℹ️ Lean mode: auto-generating streams from issue body"
else
  if [ -z "$analysis_file" ] && [ "$ANALYZE_FLAG" != "true" ]; then
    echo "⚠️ No analysis found for full mode"
    echo "Run: /pm:issue-analyze $ARGUMENTS first"
    echo "Or: /pm:issue-start $ARGUMENTS --analyze"
    exit 1
  fi
fi
```

## Instructions

### 1. Worktree Check (Optional in Lean)

```bash
# Extract epic name from task file
epic_name=$(basename "$(dirname "$task_file")")

# Check worktree (optional in lean mode)
if [ "$USE_WORKTREE" = "true" ]; then
  if ! git worktree list | grep -q "epic-$epic_name"; then
    echo "⚠️ No worktree for epic. Run: /pm:epic-start $epic_name"
    if [ "$MODE" = "lean" ]; then
      echo "ℹ️ Lean mode: continuing without worktree"
    else
      exit 1
    fi
  fi
fi
```

### 2. Setup Progress Tracking (Single File)

```bash
# Get current datetime
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create single progress file
if [ "$SINGLE_LOG" = "true" ]; then
  mkdir -p .claude/issues/$ARGUMENTS
  PROGRESS_FILE=".claude/issues/$ARGUMENTS/progress.md"
  echo -e "# Issue #$ARGUMENTS Progress (mode: $MODE)\n## Start $current_time\n" > "$PROGRESS_FILE"
else
  # Traditional multi-file structure for full mode
  mkdir -p .claude/epics/$epic_name/updates/$ARGUMENTS
fi

# Update task file if exists
if [ -n "$task_file" ]; then
  sed -i.bak "s/updated: .*/updated: $current_time/" "$task_file"
fi
```

### 3. Derive Work Streams

```bash
# Extract streams from analysis or auto-generate
if [ -n "$analysis_file" ]; then
  echo "📋 Using existing analysis from: $analysis_file"
  # Parse analysis file for streams
  streams=("Stream A" "Stream B" "Stream C")
else
  # Auto-generate from issue body (Lean mode)
  if [ "$MODE" = "lean" ]; then
    # Simple split by top-level bullets
    stream_count=$(echo "$body" | grep -E "^- |^\\* " | wc -l | tr -d ' ')
    if [ "$stream_count" -ge 2 ]; then
      streams=("Stream A" "Stream B")
    else
      streams=("Stream A")
    fi
  else
    streams=("Stream A" "Stream B" "Stream C")
  fi
fi

# Limit by parallel cap
streams=("${streams[@]:0:$PARALLEL}")
```

### 4. Launch Parallel Agents

For each stream that can start immediately:

```bash
# Extract issue title for scope locking
issue_title=$(gh issue view $ARGUMENTS --json title -q .title 2>/dev/null || echo "Issue $ARGUMENTS")

# Create stream entries and launch agents
for i in "${!streams[@]}"; do
  stream="${streams[$i]}"
  stream_letter=$(echo "$stream" | grep -o "[A-Z]")

  # Add to progress file
  if [ "$SINGLE_LOG" = "true" ]; then
    echo -e "\n## $stream - ${issue_title}\n- **Scope**: (derived from issue body)\n- **Files**: (to be determined)\n- **Status**: Starting\n- **Started**: $current_time\n" >> "$PROGRESS_FILE"
  else
    # Traditional stream file for full mode
    stream_file=".claude/epics/$epic_name/updates/$ARGUMENTS/stream-${stream_letter,,}.md"
    cat > "$stream_file" << EOF
---
issue: $ARGUMENTS
stream: $stream
agent: general-purpose
started: $current_time
status: in_progress
---

# $stream: ${issue_title}

## Scope
(derived from issue body)

## Files
(to be determined)

## Progress
- Starting implementation
EOF
  fi

  # Launch agent with scope locking
  worktree_path=""
  if [ "$USE_WORKTREE" = "true" ]; then
    worktree_path="../epic-$epic_name/"
  fi

  cat << EOF
Launching $stream agent...
EOF

  # Use Task tool to launch agent
  # Note: In actual implementation, this would spawn the agent
  echo "Agent $stream would be launched here"

  # Update progress
  if [ "$SINGLE_LOG" = "true" ]; then
    echo "- $current_time: Agent launched" >> "$PROGRESS_FILE"
  fi
done
```

### 5. CI/Review Configuration (Mode-dependent)

```bash
# Configure CI based on mode
if [ "$MODE" = "lean" ]; then
  echo "🏃 Lean CI: build + test single pipeline"
  ci_steps=("build" "test")
  review_type="self-check"
else
  echo "🏗️ Full CI: multi-stage pipeline"
  ci_steps=("build" "test" "package" "release")
  review_type="team-review"
fi

# Add CI info to progress
if [ "$SINGLE_LOG" = "true" ]; then
  echo -e "\n## Configuration\n- **CI Pipeline**: ${ci_steps[*]}\n- **Review Type**: $review_type\n- **Parallel Cap**: $PARALLEL\n- **Child Agents Cap**: $CHILD\n" >> "$PROGRESS_FILE"
fi
```

### 6. GitHub Assignment

```bash
# Assign to self and mark in-progress
gh issue edit $ARGUMENTS --add-assignee @me --add-label "in-progress" 2>/dev/null || echo "⚠️ Could not update GitHub issue"
```

### 7. Output

```bash
# Generate final output
echo "✅ Started work on issue #$ARGUMENTS (mode: $MODE)"

if [ "$SINGLE_LOG" = "true" ]; then
  echo "Progress tracking: $PROGRESS_FILE"
else
  echo "Progress tracking: .claude/epics/$epic_name/updates/$ARGUMENTS/"
fi

echo ""
echo "Launching ${#streams[@]} parallel streams:"
for stream in "${streams[@]}"; do
  echo "  $stream ✓ Started"
done

echo ""
echo "Configuration:"
echo "  Mode: $MODE"
echo "  Parallel streams: ${#streams[@]}/${PARALLEL}"
echo "  Child agents cap: $CHILD"
echo "  Worktree: $([ "$USE_WORKTREE" = "true" ] && echo "Required" || echo "Optional")"
echo "  CI: ${ci_steps[*]}"
echo "  Review: $review_type"

if [ "$SINGLE_LOG" = "true" ]; then
  echo ""
  echo "Monitor progress: cat $PROGRESS_FILE"
  echo "Sync updates: /pm:issue-sync $ARGUMENTS"
else
  echo ""
  echo "Monitor with: /pm:epic-status $epic_name"
  echo "Sync updates: /pm:issue-sync $ARGUMENTS"
fi
```

## Error Handling

If any step fails, report clearly:
- "❌ {What failed}: {How to fix}"
- Continue with what's possible
- Never leave partial state

**Lean Mode Recovery:**
- If GitHub API fails: continue in local mode
- If worktree missing: use current branch (lean only)
- If analysis missing: auto-generate simple streams

**Full Mode Requirements:**
- Worktree required for complex tasks
- Analysis required for multi-stream coordination
- Traditional file structure maintained

## Important Notes

### Scope Lock Enforcement
- All stream names MUST use terms from issue title
- No new concepts allowed (e.g., "multi-currency", "role system")
- Source references required for each stream
- Verb changes allowed, terminology must match

### Mode Differences

| Aspect | Lean Mode | Full Mode |
|--------|-----------|-----------|
| **Streams** | 1-2 max | 2-3 max |
| **Files** | Single `progress.md` | Multiple `stream-X.md` |
| **Worktree** | Optional | Required |
| **CI** | build+test | multi-stage |
| **Review** | Self-checklist | Team review |
| **Analysis** | Auto-generated | Required |

### Best Practices
- Small tasks: Use lean mode for faster execution
- Complex tasks: Use full mode for proper coordination
- Always respect scope locking to prevent scope creep
- Monitor progress file for single source of truth

Follow `/rules/datetime.md` for timestamps.
Lean mode prioritizes speed and simplicity over enterprise features.