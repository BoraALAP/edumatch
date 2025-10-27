#!/usr/bin/env python3
"""
Auto-Test Runner Hook
Automatically runs relevant tests after code changes.
Tests are run in the background to not block Claude.

Hook Type: PostToolUse
Matcher: Edit|Write
"""

import json
import sys
import subprocess
import os
from pathlib import Path

def should_run_tests(file_path: str) -> bool:
    """Check if tests should be run for this file."""
    # Only run tests for source code files
    test_extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    # Don't run tests for these directories
    skip_dirs = ['node_modules', '.next', 'dist', 'build']
    
    if any(skip in file_path for skip in skip_dirs):
        return False
    
    return any(file_path.endswith(ext) for ext in test_extensions)

def get_test_file(file_path: str) -> str | None:
    """Get corresponding test file path."""
    # Remove extension
    base = file_path.rsplit('.', 1)[0]
    
    # Possible test file locations
    test_patterns = [
        f"{base}.test.ts",
        f"{base}.test.tsx",
        f"{base}.spec.ts",
        f"{base}.spec.tsx",
    ]
    
    for test_file in test_patterns:
        if os.path.exists(test_file):
            return test_file
    
    return None

def run_tests(file_path: str) -> None:
    """Run tests for the modified file."""
    project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
    
    # Get corresponding test file
    test_file = get_test_file(file_path)
    
    if test_file:
        # Run specific test file
        print(f"🧪 Running tests for: {test_file}", file=sys.stderr)
        try:
            subprocess.Popen(
                ['pnpm', 'test', test_file, '--', '--passWithNoTests'],
                cwd=project_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception as e:
            print(f"Could not run tests: {e}", file=sys.stderr)
    else:
        # No test file found, run all related tests
        # Extract directory for focused test run
        dir_path = os.path.dirname(file_path)
        
        if dir_path:
            print(f"🧪 Running tests in: {dir_path}", file=sys.stderr)
            try:
                subprocess.Popen(
                    ['pnpm', 'test', '--', '--passWithNoTests', f'--testPathPattern={dir_path}'],
                    cwd=project_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception as e:
                print(f"Could not run tests: {e}", file=sys.stderr)

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
            sys.exit(0)
        
        # Check if we should run tests
        if should_run_tests(file_path):
            # Run tests in background (don't wait)
            run_tests(file_path)
        
        # Always succeed immediately (tests run in background)
        sys.exit(0)
        
    except Exception as e:
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()
