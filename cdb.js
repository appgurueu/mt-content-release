const cheerio = require('cheerio');
const axios = require('axios').default;

const cdb = "https://content.minetest.net/"
async function performApiRequest(url, callback) {
    return axios.get(cdb+"api/"+url, {json: true}).then(response => callback(response.data)).catch(console.error);
}

async function performPostRequest(url, data, callback) {
    return axios.post(cdb+url, data).then(callback || console.log).catch(console.error);
}

const release_defaults = {
    uploadOpt:"vcs",
    vcsLabel: "master",
    title: "rolling",
    min_rel: 1,
    max_rel: 1
}

const form_serialization = {
    input: e => e.attr("value"),
    textarea: e => e.text(),
    select: e => e.find("option[selected]").first().attr("value")
}

function session(username) {
    function login(password) {
        axios.get(base_url + "user/sign-in/").then(function(response) {
            $ = cheerio.load(response.data);
            performPostRequest("user/sign-in/", {username, password, csrf_token: $("input#csrf_token").first().attr("value")});
        }).catch(console.error);
    }

    function package(pkg_name) {
        const base_url = `packages/${username}/${pkg_name}/`

        function getReleases(callback) {
            return performApiRequest(base_url + "releases/", callback);
        }

        function getNextRelease(callback) {
            getReleases(function(releases) {
                const last = releases[0];
                const number = last.title.match(/(\d)+$/g)[0];
                last.title = last.title.substring(0, last.title.length - number.length) + (parseInt(number) + 1);
                callback(last);
            });
        }

        function createRelease(release, callback) {
            const url = base_url + "releases/new/";
            let data = release;
            axios.get(cdb + url).then(function(response) {
                let $ = cheerio.load(response.data);
                data.csrf_token = $("input#csrf_token").first().attr("value");
                for (let release_default in release_defaults) {
                    if (!data[release_default]) {
                        data[release_default] = release_defaults[release_default];
                    }
                }
                performPostRequest(url, data, callback);
            }).catch(function(exception) {
                console.error(exception);
            });
        }

        function getInfo(callback) {
            return (await performApiRequest(base_url, callback)).data;
        }

        function replaceInfo(info) {
            return performPostRequest(base_url + "edit/", info);
        }

        function editInfo(new_info) {
            axios.get(cdb + base_url + "edit/").then(function(response) {
                let $ = cheerio.load(response.data);
                let info = {};
                info.csrf_token = $("input#csrf_token").first().attr("value");
                for (const elem in form_serialization) {
                    $(elem).each((_, e) => {
                        info[e.attr("name")] = form_serialization[elem](e);
                    });
                }
                for (let key in new_info) {
                    info[key] = new_info[key];
                }
                delete info.q;
                replaceInfo(info);
            });
        }

        return {getReleases, getNextRelease, createRelease, getInfo, editInfo, replaceInfo};
    }

    return {login, package};
}

module.exports = session;