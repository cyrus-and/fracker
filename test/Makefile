test:
	@./run.sh

rebuild:
	npm install -C ../app
	-make -C ../ext distclean
	cd ../ext && phpize --clean && phpize
	cd ../ext && ./configure && make -j $(shell nproc) all

clean:
	@find cases/ -name 'result--*' -delete

test-docker:
	@docker run --rm -it fracker-testsuite

rebuild-docker:
	@docker build -f Dockerfile -t fracker-testsuite ..

clean-docker:
	@docker rmi fracker-testsuite
