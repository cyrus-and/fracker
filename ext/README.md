# Development

Instead of keeping a fork of Xdebug, we keep a single patch file so that all the changes are self-contained.

To make a change to the extension:

1. first make sure to start from a fresh state with `make fetch-xdebug`;

2. then load the existing patch with `make apply-patch`;

3. experiment and make the changes in the `./xdebug/` directory;

4. finally save the patch with `make format-patch`.

To update the Xdebug version change the `XDEBUG_VERSION` variable in the `Makefile` then continue with the above steps. You might need to resolve conflicts and other issues manually.
