# Minetest Content Release (`mt-content-release`)

A collection of various utility scripts useful for automatizing Minetest Content Releases.

## About

Written by Lars Mueller aka LMD or appguru(eu). Licensed under the MIT license.

## API

This reflects part of the API. Read the self-documenting code for more.

### Content

```javascript
const content = {
    minetestHome: "/home/user/.minetest/",
    forum: {
        username: "...",
        password: "..."
    },
    cdb: {
        username: "...",
        password: "..."
    },
    github: {
        username: "..."
    },
    games: ["cellestial_game"],
    mods: ["modlib"],
    textures: [],
    packages: [
        {type: "mod", name: "cmdlib", release: false}
    ]
}
```

#### Releasing

```javascript
const mtcr = require("mt-content-release");
const release = mtcr.util.release(content);
// Create next rolling releases for cellestial_game and modlib
release.createCDBReleases();
// Edit ContentDB page title, short description & description
release.editCDBPages();
// Edit Minetest Forum posts (requires "forums = thread_id" in mod/game.conf or forums link on CDB)
release.editForumPosts();
```