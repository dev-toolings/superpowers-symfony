#!/usr/bin/env bash
#
# Claude Code SessionStart hook: a thin wrapper around the harness-agnostic
# bin/symfony-context.
#
# It prints plain Markdown, which SessionStart appends to the session context.
# The previous version printed a bare JSON object; SessionStart parses valid
# JSON as structured hook output, and an object with unknown keys fails schema
# validation, so the detection never reached the model. Markdown avoids that
# class of bug entirely — and needs no JSON escaping in bash.

set -euo pipefail

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

exec "$ROOT/bin/symfony-context" --format=markdown
