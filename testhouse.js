const fs = require('fs');
const readConf = require("./mt_conf.js");
const Jimp = require('jimp');

class Rating {
    constructor(message, impact, max_impact) {
        this.message = message;
        this.impact = impact/100;
        this.max_impact = max_impact/100;
        this.children = [];
    }

    addChild(rating) {
        this.children.push(rating);
    }

    add(message, impact, factor) {
        if (impact === true) {
            impact = factor;
        } else if (impact === false || impact === undefined || impact === null) {
            impact = 0;
        }
        const rating = new Rating(message, impact, factor);
        this.addChild(rating);
        return rating;
    }

    calculateImpact() {
        let total_impact = 0;
        for (const child of this.children) {
            total_impact += child.calculateImpact();
        }
        this.impact = total_impact * this.impact;
    }

    _toString(tab) {
        let lines = ["["+this.impact*100+"] " + this.message];
        for (const child of this.children) {
            lines.push(child._toString(tab + 1));
        }
        return ("\n" + "-".repeat(tab)).join(lines);
    }

    toString() {
        return _toString(0);
    }
}

async function auditMod(params) {
    // TODO 0.4.x support, settingtypes.txt
    const {mod_home} = params;
    let rating = new Rating("Mod audit", 100, 100);
    let metadata = rating.add("Metadata", 30, 30);
    let mod_conf = metadata.add("mod.conf", 30, 30);
    try {
        const conf = readConf(fs.readFileSync(mod_home + "/mod.conf"));
        const fields = ["name", "description"];
        for (let field of fields) {
            mod_conf.add("Field "+field, conf[field], 100/fields.length);
        }
    } catch (err) {
        if (err instanceof SyntaxError) {
            mod_conf.message += ": Syntax error: " + err.message;
            mod_conf.impact = 0;
        }
        if (err.code !== 'ENOENT') throw err;
    }
    const screenshot_path = mod_home + "/screenshot.png";
    const screenshot_exists = fs.existsSync(screenshot_path);
    let screenshot = metadata.add("Screenshot", screenshot_exists, 10);
    if (screenshot_exists) {
        Jimp.read(screenshot_path).then(image => {
            const width = image.bitmap.width;
            const height = image.bitmap.height;
            const ratio = width/height;
            screenshot.add("Ratio of 3:2 vs "+ratio, math.abs(3/2 - ratio) <= 0.1, 50);
            screenshot.add("Size >= 300x200 vs "+width+"x"+height, width >= 300 && height >= 200, 50);
        })
    }

    let readme_exists = false;
    readme_check: for (const file of ["Readme", "readme", "README"]) {
        for (const type of ["md", "txt"]) {
            if (readme_exists = fs.existsSync(mod_home + file + type)) {
                break readme_check;
            }
        }
    }
    metadata.add("Readme", readme_exists, 30);

    let media = rating.add("Media", 30, 30);
    const media_folders = {
        "textures": ["png", "jpg", "jpeg"],
        "sounds": ["ogg"],
        "models": ["x", "b3d", "obj"],
        "shaders": ["vs.glsl", "fs.glsl", "gs.glsl"],
        "locale": ["tr"]
    }
    for (const folder in media_folders) {
        const extensions = media_folders[folder];
        const dir = mod_home + "/" + folder;
        let is_fine = true;
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(file => {
                for (const ext of extensions) {
                    if (!file.endsWith("." + ext)) {
                        is_fine = false;
                        return;
                    }
                }
            });
        }
        media.add(folder + " only contains " + ", ".join(extensions), is_fine, 100/6);
    }
    media.add("No generic media folder", !fs.existsSync(mod_home + "/media"), 100/6);

    let code = rating.add("Code", 10, 10);
    code.add("init.lua", fs.existsSync(mod_home + "/init.lua"), 30);

    rating.calculateImpact();
    return rating.toString();
}

module.exports = {auditMod};