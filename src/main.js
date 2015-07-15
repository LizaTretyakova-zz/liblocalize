module.exports.init = init;
module.exports.get = get;

var libutil = require('libutil');
var isNull = libutil.isNull;
var isUndefOrNull = libutil.isUndefOrNull;

var LOG_TAG = '[LIB_LOCALIZE]';

var LOCALES = {
    EN : 'en',
    RU : 'ru'
};
module.exports.LOCALES = LOCALES;

var initialized = false;
var localeFilesDirPath = null;
var userLocaleDict = null;
// XXX please show semantic of each special symbol here
var CONTROL_SYMBOLS = { '#': 'DYNAMIC',
						'$': 'NO_WHITESPACE',
						'~': 'ESCAPING_SYMBOL'
};
var SUBSTR_TYPE = {
	"NOT_DYNAMIC_WITH_WHITESPACE": '', //you told me to do as is convenient =^^=
	"DYNAMIC_WITH_WHITESPACE": '#',
	"NOT_DYNAMIC_NO_WHITESPACE": '$',
	"DYNAMIC_NO_WHITESPACE": '#$'
};

function DynStr(str, key, isDynamic, needsWhiteSpace) {
	this.staticString = str;
	this.key = key;
	this.isDynamic = isDynamic;
	this.needsWhiteSpace = needsWhiteSpace;

	this.setStaticString = function(str) {
		this.staticString = str;
		if(this.needsWhiteSpace) {
			this.staticString += ' ';
		}
	}
	
	this.setKey = function(key) {
		this.staticString = key;
	}

	this.toString = function() {
		return this.staticString;
	}			
}

function isControl(char) {
	for(var controlChar in CONTROL_SYMBOLS) {
		if(char == controlChar) {
			return true;
		}
	}
	return false;
}

function isEscaping(char) {
	if(isControl(char)) {
		return (CONTROL_SYMBOLS[char] == 'ESCAPING_SYMBOL');
	}
	return false;
}

function isControlNotEsc(char) {
	return (isControl(char) && (!isEscaping(char)));
}

function controlSequenceEnded(nextChar, charPresence) {
	if(isControlNotEsc(nextChar) && (!charPresence[nextChar])) {
		charPresence[nextChar] = true;
		return false;
	}
	return true;
}

function removeControlSymbols(str, index) {
	var i = isEscaping(str[i]) ? 1 : 0;
	return str.substring(index + i, str.length);
}

function getControlSymbols(charPresence) {
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
	
	for(var i = 0; i <= curStr.length; ++i) {
		if(i == curStr.length) {
			msgTemplate[substrIx] = '';
			break;
		}
		var nextChar = curStr[i];
		if(controlSequenceEnded(nextChar, charPresence)) {
			msgTemplate[substrIx] = removeControlSymbols(curStr, i);
			break;
		}
	}
	
	return getControlSymbols(charPresence);
}

function preprocessMsg(msgTemplate) {
	for(var substrIx = 0; substrIx < msgTemplate.length; ++substrIx) {
        // XXX I don't see any reason to call return value as state
        // state is something that is preserved between different functions, workflows.
        // You forgot about the state just after switch statement was complited.
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
		console.warn(LOG_TAG + 'dictionary is not initialized');
		return;
	}
	for(var i in userLocaleDict) {
		preprocessMsg(userLocaleDict[i]);
	}
}

/** FOR TEST */
// XXX please make single 'test' export here
// module.exports.test = { preprocessMsg : preprocessMsg,
//  preprocessDict : preprocessDict, ... };
module.exports.test = { preprocessMsg: preprocessMsg,
						preprocessDict: preprocessDict,
						interpolateString: interpolateString,
						DynStr: DynStr};
/** *** **** */

function interpolateString(msgTemplate, msgSubstrsDict) {
    // TODO preprocess, don't create new [] and new substr key
    // strings on each call
    for (var substrIx = 0; substrIx < msgTemplate.length; ++substrIx) {
		var substrTemplate = msgTemplate[substrIx];
        if(substrTemplate.isDynamic) {
        	substrTemplate.setStaticString(msgSubstrsDict[substrTemplate.key]); 
            // XXX move [[]] things to dedicated vars with clear names
        }
    }
    // TODO add support for explicit spacing between words
    return msgTemplate.join('');
}






function getLocale(defLocaleName) {
    // XXX What to do if locale we've got from browser don't fit into LOCALES enum?
	var userLocale = (window.navigator.language || window.navigator.browserLanguage).split('-')[0];
	for(var locale in LOCALES) {
		if(userLocale == LOCALES[locale]) {
			return userLocale;//shouldn't we use LOCALES' key instead of userLocale?
		}
	}
	console.log(LOG_TAG + ' user locale is ' + userLocale + ' and does not match any of supported locales.');
	console.log(LOG_TAG + ' using the default locale ' + defLocaleName);
	return defLocaleName;//should we check whether this locale is correct or not?
}

function init(defLocaleName, pLocaleFilesDirPath, onReady/*(isOk)*/) {
    localeFilesDirPath = pLocaleFilesDirPath;
    var localeName = getLocale(defLocaleName);

    // TODO detect browser locale and use it if it is available
    // otherwise use default locale
    	
    loadLocaleDict(localeName, function(isOk, dict) {
        userLocaleDict = dict;
        initialized = isOk;
        preprocessDict(userLocaleDict);
        onReady(isOk);
    });
}

/*
 * msgSubstrsDict : { substringKey => substring }
 * returns corresponding message as string
 */
function get(msgKey, msgSubstrsDict) {
    if (!initialized) {
        console.warn(LOG_TAG, 'Use of uninitialized lib');
        return '';
    }
    var msgTemplate = userLocaleDict[msgKey];
    if (isUndefOrNull(msgTemplate)) {
        console.warn(LOG_TAG, 'Use of not defined key', msgKey);
        return '';
    }
    return interpolateString(msgTemplate, msgSubstrsDict);
}

function loadLocaleDict(localeName, callback/*(isOk, dict)*/) {
    // TODO use cross-platform file downloader (support nodejs)
    jQuery.ajax({
        type: 'GET',
		dataType: 'json',
        url: localeFilesDirPath + localeName + ".json",
        success: onDictDownloaded.bind(null, true),
        error : onDictDownloaded.bind(null, false)
    });

    function onDictDownloaded(isOk, localeDict) {
        if (!isOk) {
            console.error(LOG_TAG, "Couldn't load locale dictionary", localeDict);
        }
        callback(isOk, localeDict);
    }
}
