#!/usr/bin/env python3
"""
Repo-local ALRAH hooks for Codex.

This compatibility layer only implements behavior supported by Codex hooks today.
It intentionally keeps the runtime self-contained inside the project checkout.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


HOOK_CONFIG_MAP = {
    "SessionStart": "disableSessionStartHook",
    "PreToolUse": "disablePreToolUseHook",
    "PostToolUse": "disablePostToolUseHook",
    "Stop": "disableStopHook",
    "UserPromptSubmit": "disableUserPromptSubmitHook",
}


def main() -> int:
    event_name, payload = parse_args(sys.argv[1:])
    if not event_name:
        return 0

    if is_hook_disabled(event_name):
        return 0

    if event_name == "SessionStart":
        return handle_session_start(payload)
    if event_name == "PreToolUse":
        return handle_pre_tool_use(payload)
    if event_name == "PostToolUse":
        return handle_post_tool_use(payload)
    if event_name == "UserPromptSubmit":
        return handle_user_prompt_submit(payload)
    if event_name == "Stop":
        return handle_stop(payload)
    return 0


def parse_args(argv: list[str]) -> tuple[str | None, dict[str, Any] | None]:
    if len(argv) < 2 or argv[0] != "--hook":
        return None, None

    event_name = argv[1]
    payload: dict[str, Any] = {"hook_event_name": event_name}

    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    payload.update(parsed)
    except Exception:
        pass

    payload["hook_event_name"] = event_name
    return event_name, payload


def repo_root() -> Path:
    try:
        root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if root:
            return Path(root)
    except Exception:
        pass
    return Path.cwd()


def hook_base_dir() -> Path:
    return repo_root() / ".codex" / "hooks"


def load_json(path: Path) -> dict[str, Any] | None:
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                if isinstance(data, dict):
                    return data
    except Exception:
        return None
    return None


def get_config_value(key: str, default: Any = False) -> Any:
    config_dir = hook_base_dir() / "config"
    local_data = load_json(config_dir / "hooks-config.local.json")
    shared_data = load_json(config_dir / "hooks-config.json")

    if local_data is not None and key in local_data:
        return local_data[key]
    if shared_data is not None and key in shared_data:
        return shared_data[key]
    return default


def hooks_enabled_by_project() -> bool:
    config_path = repo_root() / ".agent" / "alrah.json"
    data = load_json(config_path)
    if not data:
        return True
    hooks = data.get("hooks")
    if not isinstance(hooks, dict):
        return True
    enabled = hooks.get("enabled")
    return enabled is not False


def is_hook_disabled(event_name: str) -> bool:
    if not hooks_enabled_by_project():
        return True
    if bool(get_config_value("disableAllHooks", False)):
        return True
    key = HOOK_CONFIG_MAP.get(event_name)
    if not key:
        return False
    return bool(get_config_value(key, False))


def emit(payload: dict[str, Any]) -> int:
    print(json.dumps(payload, ensure_ascii=True))
    return 0


def additional_context_payload(event_name: str, text: str, *, system_message: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "additionalContext": text,
        }
    }
    if system_message:
        payload["systemMessage"] = system_message
    return payload


def get_git_context() -> tuple[str, str]:
    branch = "unknown"
    dirty = "unknown"

    try:
        branch = subprocess.check_output(
            ["git", "branch", "--show-current"],
            stderr=subprocess.DEVNULL,
            text=True,
            cwd=repo_root(),
        ).strip() or "detached"
    except Exception:
        pass

    try:
        status = subprocess.check_output(
            ["git", "status", "--short"],
            stderr=subprocess.DEVNULL,
            text=True,
            cwd=repo_root(),
        ).strip()
        dirty = "dirty" if status else "clean"
    except Exception:
        pass

    return branch, dirty


def resolve_alrah_bin() -> str | None:
    bundled = repo_root() / "alrah"
    if bundled.exists():
        return str(bundled)

    try:
        resolved = subprocess.check_output(
            ["bash", "-lc", "command -v alrah"],
            cwd=repo_root(),
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if resolved:
            return resolved
    except Exception:
        pass
    return None


def run_alrah_hook(command_name: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | None:
    alrah_bin = resolve_alrah_bin()
    if not alrah_bin:
        return None

    try:
        result = subprocess.run(
            [alrah_bin, "hook", command_name, "--project-root", str(repo_root())],
            input=json.dumps(payload) if payload else None,
            cwd=repo_root(),
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except Exception:
        return None

    raw = (result.stdout or "").strip()
    if not raw:
        return None

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None
    return None


def handle_session_start(payload: dict[str, Any] | None) -> int:
    branch, dirty = get_git_context()
    lines = ["ALRAH Codex hooks active for this project."]

    if bool(get_config_value("enableBranchContext", True)):
        lines.append(f"Git branch: {branch} ({dirty}).")

    lines.append(f"Session cwd: {payload.get('cwd') or str(repo_root())}.")

    hook_response = run_alrah_hook("session-context")
    if isinstance(hook_response, dict):
        data = hook_response.get("data")
        if isinstance(data, dict):
            profile = data.get("profileLabel") or data.get("profile")
            project = data.get("project")
            if isinstance(project, str) and project:
                if isinstance(profile, str) and profile:
                    lines.append(f"ALRAH project: {project} | profile: {profile}.")
                else:
                    lines.append(f"ALRAH project: {project}.")

    lines.append(
        "Codex hook limits: PreToolUse/PostToolUse currently see Bash only; "
        "Write/Edit interception and SubagentStop parity are not available in Codex today."
    )
    lines.append(
        "Before closeout, back completion claims with fresh command evidence or state what you did not verify."
    )

    return emit(additional_context_payload("SessionStart", " ".join(lines)))


def handle_pre_tool_use(payload: dict[str, Any] | None) -> int:
    if not bool(get_config_value("enableDestructiveBashGuard", True)):
        return 0

    command = nested_get(payload or {}, "tool_input.command", "")
    if not isinstance(command, str) or not command.strip():
        return 0

    dangerous_patterns = [
        (r"\bgit\s+reset\s+--hard\b", "Blocked destructive git history reset."),
        (r"\bgit\s+checkout\s+--\b", "Blocked destructive checkout that discards local changes."),
        (r"\bgit\s+clean\b[^\n]*\s-f", "Blocked destructive git clean."),
        (r"\bgit\s+push\b[^\n]*\s--force(?:-with-lease)?\b", "Blocked force push."),
        (r"\brm\s+-rf\s+/(?:\s|$)", "Blocked recursive deletion of the filesystem root."),
        (r"\brm\s+-rf\s+~(?:/|\s|$)", "Blocked recursive deletion of the home directory."),
    ]

    for pattern, reason in dangerous_patterns:
        if re.search(pattern, command, flags=re.IGNORECASE):
            return emit(
                {
                    "systemMessage": reason,
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": reason,
                    },
                }
            )

    return 0


def handle_post_tool_use(payload: dict[str, Any] | None) -> int:
    if bool(get_config_value("enableEvidenceLogging", True)):
        mapped_payload = dict(payload or {})
        mapped_payload["tool_name"] = "Bash"
        hook_response = run_alrah_hook("evidence-log", mapped_payload)
        if isinstance(hook_response, dict):
            lines = hook_response.get("messageLines")
            if isinstance(lines, list) and lines:
                text = " ".join([line for line in lines if isinstance(line, str)])
                if text:
                    return emit(additional_context_payload("PostToolUse", text, system_message=text))

    if not bool(get_config_value("enableGitWorkflowReminders", True)):
        return 0

    command = nested_get(payload or {}, "tool_input.command", "")
    if not isinstance(command, str):
        return 0

    command_lower = command.lower()
    if "git commit" in command_lower:
        reminder = (
            "ALRAH reminder: commit completed. Check whether sprint state, contract state, or follow-up work "
            "should be updated before treating the task as complete."
        )
        return emit(additional_context_payload("PostToolUse", reminder, system_message=reminder))

    if "git push" in command_lower:
        reminder = (
            "ALRAH reminder: push completed. Confirm project state, follow-up tasks, and evidence-backed closeout "
            "before claiming the work is done."
        )
        return emit(additional_context_payload("PostToolUse", reminder, system_message=reminder))

    return 0


def handle_user_prompt_submit(payload: dict[str, Any] | None) -> int:
    prompt = (payload or {}).get("prompt", "")
    if not isinstance(prompt, str):
        return 0

    mapped_payload = {"user_prompt": prompt}
    hook_response = run_alrah_hook("policy-context", mapped_payload)
    if isinstance(hook_response, dict):
        lines = hook_response.get("messageLines")
        if isinstance(lines, list) and lines:
            text = " ".join([line for line in lines if isinstance(line, str)])
            if text:
                return emit(additional_context_payload("UserPromptSubmit", text))

    if not bool(get_config_value("enablePromptCloseoutReminder", True)):
        return 0

    if re.search(r"\b(done|fertig|complete|completed|finish|finished|ship|merge|push|commit|ready)\b", prompt, flags=re.IGNORECASE):
        reminder = (
            "ALRAH closeout reminder: before claiming done, fixed, tested, or ready, provide fresh command evidence "
            "or explicitly say what you did not verify."
        )
        return emit(additional_context_payload("UserPromptSubmit", reminder))

    return 0


def handle_stop(payload: dict[str, Any] | None) -> int:
    if not bool(get_config_value("enableStopEvidenceGuard", True)):
        return 0

    last_message = (payload or {}).get("last_assistant_message", "")
    if not isinstance(last_message, str) or not last_message.strip():
        return 0

    claims_completion = re.search(
        r"\b(done|completed|finished|fixed|resolved|implemented|verified|tests pass|passing|ready to merge|ready to ship)\b",
        last_message,
        flags=re.IGNORECASE,
    )
    has_evidence = re.search(
        r"(`|verification|verified|not run|did not run|could not run|wasn't able to run|pnpm |npm run|vitest|pytest|git status|tests? )",
        last_message,
        flags=re.IGNORECASE,
    )

    if claims_completion and not has_evidence:
        return emit(
            {
                "decision": "block",
                "reason": (
                    "Before closing out, add a brief verification section with fresh command evidence or explicitly "
                    "state what you did not verify."
                ),
            }
        )

    return 0


def nested_get(data: dict[str, Any], dotted_key: str, default: Any = None) -> Any:
    current: Any = data
    for key in dotted_key.split("."):
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current


if __name__ == "__main__":
    sys.exit(main())
