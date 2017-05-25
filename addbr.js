var str = '方法及了深刻的激发发达哦阿基是否萨达封口机阿斯顿咖啡机阿斯顿非阿三看大家发卡十几分卡及所开发的卡萨将大幅卡萨艰苦奋斗急啊是';
var result = '';
linelength = 20; /*这个值改下哦，适配下*/
for (var i = 0; i < str.length; i++) {
	result += str[i];
	if ((i + 1) % linelength === 0) result += '<br>';
}
console.log(result);