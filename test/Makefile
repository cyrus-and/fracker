test:
	@./run.sh

clean:
	@rm -f cases/*.out

rebuild-extension:
	-make -C ../ext distclean
	cd ../ext && phpize --clean && phpize
	cd ../ext && ./configure && make -j $(shell nproc) all

build-docker-image:
	@docker build -f Dockerfile -t fracker-test ..

run-docker-image:
	@docker run --rm -it fracker-test

clean-docker-image:
	@docker rmi fracker-test
