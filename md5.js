var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var gutil = console;
var chalk = require('chalk');
var crypto = require('crypto');
var url = require('url');


/*配置*/
//配置需要处理的html路径
var md5HtmlResourceDerectory = path.resolve(__dirname, "./WEB-INF/views");
var _static_path = path.resolve(__dirname);



/*
递归处理文件,文件夹
path 路径
floor 层数
handleFile 文件,文件夹处理函数
*/

function walkSync(path, floor, handleFileSync, fn) {
	handleFileSync(path, floor, fn);
	floor++;
	var files = fs.readdirSync(path);
	for (var i = 0; i < files.length; i++) {
		var item = files[i];
		var tmpPath = path + '/' + item;
		var stats = fs.statSync(tmpPath);
		if (stats.isDirectory()) {
			walkSync(tmpPath, floor, handleFileSync, fn);
		} else {
			handleFileSync(tmpPath, floor, fn);
		}
	}
}

function handleFileSync(path, floor, fn) {
	var blankStr = '';
	for (var i = 0; i < floor; i++) {
		blankStr += '    ';
	}
	var stats = fs.statSync(path);
	if (stats.isDirectory()) {
		// gutil.log('+' + blankStr + path);
	} else {
		// gutil.log('-' + blankStr + path);
		if (fn) return fn(path)
		else concatByHtml(path);
	}
}

function resolveSrc(dir, fn) {
	walkSync(dir, 0, handleFileSync, fn);
}

var cssReg = /<\!--\s+build:css\s+([^\?\s]+)\s*-->\s*((<link\s+[^><]*href=(\"([^\"]+)\"|\'([^\']+)\')[^><]*\/?>\s*)*)<!--\s+\/build\s+-->/g;
var jsReg = /<\!--\s+build:js\s+([^\?\s]+)\s*-->\s*((<script\s+[^><]*src=(\"([^\"]+)\"|\'([^\']+)\')[^><]*><\/script>\s*)*)<!--\s+\/build\s+-->/g;
var regScript = /<script\s+[^><]*src=(\"([^\"]+)\"|\'([^\']+)\')[^><]*><\/script>\s*/g;
var regLink = /<link\s+[^><]*href=(\"([^\"]+)\"|\'([^\']+)\')[^><]*\/?>\s*/g;
var cssMin = {};
var jsMin = {};
var minFromHtmlMap = {};
var ignoreCheckMin = {};
var warning = {};
var hasErrInMinFromHtmlMap = false;
var buildDir = path.resolve(__dirname, '../static/build/html/');
var sourceDir = path.resolve(__dirname, '../static/public/html/');
module.exports.concat = function(p_sourceDir, p_buildDir) {
	if (!fs.existsSync(p_sourceDir)) {
		gutil.log("error p_sourceDir:" + p_sourceDir);
		return false;
	}
	console.log(p_buildDir)
	if (!fs.existsSync(p_buildDir)) fs.mkdirSync(p_buildDir);
	buildDir = p_buildDir;
	sourceDir = p_sourceDir;
	resolveSrc(p_sourceDir);
	gutil.log("done!");
	gutil.log("=======================================================");
	gutil.log("-----------------------cssMin------------------------");
	gutil.log(cssMin);
	gutil.log();
	gutil.log("=======================================================")
	gutil.log("-----------------------jsMin------------------------");
	gutil.log(jsMin);
	gutil.log();
	gutil.log("=======================================================")
	if (Object.keys(warning).length) {
		gutil.log("warning for use \"'\" -----------------------------------")
		gutil.log(warning);
		gutil.log();
		gutil.log("=======================================================")
	}
	checkAndShowMinFromHtmlMap();
	return {
		css: cssMin,
		js: jsMin
	}
}

module.exports.check = function(config, keyDir, valueDir) {
	valueDir = valueDir || keyDir;
	var success = true;
	console.log("check source ==> " + keyDir);
	["css", "js"].forEach(function(cj) {
		var cjconfig = config[cj];
		for (var key in cjconfig) {
			if (!fs.existsSync(path.join(keyDir, key))) {
				success = false;
				console.log("no exists: " + key);
			}
			for (var value in cjconfig[key]) {
				if (!fs.existsSync(path.join(valueDir, value))) {
					success = false;
					console.log("no exists: " + value);
				}
			}
		}
	});
	console.log('complete ==> ' + (success ? chalk.blue('success!') : chalk.red('fail!!!')));
}

module.exports.checkResourceByHtml = function(staticPath, buildDir) {
	// TO DO
}


function addWarning(path, minName, minPart) {
	if (!warning[path]) warning[path] = {};
	if (!warning[path][minName]) warning[path][minName] = {};
	warning[path][minName][minPart] = 1;
}

function addMinFromHtmlMap(path, minName, minMap) {
	minMap = JSON.stringify(minMap);
	var pushedWithoutError = false;
	if (!minFromHtmlMap[minName]) minFromHtmlMap[minName] = {};
	var keys = Object.keys(minFromHtmlMap[minName]); //minMap:obj
	if (keys.length) {
		for (var i in keys) {
			var _minMap = keys[i];
			if (_.isEqual(_minMap, JSON.stringify(minMap))) {
				minFromHtmlMap[minName][_minMap].push(path);
				pushedWithoutError = true;
			}
		}
		if (!pushedWithoutError) {
			minFromHtmlMap[minName][JSON.stringify(minMap)] = [path];
			hasErrInMinFromHtmlMap = true;
		}
	} else {
		minFromHtmlMap[minName][JSON.stringify(minMap)] = [path];
		pushedWithoutError = true;
	}
	return pushedWithoutError;
}

function checkAndShowMinFromHtmlMap() {
	if (hasErrInMinFromHtmlMap) {
		gutil.log("\x1b[1;36m发现错误的配置,一个min文件在多个html中配置不一样!!\x1b[0m\n");
		for (var minName in minFromHtmlMap) {
			var minMapPath = minFromHtmlMap[minName];
			var minMapArr = Object.keys(minMapPath);
			if (minMapArr.length > 1) {
				gutil.log("----------------------------------------------------");
				gutil.log("\x1b[1;36m" + minName + "\x1b[0m\n");
				for (var i in minMapArr) {
					var _minMapStr = i + "\t[" + Object.keys(JSON.parse(minMapArr[i])).join(", ") + "] <-- " + minMapPath[minMapArr[i]].join(", ");
					gutil.log(_minMapStr);
				}
			}
		}
	}
}

function concatByHtml(htmlPath) {
	var html = fs.readFileSync(htmlPath, "utf-8");
	var cssResult;
	var jsResult;
	var scriptResult;
	var linkResult;
	var isReplaceHtml = true;
	while (cssResult = cssReg.exec(html)) {
		html = html.replace(cssReg, "<link type=\"text/css\" rel=\"stylesheet\" href=\"$1\" />");
		var hasDefined = !!cssMin[cssResult[1]];
		if (hasDefined) {
			var o = {};
			while (linkResult = regLink.exec(cssResult[2])) {
				o[linkResult[2] || linkResult[3]] = 1;
				if (linkResult[3]) {
					addWarning(htmlPath, cssResult[1], linkResult[3]);
				}
				if (!(linkResult[2] || linkResult[3])) gutil.log("err: ==============================" + cssResult[1])
			}
			// if (!_.isEqual(o, cssMin[cssResult[1]])) {
			//     gutil.log(htmlPath + " !!!");
			//     gutil.log(cssMin[cssResult[1]], o);
			// }
			isReplaceHtml = addMinFromHtmlMap(htmlPath, cssResult[1], o) && isReplaceHtml;
		} else {
			if (!cssMin[cssResult[1]]) cssMin[cssResult[1]] = {};
			while (linkResult = regLink.exec(cssResult[2])) {
				cssMin[cssResult[1]][linkResult[2] || linkResult[3]] = 1;
				if (linkResult[3]) {
					addWarning(htmlPath, cssResult[1], linkResult[3]);
				}
				if (!(linkResult[2] || linkResult[3])) gutil.log("err: ==============================" + cssResult[1])
			}
			isReplaceHtml = addMinFromHtmlMap(htmlPath, cssResult[1], cssMin[cssResult[1]]) && isReplaceHtml;
		}
	}
	// gutil.log(cssMin);
	while (jsResult = jsReg.exec(html)) {
		html = html.replace(jsReg, "<script type=\"text/javascript\" src=\"$1\"></script>");
		var hasDefined = !!jsMin[jsResult[1]];
		if (hasDefined) {
			var o = {};
			while (scriptResult = regScript.exec(jsResult[2])) {
				o[scriptResult[2] || scriptResult[3]] = 1;
				if (scriptResult[3]) {
					addWarning(htmlPath, jsResult[1], scriptResult[3]);
				}
				if (!(scriptResult[2] || scriptResult[3])) gutil.log("err: ==============================" + jsResult[1])
			}
			// if (!_.isEqual(o, jsMin[jsResult[1]])) {
			//     gutil.log(htmlPath + " !!!");
			//     gutil.log(jsMin[jsResult[1]], o);
			// }
			isReplaceHtml = addMinFromHtmlMap(htmlPath, jsResult[1], o) && isReplaceHtml;
		} else {
			if (!jsMin[jsResult[1]]) jsMin[jsResult[1]] = {};
			while (scriptResult = regScript.exec(jsResult[2])) {
				jsMin[jsResult[1]][scriptResult[2] || scriptResult[3]] = 1;
				if (scriptResult[3]) {
					addWarning(htmlPath, jsResult[1], scriptResult[3]);
				}
				if (!(scriptResult[2] || scriptResult[3])) gutil.log("err: ==============================" + jsResult[1])
			}
			isReplaceHtml = addMinFromHtmlMap(htmlPath, jsResult[1], jsMin[jsResult[1]]) && isReplaceHtml;
		}
	}
	var buildHtmlPath = htmlPath.replace(sourceDir, buildDir);
	var dirname = path.dirname(buildHtmlPath);
	if (!fs.existsSync(dirname)) fs.mkdirSync(dirname);
	if (!fs.existsSync(path.dirname(buildHtmlPath))) fs.mkdir(path.dirname(buildHtmlPath));
	if (isReplaceHtml) fs.writeFileSync(buildHtmlPath, html);
	else fs.writeFileSync(buildHtmlPath, fs.readFileSync(htmlPath, 'utf-8'));
}
module.exports.md5sumHtml = md5sumHtml;
var md5ScriptReg = /<script\s+[^><]*src=(\"([^\"]+)\"|\'([^\']+)\')[^><]*><\/script>\s*/g;
var md5LinkReg = /<link\s+[^><]*href=(\"([^\"]+)\"|\'([^\']+)\')[^><]*\/?>\s*/g;
var md5LinkMap = {};
var md5ScriptMap = {};
var jcChangeMap = {};
var updateCount = 0;
module.exports.md5build = md5build;

function md5build(md5HtmlResourceDerectory) {
	resolveSrc(md5HtmlResourceDerectory, md5sumHtml);
	// console.log('--------------------------md5LinkMap-------------------------------------');
	// console.log(md5LinkMap);
	// console.log('--=-=-=-=-==-=-=-=-=-=-=--md5ScriptMap=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=');
	// console.log(md5ScriptMap);
	// console.log('--=-=-=-=-==-=-=-=-=-=-=----=-=-=-=-==-=-=-=-=-=-=----=-=-=-=-==-=-=-=-=-');
	console.log('link记录数-----------------------------共{total}条'.replace('{total}', Object.keys(md5LinkMap).length));
	console.log('script记录数---------------------------共{total}条'.replace('{total}', Object.keys(md5ScriptMap).length));
	console.log('更新的记录数---------------------------共{total}条'.replace('{total}', Object.keys(jcChangeMap).length));
	console.log('--=-=-=-=-==-=-=-=-=-=-=--静态资源更新列表=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=');
	console.log(jcChangeMap);
	console.log('--=-=-=-=-==-=-=-=-=-=-=--静态资源更新列表=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=');
	console.log('共修改jsp文件%s个(由%jc个资源导致)'.replace('%s', updateCount).replace('%jc', Object.keys(jcChangeMap).length));
}
md5build(md5HtmlResourceDerectory);

function getFileMd5(path) {
	return crypto.createHash('md5').update(fs.readFileSync(path, 'utf-8').toString()).digest("hex");
}

function md5sumHtml(htmlPath) {
	var html = fs.readFileSync(htmlPath, "utf-8");
	var linkResult;
	var scriptResult;
	var isReplaceHtml = false;
	var jcpath = '';
	while (linkResult = md5LinkReg.exec(html)) {
		jcpath = linkResult[1].replace(/^("|')\/?([^\?]+)\??(.*)("|')$/, '$2');
		jcpath = path.join(_static_path, jcpath);
		if (!fs.existsSync(jcpath)) return html = html.replace(md5LinkReg, "");
		var hasDefined = !!md5LinkMap[jcpath];
		if (!hasDefined) {
			md5LinkMap[jcpath] = getFileMd5(jcpath);
		}
		var queryStr = /^("|')(.*)("|')$/.exec(linkResult[1]);
		queryStr = queryStr && queryStr.length > 2 ? queryStr[2] : '';
		var queryObj = url.parse(queryStr, true);
		// queryObj = _.omit(queryObj, 'md5');
		if (!queryObj['query']) queryObj['query'] = {};
		queryObj['query']['md5'] = md5LinkMap[jcpath];
		queryObj['search'] = queryObj['search'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5LinkMap[jcpath]);
		queryObj['path'] = queryObj['path'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5LinkMap[jcpath]);
		queryObj['href'] = queryObj['href'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5LinkMap[jcpath]);
		var b = queryStr;
		queryStr = url.format(queryObj);
		// console.log('a', queryObj, queryStr);
		var a = queryStr;
		if (b != a && !jcChangeMap[jcpath]) jcChangeMap[jcpath] = '[' + b + ',' + a + ']';
		html = html.replace(linkResult[1], linkResult[1].replace(/^("|')([^\?]+)\??(.*)("|')$/, '"{query}"'.replace('{query}', queryStr)));
	}
	// gutil.log(md5ScriptMap);
	while (scriptResult = md5ScriptReg.exec(html)) {
		jcpath = scriptResult[1].replace(/^("|')\/?([^\?]+)\??(.*)("|')$/, '$2');
		jcpath = path.join(_static_path, jcpath);
		if (!fs.existsSync(jcpath)) return html = html.replace(md5ScriptReg, "");
		var hasDefined = md5ScriptMap[jcpath];
		if (!hasDefined) {
			md5ScriptMap[jcpath] = getFileMd5(jcpath);
		}
		var queryStr = /^("|')(.*)("|')$/.exec(scriptResult[1]);
		queryStr = queryStr && queryStr.length > 2 ? queryStr[2] : '';
		var queryObj = url.parse(queryStr, true);
		// queryObj = _.omit(queryObj, 'md5');
		if (!queryObj['query']) queryObj['query'] = {};
		queryObj['query']['md5'] = md5ScriptMap[jcpath];
		queryObj['search'] = queryObj['search'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5ScriptMap[jcpath]);
		queryObj['path'] = queryObj['path'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5ScriptMap[jcpath]);
		queryObj['href'] = queryObj['href'].replace(/(md5=)[a-z0-9]{32}/, '$1' + md5ScriptMap[jcpath]);
		queryStr = url.format(queryObj);
		html = html.replace(scriptResult[1], scriptResult[1].replace(/^("|')([^\?]+)\??(.*)("|')$/, '"{query}"'.replace('{query}', queryStr)));
	}
	if (fs.readFileSync(htmlPath, 'utf-8').toString() != html) {
		updateCount++;
		fs.writeFileSync(htmlPath, html);
	}
}