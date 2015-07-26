module.exports.init = init;
module.exports.get = get;

var path = require('path');
var fs = require('fs');
var lll = require('liblocalizelang');
var preprocessDict = lll.preprocessDict;
var interpolateString = lll.interpolateString;

var LOCALES = lll.LOCALES;
module.exports.LOCALES = LOCALES;

var processed = {};//shows, which dictionaries were processed(successfully or not)
var localeDicts = {};
var localeDictsPath = null;

var LOG_TAG = '[LIB_LOCALIZE_SERVER]';
var DEF_ENCODING = 'utf-8';
var ACC_LANG = 'Accept-Language';


/**
 *@param {Object} options The object, containig three fields:
                             - locales: an array of all locales to load
                             - localeDictsPath: the string which is a path to a directory containing dictionaries.
                             - encoding: [optional] the string which is the encoding of the given dictionaries.
 *@param {function} onReady The callback which is called after the dictionaries are loaded(or failed to load).
 *@returns Void. 
 */
function init(options, onReady/*(dicts)*/) {
    localeDictsPath = options.localeDictsPath;
    var encoding = options.encoding ? options.encoding : DEF_ENCODING;
    
    for(var i in options.locales) {
        var locale = options.locales[i];
        
        loadLocaleDict(locale, encoding, function (curLocale, err, dict) {
            processed[curLocale] = true;
            if (err) {
                console.warn(LOG_TAG, "Couldn't load locale dictionary", dict);
                localeDicts[curLocale] = null;
            }
            else {
                try {
                    localeDicts[curLocale] = JSON.parse(dict);
                }
                catch(exception) {
                    console.warn(LOG_TAG, " dictionary is not a correct .json-file");
                    localeDicts[curLocale] = null;
                    return;
                }
                
                preprocessDict(localeDicts[curLocale]);
            }
            
            if(allDictsProcessed(options.locales)) {
                onReady(localeDicts);
            }        
        });
    }
}

/**
 *@param {string} msgKey The key to get a message template from the locale dictionary.
 *@param {string} msgSubstrsDict The dictionary of strings to insert into the message template.
 *@param {string} locale The locale of the dictionary which the message template should be got from.
 *@returns {string} The message with the substrings inserted.
 */

function get(msgKey, msgSubstrsDict, options) {
    var locale = null;
    if(isAccLangHeader(options)) {
//        console.log('header?');
        locale = getLocaleByHeader(options);
    }
    else if(isLocaleName(options)) {
//        console.log('just locale name?');
        locale = getLocaleByName(options);
    }
    else if(options instanceof Function) {
//        console.log('function?');    
        var header = options(ACC_LANG);
        if(header) {
            locale = getLocaleByHeader(header);
        }
    }
    else if(typeof options === 'object') {
//        console.log('object?');        
        for(var field in options) {
            if(isLocaleName(field)) {
                locale = getLocaleByName(field);
                break;
            }
        }
    }
    else {
        console.warn('wtf was that? =^O.o^= ', options);
    }
    
    if(locale) {
        return getMsg(msgKey, msgSubstrsDict, locale);
    }
    
    console.warn(LOG_TAG, "failed to get a message.");
    console.warn(LOG_TAG, "It could happen because of wrong 'options' parameter unless other reason is explicitly stated.");
    return '';
}

function isAccLangHeader(options) {
    return ((typeof options === 'string')
             && (options.substring(0, ACC_LANG.length) === ACC_LANG));
}

function getLanguages(header) {
    var languages = header.substring(ACC_LANG.length + 1).replace(/\s/g, '').split(',');
    for(var i in languages) {
        languages[i] = languages[i].split(';')[0].split('-')[0];
    }
    return languages;
}

function getLocaleByHeader(header) {
    var languages = getLanguages(header);
    for(var i in languages) {
        var language = languages[i];
        if(localeDicts[language] !== undefined) {
            if(localeDicts[language] === null) {
                console.warn(LOG_TAG, "unable to use the ", language, "locale because the proper dictionary was not loaded.");
            }
            else {
                return language;
            }
        }
    }
    return null;
}

function isLocaleName(options) {
    if(typeof options === 'string') {
        if(localeDicts[options]) {
            return true;
        }
        
        var locale = LOCALES[options];
        if(locale && localeDicts[locale]) {
            return true;
        }
    }
    return false;
}

function getLocaleByName(locale) {
    if(localeDicts[locale]) {
        return locale;
    }
    
    var localeName = LOCALES[locale];
    if(localeName && localeDicts[localeName]) {
        return localeName;
    }
    
    return null;
}

function getMsg(msgKey, msgSubstrsDict, locale) {
    var localDict = localeDicts[locale];
    if(!localDict) {
        console.warn(LOG_TAG, 'Use of uninitialized dictionary');
        return '';
    }
    
    var msgTemplate = localDict[msgKey];
    if (!msgTemplate) {
        console.warn(LOG_TAG, 'Use of not defined key', msgKey);
        return '';
    }
    
    return interpolateString(msgTemplate, msgSubstrsDict);
}

function loadLocaleDict(locale, encoding, callback/*(locale, err, dict)*/) {
    var dictFilePath = path.join(localeDictsPath, locale + ".json");
    fs.readFile(dictFilePath, encoding, callback.bind(null, locale));
}

function allDictsProcessed(locales) {
    for(var i in locales) {
        var locale = locales[i];
        if(!processed[locale]) {
            return false;
        }
    }
    return true;
}

