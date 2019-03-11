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
docker exec -u root -i "$container" sh <<EOF
set -e

# install dependencies
apt-get update
apt-get install --yes autoconf gcc make pkg-config git libjson-c-dev net-tools vim
apt-get install --yes php-dev || true
apt-get install --yes php7.0-dev || true

# compile and install
cd /tmp/fracker
make distclean || true
phpize --clean
phpize
./configure
make -j "$(nproc)" all

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
echo "
zend_extension=/tmp/fracker/.libs/xdebug.so
xdebug.trace_fracker_host=\$host
xdebug.trace_fracker_port=$port
" >/tmp/fracker/fracker.ini
find / -path */php*/conf.d -exec cp /tmp/fracker/fracker.ini {} \; 2>/dev/null || true

# notify the user
echo '---'
echo
echo "Start Fracker on port \$host:$port"
echo

# make the web server reload the configuration
sleep 1
pkill -x -HUP apache2 &
pkill -x -HUP httpd &
EOF
