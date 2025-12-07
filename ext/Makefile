MAKEFLAGS += --always-make

XDEBUG_VERSION := 3.5.0
XDEBUG_GIT_URL := https://github.com/xdebug/xdebug

all: fetch-xdebug apply-patch build

fetch-xdebug: cleanall
	@git clone --depth 1 --branch "$(XDEBUG_VERSION)" "$(XDEBUG_GIT_URL)"

apply-patch:
	@patch --directory ./xdebug/ --strip 1 --merge --no-backup-if-mismatch <./fracker.patch

format-patch:
	@git -C ./xdebug/ add .
	@git -C ./xdebug/ diff --cached | grep --invert-match '^index ' >fracker.patch

build:
	@cd ./xdebug/ \
	&& make distclean || true \
	&& phpize \
	&& ./configure \
	&& make -j "$(shell nproc)"

clean:
	@git -C ./xdebug/ reset --hard HEAD
	@git -C ./xdebug/ clean -dx --force

cleanall:
	@rm -fr ./xdebug/
