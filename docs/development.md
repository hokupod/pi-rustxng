# 開発時のチェック

実行時のパッケージ依存はありません。開発には Node.js 24 以上、Safe-chain 1.5.27、Gitleaks 8.30.1 を使います。ツールのバージョンと Safe-chain のハッシュは [toolchain-policy.json](../toolchain-policy.json) に記録しています。

## ツールを準備する

[Safe-chain 1.5.27](https://github.com/AikidoSec/safe-chain/releases/tag/1.5.27) を `~/.local/share/pi-rustxng/tools/safe-chain/1.5.27/safe-chain` に導入します。[Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) も公式の配布物を使います。Safe-chain は対象環境の単体バイナリをダウンロードし、SHA-256 が toolchain-policy.json と一致することを確認してから、上記の専用パスに実行権限を付けて配置してください。標準のユーザー用インストールを置き換えるインストーラーは使いません。Gitleaks は公式の導入手順に従い、リリースのチェックサムを確認してください。このリポジトリは両ツールを自動で導入・更新しません。

Safe-chain のラッパーは固定したハッシュとバージョンを確認してから実行します。対象外の環境や異なるバイナリでは停止し、保護されていないパッケージマネージャーへ切り替えません。開発環境は macOS と Linux の arm64、x64 が対象です。この制限は RustXNG の実行対象には影響しません。

リポジトリのルートで、ロックファイルに固定した開発用の依存パッケージを導入します。

```sh
node scripts/safe-chain.mjs npm ci --ignore-scripts
```

Gitleaks の実行ファイルを絶対パスで指定し、このリポジトリのフックを設定します。

```sh
node scripts/install-hooks.mjs /absolute/path/to/gitleaks
```

このコマンドはリポジトリ内の `core.hooksPath` と `piRustxng.gitleaks` を設定します。別のフック用ディレクトリが設定されている場合や、サンプル以外の既存フックがある場合は上書きせず停止します。その場合は、既存のフックへチェックを手動で組み込んでください。

## 公開前に確認する

ファイルを整形してから、すべてのチェックを実行します。

```sh
node scripts/safe-chain.mjs npm run format
node scripts/check.mjs
```

チェックは整形、lint、単体テスト、Gitleaks によるローカルの Git 全履歴の検査を順に実行し、最初の失敗で停止します。Gitleaks の出力では秘密情報を伏せます。実行ファイルは `GITLEAKS_BIN`、リポジトリ内の `piRustxng.gitleaks`、`PATH` の順に探します。実行ファイルがない場合やバージョンが異なる場合は失敗します。

`pre-commit` フックはステージした変更を検査してから、整形、lint、単体テストを実行します。`pre-push` フックはすべてのチェックを実行します。履歴の検査では未コミットのファイルを調べないため、変更をステージして検査してからコミットします。秘密情報の検査は、機微な情報がないことを保証するものではありません。公開前に差分とコミットのメタデータも確認してください。

開発用の依存パッケージを導入した後は、外部接続なしでテストを実行できます。

```sh
node --test
```

実際の検索とページ本文取得は Pi で別途確認します。単体テストでは、外部検索プロバイダーが利用できるかどうかは分かりません。

## 依存関係の更新

[Dependabot](../.github/dependabot.yml) はnpm の依存パッケージと GitHub Actions を毎日 09:00 Asia/Tokyo に確認する設定です。週末も対象になるよう cron を使います。通常のバージョン更新では、公開から 3 日以上経過したものを対象にします。この待機期間はセキュリティ更新には適用されません。セキュリティ更新には GitHub の別の仕組みを使います。

更新のプルリクエストと CI の結果を確認してからマージしてください。この設定は自動マージや自動リリースを有効にしません。定期確認はすべての脆弱性を直ちに検知・修正できることを保証するものではありません。

この設定では Renovate の独自の正規表現マネージャーを置き換えられません。ソースやスクリプトに記録した RustXNG、Safe-chain、Gitleaks のバイナリのバージョンとチェックサムは、引き続き手動で確認・更新します。スケジュールと待機期間の動作は [Dependabot の設定リファレンス](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) を参照してください。
