var fs = require('fs');
var str = fs.readFileSync('a.html').toString();
var a = 1;
str = str.replace(/\n/g, '');
str = '%>' + str + '<%';
// console.log(str)
// console.log()
str = str.replace(/%>([^%]*)<%/g, 'console.log(\'$1\');'); /*这句是核心*/

/*控制台的输出重定向到文件里*/
var stream = require('stream');
var rawStdout = process.stdout, //先拿到原来的stdout
	newStdout = new stream.PassThrough();
process.__defineGetter__('stdout', function() { //重新定义process.stdout的Getter
	return newStdout; //返回我们的passthrough流
});
newStdout.pipe(fs.createWriteStream('b.html'));
/*执行eval*/
eval(str);