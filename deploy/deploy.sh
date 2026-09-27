#!/usr/bin/env bash
# Deploy del frontend en el servidor.
#   ./deploy/deploy.sh            -> trae cambios de git, compila y publica
#   ./deploy/deploy.sh rollback   -> vuelve al respaldo anterior del sitio
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/build-vue-app}"
WEB_DIR="${WEB_DIR:-/var/www/vue-monitoring/html}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/vue-monitoring/backups}"
SITE_URL="${SITE_URL:-https://k11box.com}"
KEEP="${KEEP:-5}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

publish() {
  local src="$1"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$src"/ "$WEB_DIR"/
  else
    find "$WEB_DIR" -mindepth 1 -delete
    cp -a "$src"/. "$WEB_DIR"/
  fi
}

check_site() {
  if curl -fsS -o /dev/null --max-time 15 "$SITE_URL/"; then
    echo "Sitio responde OK: $SITE_URL"
  else
    echo "AVISO: $SITE_URL no respondio bien. Si algo se ve roto: $0 rollback" >&2
    return 1
  fi
}

rollback() {
  local latest tmp
  latest="$(ls -1t "$BACKUP_DIR"/html-*.tgz 2>/dev/null | head -n 1 || true)"
  [ -n "$latest" ] || die "No hay respaldos en $BACKUP_DIR"
  log "Restaurando $latest"
  tmp="$(mktemp -d)"
  tar -xzf "$latest" -C "$tmp"
  publish "$tmp"
  rm -rf "$tmp"
  check_site || true
  log "Rollback listo"
}

if [ "${1:-}" = "rollback" ]; then
  rollback
  exit 0
fi

cd "$APP_DIR"
[ -d .git ] || die "$APP_DIR no es un repositorio git"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "Hay cambios sin commit en el servidor. Revisa con: git -C $APP_DIR status"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BEFORE="$(git rev-parse --short HEAD)"

log "Trayendo cambios de origin/$BRANCH"
git fetch origin "$BRANCH"
git merge --ff-only "origin/$BRANCH" || die "No se pudo avanzar en fast-forward"
AFTER="$(git rev-parse --short HEAD)"
echo "Commit: $BEFORE -> $AFTER"

LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
HASH_FILE="node_modules/.deploy-lock-hash"
if [ ! -d node_modules ] || [ "$(cat "$HASH_FILE" 2>/dev/null || true)" != "$LOCK_HASH" ]; then
  log "Instalando dependencias"
  npm ci --no-audit --no-fund
  echo "$LOCK_HASH" > "$HASH_FILE"
else
  log "Dependencias sin cambios"
fi

log "Compilando"
npm run build
[ -f dist/index.html ] || die "El build no genero dist/index.html; no se publica nada"

log "Respaldando el sitio actual"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F-%H%M%S)"
tar -czf "$BACKUP_DIR/html-$STAMP.tgz" -C "$WEB_DIR" .
ls -1t "$BACKUP_DIR"/html-*.tgz | tail -n +$((KEEP + 1)) | xargs -r rm -f

log "Publicando en $WEB_DIR"
publish "$APP_DIR/dist"

check_site || true
log "Deploy terminado ($AFTER). Para volver atras: $0 rollback"
