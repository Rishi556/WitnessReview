let hive = require("@hiveio/hive-js")
let moment = require("moment")

hive.api.setOptions({ url: "https://api.deathwing.me" });

async function getWitnessesVotingFor(voter) {
    let response = await hive.api.callAsync("condenser_api.get_accounts", [[voter]])
    let accountDetails = response[0]
    if (accountDetails.proxy !== "") {
        return getWitnessesVotingFor(accountDetails.proxy)
    }
    return accountDetails.witness_votes
}

async function getPriceFeedAge(witness) {
    let response = await hive.api.callAsync("condenser_api.get_witness_by_account", [witness])
    let lastUpdate = moment.utc(response.last_hbd_exchange_update)
    return moment.utc().diff(lastUpdate, "days")
}

async function getLastBlock(witness) {
    let response = await hive.api.callAsync("condenser_api.get_witness_by_account", [witness])
    return response.last_confirmed_block_num
}

checkWitnesses("rishi556", ["netuoso", "thecryptodrive", "cervantes"], 4, 86400/3, (86400/3) * 30).then((res) => {
    console.log(res)
})
async function checkWitnesses(voter, blockedWitnesses, maxPriceFeedAge, maxBlockDifference, maxBlockVotingDifference) {
    let witnessesVotedFor = await getWitnessesVotingFor(voter)
    let theList = {}
    let currentChainStats = await hive.api.callAsync("condenser_api.get_dynamic_global_properties", [])
    let headBlockNumber = currentChainStats.head_block_number
    for (let i in witnessesVotedFor) {
        theList[witnessesVotedFor[i]] = {"witnessesSupported" : [], "priceFeedAge" : -1, "lastProducedBlock" : 0, "blockedWitnessesSupported" : [], "priceFeedAgeTooOld" : false, "lastProducedBlockTooOld" : false, "supportedBlockTooOld" : []}
        let witnessSupportedByWitness = await getWitnessesVotingFor(witnessesVotedFor[i])
        theList[witnessesVotedFor[i]]["witnessesSupported"] = witnessSupportedByWitness
        theList[witnessesVotedFor[i]]["blockedWitnessesSupported"] = matches(blockedWitnesses, witnessSupportedByWitness)
        let priceFeedAge = await getPriceFeedAge(witnessesVotedFor[i])
        theList[witnessesVotedFor[i]]["priceFeedAge"] = priceFeedAge
        theList[witnessesVotedFor[i]]["priceFeedAgeTooOld"] = priceFeedAge >= maxPriceFeedAge
        let lastBlockedProduced = await getLastBlock(witnessesVotedFor[i])
        theList[witnessesVotedFor[i]]["lastProducedBlock"] = lastBlockedProduced
        theList[witnessesVotedFor[i]]["lastProducedBlockTooOld"] = headBlockNumber - lastBlockedProduced >= maxBlockDifference
        for (let j in theList[witnessesVotedFor[i]]["witnessesSupported"]){
            let supportedBlockAge = await getLastBlock(theList[witnessesVotedFor[i]]["witnessesSupported"][j])
            if ( headBlockNumber - supportedBlockAge >= maxBlockVotingDifference){
                theList[witnessesVotedFor[i]]["supportedBlockTooOld"].push(theList[witnessesVotedFor[i]]["witnessesSupported"][j])
            }
        }
        console.log(`done with ${witnessesVotedFor[i]}`)
    }
    return theList
}

function matches(arrayOne, arrayTwo) {
    let matches = []
    for (let i in arrayOne) {
        for (let j in arrayTwo) {
            if (arrayOne[i] === arrayTwo[j]) {
                matches.push(arrayOne[i])
            }
        }
    }
    return matches
}

module.exports = {
    checkWitnesses
}