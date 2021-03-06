//load the config

const config = require('./config');
const Steg = require('./app/Steg');

/**
 * Makes the configuration keys available globally
 * @param {Object} c 
 */
function loadConfig(c){
 global.CONFIG = {};
 let configs = Object.getOwnPropertyNames(c);
 if(configs.length > 0){
  configs.forEach((prop)=>{
   global.CONFIG[prop] = c[prop];
  });
 }
 
}

loadConfig(config);

module.exports = Steg;

