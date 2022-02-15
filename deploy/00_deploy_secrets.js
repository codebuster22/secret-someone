const deployFunction = async ({ getSigners, deployments, ethers }) => {
    const { deploy } = deployments;
    const [deployer] = await ethers.getSigners();
    const complimentarySomeones = ethers.BigNumber.from(1000);
  
    await deploy("SecretSomeone", {
      from: deployer.address,
      args: [complimentarySomeones],
      log: true,
    });
  };
  
  module.exports = deployFunction;
  module.exports.tags = ["Secrets"];