/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persistent storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

// Decode the block body
const hex2ascii = require('hex2ascii');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also every time you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
 
        return new Promise(async (resolve, reject) => {
            try {
                self.height === -1 ? block.previousBlockHash = null : block.previousBlockHash = self.chain[self.chain.length - 1].hash
                self.height === -1 ? block.height = 0 : block.height = self.height + 1 // If the height is -1 (Genesis Block) set it to 1 - else set it to the current height + 1
                block.time = Date.now().toString().slice(0,-3) 
                block.hash = SHA256(JSON.stringify(block)).toString()
                // Validate the chain BEFORE adding to the chain
                let result = await self.validateChain()
                // If result.length is greater than 0, it means the Blockchain could not be validated
                if (self.chain.length !== 0 && result.length === 0) {
                    resolve(self.chain.push(block))
                } else if (self.chain.length === 0) {
                    // For the Genesis Block, there will be nothing validate
                    resolve(self.chain.push(block))
                } 
                else {
                    reject (`There was an error validating the chain`)
                }
                self.height = self.height + 1
            } catch(e) {
               console.log(`An Error Occurred: ${JSON.stringify(e)}`) 
            }  
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${Date.now().toString().slice(0,-3)}:starRegistry`)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    async submitStar(address, message, signature, star) {
        let self = this;
        let time = parseInt(message.split(':')[1])
        let currentTime = parseInt(new Date().getTime().toString().slice(0, -3))

        return new Promise(async (resolve, reject) => {
        try{

        if((currentTime - time) < (5 * 60)) {
           if(bitcoinMessage.verify(message, address, signature)) {
                // If the Bitcoin message verify returns true
                const blockData = {"owner": address, "star": star}
                const myBlock = new BlockClass.Block(blockData)
                let result = await self._addBlock(myBlock)
                resolve(result)
           } else {
               reject(`Message Could Not Be Verified`)
           }
        } else {
            reject(`Older than five minutes`)
        }
    } catch (error) {
        reject(`Oops! Error submitting star`)
    }
    })

    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            self.chain.filter(chainItem => {
                if(chainItem.hash === hash) {
                    resolve(chainItem)
                }
            })
            reject(`No items found that match the hash`)
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.filter(blockItem => {
                const dataObj = JSON.parse(hex2ascii(blockItem.body))
                if (dataObj.owner ===  address) {
                    stars.push(dataObj.star)
                }
            })
            resolve(stars)
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */

    
    async validateChain() {
        let self = this;
        let errorLog = [];       
            try {
                self.chain.map((currentBlock, index, arr) => {
                    if (currentBlock.height === 0) {
                        currentBlock.validate() ? console.log(`Genesis Hashes Validation Passed`) : errorLog.push(currentBlock)
                    } else {
                        currentBlock.validate() ? console.log(`Block Validation Passed`) : console.log(`Block Validation Failed`)
                        currentBlock.previousBlockHash !== arr[index - 1].hash ? errorLog.push(currentBlock) : console.log(`Hashes Match`)
                    }
                })   
                // An empty array will have no errors - any value found will mean there is an issue with the Blockchain
                return errorLog
            } catch(error){
                console.log(`There was an error: ${error}`)
            }
            
    }
}

module.exports.Blockchain = Blockchain;   