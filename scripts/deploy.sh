#!/bin/bash

set -e

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

# copy the extension source in the container
docker cp "$(dirname "$0")/../ext" "$container:/tmp/fracker"

# run the setup script
docker exec -u root -i "$container" sh -s -- "$host" "$port" <<\SETUP
set -e

host="$1"
port="$2"

# install dependencies and utilities
apt-get update
apt-get --yes install --no-install-recommends autoconf gcc git libjson-c-dev make pkg-config vim
apt-get --yes install --no-install-recommends php8.2-dev || true

# apply the patch and compile
cd /tmp/fracker
make

# set up the extension
cat >/tmp/fracker/fracker.ini <<INI
zend_extension=/tmp/fracker/xdebug/modules/xdebug.so
xdebug.trace_fracker_host=$host
xdebug.trace_fracker_port=$port
INI
find / -path */php*/conf.d -exec cp /tmp/fracker/fracker.ini {} \; 2>/dev/null || true

# make the web server reload the configuration
pkill -x -HUP apache2 &
pkill -x -HUP httpd &
SETUP

# clean up the container
docker exec "$container" rm -fr /tmp/fracker

# notify the user
echo -e "\n\n\tDone! Start Fracker on port $host:$port\n\n"
