# ライセンスと配布方針

pi-rustxng のライセンスはRustXNG に合わせた **AGPL-3.0-or-later** です。[LICENSE](../LICENSE) を参照してください。

本リポジトリとパッケージは RustXNG バイナリを同梱しません。利用者が明示的に installer を実行すると、[RustXNG v0.31.2 の公式 release](https://github.com/sahenjp/RustXNG/releases/tag/v0.31.2) から、その環境のバイナリと LICENSE、NOTICE を取得します。RustXNG のソースは [v0.31.2 のソースツリー](https://github.com/sahenjp/RustXNG/tree/v0.31.2) にあります。

バイナリ同梱は技術的には可能です。ただし、対象 OS と CPU ごとの配布物管理、容量、更新時の検証が必要です。再配布する場合には AGPL の対応ソース提供、著作権表示、NOTICE、および依存コンポーネントの条件を確認する必要があります。単にソースの URL や LICENSE を添えるだけで、あらゆる再配布条件を満たすとはしていません。

この実装ではバイナリを再配布せず、公式配布元から明示的に導入する方式を採用しています。将来バイナリを同梱する場合は、配布方法とソース提供方法を別途確認します。
