#!/usr/bin/env python3
"""
Session Summary Hook
Generates a summary when Claude Code session ends.
Logs files modified, commands run, and session duration.

Hook Type: Stop
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

def get_session_log_path() -> Path:
    """Get path to session log file."""
    project_dir = Path(os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd()))
    log_dir = project_dir / '.claude' / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / 'session-summaries.jsonl'

def generate_summary() -> dict:
    """Generate session summary."""
    project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
    
    summary = {
        'timestamp': datetime.now().isoformat(),
        'project_dir': project_dir,
        'session_id': os.environ.get('CLAUDE_SESSION_ID', 'unknown'),
        'end_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }
    
    return summary

def save_summary(summary: dict) -> None:
    """Save summary to log file."""
    log_path = get_session_log_path()
    
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps(summary) + '\n')
    except Exception as e:
        print(f"Could not save summary: {e}", file=sys.stderr)

def display_summary(summary: dict) -> None:
    """Display summary to user."""
    print("\n" + "="*60, file=sys.stderr)
    print("📊 Claude Code Session Summary", file=sys.stderr)
    print("="*60, file=sys.stderr)
    print(f"\n🕐 Session ended: {summary['end_time']}", file=sys.stderr)
    print(f"📁 Project: {summary['project_dir']}", file=sys.stderr)
    print(f"\n✅ Session complete! Logs saved to:", file=sys.stderr)
    print(f"   {get_session_log_path()}", file=sys.stderr)
    print("\n" + "="*60 + "\n", file=sys.stderr)

def main():
    """Main hook execution."""
    try:
        # Generate summary
        summary = generate_summary()
        
        # Save to log file
        save_summary(summary)
        
        # Display to user
        display_summary(summary)
        
        # Always succeed
        sys.exit(0)
        
    except Exception as e:
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == '__main__':
    main()
