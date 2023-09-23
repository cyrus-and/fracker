MAKEFLAGS += --always-make

XDEBUG_VERSION := 3.2.2

all: fetch-xdebug apply-patch build
	@echo Use zend_extension=$$PWD/xdebug/modules/xdebug.so

fetch-xdebug: cleanall
	git clone --depth 1 --branch "$(XDEBUG_VERSION)" 'https://github.com/xdebug/xdebug'

status:
	git -C ./xdebug/ status

apply-patch:
	git -C ./xdebug/ apply ../fracker.patch

format-patch:
	git -C ./xdebug/ add .
	git -C ./xdebug/ diff --cached | grep --invert-match '^index ' >fracker.patch

build:
	cd ./xdebug/ \
	&& make distclean || true \
	&& phpize --clean \
	&& phpize \
	&& ./configure \
	&& make -j "$(shell nproc)"

clean:
	git -C ./xdebug/ reset --hard HEAD
	git -C ./xdebug/ clean -dx --force

cleanall:
	rm -fr ./xdebug/
