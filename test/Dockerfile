FROM node:18-bookworm

RUN apt-get update
RUN apt-get install --yes --no-install-recommends \
    autoconf gcc git iproute2 libjson-c-dev make php-dev

COPY . /fracker

WORKDIR /fracker/test
RUN make rebuild

ENTRYPOINT make test
