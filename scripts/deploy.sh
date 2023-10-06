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
docker exec -u root "$container" rm -fr /tmp/fracker
docker cp "$(dirname "$0")/../ext" "$container:/tmp/fracker"

# run the setup script
docker exec -u root -i "$container" sh -s -- "$host" "$port" <<\SETUP
set -e

host="$1"
port="$2"

# install dependencies and utilities
apt-get update
apt-get --yes install --no-install-recommends autoconf gcc git libjson-c-dev make pkg-config vim
apt-get --yes install --no-install-recommends php-dev || true

# apply the patch and compile
cd /tmp/fracker
make

# install and set up the extension
cp ./xdebug/modules/xdebug.so "$(php-config --extension-dir)"
cat >"$(php-config --ini-dir)/fracker.ini" <<INI
zend_extension = xdebug
xdebug.trace_fracker_host = $host
xdebug.trace_fracker_port = $port
INI

# reload the web server configuration
/etc/init.d/apache2 reload
SETUP

# clean up the container
docker exec -u root "$container" rm -fr /tmp/fracker

# notify the user
echo -e "\n\n\tDone! Start Fracker on port $host:$port\n\n"
