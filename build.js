var files = [
    "src/TreeBucket.js",
    "src/HashGrid.js",
    "src/HashBounds.js"
];

function Glob(files) {
    var fs = require("fs");

    function regexIndexOf(string, regex, startpos) {
        var indexOf = string.substring(startpos || 0).search(regex);
        return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
    }

    var out = [];

    function get(file) {
        function walk(path, i) {
            try {
                var current = fs.readdirSync(path);
                var rule = after[i];
                if (/[*?[\]]/.test(rule)) {
                    var regex = new RegExp(rule.replace(/[*?]/g, function (a) {
                        return "." + (a === "*" ? "*" : "");
                    }));
                    current.forEach((p) => {
                        if (regex.test(p)) {
                            if (i === after.length - 1) {
                                out.push(path + "/" + p);
                            } else {
                                walk(path + "/" + p, i + 1);
                            }
                        }
                    });
                } else {

                    if (current.indexOf(rule) !== -1) {
                        if (i === after.length - 1) {
                            out.push(path + "/" + rule);
                        } else {
                            walk(path + "/" + rule, i + 1);
                        }
                    }
                }
            } catch (e) {
                //
            }
        }
        if (/[*?[\]]/.test(file)) {
            var ind = regexIndexOf(file, /[*?[\]]/),
                ind2 = file.lastIndexOf("/", ind);

            var before = file.substring(0, ind2),
                after = file.substring(ind2 + 1);
            try {
                fs.statSync(before);
                after = after.split("/");

                walk(before, 0);
            } catch (e) {
                //
            }
        } else {
            if (fs.existsSync(file)) {
                out.push(file);
            }
        }
    }
    if (typeof files === "object") {
        files.forEach((file) => {
            get(file);
        });
    } else {
        get(files);
    }
    return out;
}


function compile(code, callback) {
    const ClosureCompiler = require("google-closure-compiler").compiler;

    const closureCompiler = new ClosureCompiler({
        js: code,
        compilation_level: "SIMPLE",
        rewrite_polyfills: false
    });

    closureCompiler.run((exitCode, stdOut, stdErr) => {
        console.log(stdErr);
        callback(stdOut);
        //compilation complete
    });
}


var fs = require("fs");

files = Glob(files.map((f) => {
    return __dirname + "/" + f;
})).filter((v, i, a) => a.indexOf(v) === i).map((file) => {
    var dt = fs.readFileSync(file, "utf8");
    var ind = dt.indexOf("export default ");
    var ind2 = dt.lastIndexOf('/**', ind);
    var cutoff = Math.max(ind2 != -1 ? ind2 : ind, 0);

    // "// " + file.replace(__dirname + "/src/", "")
    return "\n" + dt.substring(cutoff).replace("export default ", "");
});

var out = files.join("");

var today = new Date();
var dd = today.getDate();
var mm = today.getMonth() + 1; //January is 0!

var yyyy = today.getFullYear();
if (dd < 10) {
    dd = "0" + dd;
}
if (mm < 10) {
    mm = "0" + mm;
}
var date = dd + "/" + mm + "/" + yyyy;

var dt = JSON.parse(fs.readFileSync("package.json", "utf8"));


var top = `\
/*\n\
 ${dt.name.charAt(0).toUpperCase() + dt.name.slice(1)}: ${dt.description}\n\
\n\
 Author: ${dt.author}\n\
 License: ${dt.license} (https://github.com/ThreeLetters/HashBounds/blob/master/LICENSE)\n\
 Source: https://github.com/ThreeLetters/HashBounds\n\
 Build: v${dt.version}\n\
 Built on: ${date}\n\
*/\n\n`;


fs.writeFileSync(__dirname + "/dist/HashBounds.js", top + out);

console.log("Built HashBounds.js. Minifying...");
const exec = require('child_process').exec;

compile(__dirname + "/dist/HashBounds.js", function (compiled) {
    fs.writeFileSync(__dirname + "/dist/HashBounds.min.js", top + compiled);
    console.log("Compiled " + files.length + " files");
    exec('eslint .',
        (error, stdout, stderr) => {
            console.log(stderr);
            console.log(stdout);

            if (error !== null) {
                console.log(`error: ${error}`);
            }
            exec('jest --coverage',
                (error, stdout, stderr) => {
                    console.log(stderr);
                    console.log(stdout);

                    if (error !== null) {
                        console.log(`error: ${error}`);
                    }

                    exec('documentation readme index.js --section=API --github',
                        (error, stdout, stderr) => {
                            console.log(stderr);
                            if (error !== null) {
                                console.log(`error: ${error}`);
                            }
                        });
                });
        });
});

