#!/usr/bin/env bash
set -euo pipefail
systemctl stop plumcommerce.service 2>/dev/null || true
