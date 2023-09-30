MAKEFLAGS += --always-make

build:
	npm install -C ../app/
	make -C ../ext/

test:
	@./run.sh

clean:
	@find ./cases/ -name 'result--*' -delete

docker-build:
	@docker build -f ./Dockerfile -t fracker-testsuite ..

docker-test:
	@docker run --rm -it fracker-testsuite

docker-clean:
	@docker rmi fracker-testsuite
