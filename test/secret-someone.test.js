const { expect, use } = require("chai");
const { solidity } = require("ethereum-waffle");
const { parseUnits } = require("ethers/lib/utils");
const { time } = require("@openzeppelin/test-helpers");

use(solidity);

const deploy = async () => {
  const setup = {};
  setup.roles = await ethers.getSigners();
  setup.secretFactory = await ethers.getContractFactory(
    "SecretSomeone",
    setup.roles[0]
  );
  return setup;
};

describe("Contract: SecretSomeone", () => {
  let owner, receiver, sender, nonReceiver, nonSender, extras;
  const complimentarySomeones = ethers.BigNumber.from(10);
  const price = parseUnits("0.027", 18);
  const discountedPrice = parseUnits("0.014", 18);
  let secretFactory, secretInstance;
  let ipfsHash = "qjkbdjhvbdsjhygvytfvjkusdbou";
  context(">> Setup SecretSomeone to be able to send secrets", () => {
    before("!! setup", async () => {
      const setup = await deploy();
      [owner, receiver, sender, nonReceiver, nonSender, extras] = setup.roles;
      secretFactory = setup.secretFactory;
    });
    it("$ woohoo, start sending secrets", async () => {
      secretInstance = await secretFactory.deploy(complimentarySomeones);
      expect(await secretInstance.owner()).to.equal(owner.address);
    });
  });
  context(">> I want to mint during Complimentary period", () => {
    it("$ reverts if I set price on my secret", async () => {
      await expect(
        secretInstance
          .connect(sender)
          .sendSecret(receiver.address, ipfsHash, { value: price })
      ).to.be.revertedWith("Are you rich?");
    });
    it("$ reverts when I feel lonely and send it to zero address", async () => {
      await expect(
        secretInstance
          .connect(sender)
          .sendSecret(ethers.constants.AddressZero, ipfsHash)
      ).to.be.revertedWith("Don't feel lonely");
    });
    it("$ sends secret successfully", async () => {
      await expect(
        secretInstance.connect(sender).sendSecret(receiver.address, ipfsHash)
      ).to.emit(secretInstance, "SecretSealed");
    });
  });
  context(
    ">> when I'm late for complimentary but on right time of discount period",
    () => {
      before("!! finish complimentary secrets", async () => {
        const totalMinted = await secretInstance.secrets();
        const remaining = complimentarySomeones.sub(totalMinted.div(2));
        for (let i = ethers.BigNumber.from(0); i.lt(remaining); i = i.add(1)) {
          await secretInstance.sendSecret(receiver.address, ipfsHash);
        }
        expect(
          (await secretInstance.secrets()).div(2).gte(complimentarySomeones)
        ).to.be.true;
      });
      it("$ reverts when sending incorrect value", async () => {
        await expect(
          secretInstance.connect(sender).sendSecret(receiver.address, ipfsHash)
        ).to.be.revertedWith("Send exact discount price");
        await expect(
          secretInstance
            .connect(sender)
            .sendSecret(receiver.address, ipfsHash, { value: price })
        ).to.be.revertedWith("Send exact discount price");
      });
      it("$ mints successfully when sent correct value", async () => {
        await expect(
          secretInstance
            .connect(sender)
            .sendSecret(receiver.address, ipfsHash, { value: discountedPrice })
        ).to.emit(secretInstance, "SecretSealed");
      });

      context(">> pause sending secrets", () => {
        it("$ pauses", async () => {
          await secretInstance.connect(owner).togglePauseState();
          expect(await secretInstance.paused()).to.be.true;
          await expect(
            secretInstance
              .connect(sender)
              .sendSecret(receiver.address, ipfsHash, {
                value: discountedPrice,
              })
          ).to.be.revertedWith("Pausable: paused");
        });
        it("$ unpauses", async () => {
          await secretInstance.connect(owner).togglePauseState();
          expect(await secretInstance.paused()).to.be.false;
          await expect(
            secretInstance
              .connect(sender)
              .sendSecret(receiver.address, ipfsHash, {
                value: discountedPrice,
              })
          ).to.not.be.reverted;
        });
      });
    }
  );
  context(">> when I'm late for discounted and now public sale started", () => {
    before("!! go past discounted period", async () => {
      const discountEndsOn = (
        await secretInstance.complimentaryPeriodEndedOn()
      ).add(await secretInstance.DISCOUNTED_PERIOD());
      await time.increaseTo(discountEndsOn.toString());
    });
    it("$ reverts when sending incorrect value", async () => {
      await expect(
        secretInstance
          .connect(sender)
          .sendSecret(receiver.address, ipfsHash, { value: discountedPrice })
      ).to.be.revertedWith("Send exact secret price");
      await expect(
        secretInstance
          .connect(sender)
          .sendSecret(receiver.address, ipfsHash, { value: price.mul(2) })
      ).to.be.revertedWith("Send exact secret price");
    });
    it("$ mints successfully when sent correct value", async () => {
      await expect(
        secretInstance
          .connect(sender)
          .sendSecret(receiver.address, ipfsHash, { value: price })
      ).to.emit(secretInstance, "SecretSealed");
    });
  });
  context(">> owner can withdraw", () => {
    it("$ withdraws", async () => {
      const prevbalance = await owner.getBalance();
      await expect(secretInstance.connect(owner).withdraw()).to.not.be.reverted;
      const afterBalancer = await owner.getBalance();
      expect(afterBalancer.gt(prevbalance)).to.be.true;
    });
  });
  context(">> secrets cannot be transfered", () => {
    it("$ reverts when transferring secrets", async () => {
      await expect(
        secretInstance
          .connect(sender)
          .transferFrom(sender.address, receiver.address, 2)
      ).to.be.revertedWith("Passing secrets is bad manners");
    });
  });
  context(">> get secret", () => {
    it("$ fetches correct secret", async () => {
      expect(await secretInstance.connect(sender).tokenURI(1)).to.equal(
        `ipfs://${ipfsHash}`
      );
    });
  });
});
