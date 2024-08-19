import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  createWalletClient,
} from "viem";
import { abi } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();
import { hexToString } from "viem";
import * as readlineSync from 'readline-sync';

/// ENV CONSTANTS
const providerApiKey = process.env.ALCHEMY_API_KEY || "";

/// GET USER INPUT FUNCTION
function getUserInput(prompt: string): string {
  return readlineSync.question(prompt);
}

/// MAIN FUNCTION
async function main() {
  /// CONNECT TO TESTNET CHAIN VIA PUBLICCLIENT
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  /// OBTAIN AND TEST INPUT PARAMETERS (DEPLOYED CONTRACT ADDRESS, ARRAY INDEX of PROPOSAL BEING VOTED ON)
  const parameters = process.argv.slice(2);
  if (!parameters || parameters.length < 2)
    throw new Error("Parameters not provided");
  const contractAddress = parameters[0] as `0x${string}`;
  if (!contractAddress) throw new Error("Contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address");
  const proposalIndex = parameters[1];
  if (isNaN(Number(proposalIndex))) throw new Error("Invalid proposal index");

  /// READ FROM CONTRACT TO OBTAIN PROPOSAL AND CONFIRM WHETHER TO VOTE
  console.log("Proposal selected: ");
  const proposal = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "proposals",
    args: [BigInt(proposalIndex)],
  })) as any[];
  const name = hexToString(proposal[0], { size: 32 });
  console.log("Voting to proposal", name);

  /// GET VOTER PRIVATE KEY
  const voterPvtKey = getUserInput("Voter, please provide your private key: ");
  const account = privateKeyToAccount(`0x${voterPvtKey}`);
  // connect wallet client to Sepolia
  const voter = createWalletClient({
      account,
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });
  const vote = getUserInput("Please enter your vote (N/n for 'No', anything for 'Yes'): ")
  if (vote.toString().trim().toLowerCase() != "n") {
    const hash = await voter.writeContract({
      address: contractAddress,
      abi,
      functionName: "vote",
      args: [BigInt(proposalIndex)],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed");
  } else {
    console.log("Operation cancelled");
  }
  process.exit();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
