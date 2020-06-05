const cheerio = require('cheerio');
const axios = require('axios').default;
const querystring = require('querystring');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');

axiosCookieJarSupport(axios);

axios.defaults.withCredentials = true;

const cdb = "https://content.minetest.net/"
async function performApiRequest(url, callback, config) {
    if (!callback) {
        return (await axios.get(cdb+"api/"+url, {json: true, jar: config.jar})).data;
    }
    axios.get(cdb+"api/"+url, {json: true}).then(response => callback(response.data)).catch(console.error);
}

async function performPostRequest(url, data, callback, config) {
    return axios.post(cdb+url, querystring.stringify(data), config).then(function (response) {
        if (callback) {
            callback(response);
        } else {
            console.log(url+": "+response.status);
        }
    }).catch(console.error);
}

const release_defaults = {
    uploadOpt: "vcs",
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

function session(username, token) {
    const cookieJar = new tough.CookieJar();
    async function login(password) {
        axios.get(cdb + "user/sign-in", {jar: cookieJar}).then(function(response) {
            $ = cheerio.load(response.data);
            let data = {username, password};
            $("input").each((_, e) => {
                e = $(e);
                if (e.attr("name") && e.attr("value")) {
                    data[e.attr("name")] = e.attr("value");
                }
            })
            return axios({
                method: "post",
                jar: cookieJar,
                url: cdb + "user/sign-in",
                data: querystring.stringify(data),
                headers: {Referer: "https://content.minetest.net/user/sign-in"}
            });
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
            const url = cdb + "api/" + base_url + "releases/new/";
            axios({
                method: "post",
                url: url,
                headers: {
                    Authorization: "Bearer " + token
                },
                data: {
                    title: release.title,
                    ref: release.ref || "master",
                    method: "git",
                    min_protocol: release.min_protocol,
                    max_protocol: release.max_protocol
                }
            }).then(callback || (response => console.log(url+": "+response.status+"; "+response.data))).catch(reason => console.debug(reason));
        }

        async function getInfo(callback) {
            if (callback) {
                return performApiRequest(base_url, callback, cookieJar);
            }
            return (await performApiRequest(base_url, undefined, cookieJar));
        }

        function replaceInfo(info, callback) {
            return performPostRequest(base_url + "edit/", info, callback, {jar: cookieJar});
        }

        async function editInfo(new_info) {
            axios.get(cdb + base_url + "edit/", {jar: cookieJar}).then(function(response) {
                let $ = cheerio.load(response.data);
                let info = {};
                info.csrf_token = $("input#csrf_token").first().attr("value");
                for (const elem in form_serialization) {
                    $(elem).each((_, e) => {
                        e = $(e);
                        if (e.attr("name")) {
                            let value = form_serialization[elem]($(e));
                            if (value) {
                                info[e.attr("name")] = value;
                            }
                        }
                    });
                }
                delete info.q;
                for (let key in new_info) {
                    info[key] = new_info[key];
                }
                return replaceInfo(info);
            });
        }

        return {getReleases, getNextRelease, createRelease, getInfo, editInfo, replaceInfo};
    }

    return {login, package};
}

module.exports = session;