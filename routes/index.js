'use strict';
var express = require('express');
var router = express.Router();

// Dependencies
var Web3 = require('web3');
var Tx = require('ethereumjs-tx');
var keythereum = require("keythereum");

// This is the actual solidity code that was used to create the token:
//contract token { 
//    mapping (address => uint) public coinBalanceOf;
//    event CoinTransfer(address sender, address receiver, uint amount);
//
//  /* Initializes contract with initial supply tokens to the creator of the contract */
//  function token(uint supply) {
//        if (supply == 0) supply = 10000;
//        coinBalanceOf[msg.sender] = supply;
//    }
//
//  /* Very simple trade function */
//    function sendCoin(address receiver, uint amount) returns(bool sufficient) {
//        if (coinBalanceOf[msg.sender] < amount) return false;
//        coinBalanceOf[msg.sender] -= amount;
//        coinBalanceOf[receiver] += amount;
//        CoinTransfer(msg.sender, receiver, amount);
//        return true;
//    }
//}

var getData = function () {
    var data = {
        'item1': 'http://public-domain-photos.com/free-stock-photos-1/flowers/cactus-76.jpg',
        'item2': 'http://public-domain-photos.com/free-stock-photos-1/flowers/cactus-77.jpg',
        'item3': 'http://public-domain-photos.com/free-stock-photos-1/flowers/cactus-78.jpg'
    }
    return data;
}

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'Express', "data": getData });
});

/*
    GET
*/
router.get('/balance', function (req, res) {
    return res.json({ success: true });
});

/*
    GET
    /transfer
*/
router.get('/transfer', function (req, res) {
    // Initialize connection
    var web3 = new Web3();
    web3.setProvider(new web3.providers.HttpProvider("http://localhost:8545"));

    // Variables
    var walletContractAddress = '0x4c3fdbf4d1688514fe274c7c7893a41d8650b0cb';
    var toAccount = '0x8969756efB5de1A83afD686040ABEFcF89B1F89d';
    var fromAccount = '0xAFF855913D02A4E7198DD91F1dF6FB5bC88cE1F8';
    var amount = 10;

    // Step 1: Get private key
    // This is what you get from keythereum when generating a new private key:
    // METHOD 1
    var keyObject = {"address":"aff855913d02a4e7198dd91f1df6fb5bc88ce1f8","crypto":{"cipher":"aes-128-ctr","ciphertext":"72383fab60816d1e330affa3a1df7f99489dcf0ac5beb5b6b6529600e5e1c941","cipherparams":{"iv":"c8f7d09caefebeeb0e9da61e4b0299d9"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"0d7ef83666daa2c010312321719aa7a644ba67a1022b359ac188f22b6c55adf6"},"mac":"21b8420f58b6dfd732a3c8e81fdeb88cb313c2d40807794f05fe6dc1e8042534"},"id":"40db8baa-454e-4d80-bc07-c818ca1f12c5","version":3};
    var password = '12312312';
    var privateKey1 = keythereum.recover(password, keyObject);    
    // METHOD 2
    var privateKey = 'f56a5b3300e1b50ff24a2eac812e7d3e694b7b409134aa32314b2764442190ac';
    privateKey = new Buffer(privateKey, 'hex');

    console.log('privateKey (method 1):');
    console.log(privateKey1);
    console.log('privateKey (method 2):');
    console.log(privateKey);

    // Step 2: This is the ABI from the token solidity code
    var tokenABI = [{
        constant: false,
        inputs: [{
            name: "receiver",
            type: "address"
        }, {
            name: "amount",
            type: "uint256"
        }],
        name: "sendCoin",
        outputs: [{
            name: "sufficient",
            type: "bool"
        }],
        type: "function"
    }, {
        constant: true,
        inputs: [{
            name: "",
            type: "address"
        }],
        name: "coinBalanceOf",
        outputs: [{
            name: "",
            type: "uint256"
        }],
        type: "function"
    }, {
        inputs: [{
            name: "supply",
            type: "uint256"
        }],
        type: "constructor"
    }, {
        anonymous: false,
        inputs: [{
            indexed: false,
            name: "sender",
            type: "address"
        }, {
            indexed: false,
            name: "receiver",
            type: "address"
        }, {
            indexed: false,
            name: "amount",
            type: "uint256"
        }],
        name: "CoinTransfer",
        type: "event"
    }]

    // Step 3: produce payloadData, remember .encodeABI()
    var token = new web3.eth.Contract(tokenABI, walletContractAddress);
    var payloadData = token.methods.sendCoin(toAccount, amount).encodeABI();
    console.log('payloadData:');
    console.log(payloadData);

    // Step 4: build rawTx
    web3.eth.getGasPrice().then(function (gasPrice) {
        var gasPriceHex = web3.utils.toHex(gasPrice);
        var gasLimitHex = web3.utils.toHex(300000);
        console.log('Current gasPrice: ' + gasPrice + ' OR ' + gasPriceHex);

        web3.eth.getTransactionCount(fromAccount).then(function (nonce) {
            var nonceHex = web3.utils.toHex(nonce);
            console.log('nonce (transaction count on fromAccount): ' + nonce + '(' + nonceHex + ')');

            var rawTx = {
                nonce: nonceHex,
                gasPrice: gasPriceHex,
                gasLimit: gasLimitHex,
                to: walletContractAddress,
                from: fromAccount,
                value: '0x00',
                data: payloadData
            };
            console.log('rawTx:');
            console.log(rawTx);

            // Step 5: sign the rawTx with privateKey then send to signed Transaction to network
            var tx = new Tx(rawTx);
            tx.sign(privateKey);
            var serializedTx = tx.serialize();

            web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).then(function (receipt) {
                console.log('Transaction receipt:');
                console.log(receipt);
                console.log('Transaction has gone through successfully! :)');
            });
        });
    });

    return res.json({ success: true });
});

module.exports = router;
