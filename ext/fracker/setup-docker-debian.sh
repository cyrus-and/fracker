#!/bin/sh

if [ "$#" != 1 ]; then
    echo 'Usage: <container>' >&2
    exit 1
fi

container="$1"

# copy the extension source in the container
docker exec -u root -i "$container" rm -fr /tmp/xdebug-fracker
docker cp "$(dirname "$0")/.." "$container:/tmp/xdebug-fracker"

# run the setup script
docker exec -u root -i "$container" sh <<EOF
# install dependencies
apt-get update
apt-get install --yes autoconf gcc make pkg-config git libjson-c-dev net-tools
apt-get install --yes php-dev
apt-get install --yes php5-dev
apt-get install --yes php7.0-dev

# compile and install
cd /tmp/xdebug-fracker
make distclean
phpize --clean
phpize
./configure
make -j 4 all
make install

# set up the extension
echo "
zend_extension=xdebug.so
xdebug.trace_fracker_host=\$(route -n | awk '/UG/ { print \$2 }')
xdebug.trace_fracker_port=${PORT:-6666}
" >/tmp/xdebug-fracker/fracker.ini
find / -path */php*/conf.d -exec cp /tmp/xdebug-fracker/fracker.ini {} \; 2>/dev/null

# make the web server reload the configuration
pkill -x -HUP apache2
pkill -x -HUP httpd
EOF
