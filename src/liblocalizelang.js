module.exports.preprocessDict = preprocessDict;
module.exports.interpolateString = interpolateString;

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

var LOG_TAG = '[LIB_LOCALIZE_LANG]';


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
    var i = isEscaping(str[index]) ? 1 : 0;
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

function preprocessDict(userLocaleDict) {
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


/*
module.exports.test = { preprocessMsg: preprocessMsg,
                        preprocessDict: preprocessDict,
                        interpolateString: interpolateString,
                        DynStr: DynStr
};
*/
