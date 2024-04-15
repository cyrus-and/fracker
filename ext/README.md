# PHP extension development

All the changes introduced by Fracker to Xdebug are self-contained in a single [patch file](./fracker.patch), perform the following steps to to update it.

1. Make sure to start from a fresh state with:

   ```
   make fetch-xdebug
   ```

2. Load the existing patch with:

    ```
    make apply-patch
    ```

3. Make the changes in the `./xdebug/` directory, each time building with:

    ```
    make build
    ```

4. Try the extension with after starting Fracker as usual:

    ```
    php -d zend_extension=$PWD/xdebug/modules/xdebug.so -r 'var_dump("Hello Fracker!");'
    ```

    The expected Fracker output should be:

    ```
    001 │ PHP ["Standard input code"]
    001 │ {main}() Command line code +0
    001 │ »  var_dump(value="Hello Fracker!", values=null) Command line code +1
    ```

5. Save the patch with:

    ```
    make format-patch
    ```

6. Run the test suite as described in the [test](/test/) folder.

To update the Xdebug version, change the `XDEBUG_VERSION` variable in the `Makefile` then repeat the above steps, conflicts and other issues must be addressed manually. Same goes for downgrading Xdebug in order to support older PHP versions, refer to [this](https://xdebug.org/docs/compat) page to find the right version.

After any update commit using the `Update Xdebug to <XDEBUG_VERSION>` message and tag with `xdebug-<XDEBUG_VERSION>`.
