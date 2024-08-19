import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, createWalletClient } from "viem";
import { abi } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();
import { toHex } from "viem";
import * as readlineSync from "readline-sync";

/// ENV CONSTANTS
const providerApiKey = process.env.ALCHEMY_API_KEY || "";

/// GET USER INPUT FUNCTION
function getUserInput(prompt: string): string {
  return readlineSync.question(prompt);
}

async function main() {
  /// CONNECT TO TESTNET CHAIN VIA PUBLICCLIENT
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  /// OBTAIN CONTRACT ADDRESS
  const userInput = getUserInput("Please input the contract address: ");
  const contractAddress = userInput as `0x${string}`;
  if (!contractAddress) throw new Error("Contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address");

  /// ENTER YOUR PRIVATE KEY (AS DELEGATOR)
  const delegatorPvtKey = getUserInput(
    "Delegator, please provide your private key: "
  );
  const account = privateKeyToAccount(`0x${delegatorPvtKey}`);
  /// CONNECT DELEGATOR WALLET CLIENT TO SEPOLIA
  const delegator = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  /// GET PUBLIC KEY OF USER TO DELEGATE VOTE TO
  const delegateeAddress = getUserInput(
    "Please enter the public key of the user to whom you'd like to delegate your vote to: "
  );
  const hash = await delegator.writeContract({
    address: contractAddress,
    abi,
    functionName: "delegate",
    args: [delegateeAddress],
  });
  console.log("Transaction hash:", hash);
  console.log("Waiting for confirmations...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Transaction confirmed");
  process.exit();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
