import { constants } from "ethers";

import { expect, getTestLoggers } from "../utils";
import { createTransfer, depositInChannel, getSetupChannel, resolveTransfer } from "../utils/channel";

const testName = "Happy Integration";
const { log } = getTestLoggers(testName);
describe(testName, () => {
  // const chainId = parseInt(Object.keys(env.chainProviders)[0]);

  it("should work for a simple ETH setup -> deposit -> create -> resolve flow", async () => {
    // Set test constants
    const assetId = constants.AddressZero;
    const depositAmount = "16";
    const transferAmount = "7";

    // Setup the channel with signers funded onchain
    log.info("Setting up channel");
    const { alice, aliceSigner, bob, bobSigner, channel } = await getSetupChannel(testName);

    // User (Bob) deposits
    log.info("Bob depositing into channel", { amount: depositAmount });
    await depositInChannel(channel.channelAddress, bob, bobSigner, alice, assetId, depositAmount);

    // Node (Alice) deposits
    log.info("Alice depositing into channel", { amount: depositAmount });
    const postDeposit = await depositInChannel(channel.channelAddress, alice, aliceSigner, bob, assetId, depositAmount);

    // Validate final balance
    log.info("Verifying deposits");
    expect(postDeposit.assetIds).to.be.deep.eq([assetId]);
    expect(postDeposit.balances).to.be.deep.eq([{ to: channel.participants, amount: [depositAmount, depositAmount] }]);

    // Create Alice -> Bob transfer
    log.info("Creating transfer", { amount: transferAmount });
    const { transfer } = await createTransfer(channel.channelAddress, alice, bob, assetId, transferAmount);

    // Resolve transfer
    log.info("Resolving transfer", { transferId: transfer.transferId, resolver: transfer.transferResolver });
    await resolveTransfer(channel.channelAddress, transfer, alice, bob);
  });
});
