/**
 * MEEスタック向けセルフホスティングマルチチェーンガススポンサーシップサービス
 *
 * このサーバーは、Biconomy AbstractJSを使用して、複数のブロックチェーンネットワークで
 * ユーザーのガス代を代理支払い（スポンサー）するためのREST APIを提供します。
 */

// 環境変数の読み込み（.envファイル）
import "dotenv/config";

// Express.jsのインポート（REST APIサーバー構築用）
import express, { type Request, type Response } from "express";
import { Router } from "express";

// Biconomy AbstractJSのインポート（ガス代スポンサーシップ機能用）
import {
  getMeeScanLink,
  testnetMcUSDC,
  toGasTankAccount,
  type GasTankAccount,
  type GetQuotePayload,
} from "@biconomy/abstractjs";

// Viem（Ethereumブロックチェーン操作ライブラリ）のインポート
import {
  erc20Abi,          // ERC20トークンの標準ABI
  formatUnits,       // トークン金額のフォーマット用
  http,              // HTTPトランスポート設定用
  isAddress,         // アドレス検証用
  isHash,            // トランザクションハッシュ検証用
  parseUnits,        // トークン金額のパース用
  stringify,         // JSONシリアライズ用
  type Address,      // アドレス型
  type Chain,        // チェーン型
  type Hex,          // 16進数文字列型
} from "viem";
import { baseSepolia } from "viem/chains";  // テストネットチェーン定義
import { privateKeyToAccount } from "viem/accounts";   // 秘密鍵からアカウント生成
import { readContract } from "viem/actions";          // コントラクト読み取り用

// ==================== 型定義 ====================

/**
 * ガスタンク初期化設定
 * 各ガスタンクの初期化に必要な設定情報を定義します。
 */
interface GasTankConfiguration {
  tokenAddress: Address;    // スポンサーシップに使用するトークンのアドレス（USDC等）
  chain: Chain;             // デプロイ先のブロックチェーン（例: Base Sepolia）
  amountToDeposit: bigint;  // 初期デポジット金額
  rpcUrl: string;           // ブロックチェーンRPCエンドポイントURL
  privateKey: Hex;          // ガスタンクオーナーの秘密鍵
}

/**
 * デプロイ済みガスタンク
 * 運用中のガスタンクの情報を保持します。
 */
interface GasTank {
  chainId: number;                // チェーンID（例: 84532 = Base Sepolia）
  tokenAddress: Address;          // 使用トークンアドレス
  gasTankAddress: Address;        // ガスタンクのコントラクトアドレス
  gasTankAccount: GasTankAccount; // Biconomyのガスタンクアカウント抽象化オブジェクト
}

/**
 * ガスタンク情報（クライアント返却用）
 * APIレスポンスとして返すガスタンクの情報を定義します。
 */
interface GasTankInfo {
  chainId: number;       // チェーンID
  token: {               // トークン情報
    address: Address;    // トークンアドレス
    balance: string;     // 残高（フォーマット済み文字列）
    decimals: number;    // トークンの小数点桁数
  };
  gasTankAddress: Address;  // ガスタンクアドレス  // ガスタンクアドレス
}

// ==================== グローバル変数 ====================

/**
 * ガスタンクストレージ（メモリ内）
 * チェーンIDをキーとして、各チェーンのガスタンク配列を保持します。
 * 例: Map { 84532 => [GasTank, GasTank], 11155111 => [GasTank] }
 */
const gasTanks = new Map<number, GasTank[]>();

/**
 * EOA（外部所有アカウント）の秘密鍵
 * 環境変数 PRIVATE_KEY から読み込みます
 * この秘密鍵を持つアカウントがガスタンクをデプロイ・管理します。
 */
if (!process.env.PRIVATE_KEY) {
  throw new Error(
    "PRIVATE_KEY environment variable is not set. Please configure it in .env file."
  );
}
const privateKey = process.env.PRIVATE_KEY as Hex;

/**
 * ガスタンク初期化設定リスト
 * 起動時に初期化するガスタンクの設定を定義します。
 * 複数のチェーン・トークンの組み合わせを設定可能です。
 */
const gasTankConfigurations: GasTankConfiguration[] = [
  // Base Sepoliaテストネット用ガスタンク
  {
    tokenAddress: testnetMcUSDC.addressOn(baseSepolia.id),  // Base SepoliaのテストUSDCアドレス
    chain: baseSepolia,                                      // Base Sepoliaチェーン
    amountToDeposit: parseUnits("5", 6),                    // 初期デポジット: 5 USDC（6桁の小数点）
    rpcUrl: baseSepolia.rpcUrls.default.http[0],            // デフォルトRPC URL
    privateKey,                                              // 上で定義した秘密鍵を使用
  },
];

// ==================== ガスタンク初期化処理 ====================

/**
 * スポンサーシップガスタンクの初期化
 *
 * 設定に基づいて全てのガスタンクを初期化します。
 * - ガスタンクアカウントの作成
 * - 既存のガスタンクチェック（重複防止）
 * - 未デプロイの場合は自動デプロイ
 * - メモリストレージへの登録
 *
 * @param gasTankConfigs - ガスタンク設定の配列
 */
const initializeSponsorship = async (
  gasTankConfigs: GasTankConfiguration[]
) => {

  // 各ガスタンク設定を順番に処理
  for (const gasTankConfig of gasTankConfigs) {
    const { rpcUrl, chain, privateKey, tokenAddress, amountToDeposit } =
      gasTankConfig;

    // ガスタンクアカウント（アカウント抽象化）を作成
    // これがスポンサーシップの主体となるスマートコントラクトウォレットです
    const gasTankAccount = await toGasTankAccount({
      transport: http(rpcUrl),  // HTTPトランスポートでRPCに接続
      chain,                     // 対象チェーン
      privateKey,                // オーナーの秘密鍵
      options: {
        mee: {
          apiKey: process.env.MEE_API_KEY,
        }
      },
    });

    // ガスタンクアカウントのアドレスを取得
    const { address: gasTankAddress } = await gasTankAccount.getAddress();

    // このチェーンに既に登録されているガスタンクを取得
    const existingGasTanks = gasTanks.get(chain.id) || [];

    // 重複チェック: 同じトークン・同じアドレスのガスタンクが既に存在するか確認
    // 重複している場合は初期化をスキップ
    const isDuplicateGasTank = existingGasTanks.some((gasTank) => {
      if (
        gasTank.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
        gasTank.gasTankAddress.toLowerCase() === gasTankAddress.toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    if (isDuplicateGasTank) continue;  // 重複の場合はスキップして次へ  // 重複の場合はスキップして次へ

    // 秘密鍵からEOA（外部所有アカウント）を生成
    // このアカウントがガスタンクのオーナーとなります
    const eoaAccount = privateKeyToAccount(privateKey);

    // デバッグ情報: EOAアドレスを出力
    console.log(
      `Gas tank (${chain.id}) EOA account address: `,
      eoaAccount.address
    );

    // デバッグ情報: ガスタンクアドレスを出力
    console.log(`Gas tank (${chain.id}) account address: `, gasTankAddress);

    // ガスタンクアカウントが既にブロックチェーンにデプロイされているか確認
    const isDeployed = await gasTankAccount.isDeployed();

    // まだデプロイされていない場合、デプロイを実行
    if (!isDeployed) {
      // EOAのトークン残高を確認（デプロイに十分な残高があるか）
      const balance = await readContract(gasTankAccount.publicClient, {
        address: tokenAddress,    // トークンコントラクトアドレス
        abi: erc20Abi,            // ERC20標準ABI
        functionName: "balanceOf", // 残高確認関数
        args: [eoaAccount.address],// EOAアドレス
      });

      // ガス代のバッファを25%追加した金額を計算
      // デプロイトランザクションのガス代を考慮した安全マージン
      const amountToDepositWithGasFees = (amountToDeposit * 125n) / 100n;

      // 残高が不足している場合はスキップ
      if (balance < amountToDepositWithGasFees) {
        console.log(
          "Not enough balance to deploy sponsorship gas tank account. Deployment is skipped"
        );
        continue;
      }

      console.log("Sponsorship gas tank account is being deployed");

      // ガスタンクアカウントをデプロイし、同時に初期トークンをデポジット
      const { hash } = await gasTankAccount.deploy({
        tokenAddress,          // デポジットするトークン
        amount: amountToDeposit, // デポジット金額
      });

      if (hash) {
        // デプロイトランザクションのリンクを出力（MEE Scan）
        console.log(
          "Sponsorship gas tank account deployment transaction link: ",
          getMeeScanLink(hash)
        );
      } else {
        // デプロイトランザクションがない場合（既にデプロイ済み）
        console.log("Sponsorship gas tank account was already deployed");
      }
    }

    // 新しいガスタンクオブジェクトを作成
    const newGasTank: GasTank = {
      chainId: chain.id,          // チェーンID
      tokenAddress,               // トークンアドレス
      gasTankAddress,             // ガスタンクアドレス
      gasTankAccount,             // ガスタンクアカウント抽象化オブジェクト
    };

    // メモリ内のガスタンクストレージに追加
    let gasTankArr: GasTank[] = [];

    if (existingGasTanks.length > 0) {
      // 既存のガスタンクがある場合は配列に追加
      gasTankArr = [...existingGasTanks, newGasTank];
    } else {
      // このチェーンで最初のガスタンクの場合
      gasTankArr = [newGasTank];
    }

    // チェーンIDをキーとしてMapに保存
    gasTanks.set(chain.id, gasTankArr);
  }
};

// ==================== 起動時初期化 ====================

// サーバー起動時に全てのガスタンクを初期化
// トップレベルawaitを使用（ESModuleのため可能）
await initializeSponsorship(gasTankConfigurations);

// ==================== Express サーバーセットアップ ====================

const app = express();            // Expressアプリケーションインスタンス
const router = Router();          // ルーター（エンドポイント定義用）
const PORT = process.env.PORT || 3004;  // サーバーポート（環境変数 or デフォルト3004）

// ミドルウェア設定
app.use(express.json());          // JSONリクエストボディのパース
app.use("/v1", router);           // 全エンドポイントに /v1 プレフィックスを付与           // 全エンドポイントに /v1 プレフィックスを付与

// ==================== API エンドポイント ====================

/**
 * GET /v1/sponsorship/info
 *
 * 全ガスタンクの情報を取得
 * - 各チェーンのガスタンク一覧
 * - トークン残高
 * - アドレス情報
 *
 * レスポンス例:
 * {
 *   "84532": [{ chainId, token: { address, balance, decimals }, gasTankAddress }],
 *   "11155111": [...]
 * }
 */
router.get("/sponsorship/info", async (req: Request, res: Response) => {
  try {
    // チェーンIDをキーとしたガスタンク情報オブジェクト
    const gasTankInfo: Record<string, GasTankInfo[]> = {};

    // 全チェーンのガスタンクを走査
    const existingGasTanksByChains = gasTanks.entries();

    for (const [chainId, existingGasTanks] of existingGasTanksByChains) {
      // 各チェーンのガスタンク情報を並列取得
      gasTankInfo[chainId] = await Promise.all(
        existingGasTanks.map(async (gasTank) => {
          // 各ガスタンクのトークン残高と小数点桁数を取得
          const { balance, decimals } = await gasTank.gasTankAccount.getBalance(
            {
              tokenAddress: gasTank.tokenAddress,
            }
          );

          return {
            chainId: gasTank.chainId,
            token: {
              address: gasTank.tokenAddress,
              balance: formatUnits(balance, decimals),
              decimals,
            },
            gasTankAddress: gasTank.gasTankAddress,
          };
        })
      );
    }

    res.json(gasTankInfo);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch gas tank info";
    res.status(400).json({
      errors: [errorMessage],
    });
  }
});

/**
 * GET /v1/sponsorship/nonce/:chainId/:gasTankAddress
 *
 * 特定のガスタンクアカウントの現在のnonceを取得
 *
 * パラメータ:
 * - chainId: チェーンID（例: 84532）
 * - gasTankAddress: ガスタンクアドレス
 *
 * レスポンス: { nonceKey: string, nonce: string }
 *
 * nonceはトランザクションの順序管理に使用されます。
 */
router.get(
  "/sponsorship/nonce/:chainId/:gasTankAddress",
  async (req: Request, res: Response) => {
    try {
      const { chainId, gasTankAddress } = req.params;

      // パラメータのバリデーション
      if (!chainId) throw new Error("Invalid chain id");

      if (!gasTankAddress || !isAddress(gasTankAddress))
        throw new Error("Invalid gas tank address");

      // 指定されたチェーンのガスタンクを検索
      const existingGasTanks = gasTanks.get(Number(chainId)) || [];

      // 指定されたアドレスのガスタンクをフィルタリング
      const [gasTank] = existingGasTanks.filter(
        (tank) =>
          tank.gasTankAddress.toLowerCase() === gasTankAddress.toLowerCase()
      );

      if (!gasTank) throw new Error("Gas tank not found");

      // アカウントの現在のnonce（トランザクション番号）を取得
      const { nonce, nonceKey } = await gasTank.gasTankAccount.getNonce();

      res.json({ nonceKey: nonceKey.toString(), nonce: nonce.toString() });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch gas tank nonce";
      res.status(400).json({
        errors: [errorMessage],
      });
    }
  }
);

// Endpoint to get the transaction receipt for a sponsorship transaction
router.get(
  "/sponsorship/receipt/:chainId/:hash",
  async (req: Request, res: Response) => {
    try {
      const { hash, chainId } = req.params;

      if (!chainId) throw new Error("Invalid chain id");

      if (!hash || !isHash(hash)) throw new Error("Invalid transaction hash");

      // Get the first gas tank for the given chain (assumes one per chain)
      const existingGasTanks = gasTanks.get(Number(chainId)) || [];

      if (existingGasTanks.length <= 0) throw new Error("No gas tanks found");

      const [gasTank] = existingGasTanks;

      if (!gasTank) throw new Error("Gas tank not found");

      // Fetch the transaction receipt from the public client
      const receipt =
        await gasTank.gasTankAccount.publicClient.getTransactionReceipt({
          hash,
        });

      res.setHeader("Content-Type", "application/json");
      res.send(stringify(receipt));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch transaction receipt";
      res.status(400).json({
        errors: [errorMessage],
      });
    }
  }
);

// Endpoint to sign a sponsorship quote using a gas tank account
router.post(
  "/sponsorship/sign/:chainId/:gasTankAddress",
  async (req: Request, res: Response) => {
    try {
      const { chainId, gasTankAddress } = req.params;

      const quote = req.body as GetQuotePayload;

      if (!chainId) throw new Error("Invalid chain id");

      if (!gasTankAddress || !isAddress(gasTankAddress))
        throw new Error("Invalid gas tank address");

      // Find the gas tank for the given chain and address
      const existingGasTanks = gasTanks.get(Number(chainId)) || [];

      const [gasTank] = existingGasTanks.filter(
        (tank) =>
          tank.gasTankAddress.toLowerCase() === gasTankAddress.toLowerCase()
      );

      if (!gasTank) throw new Error("Gas tank not found");

      if (
        quote.paymentInfo.token.toLowerCase() !==
        gasTank.tokenAddress.toLowerCase()
      ) {
        throw new Error("Sponsorship token not supported.");
      }

      // Project verification step: Here you can add logic to verify that the sponsorship request
      // is coming from an authorized or valid project. This may involve checking an API key,
      // validating a project ID, or performing other authentication/authorization checks.

      // Custom validation logic can be added here if needed.
      // For example, you may want to check the monthly spending limits, max spend per transaction,
      // or enforce business rules before signing.

      // Sign the sponsorship quote using the gas tank account
      const sponsorshipSignedQuote: GetQuotePayload =
        await gasTank.gasTankAccount.signSponsorship({ quote });

      res.json(sponsorshipSignedQuote);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch transaction receipt";
      res.status(400).json({
        errors: [errorMessage],
      });
    }
  }
);

// ==================== エラーハンドリングミドルウェア ====================

/**
 * グローバルエラーハンドラー
 *
 * 全ての未処理エラーをキャッチして、統一されたエラーレスポンスを返します。
 * MEEスタックとの互換性を保つため、エラーレスポンス形式を統一。
 */
app.use((err: Error, request: Request, response: Response, next: any) => {
  response.status(400).json({
    errors: [err.message || "Internal server error"],
  });
});

// ==================== サーバー起動 ====================

/**
 * Expressサーバーの起動
 *
 * デフォルトポート: 3004
 * 環境変数PORTで変更可能
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// モジュールとしてエクスポート（テスト等で使用可能）
export default app;
