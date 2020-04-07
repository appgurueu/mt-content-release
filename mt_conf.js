function readConf(conf) {
    const lines = conf.split(/\r?\n|\r/);
    let dict = {};
    for (let i = 0; i < lines.length; i++) {
        const error_base = "Line " + (i+1) + ": ";
        let line = lines[i].trimLeft();
        if (line.startsWith("#") || line.length === 0) {
            continue;
        }
        line = line.split("=", 2);
        if (line.length !== 2) {
            throw new SyntaxError(error_base + "No value given");
        }
        const prop = line[0].trimRight();
        if (prop.length === 0) {
            throw new SyntaxError(error_base + "No key given");
        }
        let val = line[1].trimLeft();
        if (val.length === 0) {
            throw new SyntaxError(error_base + "No value given");
        }
        if (val.startsWith('"""')) {
            val = val.substring(3);
            let total_val = [];
            readMultiline: {
                while (i < lines.length) {
                    if (val.endsWith('"""')) {
                        val = val.substring(0, val.length - 3);
                        break readMultiline;
                    }
                    total_val.push(val);
                    val = lines[++i];
                }
                i--;
                throw new SyntaxError(error_base + "Unclosed multiline block");
            }
            total_val.push(val);
            val = total_val.join("\n");
        } else {
            val = val.trimRight();
        }
        if (dict[prop]) {
            throw new Error(error_base + "Duplicate key");
        }
        dict[prop] = val;
    }
    return dict;
}

module.exports = readConf;