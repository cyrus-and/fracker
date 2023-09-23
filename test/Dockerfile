FROM node:18-bookworm

RUN apt-get update
RUN apt-get install --yes --no-install-recommends \
    autoconf gcc git libjson-c-dev lsof make php-dev

COPY . /fracker

WORKDIR /fracker/test
RUN make rebuild

ENTRYPOINT make test
