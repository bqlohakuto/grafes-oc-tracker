# グラフェス2026 OC TRACKER

グラブルフェス2026の撮影スポット・ステージの登場状況を来場者同士で共有する**非公式・開発中**のスマホ向けWebアプリです。

## 機能
- 会場の仮マップ上で各スポットを選択し、状態アイコンを確認
- 待機列の「列形成開始」「列締切」「撮影終了」を投稿
- キャストの「登場」「まだいる」「離れた」を独立して投稿
- 十二神将・六竜などのカテゴリ別検索、お気に入り
- ステージの出演開始・終了報告
- Supabaseの報告データ取得とRealtime更新

## GitHub Pagesの公開設定
GitHubの **Settings → Pages → Build and deployment** から、
`Deploy from a branch` を選択し、`main` / `/(root)` で保存してください。
設定が完了すると通常は `https://bqlohakuto.github.io/grafes-oc-tracker/` で公開されます。

## Supabaseの設定
`config.js` に専用プロジェクトの**公開可能な**Publishable keyが設定されています。秘密鍵は絶対にコミットしないでください。
メールアドレス登録なしの投稿には [Supabaseの認証設定](https://supabase.com/dashboard/project/qpdhznlqseiqvqyyivgj/auth/providers) で `Anonymous Sign-ins` を有効にする必要があります。

## 公開前に必要な確認
- **現状の会場マップ、エリアの位置、出演キャストは仮データで、公式情報ではありません。**
- 正式なOC一覧・公開撮影スポット・公式ステージ予定へ差し替える
- 通報・モデレーター機能と、複数人確認による誤情報対策を追加
- スマートフォン2台で投稿・受信・リロードの動作検証
- 回線不安定時の動作やアクセス集中時の負荷テスト
- 非公開エリアや出演者の移動経路は扱わない

現地スタッフの案内・撮影ルールが常に優先です。
