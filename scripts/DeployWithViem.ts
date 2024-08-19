import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  createWalletClient,
  formatEther,
} from "viem";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();
import { toHex, hexToString } from "viem";

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

async function main() {
  /// OBTAIN PROPOSALS FROM USER INPUT OR THROW ERROR
  const proposals = process.argv.slice(2);
  if (!proposals || proposals.length < 1)
    throw new Error("Proposals not provided");
  /// LOG PROPOSALS
  console.log("Proposals: ");
  proposals.forEach((element, index) => {
    console.log(`Proposal N. ${index + 1}: ${element}`);
  });
  /// CONNECT TO TESTNET USING POKT GATEWAY
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  /// PROVIDE PROOF OF CONNECTION TO TESTNET
  const blockNumber = await publicClient.getBlockNumber();
  console.log("Last block number:", blockNumber);
  /// SETUP WALLET CLIENT USING MY PRIVATE KEY
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  /// LOG DEPLOYER ACCOUNT ADDRESS ON TESTNET
  console.log("Deployer address:", deployer.account.address);
  /// Provide proof of successful deployer acct creation
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(
    "Deployer balance: ",
    formatEther(balance),
    deployer.chain.nativeCurrency.symbol
  );
  /// DEPLOYING CONTRACT TO TESTNET
  console.log("\nDeploying Ballot contract");
  const hash = await deployer.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [proposals.map((prop) => toHex(prop, { size: 32 }))],
  });
  /// LOG PROOF OF DEPLOYMENT TRANSACTION
  console.log("Transaction hash:", hash);
  /// LOG DEPLOYMENT TRANSACTION RECEIPT
  console.log("Waiting for confirmations...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  /// LOG CONTRACT ADDRESS FROM RECEIPT
  console.log(receipt);
  console.log("Ballot contract deployed to:", receipt.contractAddress);
  // JUAN'S TYPE CHECK FOR CONTRACTADDRESS
  if (!receipt.contractAddress) {
    console.log("Contract deployment failed");
    return;
  }
  /// PULL AND READ ALL PROPOSALS FROM OUR DEPLOYED CONTRACT
  console.log("Proposals:");
  for (let index = 0; index < proposals.length; index++) {
    const proposal = (await publicClient.readContract({
      address: receipt.contractAddress,
      abi,
      functionName: "proposals",
      args: [BigInt(index)],
    })) as any[];
    const name = hexToString(proposal[0], { size: 32 });
    console.log({ index, name, proposal });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
