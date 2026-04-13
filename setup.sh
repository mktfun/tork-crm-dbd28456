#!/bin/bash
# 🪐 Antigravity Config Setup Script
# Usage: ./setup.sh [target-directory]
# If no target directory is specified, uses current directory.

set -e

TARGET_DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🪐 Antigravity Config Kit — Setup"
echo "=================================="
echo "Target: $TARGET_DIR"
echo ""

# Create directories
mkdir -p "$TARGET_DIR/.agent/skills/ux-ui-architect-2026"
mkdir -p "$TARGET_DIR/.agent/workflows"
mkdir -p "$TARGET_DIR/.antigravity"
mkdir -p "$TARGET_DIR/specs"

# Copy skills
cp "$SCRIPT_DIR/.agent/skills/ux-ui-architect-2026/SKILL.md" \
   "$TARGET_DIR/.agent/skills/ux-ui-architect-2026/SKILL.md"
echo "✅ Skill: ux-ui-architect-2026"

# Copy workflows
for f in "$SCRIPT_DIR/.agent/workflows/"*.md; do
  cp "$f" "$TARGET_DIR/.agent/workflows/"
  echo "✅ Workflow: $(basename "$f" .md)"
done

# Copy rules
cp "$SCRIPT_DIR/.antigravity/rules.md" "$TARGET_DIR/.antigravity/rules.md"
echo "✅ Rules: rules.md"

# Optionally copy templates
if [ -d "$SCRIPT_DIR/templates" ]; then
  cp -r "$SCRIPT_DIR/templates" "$TARGET_DIR/templates"
  echo "✅ Templates copied"
fi

echo ""
echo "🎉 Setup complete! Open $TARGET_DIR in your editor with Antigravity."
echo "   Use /vibe-proposal to start planning your first feature."
