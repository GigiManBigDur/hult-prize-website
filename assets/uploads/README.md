# assets/uploads

Decap CMS's media library (`/admin`, see `admin/config.yml`'s `media_folder`/
`public_folder`) writes any file an editor uploads through the CMS here.

This file exists only so the folder itself is tracked by git — an empty
directory can't be committed on its own, and Decap CMS's media library
fails to initialize at all (blocking every entry from loading, not just
ones with an image field) if `media_folder` points at a path that doesn't
exist yet. Delete this file once a real upload lands here.
