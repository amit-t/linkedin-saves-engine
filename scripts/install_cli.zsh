#!/usr/bin/env zsh
set -euo pipefail

script_path=${0:A}
repo_dir=${script_path:h:h}
launcher="$repo_dir/bin/linkedin-saves-engine"
global_bin_dir=${LINKEDIN_SAVES_GLOBAL_BIN_DIR:-"$HOME/.local/bin"}
cli_alias_names=(linkedin-saves-engine li-saves linkedin-content-ideas)

print_step() {
  print -r -- ""
  print -r -- "==> $1"
}

print_step "Preparing launcher"
if [[ ! -x "$launcher" ]]; then
  chmod +x "$launcher"
fi
print -r -- "$launcher"

print_step "Creating global CLI aliases"
mkdir -p "$global_bin_dir"
for alias_name in $cli_alias_names; do
  ln -sfn "$launcher" "$global_bin_dir/$alias_name"
  print -r -- "$global_bin_dir/$alias_name -> $launcher"
done

print_step "Checking PATH"
if [[ ":$PATH:" != *":$global_bin_dir:"* ]]; then
  print -r -- "$global_bin_dir is not currently on PATH."
  print -r -- "Add this to ~/.zshrc if needed:"
  print -r -- "export PATH=\"$global_bin_dir:\$PATH\""
else
  for alias_name in $cli_alias_names; do
    if (( $+commands[$alias_name] )); then
      print -r -- "$alias_name is available on PATH."
    else
      print -r -- "$alias_name will be available after shell hash refresh or new terminal."
    fi
  done
fi

print_step "Done"
print -r -- "Run: li-saves --env .env sync --dry-run --limit 10"
