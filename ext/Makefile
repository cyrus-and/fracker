MAKEFLAGS += --always-make

XDEBUG_VERSION := 3.2.2

fetch-xdebug: cleanall
	git clone --depth 1 --branch "$(XDEBUG_VERSION)" 'https://github.com/xdebug/xdebug'

apply-patch:
	git -C ./xdebug/ apply ../fracker.patch

format-patch:
	git -C ./xdebug/ add .
	git -C ./xdebug/ diff --cached | grep --invert-match '^index ' >fracker.patch

clean:
	git -C ./xdebug/ reset --hard HEAD
	git -C ./xdebug/ clean -dx --force

cleanall:
	rm -fr ./xdebug/
