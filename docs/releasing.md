# GitHub Actions から公開する

[English](releasing.en.md)

ワークフローは準備済みですが、この変更ではパッケージ公開や npm の信頼設定は行いません。`release.yml` が動くのは `v*` タグを push したときだけです。ブランチの push では CI のみが動き、公開しません。

## npm と GitHub を設定する

1. 新しいパッケージは npm アカウントと 2FA を使い、レビュー済みの初版を公開します。以下の Trusted Publisher 設定には、npm のパッケージ設定画面が必要です。仮のパッケージを公開したり、公開済みのバージョンを再利用したりしないでください。[npm の公開パッケージ作成手順](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)も参照してください。
2. GitHub に `release` environment を作成します。公開のたびに承認を挟む場合は、required reviewers を設定してください。ワークフローに environment 名を書くだけでは、承認者や保護ルールは設定されません。
3. npm のパッケージの **Settings → Trusted Publisher → GitHub Actions** を開き、次の内容を入力します。
   - Organization or user: `hokupod`
   - Repository: `pi-rustxng`
   - Workflow filename: `release.yml`
   - Environment name: `release`
   - 直接の `npm publish` を許可します。dist-tag 管理の権限は不要です。
4. npm が求める認証を行い、設定を保存します。長期間使える npm トークンや、GitHub の `NODE_AUTH_TOKEN` は作成しません。

これらのアカウント・権限設定は管理者が行います。ワークフローは設定を変更しません。現在の [npm の Trusted Publishing 資料](https://docs.npmjs.com/trusted-publishers/)では、未使用の信頼設定は、2 日以内の初回公開で検証されないと失効すると説明されています。公開の準備ができてから設定してください。npm の必要条件は Node 22.14 以上と npm 11.5.1 以上です。このワークフローは GitHub-hosted Ubuntu 上で Node 24 と npm 11.18.0 を使います。

## バージョンを公開する

1. `package.json` と `package-lock.json` を、同じ新しい安定版の番号に更新します。初回に `0.1.0` を公開した場合、次は `0.1.1` などにします。
2. 差分とコミットのメタデータを確認し、`node scripts/check.mjs` を実行します。レビュー済みのコミットを push し、CI の成功を確認します。
3. そのバージョンを一般公開するタイミングで、`v0.1.1` などの一致するタグを作成して push します。
4. `release` environment に承認者を設定した場合は、公開を承認します。実行後に Actions の結果と npm のバージョンを確認してください。

check job は、タグとパッケージの安定版番号が一致しなければ停止します。各チェックの後、ライフサイクルスクリプトを実行せずにパッケージを作成し、収録ファイルとパッケージ情報を確認して SHA-256 とコミットを記録します。publish job はその成果物を受け取り、再検証して同じ tarball を OIDC で公開します。`id-token: write` を持つのは publish job だけです。公開リポジトリからの対応する Trusted Publishing では、npm が provenance を生成します。

公開結果が不明な場合は、再実行する前に npm を確認してください。同じバージョンは再公開できません。別のコミットでやり直すために既存の公開タグを移動しないでください。

## 公開せずにローカルで確認する

```sh
node scripts/check.mjs
node scripts/release-package.mjs pack
node scripts/release-package.mjs verify
```

出力先は `.artifacts/release/` です。pack コマンドは出力先が空でなければ停止します。再実行する場合は、前の成果物を別の場所に移してください。この確認では OIDC、environment の承認、npm の公開権限は検証しません。release workflow には手動 dispatch による公開経路を設けていません。
