#!/usr/bin/env bash

# ============================================
# superpowers-symfony Session Start Hook
# Detects Symfony projects and configures environment
# ============================================

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
SKILL_DIR="${PLUGIN_ROOT}/skills/using-symfony-superpowers"

# ============================================
# 1. SYMFONY PROJECT DETECTION
# ============================================

detect_symfony_apps() {
  local search_root="${1:-.}"
  local apps=()

  # Search for composer.json with symfony/framework-bundle
  while IFS= read -r -d '' composer_file; do
    if grep -q '"symfony/framework-bundle"' "$composer_file" 2>/dev/null; then
      local app_dir
      app_dir=$(dirname "$composer_file")
      apps+=("$app_dir")
    fi
  done < <(find "$search_root" \
    -name "composer.json" \
    -not -path "*/vendor/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -print0 2>/dev/null)

  # Guard the empty case: under bash 3.2 + `set -u`, expanding an empty
  # array as "${apps[@]}" raises "apps[@]: unbound variable" (only fixed in
  # bash 4.4+). ${#apps[@]} is safe on an empty array, so gate on the count.
  if [[ ${#apps[@]} -gt 0 ]]; then
    printf '%s\n' "${apps[@]}"
  fi
}

# ============================================
# 2. SYMFONY VERSION DETECTION
# ============================================

get_symfony_version() {
  local app_dir="$1"
  local version=""

  # Priority 1: composer.lock (most accurate)
  if [[ -f "$app_dir/composer.lock" ]]; then
    version=$(grep -A5 '"name": "symfony/framework-bundle"' "$app_dir/composer.lock" 2>/dev/null |
      grep '"version"' | head -1 |
      sed -E 's/.*"version": "v?([0-9]+\.[0-9]+).*/\1/')
  fi

  # Priority 2: composer.json require
  # Anchor on the framework-bundle key so a minified (single-line) composer.json
  # can't bleed another dependency's version into the match.
  if [[ -z "$version" && -f "$app_dir/composer.json" ]]; then
    version=$(grep -oE '"symfony/framework-bundle"[[:space:]]*:[[:space:]]*"[v^~>=! ]*[0-9]+\.[0-9]+' "$app_dir/composer.json" 2>/dev/null |
      head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
  fi

  echo "${version:-unknown}"
}

# ============================================
# 3. API PLATFORM DETECTION
# ============================================

detect_api_platform() {
  local app_dir="$1"
  local has_api_platform="false"
  local api_version=""

  if [[ -f "$app_dir/composer.lock" ]]; then
    if grep -q '"api-platform/core"' "$app_dir/composer.lock" 2>/dev/null; then
      has_api_platform="true"
      api_version=$(grep -A5 '"name": "api-platform/core"' "$app_dir/composer.lock" 2>/dev/null |
        grep '"version"' | head -1 |
        sed -E 's/.*"version": "v?([0-9]+\.[0-9]+).*/\1/')
    fi
  elif [[ -f "$app_dir/composer.json" ]]; then
    if grep -q '"api-platform/core"' "$app_dir/composer.json" 2>/dev/null; then
      has_api_platform="true"
    fi
  fi

  echo "${has_api_platform}:${api_version:-none}"
}

# ============================================
# 4. DOCKER TYPE DETECTION
# ============================================

detect_docker_type() {
  local app_dir="$1"
  local docker_type="none"

  # Check for DDEV first (highest priority)
  if [[ -d "$app_dir/.ddev" ]]; then
    docker_type="ddev"
  # Check for Symfony Docker (dunglas/symfony-docker with FrankenPHP)
  elif [[ -f "$app_dir/compose.yaml" ]]; then
    if grep -qE "(frankenphp|dunglas/symfony-docker|caddy)" "$app_dir/compose.yaml" 2>/dev/null; then
      docker_type="symfony-docker"
    elif grep -q "services:" "$app_dir/compose.yaml" 2>/dev/null; then
      docker_type="compose-yaml"
    fi
  elif [[ -f "$app_dir/compose.yml" ]]; then
    if grep -qE "(frankenphp|dunglas/symfony-docker|caddy)" "$app_dir/compose.yml" 2>/dev/null; then
      docker_type="symfony-docker"
    else
      docker_type="compose-yml"
    fi
  elif [[ -f "$app_dir/docker-compose.yaml" ]]; then
    docker_type="docker-compose-yaml"
  elif [[ -f "$app_dir/docker-compose.yml" ]]; then
    docker_type="docker-compose-yml"
  fi

  # Additional check for Symfony Docker indicators
  if [[ -d "$app_dir/frankenphp" ]] || [[ -f "$app_dir/Caddyfile" ]]; then
    docker_type="symfony-docker"
  fi

  echo "$docker_type"
}

# ============================================
# 5. DOCKER RUNNING STATUS
# ============================================

check_docker_running() {
  local app_dir="$1"
  local docker_type="$2"

  # For testing
  if [[ "${SUPERPOWERS_TEST_DOCKER_RUNNING:-}" == "true" ]]; then
    echo "true"
    return
  fi

  if ! command -v docker &>/dev/null; then
    echo "false"
    return
  fi

  # Check if containers are running in project context
  cd "$app_dir" 2>/dev/null || {
    echo "false"
    return
  }

  if docker compose ps --filter "status=running" 2>/dev/null | grep -q .; then
    echo "true"
  else
    echo "false"
  fi
}

# ============================================
# 6. TEST FRAMEWORK DETECTION
# ============================================

detect_test_framework() {
  local app_dir="$1"
  local framework="phpunit" # Default Symfony

  if [[ -f "$app_dir/composer.lock" ]]; then
    if grep -q '"pestphp/pest"' "$app_dir/composer.lock" 2>/dev/null; then
      framework="pest"
    fi
  elif [[ -f "$app_dir/composer.json" ]]; then
    if grep -q '"pestphp/pest"' "$app_dir/composer.json" 2>/dev/null; then
      framework="pest"
    fi
  fi

  echo "$framework"
}

# ============================================
# 7. DETERMINE RUNNER COMMANDS
# ============================================

get_runner_commands() {
  local app_dir="$1"
  local docker_type="$2"
  local docker_running="$3"

  local runner_cmd="php"
  local console_cmd="php bin/console"
  local composer_cmd="composer"
  local test_cmd="./vendor/bin/phpunit"

  if [[ "$docker_running" == "true" ]]; then
    if [[ "$docker_type" == "ddev" ]]; then
      runner_cmd="ddev exec"
      console_cmd="ddev exec bin/console"
      composer_cmd="ddev composer"
      test_cmd="ddev exec ./vendor/bin/phpunit"
    elif [[ "$docker_type" == "symfony-docker" ]]; then
      runner_cmd="docker compose exec php"
      console_cmd="docker compose exec php bin/console"
      composer_cmd="docker compose exec php composer"
      test_cmd="docker compose exec php ./vendor/bin/phpunit"
    elif [[ "$docker_type" != "none" ]]; then
      # Docker Compose standard - detect service name
      local service_name="php"
      cd "$app_dir" 2>/dev/null || true
      if docker compose config --services 2>/dev/null | grep -q "^app$"; then
        service_name="app"
      fi
      runner_cmd="docker compose exec $service_name"
      console_cmd="docker compose exec $service_name bin/console"
      composer_cmd="docker compose exec $service_name composer"
      test_cmd="docker compose exec $service_name ./vendor/bin/phpunit"
    fi
  fi

  echo "${runner_cmd}|${console_cmd}|${composer_cmd}|${test_cmd}"
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
  local cwd="${PWD}"
  local apps=()

  # Detect Symfony applications
  # NOTE: use a read loop instead of `mapfile -t` — mapfile is a bash 4.0+
  # builtin and macOS ships bash 3.2.57, so mapfile triggers
  # "mapfile: command not found". This idiom is portable across bash 3.2/4/5.
  while IFS= read -r app_line; do
    apps+=("$app_line")
  done < <(detect_symfony_apps "$cwd")

  if [[ ${#apps[@]} -eq 0 ]]; then
    # No Symfony application detected
    exit 0
  fi

  # Determine active application (one in CWD or first found)
  local active_app=""
  for app in "${apps[@]}"; do
    if [[ "$cwd" == "$app"* ]]; then
      active_app="$app"
      break
    fi
  done
  [[ -z "$active_app" ]] && active_app="${apps[0]}"

  # Collect information
  local symfony_version
  local api_platform_info
  local docker_type
  local docker_running
  local test_framework
  local runner_info

  symfony_version=$(get_symfony_version "$active_app")
  api_platform_info=$(detect_api_platform "$active_app")
  docker_type=$(detect_docker_type "$active_app")
  docker_running=$(check_docker_running "$active_app" "$docker_type")
  test_framework=$(detect_test_framework "$active_app")
  runner_info=$(get_runner_commands "$active_app" "$docker_type" "$docker_running")

  # Parse API Platform info
  local has_api_platform="${api_platform_info%%:*}"
  local api_version="${api_platform_info##*:}"

  # Parse runner commands
  IFS='|' read -r runner_cmd console_cmd composer_cmd test_cmd <<<"$runner_info"

  # Determine guidance messages
  local guidance_docker=""
  if [[ "$docker_type" == "ddev" && "$docker_running" == "false" ]]; then
    guidance_docker="Start DDEV with: ddev start"
  elif [[ "$docker_type" == "symfony-docker" && "$docker_running" == "false" ]]; then
    guidance_docker="Start Symfony Docker with: docker compose up -d --wait"
  elif [[ "$docker_type" != "none" && "$docker_type" != "symfony-docker" && "$docker_type" != "ddev" && "$docker_running" == "false" ]]; then
    guidance_docker="Start Docker containers with: docker compose up -d"
  fi

  # Output JSON context for Claude
  cat <<EOF
{
  "plugin": "superpowers-symfony",
  "detected_apps": ${#apps[@]},
  "active_app": "$active_app",
  "symfony": {
    "version": "$symfony_version",
    "is_lts": $(if [[ "$symfony_version" == "6.4" || "$symfony_version" == "7.4" ]]; then echo "true"; else echo "false"; fi),
    "is_legacy": $(if [[ "$symfony_version" == "5.4" || "$symfony_version" == "6.4" ]]; then echo "true"; else echo "false"; fi),
    "current_lts": "7.4",
    "current_stable": "8.1"
  },
  "api_platform": {
    "installed": $has_api_platform,
    "version": "$api_version"
  },
  "docker": {
    "type": "$docker_type",
    "running": $docker_running,
    "is_symfony_docker": $(if [[ "$docker_type" == "symfony-docker" ]]; then echo "true"; else echo "false"; fi)
  },
  "test_framework": "$test_framework",
  "commands": {
    "runner": "$runner_cmd",
    "console": "$console_cmd",
    "composer": "$composer_cmd",
    "test": "$test_cmd"
  },
  "guidance": $(if [[ -n "$guidance_docker" ]]; then echo "\"$guidance_docker\""; else echo "null"; fi)
}
EOF

}

main "$@"
