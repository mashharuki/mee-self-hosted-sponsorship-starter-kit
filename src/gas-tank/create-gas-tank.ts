/**
 * ガスタンク作成スクリプト
 * 
 * このスクリプトは新しいガスタンクをデプロイします。
 * 既にデプロイ済みの場合は情報を表示します。
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
} from "viem";
import { baseSepolia } from "viem/chains";

// 環境変数の検証
if (!process.env.PRIVATE_KEY) {
  throw new Error("❌ PRIVATE_KEY environment variable is not set");
}
if (!process.env.MEE_API_KEY) {
  throw new Error("❌ MEE_API_KEY environment variable is not set");
}

const privateKey = process.env.PRIVATE_KEY as Hex;
const meeApiKey = process.env.MEE_API_KEY;

// デプロイ設定
const CHAIN = baseSepolia;
const TOKEN_ADDRESS = testnetMcUSDC.addressOn(baseSepolia.id);
const INITIAL_DEPOSIT = "0.1"; // 0.1 USDC
const TOKEN_DECIMALS = 6;

async function main() {
  try {
    console.log("🚀 === ガスタンク作成スクリプト ===\n");

    // 1. ガスタンクアカウントを作成
    console.log("⏳ ガスタンクアカウントを作成中...");
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
    console.log("✅ ガスタンクアカウントを作成しました\n");

    // 2. ガスタンクアドレスを取得
    console.log("⏳ ガスタンクアドレスを取得中...");
    const { address: gasTankAddress } = await gasTankAccount.getAddress();
    console.log(`✅ ガスタンクアドレス: ${gasTankAddress}\n`);

    // 3. デプロイ状態を確認
    console.log("⏳ デプロイ状態を確認中...");
    const isDeployed = await gasTankAccount.isDeployed();
    
    if (isDeployed) {
      console.log("✅ このガスタンクは既にデプロイ済みです\n");
      
      // 残高を確認
      console.log("⏳ 残高を確認中...");
      const { balance, decimals } = await gasTankAccount.getBalance({
        tokenAddress: TOKEN_ADDRESS,
      });
      const formatted = (Number(balance) / Math.pow(10, decimals)).toFixed(decimals);
      console.log(`💰 現在の残高: ${formatted} USDC\n`);
      
      console.log("📋 === デプロイ済みガスタンク情報 ===");
      console.log(`チェーン: ${CHAIN.name} (${CHAIN.id})`);
      console.log(`トークン: ${TOKEN_ADDRESS}`);
      console.log(`ガスタンクアドレス: ${gasTankAddress}`);
      console.log(`残高: ${formatted} USDC`);
    } else {
      console.log("⚠️  ガスタンクはまだデプロイされていません\n");
      
      // 4. デプロイと初期資金の供給
      console.log(`⏳ ガスタンクをデプロイして ${INITIAL_DEPOSIT} USDC を供給中...`);
      console.log(`   これには数秒から数分かかる場合があります...\n`);
      
      const result = await gasTankAccount.deploy({
        tokenAddress: TOKEN_ADDRESS,
        amount: parseUnits(INITIAL_DEPOSIT, TOKEN_DECIMALS),
      });

      console.log("✅ ガスタンクのデプロイが完了しました！\n");
      
      console.log("📋 === デプロイ情報 ===");
      console.log(`チェーン: ${CHAIN.name} (${CHAIN.id})`);
      console.log(`トークン: ${TOKEN_ADDRESS}`);
      console.log(`ガスタンクアドレス: ${result.address}`);
      console.log(`初期デポジット: ${INITIAL_DEPOSIT} USDC`);
      console.log(`デプロイ状態: ${result.isDeployed ? '成功' : '失敗'}`);
    }

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
