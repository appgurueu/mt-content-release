const fs = require("fs");
const cdb = require("./cdb.js");
const mtForum = require("./mt_forum.js");
const bbc = require("./bbc.js");
const mtConf = require("./mt_conf.js");
const { sleep } = require("./common.js");

async function release(content) {
    content.packages = content.packages || [];
    for (const type of ["mod", "game", "texture"]) {
        let pkgs = (content[type+"s"] || []).map(pkg => {
            if (typeof(pkg) === "string") {
                return {type: type, name: pkg};
            }
            pkg.type = type;
            return pkg;
        });
        content.packages = [...content.packages, ...pkgs];
    }

    const session = cdb(content.cdb.username);

    for (const pkg of content.packages) {
        const base_path = content.minetestHome + pkg.type + "s/" + pkg.name + "/";
        const readme = fs.readFileSync(base_path + "Readme.md").toString("utf-8");
        let conf = fs.readFileSync(base_path + pkg.type + ".conf");
        conf = conf ? mtConf(conf.toString("utf-8")) : {};
        if (!conf.title || !conf.description || !conf.forums) {
            let info = await session.package(pkg.name).getInfo();
            conf.title = conf.title || info.title;
            conf.description = conf.description || info.short_description;
            conf.forums = conf.forums || info.forums;
        }
        conf.readme = readme;
        pkg.conf = conf;
    }

    function createCDBReleases() {
        for (const pkg of content.packages) {
            if (pkg.release === false) {
                continue;
            }
            session.getNextRelease(release => session.createRelease(release));
        }
    }

    async function editCDBPages() {
        session.login(content.cdb.password).then(async function() {
            for (const pkg of content.packages) {
                const conf = pkg.conf;
                await session.package(pkg.name).editInfo({title: conf.title, short_desc: conf.description, desc: conf.readme});
                await sleep(1);
            }
        });
    }

    function obtainForumEditActions() {
        let actions = [];
        for (const pkg of content.packages) {
            const toBBC = bbc((ref) => {
                if (ref.startsWith("http")) {
                    return ref;
                }
                return "https://raw.githubusercontent.com/"+content.github.username+"/"+pkg.name+"/master/"+ref;
            });
            const prefix = "[" + pkg.type.sub(0, 1).toUpperCase() + pkg.type.sub(1) + "] ";
            const suffix = " [" + pkg.name + "]";
            let subject = prefix + pkg.conf.title + " - " + pkg.conf.description + suffix;
            if (subject.length > 60) {
                subject = prefix + pkg.conf.title + suffix;
            }
            const action = {
                "type": "edit",
                "id": pkg.conf.forums,
                "subject": subject,
                // TODO find better method than removing all non-latin characters
                "message": toBBC(pkg.conf.readme.replace(/[^\x00-\xFF]/g, ""))
            };
            actions.push(action);
        }
        return actions;
    }

    function editForumPosts(content) {
        obtainForumEditActions(content).then(actions => mtForum(content.forum.username, content.forum.password, actions));
    }

    return {createCDBReleases, editCDBPages, editForumPosts};
}

module.exports = release;