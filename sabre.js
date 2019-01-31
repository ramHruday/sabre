const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');

if (process.argv.length != 3) {
    console.log("Usage: " + __filename + " <solidity_file>");
    process.exit(-1);
}

var ethAddress = process.env.MYTHX_ETH_ADDRESS;
var password = process.env.MYTHX_PASSWORD;
var solidity_file = process.argv[2];

if (!ethAddress || !password) {
    console.log("Please set the MYTHX_ETH_ADDRESS and MYTHX_PASSWORD environment variables.");
    process.exit(-1);
}

try {
    var solidity_code = fs.readFileSync(solidity_file, 'utf8');
} catch (err) {
    console.log("Error opening input file" + err.message);
    process.exit(-1);
}

var input = {
    language: 'Solidity',
    sources: {
        inputfile: {
            content: solidity_code
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': [ '*' ]
            }
        }
    }
};

var compiled = JSON.parse(solc.compile(JSON.stringify(input)));

if (!compiled.contracts) {
    if (compiled.errors) {

        var len = compiled.errors.length;
        for (var i = 0; i < len; i++) {
            console.log(compiled.errors[i].formattedMessage);
        }
    }
    process.exit(-1);
}

for (var contractName in compiled.contracts.inputfile) {
    contract = compiled.contracts.inputfile[contractName];
    break;
}

/* Format data for Mythril Platform API */

var data = {
    contractName: contractName,
    bytecode: contract.evm.bytecode.object,
    sourceMap: contract.evm.deployedBytecode.sourceMap,
    deployedBytecode: contract.evm.deployedBytecode.object,
    deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
    sourceList: [
      solidity_file
    ],
    analysisMode: "quick",
    sources: {}
};

data.sources[solidity_file] = {source: solidity_code};

/* Instantiate Mythril Platform Client */

const client = new armlet.Client(
  {
    ethAddress: ethAddress,
    password: password,
    platforms: ['sabre']  // client chargeback
  }
);

client.analyze({data, timeout: 60000})
  .then(issues => {
    console.log(issues);
  }).catch(err => {
    console.log("API error: " + err.message);
  }
);