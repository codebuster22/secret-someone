const deployFunction = async ({ getSigners, deployments, ethers }) => {
    const { deploy } = deployments;
    const [deployer] = await ethers.getSigners();
    const complimentarySomeones = ethers.BigNumber.from(100);
    const cap = ethers.BigNumber.from(500);
  
    await deploy("SecretSomeone", {
      from: deployer.address,
      args: [complimentarySomeones, cap],
      log: true,
    });
  };
  
  module.exports = deployFunction;
  module.exports.tags = ["Secrets"];