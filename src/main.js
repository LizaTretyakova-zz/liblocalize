module.exports.init = init;
module.exports.get = get;

var LOG_TAG = '[LIB_LOCALIZE]';


/**
 *@namespace
 *@property {string} EN English locale.
 *@property {string} RU Russian locale.
 */
var LOCALES = {
	EN : 'en',
	RU : 'ru'
};
module.exports.LOCALES = LOCALES;

/**
 *@param {string} defLocaleName The default value; is used when the user's locale is not supported.
 *@param {string} pLocaleFilesDirPath The path to a directory containing a dictionary.
 *@param {function} onReady The callback which is called after the dictionary is loaded(or failed to load).
 *@returns Void.
 */
function init(defLocaleName, pLocaleFilesDirPath, onReady/*(err)*/) {
	localeFilesDirPath = pLocaleFilesDirPath;
	var localeName = getUserLocale(defLocaleName);

	loadLocaleDict(localeName, afterLoading/*(err, dict)*/);
	
	function afterLoading(err, dict) {
		userLocaleDict = dict;
		initialized = !err;
		if(!err) {
			preprocessDict(userLocaleDict);
			onReady(err);
		}
		else if(err && localeName !== defLocaleName) {
			console.warn(LOG_TAG, " user locale ", localeName, " is not supported. Trying to use the default locale ", defLocaleName);
			localeName = defLocaleName;
			loadLocaleDict(defLocaleName, afterLoading/*(err, dict)*/);
		}
		else {
			console.warn(LOG_TAG, " failed to load the default locale ", defLocaleName);
			onReady(err);
		}
	}
}

/*
 * msgSubstrsDict : { substringKey => substring }
 * returns corresponding message as string
 */
 
/**
 *@param {string} msgKey The key to get a message template from the locale dictionary.
 *@param {string} msgSubstrsDict The dictionary of strings to insert into the message template.
 *@returns {string} The message with the substrings inserted.
 */
function get(msgKey, msgSubstrsDict) {
	if (!initialized) {
		console.warn(LOG_TAG, 'Use of uninitialized lib');
		return '';
	}
	var msgTemplate = userLocaleDict[msgKey];
	if (!msgTemplate) {
		console.warn(LOG_TAG, 'Use of not defined key', msgKey);
		return '';
	}
	return interpolateString(msgTemplate, msgSubstrsDict);
}

function getUserLocale(defLocaleName) {
	var forceLang = localStorage.getItem('forceLang');
	if(forceLang) {
		console.log(LOG_TAG, " a forced locale ", forceLang, " is detected.");
		return forceLang;
	}
	return (window.navigator.language || window.navigator.browserLanguage).split('-')[0];
}

function loadLocaleDict(localeName, callback/*(err, dict)*/) {
	// TODO use cross-platform file downloader (support nodejs)
	jQuery.ajax({
		type: 'GET',
		dataType: 'json',
		url: localeFilesDirPath + localeName + ".json",
		success: onDictDownloaded.bind(null, false),//changed
		error : onDictDownloaded.bind(null, true)//changed
	});

	function onDictDownloaded(err, localeDict) {
		if (err) {
			console.error(LOG_TAG, "Couldn't load locale dictionary", localeDict);
		}
		callback(err, localeDict);
	}
}




var initialized = false;
var localeFilesDirPath = null;
var userLocaleDict = null;

var CONTROL_SYMBOLS = { '#': 'DYNAMIC',
                        '$': 'NO_WHITESPACE',
                        '~': 'ESCAPING_SYMBOL'
};
var SUBSTR_TYPE = {
	"NOT_DYNAMIC_WITH_WHITESPACE": '',
	"DYNAMIC_WITH_WHITESPACE": '#',
	"NOT_DYNAMIC_NO_WHITESPACE": '$',
	"DYNAMIC_NO_WHITESPACE": '#$'
};



function DynStr(str, key, isDynamic, needsWhiteSpace) {
	this._staticString = str;
	this.key = key;				
	this.isDynamic = isDynamic; 
	this._needsWhitespace = needsWhiteSpace;
}

DynStr.prototype.setStaticString = function(str) {
	this._staticString = str;
	if(this._needsWhitespace) {
		this._staticString += ' ';
	}
}
	
DynStr.prototype.setKey = function(key) {
	this.key = key;
}

DynStr.prototype.toString = function() {
	return this._staticString;
}			



function isControl(char) {
	for(var controlChar in CONTROL_SYMBOLS) {
		if(char === controlChar) {
			return true;
		}
	}
	return false;
}

function isEscaping(char) {
	if(isControl(char)) {
		return (CONTROL_SYMBOLS[char] === 'ESCAPING_SYMBOL');
	}
	return false;
}

function isControlNotEsc(char) {
	return (isControl(char) && (!isEscaping(char)));
}

function controlSequenceEnded(nextChar, charPresence) {
	//A control sequence is ended when we first meet a non-control symbol.
	//So if a control symbol is repeated the library treats it as a non-control.
	return ((!isControlNotEsc(nextChar)) || charPresence[nextChar]);
}

function removeControlSymbols(str, index) {
	var i = isEscaping(str[i]) ? 1 : 0;
	return str.substring(index + i, str.length);
}

function getStringType(charPresence) {
	var res = '';
	for(var char in CONTROL_SYMBOLS) {
		if(isControlNotEsc(char) && charPresence[char]) {
			res += char;
		}
	}
	return res;
}

function preprocessString(msgTemplate, substrIx) {
	var charPresence = {'#': false, '$': false};
	var curStr = msgTemplate[substrIx];
	
	for(var i = 0; i < curStr.length; ++i) {
		var nextChar = curStr[i];
		if(controlSequenceEnded(nextChar, charPresence)) {
			msgTemplate[substrIx] = removeControlSymbols(curStr, i);
			break;
		}
		charPresence[nextChar] = true;		
	}

	if(i === curStr.length && i > 0) {
		console.warn(LOG_TAG, ' dictionary template string should contain at least one non-control symbol or be empty');
		console.warn(LOG_TAG, ' current string is ', curStr, ' having index ', substrIx, ' in template ', msgTemplate);
		msgTemplate[substrIx] = '';
		return SUBSTR_TYPE["NOT_DYNAMIC_NO_WHITESPACE"];
	}
	
	return getStringType(charPresence);
}

function preprocessMsg(msgTemplate) {
	for(var substrIx = 0; substrIx < msgTemplate.length; ++substrIx) {
		switch(preprocessString(msgTemplate, substrIx)) {
			case SUBSTR_TYPE["NOT_DYNAMIC_WITH_WHITESPACE"]:
				msgTemplate[substrIx] = new DynStr(msgTemplate[substrIx] + ' ', '', false, false);
				break;
			case SUBSTR_TYPE["DYNAMIC_WITH_WHITESPACE"]:
				msgTemplate[substrIx] = new DynStr('', msgTemplate[substrIx], true, true);
				break;
			case SUBSTR_TYPE["NOT_DYNAMIC_NO_WHITESPACE"]:
				msgTemplate[substrIx] = new DynStr(msgTemplate[substrIx], '', false, false);
				break;
			case SUBSTR_TYPE["DYNAMIC_NO_WHITESPACE"]:
				msgTemplate[substrIx] = new DynStr('', msgTemplate[substrIx], true, false);
				break;
		}
	}
}

function preprocessDict() {
	if(!initialized) {
		console.warn(LOG_TAG, 'dictionary is not initialized');
		return;
	}
	for(var i in userLocaleDict) {
		preprocessMsg(userLocaleDict[i]);
	}
}


function interpolateString(msgTemplate, msgSubstrsDict) {
	for (var substrIx = 0; substrIx < msgTemplate.length; ++substrIx) {
		var substrTemplate = msgTemplate[substrIx];
		if(substrTemplate.isDynamic) {
			substrTemplate.setStaticString(msgSubstrsDict[substrTemplate.key]); 
		}
	}
	return msgTemplate.join('');
}



module.exports.test = { preprocessMsg: preprocessMsg,
                        preprocessDict: preprocessDict,
                        interpolateString: interpolateString,
                        DynStr: DynStr
};
