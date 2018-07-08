
const filesystem = require('fs');
const path = require('path');
const StegError = require('./StegError');
const encoder = require('./encoder');

/**
 * @var storageBuffer - The storage file content Buffer
 */
const storageBuffer = null;

/**
 * Start of steganography, where the sos marker should be located
 * @var sosOffset
 */
let sosOffset;
/**
 * @var lodOffset - the offset where the size of the data on the storage is stored offset where e.g. 'abc'.length is stored
 */
let lodOffset;
/**
 * @var lod - the size/length of the data on the storage e.g. 'abc'.length
 */
let lod = 0;

/**
 * @var sodOffset- Start Of Data, offset where the start of data is
 */
let sodOffset;

/**
 * @var isReady - Steg is ready, meaning the ready function has been called and resolved
 */
let isReady = false;

/**
 * @var isNew - storageFilePath is a new storage
 */
let isNew = true;
/**
 * @ver 0.0.2
 */
class Steg{
  constructor(storageFilePath){
    this.storageFilePath = storageFilePath;
    this.isReady=false;    
  }

  async ready(){
    //always start with a fresh storageBuffer
    storageBuffer = null;
    //check if the storageFilePath exists, is writable and readable throw an error if it is not
    let fs = require('fs');
    try {      
      fs.accessSync(this.storageFilePath,fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      let stegError;
      if(error.code === 'ENOENT'){
        stegError = new StegError('Invalid storage file path');
      }
      if(error.code === 'EACCESS'){
        stegError = new StegError('Permission to storage file denied');
      }
      throw stegError;
    }
    //get the contents of the file
    try {
      storageBuffer = await storageFileContentPromise(this.storageFilePath);  
    } catch (error) {
      throw error;
    }    
    //check for the SOS_MARKER
    let indexOfSOS_MARKER = storageBuffer.indexOf(SOS_MARKER);
    if(indexOfSOS_MARKER === -1){
      //this is a new storage
      //get the SOS_MARKER from config,and write it on the storage starting from the DEFAULT_SOS_OFFSET
      //set the sosOffset to the default set on config
      sosOffset = DEFAULT_SOS_OFFSET;
      let numberOfBytesOccupiedBySOS_MARKER = storageBuffer.write(SOS_MARKER,sosOffset);
      //set the lodOffset      
      lodOffset = sosOffset + numberOfBytesOccupiedBySOS_MARKER + 1;
      //initialize the size of data (lod) to 0
      lod = 0;
      //writeUInt returns lodOffset + number of bytes written, 
      sodOffset = storageBuffer.writeUInt32BE(lod,lodOffset) + 1;
      isReady = true;
      isNew = true;
      return this;
    }
    //else existing storage
    sosOffset = indexOfSOS_MARKER;
    lodOffset = sosOffset + SOS_MARKER.length + 1;
    sodOffset = lodOffset + 4 + 1; //lod = 32 bit 4 bytes
    isReady = true;
    isNew = true;
    return this;
  }

  /**
  * Writes the data to the buffer used by this class. Call commit() after write to actually write the data to the
  * storage medium e.g. a bitmap file.
  * The Steganographer does not care about the format of the string. It's up to the user to write a formatted 
  * string like a JSON string.
  * 
  * Write operation always overwrites the entire data on the storage medium.
  * 
  * @param {String} str - The string to write
  */
 write(str){
  
  if(isReady === false){
   throw new StegError('S Not Ready');
  }
  // if(str.length >= secret_max_length){
  //  throw new StegError('Not enough storage');
  // }
  storageBuffer.writeUInt32BE(str.length, lodOffset);
  storageBuffer = encoder.encode(str,storageBuffer,sodOffset);
 }

  /**
  * Saves the secret to the image file
  */
 commit(){
  let ws = filesystem.createWriteStream(this.storageFilePath);
  ws.on('error',(e)=>{
   console.log(e);
  });
  let ret = ws.write(storageBuffer);
 }

  /**
  * Reads the secret from the image file
  * @return {String} the data
  */
 read(){

  if(this.isReady === false){
    throw new StegError('S Not Ready');
  }

  if(this.isNew || storageBuffer.readUInt32BE(lodOffset) === 0){
    return null;//no data
  }

  let data = encoder.decode(storageBuffer,this.sizeOfData,sodOffset);

  return data;
 }

  get sizeOfData(){
    return storageBuffer === null? 0: storageBuffer.readUInt32BE(lodOffset);
  }

  get isReady(){
    return isReady;
  }

  get isNew(){
    return isNew;
  }
  
}

/**
 * @return a Promise that resolves to the content of the file as a Buffer
 * @param {*} storageFilePath 
 */
function storageFileContent(storageFilePath){
  return new Promise((resolve,reject)=>{
    fs.readFile(storageFilePath,(err,content)=>{
    if(err){          
     reject(err);
     return;
    } 
    resolve(content);
   });
  });
}



module.exports = Steg;