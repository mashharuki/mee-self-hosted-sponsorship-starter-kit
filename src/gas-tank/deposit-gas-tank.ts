/**
 * ガスタンク入金スクリプト
 * 
 * このスクリプトはガスタンクに追加の資金を入金します。
 * 
 * 使い方:
 *   bun run deposit-gas-tank
 * 
 * 環境変数で入金額を設定できます:
 *   DEPOSIT_AMOUNT=1.5 bun run deposit-gas-tank
 */

import "dotenv/config";
import {
  testnetMcUSDC,
  toGasTankAccount,
} from "@biconomy/abstractjs";
import {
  http,
  parseUnits,
  type Hex,
  createWalletClient,
  createPublicClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// 環境変数の検証
if (!process.env.PRIVATE_KEY) {
  throw new Error("❌ PRIVATE_KEY environment variable is not set");
}
if (!process.env.MEE_API_KEY) {
  throw new Error("❌ MEE_API_KEY environment variable is not set");
}

const privateKey = process.env.PRIVATE_KEY as Hex;
const meeApiKey = process.env.MEE_API_KEY;

// 入金設定
const CHAIN = baseSepolia;
const TOKEN_ADDRESS = testnetMcUSDC.addressOn(baseSepolia.id);
const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "1.0"; // デフォルト: 1.0 USDC
const TOKEN_DECIMALS = 6;

async function main() {
  try {
    console.log("💰 === ガスタンク入金スクリプト ===\n");
    console.log(`入金額: ${DEPOSIT_AMOUNT} USDC\n`);

    // 1. ガスタンクアカウントを取得
    console.log("⏳ ガスタンクアカウントを取得中...");
    const gasTankAccount = await toGasTankAccount({
      transport: http(),
      chain: CHAIN,
      privateKey,
      options: {
        mee: {
          apiKey: meeApiKey,
        },
      },
    });
    console.log("✅ ガスタンクアカウントを取得しました\n");

    // 2. ガスタンクアドレスを取得
    const { address: gasTankAddress } = await gasTankAccount.getAddress();
    console.log(`📍 ガスタンクアドレス: ${gasTankAddress}\n`);

    // 3. デプロイ状態を確認
    console.log("⏳ デプロイ状態を確認中...");
    const isDeployed = await gasTankAccount.isDeployed();
    
    if (!isDeployed) {
      console.error("❌ ガスタンクがデプロイされていません");
      console.log("💡 先に create-gas-tank スクリプトを実行してください:");
      console.log("   bun run create-gas-tank\n");
      process.exit(1);
    }
    console.log("✅ ガスタンクはデプロイ済みです\n");

    // 4. 入金前の残高を確認
    console.log("⏳ 入金前の残高を確認中...");
    const balanceBefore = await gasTankAccount.getBalance({
      tokenAddress: TOKEN_ADDRESS,
    });
    const formattedBefore = (Number(balanceBefore.balance) / Math.pow(10, balanceBefore.decimals)).toFixed(balanceBefore.decimals);
    console.log(`💰 入金前の残高: ${formattedBefore} USDC\n`);

    // 5. EOAからガスタンクへトークンを転送
    console.log(`⏳ ${DEPOSIT_AMOUNT} USDC を入金中...`);
    console.log("   トランザクションを送信しています...\n");

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: CHAIN,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: CHAIN,
      transport: http(),
    });

    // トークンの転送トランザクションを実行
    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }]
        }
      ],
      functionName: 'transfer',
      args: [gasTankAddress, parseUnits(DEPOSIT_AMOUNT, TOKEN_DECIMALS)],
    });

    console.log(`📝 トランザクションハッシュ: ${hash}`);
    console.log("⏳ トランザクションの確認を待機中...\n");

    // トランザクションの完了を待つ
    await publicClient.waitForTransactionReceipt({ hash });

    console.log("✅ 入金が完了しました！\n");

    // 6. 入金後の残高を確認
    console.log("⏳ 入金後の残高を確認中...");
    const balanceAfter = await gasTankAccount.getBalance({
      tokenAddress: TOKEN_ADDRESS,
    });
    const formattedAfter = (Number(balanceAfter.balance) / Math.pow(10, balanceAfter.decimals)).toFixed(balanceAfter.decimals);
    console.log(`💰 入金後の残高: ${formattedAfter} USDC\n`);

    // 7. 結果のサマリーを表示
    const depositedAmount = (Number(balanceAfter.balance - balanceBefore.balance) / Math.pow(10, TOKEN_DECIMALS)).toFixed(TOKEN_DECIMALS);
    console.log("📋 === 入金完了サマリー ===");
    console.log(`チェーン: ${CHAIN.name} (${CHAIN.id})`);
    console.log(`トークン: ${TOKEN_ADDRESS}`);
    console.log(`ガスタンクアドレス: ${gasTankAddress}`);
    console.log(`入金額: ${depositedAmount} USDC`);
    console.log(`入金前残高: ${formattedBefore} USDC`);
    console.log(`入金後残高: ${formattedAfter} USDC`);
    console.log(`トランザクション: ${hash}`);

    console.log("\n🎉 スクリプトが正常に完了しました");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプトを実行
if (import.meta.main) {
  main();
}
