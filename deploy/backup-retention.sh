#!/bin/bash
# Decides which backups in a folder are kept, and removes the rest.
#
#   backup-retention.sh <folder> [--dry-run]
#
# Kept is the union of three sets, each read from the time in the file's NAME
# (`20261001T164913Z.tessarisnap`) rather than from its mtime, which a copy or a
# restore of the folder would reset:
#
#   - the newest 5 copies;
#   - the newest copy of each of the 4 most recent ISO weeks that hold one;
#   - the newest copy of each of the 2 most recent months that hold one.
#
# "Most recent weeks that hold one" rather than "the last 28 days": if backups
# stop for a while, the weekly and monthly copies are the history from before
# the gap, which is when they matter, and a calendar window would delete them.
#
# Every extension backup.sh has written is counted — `.tessarisnap` now,
# `.tessarilog` until 0.18.0-beta, `.tessalog` before that — so the older files
# leave by the same rule as soon as newer copies cover their week and month,
# and never while one is the only copy of its period. A file whose name carries
# no time is never removed: what cannot be dated cannot be judged.
set -euo pipefail

log() { printf 'retention: %s\n' "$*" >&2; }

INTO="${1:?usage: backup-retention.sh <folder> [--dry-run]}"
DRY="${2:-}"
NEWEST=5
WEEKS=4
MONTHS=2

declare -A KEEP=() WEEK_SEEN=() MONTH_SEEN=()
weeks=0
months=0
rank=0

# Newest first. The stamp sorts as text in time order, so no date arithmetic is
# needed to order them, only to bucket them.
mapfile -t FILES < <(
  find "${INTO}" -maxdepth 1 -type f \
    \( -name '*.tessarisnap' -o -name '*.tessarilog' -o -name '*.tessalog' \) \
    -printf '%f\n' | sort -r
)

for name in "${FILES[@]:-}"; do
  [ -n "${name}" ] || continue
  stamp="${name%%.*}"
  if ! [[ "${stamp}" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})T[0-9]{6}Z$ ]]; then
    log "kept ${name}: its name carries no time"
    KEEP["${name}"]=undated
    continue
  fi
  day="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
  week="$(date -u -d "${day}" +%G-W%V)"
  month="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}"

  if (( rank < NEWEST )); then KEEP["${name}"]=newest; fi
  rank=$((rank + 1))
  if [ -z "${WEEK_SEEN[${week}]:-}" ] && (( weeks < WEEKS )); then
    WEEK_SEEN["${week}"]=1
    weeks=$((weeks + 1))
    KEEP["${name}"]="${KEEP[${name}]:-}${KEEP[${name}]:+,}week ${week}"
  fi
  if [ -z "${MONTH_SEEN[${month}]:-}" ] && (( months < MONTHS )); then
    MONTH_SEEN["${month}"]=1
    months=$((months + 1))
    KEEP["${name}"]="${KEEP[${name}]:-}${KEEP[${name}]:+,}month ${month}"
  fi
done

for name in "${FILES[@]:-}"; do
  [ -n "${name}" ] || continue
  if [ -n "${KEEP[${name}]:-}" ]; then
    log "kept ${name} (${KEEP[${name}]})"
  elif [ "${DRY}" = "--dry-run" ]; then
    log "would remove ${name}"
  else
    rm -f "${INTO}/${name}"
    log "removed ${name}"
  fi
done
