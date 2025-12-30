/**
 * ガスタンク引き出しスクリプト
 * 
 * このスクリプトはガスタンクから資金を引き出します。
 * 
 * 使い方:
 *   bun run withdraw-gas-tank
 * 
 * 環境変数で引き出し額と受取アドレスを設定できます:
 *   WITHDRAW_AMOUNT=0.5 RECIPIENT_ADDRESS=0x... bun run withdraw-gas-tank
 * 
 * 全額引き出しの場合:
 *   WITHDRAW_ALL=true bun run withdraw-gas-tank
 */

import "dotenv/config";
import {
  testnetMcUSDC,
  toGasTankAccount,
  runtimeERC20BalanceOf,
} from "@biconomy/abstractjs";
import {
  http,
  parseUnits,
  type Hex,
  type Address,
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

// 引き出し設定
const CHAIN = baseSepolia;
const TOKEN_ADDRESS = testnetMcUSDC.addressOn(baseSepolia.id);
const WITHDRAW_ALL = process.env.WITHDRAW_ALL === "true";
const WITHDRAW_AMOUNT = process.env.WITHDRAW_AMOUNT || "0.5"; // デフォルト: 0.5 USDC
const TOKEN_DECIMALS = 6;
const CONFIRMATIONS = 3; // 確認ブロック数

async function main() {
  try {
    console.log("💸 === ガスタンク引き出しスクリプト ===\n");

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

    // 4. 引き出し前の残高を確認
    console.log("⏳ 引き出し前の残高を確認中...");
    const balanceBefore = await gasTankAccount.getBalance({
      tokenAddress: TOKEN_ADDRESS,
    });
    const formattedBefore = (Number(balanceBefore.balance) / Math.pow(10, balanceBefore.decimals)).toFixed(balanceBefore.decimals);
    console.log(`💰 引き出し前の残高: ${formattedBefore} USDC\n`);

    // 残高が0の場合は処理を終了
    if (balanceBefore.balance === 0n) {
      console.log("⚠️  ガスタンクの残高が0です。引き出しできません。\n");
      process.exit(0);
    }

    // 5. 受取アドレスを決定
    const eoaAccount = privateKeyToAccount(privateKey);
    const recipientAddress = (process.env.RECIPIENT_ADDRESS as Address) || eoaAccount.address;
    console.log(`📬 受取アドレス: ${recipientAddress}\n`);

    // 6. 引き出し額を決定
    let withdrawAmount: bigint;
    let withdrawMessage: string;

    if (WITHDRAW_ALL) {
      withdrawAmount = balanceBefore.balance;
      withdrawMessage = "全額を引き出し中...";
      console.log("⚠️  全額引き出しモード");
    } else {
      withdrawAmount = parseUnits(WITHDRAW_AMOUNT, TOKEN_DECIMALS);
      withdrawMessage = `${WITHDRAW_AMOUNT} USDC を引き出し中...`;
      
      // 引き出し額が残高を超えていないか確認
      if (withdrawAmount > balanceBefore.balance) {
        console.error("❌ 引き出し額が残高を超えています");
        console.log(`   引き出し額: ${WITHDRAW_AMOUNT} USDC`);
        console.log(`   現在の残高: ${formattedBefore} USDC\n`);
        process.exit(1);
      }
    }

    // 7. 引き出しを実行
    console.log(`⏳ ${withdrawMessage}`);
    console.log(`   ${CONFIRMATIONS} ブロックの確認を待ちます...`);
    console.log("   これには数分かかる場合があります...\n");

    await gasTankAccount.withdraw({
      tokenAddress: TOKEN_ADDRESS,
      recipient: recipientAddress,
      amount: withdrawAmount,
      confirmations: CONFIRMATIONS,
    });

    console.log("✅ 引き出しが完了しました！\n");

    // 8. 引き出し後の残高を確認
    console.log("⏳ 引き出し後の残高を確認中...");
    const balanceAfter = await gasTankAccount.getBalance({
      tokenAddress: TOKEN_ADDRESS,
    });
    const formattedAfter = (Number(balanceAfter.balance) / Math.pow(10, balanceAfter.decimals)).toFixed(balanceAfter.decimals);
    console.log(`💰 引き出し後の残高: ${formattedAfter} USDC\n`);

    // 9. 結果のサマリーを表示
    const withdrawnAmount = (Number(balanceBefore.balance - balanceAfter.balance) / Math.pow(10, TOKEN_DECIMALS)).toFixed(TOKEN_DECIMALS);
    console.log("📋 === 引き出し完了サマリー ===");
    console.log(`チェーン: ${CHAIN.name} (${CHAIN.id})`);
    console.log(`トークン: ${TOKEN_ADDRESS}`);
    console.log(`ガスタンクアドレス: ${gasTankAddress}`);
    console.log(`受取アドレス: ${recipientAddress}`);
    console.log(`引き出し額: ${withdrawnAmount} USDC`);
    console.log(`引き出し前残高: ${formattedBefore} USDC`);
    console.log(`引き出し後残高: ${formattedAfter} USDC`);

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
