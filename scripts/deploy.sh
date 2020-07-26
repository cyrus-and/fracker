#!/bin/sh

if [ "$#" -eq 0 -o "$#" -gt 3 ]; then
    echo 'Usage: <container> [<port> [<host>]]' >&2
    exit 1
fi

container="$1"
port="${2:-6666}"
host="${3}"

# copy the extension source in the container
docker exec -u root -i "$container" rm -fr /tmp/fracker
docker cp "$(dirname "$0")/../ext" "$container:/tmp/fracker"

# run the setup script
docker exec -u root -i "$container" sh <<SETUP
set -e

# install dependencies
apt-get update
apt-get install --yes autoconf gcc make git libjson-c-dev net-tools vim pkg-config
apt-get install --yes php-dev || true

# compile and install
cd /tmp/fracker
make distclean || true
phpize --clean
phpize
./configure
make -j "\$(nproc)" all

if [ "$host" ]; then
    host="$host"
else
    # gather host address
    if [ "$(uname)" = Linux ]; then
       host="\$(route -n | awk '/UG/ { print \$2 }')"
    else
       host='host.docker.internal'
    fi
fi

# set up the extension
cat >/tmp/fracker/fracker.ini <<INI
zend_extension=/tmp/fracker/.libs/xdebug.so
xdebug.trace_fracker_host=\$host
xdebug.trace_fracker_port=$port
INI
find / -path */php*/conf.d -exec cp /tmp/fracker/fracker.ini {} \; 2>/dev/null || true

# make the web server reload the configuration
sleep 1
pkill -x -HUP apache2 &
pkill -x -HUP httpd &

# notify the user
TERM=$TERM clear || true
echo "\n\tDone! Start Fracker on port \$host:$port\n"
SETUP
