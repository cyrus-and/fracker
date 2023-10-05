# PHP extension development

All the changes introduced by Fracker to Xdebug are self-contained in a single [patch file](./fracker.patch), to update it:

1. first make sure to start from a fresh state with:

   ```
   make fetch-xdebug
   ```

2. then load the existing patch with:

    ```
    make apply-patch
    ```

3. make the changes in the `./xdebug/` directory, each time building with:

    ```
    make build
    ```

4. try the extansion with:

    ```
    php -d zend_extension=$PWD/xdebug/modules/xdebug.so -r 'var_dump("Hello Fracker!");'
    ```

5. finally save the patch with:

    ```
    make format-patch
    ```

To update the Xdebug version, change the `XDEBUG_VERSION` variable in the `Makefile` then repeat the above steps. You might need to resolve conflicts and other issues manually.
