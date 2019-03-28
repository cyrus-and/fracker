FROM node:8-stretch

RUN apt-get update
RUN apt-get install --yes --no-install-recommends \
    php-dev autoconf gcc make pkg-config git libjson-c-dev iproute2

COPY . /fracker

WORKDIR /fracker/test
RUN make rebuild-extension

ENTRYPOINT make
