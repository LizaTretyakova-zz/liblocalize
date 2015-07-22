module.exports.init = init;
module.exports.get = get;

var lll = require('./liblocalizelang.js');
var preprocessDict = lll.preprocessDict;
var fs = require('fs');

var initialized = {};
var localeDicts = {};
var localeDictsPath = null;

var LOG_TAG = '[LIB_LOCALIZE_SERVER]';
var defEncoding = 'utf-8';

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
 *@param {Array} locales All locales to load
 *@param {string} pLocaleDictsPath The path to a directory containing dictionaries.
 *@param {function} onReady The callback which is called after the dictionaries are loaded(or failed to load).
 *@returns Void. 
 */
function init(locales, pLocaleDictsPath, pEncoding) {
	localeDictsPath = pLocaleDictsPath;
	for(var i in locales) {
		var locale = locales[i];
		var encoding = pEncoding ? pEncoding : defEncoding;
		
		loadLocaleDict(locale, encoding, function (err, dict) {
			initialized[locale] = !err;
			if (err) {
				console.error(LOG_TAG, "Couldn't load locale dictionary", dict);
				localeDicts[locale] = null;
			}
			else {
				try {
					localeDicts[locale] = JSON.parse(dict);
				}
				catch(exception) {
					console.warn(LOG_TAG, " dictionary is not a correct .json-file");
					localeDicts[locale] = null;
					initialized[locale] = false;
					return;
				}
				
				preprocessDict(localeDicts[locale]);
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
	if(!initialized[locale] || !localDict) {
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

function loadLocaleDict(locale, encoding, callback/*(err, dict)*/) {
	var path = localeDictsPath + locale + ".json";
	fs.readFile(path, encoding, callback);
}

