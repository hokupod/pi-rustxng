# pi-rustxng

[English](README.md)

[Pi](https://github.com/earendil-works/pi) から [RustXNG](https://github.com/sahenjp/RustXNG) の Web 検索とページ本文取得を使う拡張です。Pi の native MCP に stdio サーバーを登録します。

## 導入する

Node.js 22 以上と、`pi.registerMcpServer` を提供する Pi が必要です。

1. 拡張をインストールします。

   ```sh
   pi install git:github.com/hokupod/pi-rustxng
   ```

2. Pi を起動します。起動済みなら `/reload` を実行します。
3. Pi の入力欄で `/rustxng-install` を実行します。引数はありません。この操作で公式 GitHub release から RustXNG v0.30.0、LICENSE、NOTICE をダウンロードし、検証します。
4. `/mcp` で `rustxng` の接続状態を確認します。登録完了の通知は接続成功を保証しません。
5. Pi に「RustXNG で Rust の公式ドキュメントを検索して、結果のページ本文を読んで」と依頼します。

拡張のロードだけではダウンロードしません。バイナリ未導入時も拡張はロードされ、導入方法を通知します。導入後は MCP サーバーを登録します。

手元の checkout から導入する場合は次を実行します。

```sh
git clone https://github.com/hokupod/pi-rustxng.git
cd pi-rustxng
node scripts/install-rustxng.mjs
pi install .
```

バイナリの配置先は `~/.local/share/pi-rustxng/v0.30.0/rustxng` です。Windows のファイル名は `rustxng.exe` です。Windows でもホームディレクトリ以下の同じ `.local/share/pi-rustxng/v0.30.0` を使います。

## 既存のバイナリを指定する

独自に管理するバイナリには、起動前に `PI_RUSTXNG_BIN` を設定します。

```sh
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" pi
```

絶対パスの実行可能ファイルだけを受け付けます。`PATH` は検索しません。相対パス、空文字、ディレクトリ、実行不可ファイルは登録しません。override のバージョンと完全性は利用者が管理します。拡張は override のハッシュを検証しません。

`PI_RUSTXNG_BIN` が設定されている間、`/rustxng-install` は導入を行いません。管理対象バイナリに戻すには環境変数を解除して Pi を再起動します。

## 更新と削除

RustXNG は v0.30.0 に固定しています。自動更新や `postinstall` はありません。`/rustxng-install` の再実行は既存のバイナリと LICENSE、NOTICE を再検証して再利用します。

不完全または変更された既存ディレクトリは上書きしません。Pi を終了し、エラーで示されたバージョンディレクトリを別名に退避してから再実行します。既存データを保護するための動作です。

拡張を削除します。

```sh
pi remove git:github.com/hokupod/pi-rustxng
```

ローカルパスから導入した場合は、`pi list` の該当パスを `pi remove` に渡します。Pi を終了後、不要になった `~/.local/share/pi-rustxng/v0.30.0` を削除するとバイナリも削除できます。

## 開発時の確認

[開発時のチェック](docs/development.md) に従い、固定したツールとリポジトリ内のフックを準備します。公開前に `node scripts/check.mjs` を実行してください。

```sh
node --test
```

テストは追加パッケージや外部接続を必要としません。実バイナリによる検索とページ取得は、導入後に Pi から別途確認します。

[動作と制約](docs/reference.md) に対応環境、データ送信、MCP の制約を記載しています。[ライセンスと配布方針](docs/distribution.md) にバイナリ同梱の扱いを記載しています。
