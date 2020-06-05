const md = require('mark-twain');
const parse5 = require('parse5');

tags = {
    "strong": "b",
    "em": "i",
    "u": "u",
    "code": "icode",
    "h1": ["h", "b"],
    "h2": ["size=150", "color=#115098"],
    "h3": ["size=140", "color=#115098"],
    "h4": ["size=130", "color=#115098"],
    "h5": ["size=120", "color=#115098"],
    "h6": ["size=110", "color=#115098"],
    "img": "img",
    "a": "url",
    "ul": "list",
    "ol": "list=1",
    "li": "*"
};

const preceding_newlines_required = {
    "h1": 1, "h2": 1, "h3": 1, "h4": 1, "h5": 1, "h6": 1
}

const trailing_newlines_required = {
    "p": 1, "h1": 1, "h2": 2, "h3": 2, "h4": 2, "h5": 2, "h6": 2, "img": 1, "ul": 1, "ol": 1, "li": 1, "codeblock": 1
};

function closing(name) {
    const index = name.indexOf("=");
    if (index > 0) {
        return name.substring(0, name.indexOf("="));
    }
    return name;
}

function treeconvert(elem) {
    let children = [];
    if (elem.childNodes) {
        for (let e of elem.childNodes) {
            if (typeof(e) === "object") {
                if (e.nodeName === "#text") {
                    children.push(e.value);
                } else {
                    children.push(treeconvert(e));
                }
            } else {
                children.push(e);
            }
        }
    }
    let obj = {};
    if (elem.attrs) {
        for (let a of elem.attrs) {
            obj[a.name] = a.value;
        }
        if (elem.attrs.length) {
            children.push(obj);
        }
    }
    return [elem.nodeName, ...children];
}

function htmlparse(text) {
    return treeconvert(parse5.parse(text).childNodes[0].childNodes[1]);
}

function BBCGenerator(process_ref) {
    function toBBC(parsed, ignore_html) {
        let html_tag = parsed[0];
        let bb_tagname = tags[html_tag];
        let out = "";
        for (let ci = 1; ci < parsed.length; ci++) {
            let child = parsed[ci];
            if (typeof(child) === "object") {
                if (child.length) {
                    out += toBBC(child);
                } else {
                    if (child.href) {
                        bb_tagname += "=" + process_ref(child.href);
                    } else if (child.src) {
                        out = process_ref(child.src);
                    }
                }
            } else {
                // HACK to prevent htmlparse from stripping spaces
                let start_spaces = child.match(/^\s*/)[0];
                let end_spaces = child.match(/\s*$/)[0];
                // second pass needs to ignore HTML
                out += ignore_html ? child : start_spaces + toBBC(htmlparse(child), true) + end_spaces;
            }
        }
        let final = out;
        if (out.trim() === "") {
            return "";
        }
        if (bb_tagname) {
            if (typeof(bb_tagname) === "string") {
                if (bb_tagname === "icode" && out.indexOf("\n") >= 0) {
                    bb_tagname = "code";
                    html_tag = "codeblock";
                }
                let opening_tag = "[" + bb_tagname + "]";
                let closing_tag = "[/" + closing(bb_tagname) + "]";
                if (bb_tagname.startsWith("url") && final.startsWith("[icode]") && final.endsWith("[/icode]")) {
                    // HACK because [icode][url] renders better than [url][icode]
                    const stripped_final = final.substring("[icode]".length,final.length-("[/icode]".length))
                    final = "[icode]" + opening_tag + stripped_final + closing_tag + "[/icode]";
                } else {
                    final = opening_tag + final + closing_tag;
                }
            } else {
                let start = "";
                let end = ""
                for (let i = 0; i < bb_tagname.length; i++) {
                    start += "[" + bb_tagname[i] + "]";
                    end = "[/" + closing(bb_tagname[i]) + "]" + end;
                }
                final = start + final + end;
            }
        }
        const preceding_newlines = preceding_newlines_required[parsed[0]];
        const trailing_newlines = trailing_newlines_required[parsed[0]];
        return "\n".repeat(preceding_newlines || 0) + final + "\n".repeat(trailing_newlines || 0);
    }
    return function(src) {
        return toBBC(md(src).content);
    };
}

module.exports = BBCGenerator;