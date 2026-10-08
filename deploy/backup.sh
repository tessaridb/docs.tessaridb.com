#!/bin/bash
# Takes a snapshot of the running store, checks it, and keeps 5 + 4 weekly + 2 monthly.
#
# A snapshot is every live record at one moment (`.tessarisnap`). It is the
# backup from engine 0.18.0-beta on, because the node now keeps only the newest
# 100 000 records of each log and a pruned log cannot be copied whole.
# `BACKUP STATE;` is a statement the running node answers, which is why nothing
# has to stop for this.
#
# # It needs a store-wide account, and for a week it did not have one
#
# `BACKUP` reads every record in every namespace, so it has no tenancy to check
# and its subject is the **store**. An owner scoped to one database is refused
# with `"owner" holds one database, and this statement's subject is the whole
# store`. That is exactly what this deployment had until 2026-09-02: the store
# had been bootstrapped by a script that declared a database-scoped owner, and
# it could not be repaired in place — a scoped owner may not declare a wider
# user and a closed store has no anonymous session.
#
# It was repaired by rebuilding: a fresh store whose first user the engine
# itself declares from `TESSARIDB_INITIAL_USER` (which has no `ON`, so it owns
# the store), then a republish of `content/`. Q-DOCS-44.
#
# **If this script ever starts failing that way again, do not paper over it.**
# It means a store was bootstrapped without a store-wide owner, and the same
# store also cannot declare a namespace or be repaired. The fallback that needs
# no account at all is to stop the node and open the store directly:
#
#   docker compose ... stop db
#   docker run --rm --user 0:0 -v "$STORE:/store" -v "$INTO:/out" \
#     tessaridb/tessaridb:0.18.0-beta /store/store --backup /out/manual.tessarisnap
#   docker compose ... start db
#
# The node writes the file itself, into its own backup folder, and answers with
# its path and size. It used to answer with the snapshot as a value, decoded here
# from hex, and that stopped working on 2026-10-09 once the snapshot outgrew the
# 16 MiB a single wire frame may carry: the connection ended mid-frame and the
# script kept nothing. `BACKUP STATE TO` streams to disk instead of holding the
# snapshot in memory, then syncs and verifies it where it was written.
#
# The folder is `TESSARIDB_BACKUP_DIR`, which the image sets inside the store's
# own directory, so the file is copied out of the container and removed there.
# The engine binary is not on the host, so the copy is checked by the engine
# again over a read-only mount before it is kept.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "${HERE}/compose.yaml" --env-file "${HERE}/.env")
INTO="${DOCS_BACKUP_DIR:-/var/backups/docs}"

log() { printf 'backup: %s\n' "$*" >&2; }
# The published engine, read out of `compose.yaml` rather than repeated here.
#
# It has to be the same version the store runs, because a backup is verified by
# an engine and an older one refuses a newer file rather than guessing at it —
# correctly. This was a literal until 2026-09-08, and it drifted: the pin moved
# to 0.0.4-alpha and then 0.0.5-alpha while this line stayed at 0.0.3-alpha, so
# for two nights the node wrote a good log, the check refused to read it, and
# the script discarded it and exited 0. Nothing was in an error state and the
# site had no backup:
#
#   this backup was written by version 0.0.5; this build is 0.0.3 and will not
#   guess at what a newer one meant
#
# A copy of a value that must equal another value is a defect waiting for
# somebody to move one of them, so it is derived. `DOCS_DB_IMAGE` still
# overrides, which is what makes reading an older store possible on purpose.
IMAGE="${DOCS_DB_IMAGE:-}"
if [[ -z "${IMAGE}" ]]; then
  IMAGE="$(sed -n 's|^[[:space:]]*image:[[:space:]]*\(tessaridb/tessaridb:[^[:space:]]*\).*|\1|p' "${HERE}/compose.yaml" | head -1)"
fi
if [[ -z "${IMAGE}" ]]; then
  log "no engine image found in compose.yaml and DOCS_DB_IMAGE is unset"
  exit 1
fi

mkdir -p "${INTO}"
chmod 700 "${INTO}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${INTO}/${STAMP}.tessarisnap"
# Written aside and moved into place only once it has been checked, so the
# directory never holds a file that has not been read back.
WORKING="${FILE}.partial"

log "asking the node for a snapshot"
# The password is read from the container's own environment. An argument would
# be in the process table for anybody on the host to see. The file name is the
# statement's only literal and is made here from the date, never from input;
# the statement takes a quoted name and no parameter.
NAME="${STAMP}.tessarisnap"
IN_DB="$("${COMPOSE[@]}" exec -T db printenv TESSARIDB_BACKUP_DIR)/${NAME}"
"${COMPOSE[@]}" exec -T -e NAME="${NAME}" db sh -c '
    TESSARIDB_PASSWORD="$TESSARIDB_INITIAL_PASSWORD" tessaridb \
      --at "127.0.0.1:${TESSARIDB_ADDRESS##*:}" \
      --user "${TESSARIDB_INITIAL_USER:-owner}" \
      -e "BACKUP STATE TO '"'"'${NAME}'"'"';"' >&2

"${COMPOSE[@]}" cp "db:${IN_DB}" "${WORKING}"
"${COMPOSE[@]}" exec -T db rm -f "${IN_DB}"

if [ ! -s "${WORKING}" ]; then
  rm -f "${WORKING}"
  log "the node wrote nothing"
  exit 1
fi

# Read-only, because a verifier has no business writing to the thing it checks.
log "checking it"
if ! OUT="$(docker run --rm --user 0:0 -v "${INTO}:/b:ro" \
              "${IMAGE}" --verify "/b/$(basename "${WORKING}")" 2>&1)"; then
  log "the file did not verify, so it is not kept: ${OUT}"
  rm -f "${WORKING}"
  exit 1
fi
log "${OUT}"

mv "${WORKING}" "${FILE}"
log "kept ${FILE} ($(stat -c %s "${FILE}") bytes)"

# What is kept is decided by backup-retention.sh: the newest 5 copies, the
# newest of each of the last 4 weeks and of the last 2 months, read from each
# file's name. A `.partial` left by a failed run is removed above, never rotated.
"${HERE}/backup-retention.sh" "${INTO}"
