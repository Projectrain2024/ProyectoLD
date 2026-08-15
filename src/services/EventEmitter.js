const EventEmitter = require('events');
class PlatformEventEmitter extends EventEmitter {}
const platformEvents = new PlatformEventEmitter();
module.exports = platformEvents;
