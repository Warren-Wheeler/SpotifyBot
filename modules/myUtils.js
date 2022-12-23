/////////////////////////////////////////////
// Imports & Global Values
/////////////////////////////////////////////

const fs = require('fs');

/////////////////////////////////////////////
// Functions
/////////////////////////////////////////////

// Return a JS object for a file, or an empty object `{}` if there is an error
function JSONRead(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf-8')) 
    } catch {
        return {}
    }
}
module.exports.JSONRead = JSONRead;

// Write a JS object to a file
function JSONWrite(filename, content) {
    fs.writeFileSync(filename , JSON.stringify(content), err => {  
        if (err) {
            throw err;
        }
    });
}
module.exports.JSONWrite = JSONWrite;

// Get the current day of the week
function GetDayOfWeek(date = new Date()){
    return date.getDay();
}
module.exports.GetDayOfWeek = GetDayOfWeek;

// Get the date of next Friday
function GetNextFriday(dateMS = 0) {
    if (dateMS == 0) dateMS = new Date().getTime()
    const dateCopy = new Date(dateMS)
  
    const nextFriday = new Date(
        dateCopy.setDate(
            dateCopy.getDate() + ((7 - dateCopy.getDay() + 5) % 7 || 7),
        )
    );
  
    return nextFriday;
}
module.exports.GetNextFriday = GetNextFriday;

// Convert hours to milliseconds
function HoursToMS(hours) {
    return hours * 60 * 60 * 1000;
}
module.exports.HoursToMS = HoursToMS;

// Get milliseconds until noon
function MSUntilNoon( now = new Date() ){

    let todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    if (todayNoon - now > 0) return todayNoon - now;
    else {
        let tomorrowNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 12);
        return tomorrowNoon - now; 
    }
}
module.exports.MSUntilNoon = MSUntilNoon;

// Get a key from an object if the key exists, or a default value if it doesn't
function GetOrElse(object, key, defaultValue) {
    return (object.hasOwnProperty(key) ? object[key] : defaultValue);
}
module.exports.GetOrElse = GetOrElse;

// Return a string parsed as JSON or a default value if the parse fails
function JSONParseOrElse(target, defaultValue) {
    try {
        parsed = JSON.parse(target)
        if (parsed != undefined) return parsed
    } catch {}
    return defaultValue
}
module.exports.JSONParseOrElse = JSONParseOrElse

// Read a JSON file, write a new value to a specific key, and write the new JSON object to the same file
function JSONFileKeySet(path, key, newValue) {
    let file = JSONRead(path)
    file[key] = newValue 
    JSONWrite(path, file)
}
module.exports.JSONFileKeySet = JSONFileKeySet

function DoubleTry( firstTry = () => {}, thenTry = () => {}, onFail = () => {} ) {
    try {
        firstTry()
    } catch {
        try {
            secondTry()
        } catch {
            onFail()
        }
    }
}
module.exports.DoubleTry = DoubleTry