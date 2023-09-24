MAKEFLAGS += --always-make

rebuild:
	npm install -C ../app/
	make -C ../ext/

test:
	@./run.sh

clean:
	@find ./cases/ -name 'result--*' -delete

rebuild-docker:
	@docker build -f ./Dockerfile -t fracker-testsuite ..

test-docker:
	@docker run --rm -it fracker-testsuite

clean-docker:
	@docker rmi fracker-testsuite
