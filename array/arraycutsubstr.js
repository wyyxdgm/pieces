function getStr(sourceStr, strArr) {
    //the function here
    var source = sourceStr;
    for (var key in strArr) {
        source = source.replace(new RegExp('^(' + strArr[key] + ',)*', 'g'), '').replace(new RegExp('(,' + strArr[key] + ')*$', 'g'), '').replace(new RegExp(',' + strArr[key] + ',', 'g'), ',').replace(new RegExp('^' + strArr[key] + '$', 'g'), '');
    }
    return source;
}

var sourceStr = 'aa,bb,cc,dd,ee,aa,bb,cc,dd,ee'; //source string
var strArr = ['aa', 'bb']; //input string array
var result = getStr(sourceStr, strArr);
console.log(result);