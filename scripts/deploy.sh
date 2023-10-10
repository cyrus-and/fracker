#!/bin/bash

set -e

FRACKER_DIR='/opt/fracker'

# parse arguments
if [[ "$#" -eq 0 || "$#" -gt 3 ]]; then
    echo 'Usage: <container> [<port> [<host>]]' 1>&2
    exit 1
else
    container="$1"
    port="${2:-6666}"
    host="$3"

    # resolve the host
    if [[ "$host" ]]; then
        host="$host"
    else
        # gather host address
        if [[ "$OSTYPE" = darwin* ]]; then
            host='host.docker.internal'
        else
            docker inspect "$container" --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{break}}{{end}}'
        fi
    fi
fi

# install dependencies and utilities
docker exec --user root "$container" apt-get update
docker exec --user root "$container" apt-get --yes install --no-install-recommends \
       autoconf \
       ca-certificates \
       gcc \
       git \
       libjson-c-dev \
       make \
       patch \
       pkg-config \
       vim
docker exec --user root "$container" apt-get --yes install --no-install-recommends php-dev || true

# copy the extension source in the container
docker exec --user root "$container" rm -fr "$FRACKER_DIR"
docker exec --user root "$container" mkdir -p "$FRACKER_DIR"
docker cp "$(dirname "$0")/../ext/Makefile" "$container:$FRACKER_DIR"
docker cp "$(dirname "$0")/../ext/fracker.patch" "$container:$FRACKER_DIR"

# apply the patch and compile
docker exec --user root "$container" make -C "$FRACKER_DIR"
docker exec --user root "$container" cp "$FRACKER_DIR/xdebug/modules/xdebug.so" "$FRACKER_DIR/fracker.so"

# create the configuration file
docker exec --user root --interactive "$container" tee "$FRACKER_DIR/fracker.ini" >/dev/null <<EOF
zend_extension = "$FRACKER_DIR/fracker.so"
xdebug.trace_fracker_host = $host
xdebug.trace_fracker_port = $port
EOF

# clean up the build directory
docker exec --user root "$container" make -C "$FRACKER_DIR" cleanall
docker exec --user root "$container" rm "$FRACKER_DIR/Makefile" "$FRACKER_DIR/fracker.patch"

echo
echo '----------------------------------------------------------------------'
echo

trap "echo 'Cannot install the INI file, do it manually: $FRACKER_DIR/fracker.ini'" ERR

# install the INI file
docker exec --user root "$container" \
       find / -path '/proc/*' -prune -o -path '*/php*/conf.d' -exec cp "$FRACKER_DIR/fracker.ini" {} \;

trap "echo 'Cannot restart the Apache web server, do it manually.'" ERR

# restart the Apache web server
docker exec --user root "$container" /etc/init.d/apache2 reload &>/dev/null

echo "All done! Start Fracker on port $host:$port"
echo
