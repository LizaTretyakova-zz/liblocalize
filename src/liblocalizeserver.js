module.exports.init = init;
module.exports.get = get;

var path = require('path');
var lll = require('./liblocalizelang');
var preprocessDict = lll.preprocessDict;
var interpolateString = lll.interpolateString;
var fs = require('fs');

var processed = {};//shows, which dictionaries were processed(successfully or not)
var localeDicts = {};
var localeDictsPath = null;

var LOG_TAG = '[LIB_LOCALIZE_SERVER]';
var DEF_ENCODING = 'utf-8';

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
 *@param {Object} options The object, containig three fields:
 							- locales: an array of all locales to load
 							- pLocaleDictsPath: the string which is a path to a directory containing dictionaries.
 							- pEncoding: [optional] the string which is the encoding of the given dictionaries.
 *@param {function} onReady The callback which is called after the dictionaries are loaded(or failed to load).
 *@returns Void. 
 */
function init(options, onReady/*(dicts)*/) {
	localeDictsPath = options.pLocaleDictsPath;
	var encoding = options.pEncoding ? options.pEncoding : DEF_ENCODING;
	
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
function get(msgKey, msgSubstrsDict, locale) {
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

