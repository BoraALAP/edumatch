#!/usr/bin/env python3
"""
Protect Sensitive Files Hook
Blocks editing or deletion of sensitive files like .env, secrets, and lock files.

Hook Type: PreToolUse
Matcher: Edit|Write|MultiEdit
"""

import json
import sys
import os

# Files and patterns that should never be modified
PROTECTED_PATTERNS = [
    '.env',
    '.env.local',
    '.env.production',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    '.git/',
    'node_modules/',
    '.next/',
]

# Critical configuration files that need extra confirmation
CRITICAL_FILES = [
    'next.config.js',
    'next.config.mjs',
    'tailwind.config.ts',
    'tsconfig.json',
]

def is_protected(file_path: str) -> bool:
    """Check if file is protected from modifications."""
    for pattern in PROTECTED_PATTERNS:
        if pattern in file_path:
            return True
    return False

def is_critical(file_path: str) -> bool:
    """Check if file is critical and needs extra care."""
    return any(critical in file_path for critical in CRITICAL_FILES)

def main():
    """Main hook execution."""
    try:
        # Read tool input from stdin
        input_data = json.load(sys.stdin)
        
        # Get file path from tool input
        tool_input = input_data.get('tool_input', {})
        file_path = tool_input.get('file_path') or tool_input.get('path')
        
        # Get from environment variables as fallback
        if not file_path:
            file_paths = os.environ.get('CLAUDE_FILE_PATHS', '').split()
            if file_paths:
                file_path = file_paths[0]
        
        if not file_path:
            # No file specified, allow
            sys.exit(0)
        
        # Check if file is protected
        if is_protected(file_path):
            output = {
                "continue": False,
                "stopReason": f"🛑 BLOCKED: Cannot modify protected file '{file_path}'\n\n"
                             f"This file is protected to prevent accidental changes.\n"
                             f"Protected patterns: {', '.join(PROTECTED_PATTERNS)}\n\n"
                             f"If you need to modify this file, do it manually.",
                "suppressOutput": False
            }
            print(json.dumps(output))
            sys.exit(2)  # Exit code 2 blocks the action
        
        # Warn about critical files but allow
        if is_critical(file_path):
            output = {
                "continue": True,
                "systemMessage": f"⚠️ WARNING: Modifying critical configuration file '{file_path}'\n"
                                f"Please review changes carefully.",
                "suppressOutput": False
            }
            print(json.dumps(output))
            sys.exit(0)
        
        # File is safe to modify
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}", file=sys.stderr)
        # Allow on parse errors to not block Claude
        sys.exit(0)
    except Exception as e:
        print(f"Hook error: {e}", file=sys.stderr)
        # Allow on other errors to not block Claude
        sys.exit(0)

if __name__ == '__main__':
    main()
