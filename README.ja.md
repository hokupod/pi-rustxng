# pi-rustxng

[English](README.md)

[Pi](https://github.com/earendil-works/pi) と [Oh My Pi（OMP）](https://github.com/can1357/oh-my-pi) から [RustXNG](https://github.com/sahenjp/RustXNG) の Web 検索とページ本文取得を使う拡張です。各ホストの native MCP を使います。OMP 標準の `web_search` は別のツールとして共存します。

## Pi に導入する

Node.js 22 以上と、`pi.registerMcpServer` を提供する Pi が必要です。

1. 拡張をインストールします。

   ```sh
   pi install git:github.com/hokupod/pi-rustxng
   ```

2. Pi を起動します。起動済みなら `/reload` を実行します。
3. Pi の入力欄で `/rustxng-install` を実行します。引数はありません。この操作で公式 GitHub release から RustXNG v0.31.2、LICENSE、NOTICE をダウンロードし、検証します。
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

バイナリの配置先は `~/.local/share/pi-rustxng/v0.31.2/rustxng` です。Windows のファイル名は `rustxng.exe` です。Windows でもホームディレクトリ以下の同じ `.local/share/pi-rustxng/v0.31.2` を使います。

## OMP に導入する

OMP 対応は `pi-rustxng@0.2.0` からで、`0.1.1` には含まれません。Node.js 22 以上と OMP 18.13.2 が必要です。

1. 次のコマンドで npm から `0.2.2` を導入します。

   ```sh
   omp plugin install pi-rustxng@0.2.2
   ```

   手元の checkout を使う場合は、絶対パスを指定してリンクします。

   ```sh
   omp plugin link /absolute/path/to/pi-rustxng
   ```

   `omp plugin install /absolute/path/to/pi-rustxng` でも導入できます。OMP 18.13.2 では、これらのコマンドによるプロジェクト限定の導入はできません。

2. OMP を起動または再起動して、新しい拡張を読み込みます。
3. `/rustxng-install` を引数なしで実行し、管理対象バイナリをダウンロードして検証します。
4. 導入後に OMP を再起動し、`/mcp` で `rustxng` の状態を確認します。`/mcp reload` でも再試行できますが、接続が復旧しなければ再起動します。プラグインやバイナリの導入成功は、MCP の接続成功を意味しません。
5. OMP に RustXNG での検索を依頼し、同じ接続で結果のページ本文を取得します。ツール名は `mcp__rustxng_search` と `mcp__rustxng_read_page` です。`tools.xdev` 使用時はツール探索を通じて公開される場合があります。

OMP 拡張のロードや MCP ランチャーの起動だけでは RustXNG を導入しません。拡張は導入コマンドを提供し、OMP はパッケージの `.mcp.json` を使って接続を管理します。MCP 設定の手動変更は不要です。

## 既存のバイナリを指定する

独自に管理するバイナリには、起動前に `PI_RUSTXNG_BIN` を設定します。

```sh
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" pi
PI_RUSTXNG_BIN="/absolute/path with spaces/rustxng" omp
```

絶対パスの実行可能ファイルだけを受け付けます。`PATH` は検索しません。相対パス、空文字、ディレクトリ、実行不可ファイルは登録しません。override のバージョンと完全性は利用者が管理します。拡張は override のハッシュを検証しません。

`PI_RUSTXNG_BIN` が設定されている間、`/rustxng-install` は導入を行いません。管理対象バイナリに戻すには環境変数を解除して使用中のホストを再起動します。

## 更新と削除

RustXNG は v0.31.2 に固定しています。自動更新や `postinstall` はありません。`/rustxng-install` の再実行は既存のバイナリと LICENSE、NOTICE を再検証して再利用します。

以前の固定バージョンから拡張を更新した場合は、ホストを再起動して `/rustxng-install` を実行し、もう一度再起動して `/mcp` を確認します。新しいバージョンは専用ディレクトリに導入され、古いバージョンはそのまま残ります。

不完全または変更された既存ディレクトリは上書きしません。Pi と OMP を終了し、エラーで示されたバージョンディレクトリを別名に退避してから再実行します。既存データを保護するための動作です。

Pi の拡張を削除します。

```sh
pi remove git:github.com/hokupod/pi-rustxng
```

ローカルパスから導入した場合は、`pi list` の該当パスを `pi remove` に渡します。両ホストを終了後、不要になった `~/.local/share/pi-rustxng/v0.31.2` を削除するとバイナリも削除できます。

## 開発時の確認

[開発時のチェック](docs/development.md) に従い、固定したツールとリポジトリ内のフックを準備します。公開前に `node scripts/check.mjs` を実行してください。

```sh
node --test
```

開発用の依存パッケージを導入した後は、外部接続なしでテストを実行できます。実バイナリによる検索とページ取得は、導入後に Pi と OMP で別途確認します。

[動作と制約](docs/reference.md) に対応環境、データ送信、MCP の制約を記載しています。[ライセンスと配布方針](docs/distribution.md) にバイナリ同梱の扱いを記載しています。

## 謝辞

この拡張に Web 検索とページ本文取得の機能を提供する [RustXNG](https://github.com/sahenjp/RustXNG) と、作者の [sahenjp](https://github.com/sahenjp) さんに感謝します。
