import { ethers } from "ethers"
import { readFileSync } from "fs";
import path from "path";
import abi from './abi';

const provider = new ethers.providers.JsonRpcProvider('https://rpc.goerli.linea.build');
// 空投合约地址
const AIRDROP_OUTER_LINEA_ADDR = '0x50617aD592A497b04d10372EDDf3288a868D55b7';

// 空投钱包私钥
const privateKey = "";
// 每个地址空投eth数量
const amount = '0.01';

const airdropEth = async (addresses: string[]) => {
  while (true) {
    try {
      const signer = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(AIRDROP_OUTER_LINEA_ADDR, abi, signer);
      const amounts = addresses.map(() => ethers.utils.parseEther(amount));
      const amountTotal = amounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));

      const balnace = await signer.getBalance();
      console.log(`需要${ethers.utils.formatEther(amountTotal)}eth，当前余额${ethers.utils.formatEther(balnace)}eth`);

      if (balnace.lt(amountTotal)) {
        throw Error(`余额不足`);
      }

      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.gasPrice.add(ethers.utils.parseUnits('10', 'gwei'));
      const maxPriorityFeePerGas = maxFeePerGas.sub(ethers.utils.parseUnits('1', 'wei'))
      const gasLimit = await contract.estimateGas.multiTransferLocal(
        addresses,
        amounts,
        { value: amountTotal }
      )
      const nonce = await signer.getTransactionCount();
      const tx: ethers.ContractTransaction = await contract.multiTransferLocal(
        addresses,
        amounts,
        {
          value: amountTotal,
          nonce,
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas
        });
      console.log("调用成功，等待链上确认", tx.hash)
      await tx.wait();
      console.log("空投完成")
      break;
    } catch (error) {
      console.log(`[${addresses[0]}]空投出错: ${error.message}`)
    }
  }
}

// 获取txt文件内容，移除空行和制表符并转换为数组
function getTxtContent(path: string) {
  const str = readFileSync(path, 'utf-8');
  return str.split(/[(\r\n)\r\n]+/).filter(el => el);
}

const main = async () => {
  const addresses = getTxtContent(path.join(__dirname, './addresses.txt'));
  while (addresses.length) {
    // 一次空投最多200个地址，分组空投
    const arr = addresses.splice(0, 200);
    await airdropEth(arr);
  }
}

main().catch(console.error)