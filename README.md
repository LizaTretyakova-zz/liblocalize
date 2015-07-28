## Description

A little JS library that performs preprocessing and keeping of a dictionary of localized strings and also further access to its content.
(It actually may be a dictionary of not only _localized_ strings, but any strings which follow the format specified below)

## API
### preprocessDict(dictionary)

Changes the dictionary making its values ready to be passed as an **interpolateString**'s first parameter. 
It is necessary to use this function _before_ the first use of the **interpolateString**.

The function gets a dictionary in the following format: 'key' is a usual key to get a particular string from the dictionary, but 'value'
is not the string but _the template_: an array of substrings, 
which will be put together(perhaps with some data provided dynamically) when needed. 
You may prefix these substrings with some control symbols to specify the way the library will put them together:
- **$**: there won't be a whitespace added after the substring
- **#**: the actual value of this substring will be provided dynamically
- **~**: the escaping symbol; the remaining substring after this character will be left as-is

### interpolateString(messageTemplate, dynamicSubstrings)

Creates a string from the template.

messageTemplate is a value from the preprocessed dictionary and dynamicSubstrings is a dictionary with the data to be 
dynamically inserted into the template.

## Install

`npm install git+https://git@github.com/LizaTretyakova/liblocalizelang.git`
