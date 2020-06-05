# Minetest Content Release (`mt-content-release`)

A collection of various utility scripts useful for automatizing Minetest Content Releases.

## About

Written by Lars Mueller aka LMD or appguru(eu). Licensed under the MIT license.

## API

This reflects part of the API. Read the self-documenting code for more.

### Content

```javascript
const content = {
    // Minetest home folder of Ubuntu PPA installs
    minetestHome: "/home/user/.minetest/",
    forum: {
        username: "...",
        password: "..."
    },
    cdb: {
        username: "...",
        password: "...",
        token: "..."
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
const { exec } = require("child_process");
function execute(command, callback) {
    console.log("Executing " + command);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            throw error.message;
        }
        callback(stdout);
    });
}
mtcr.util.release(content).then(release => {
    // Example code
    for (const pkg of release.content.packages) {
        execute('cd "'+pkg.path+'" && git log --pretty=format:"%H" -n 1', hash => {
            const pkg_session = release.session.package(pkg.name);
            pkg_session.getReleases(function(releases) {
                if (releases[0].commit != hash) {
                    console.log("Package "+pkg.name+" has unreleased changes - " + hash + " vs " + releases[0].commit);
                    execute('cd "' + pkg.path + '" && git push -u origin master', done => {
                        pkg_session.getNextRelease(release => {
                            pkg_session.createRelease({title: release.title});
                        });
                    });
                }
            })
            execute('cd "' + pkg.path + '" && git status --porcelain', status => {
                if (status) {
                    console.log("Package " + pkg.name + " has uncommitted changes");
                }
            })
        });
    }
    // Create next rolling releases for cellestial_game and modlib, untested
    release.createCDBReleases();
    // Edit ContentDB page title, short description & description, tested
    release.editCDBPages();
    // Edit Minetest Forum posts (requires "forums = thread_id" in mod/game.conf or forums link on CDB), tested
    release.editForumPosts();
});
```

#### Testhouse

Audit tool for Minetest content. Still experimental.