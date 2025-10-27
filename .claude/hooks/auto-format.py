#!/usr/bin/env python3
"""
Auto-Format Hook
Automatically formats TypeScript, JavaScript, and CSS files after editing.
Uses Prettier with Next.js configuration.

Hook Type: PostToolUse
Matcher: Edit|Write
"""

import json
import sys
import subprocess
import os
from pathlib import Path

def should_format(file_path: str) -> bool:
    """Check if file should be formatted."""
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md']
    return any(file_path.endswith(ext) for ext in extensions)

def format_file(file_path: str) -> bool:
    """Format file using Prettier."""
    try:
        # Run prettier on the file
        result = subprocess.run(
            ['npx', 'prettier', '--write', file_path],
            capture_output=True,
            text=True,
            cwd=os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error formatting {file_path}: {e}", file=sys.stderr)
        return False

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
            # No file to format, exit successfully
            sys.exit(0)
        
        # Check if file should be formatted
        if should_format(file_path):
            if format_file(file_path):
                print(f"✓ Formatted: {file_path}", file=sys.stderr)
            else:
                print(f"⚠ Could not format: {file_path}", file=sys.stderr)
        
        # Always succeed so Claude continues
        sys.exit(0)
        
    except Exception as e:
        print(f"Hook error: {e}", file=sys.stderr)
        # Don't block Claude on hook errors
        sys.exit(0)

if __name__ == '__main__':
    main()
