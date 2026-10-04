# New_wAnime

新作アニメ・国内ドラマ（特撮を含む）・海外ドラマの放送、配信、出演者を探す日本語Webアプリです。ダーク／ライト表示、スマートフォン対応、PWA、ユーザー別マイリストを備えています。

外部APIから取得した実際の作品をPostgreSQLに保存します。デモデータを本番に投入する処理はありません。未発表の日付・出演者・日本の配信先は生成しません。

## 実装した機能

- ホーム：今月／来月の新作アニメとドラマ、今後の注目作品、今週の初回予定、追加された作品、更新された作品、マイリスト。
- ポスター付き一覧、詳細、あらすじ、制作会社、別名、出演者・役名、出典、確認日時、更新履歴。
- 年・月・アニメクールのプルダウン、期間、複数ジャンルAND／OR、出演者、サービス、状態、放送局、会社、原作媒体、新作区分、地域の複合検索。URLに検索条件を保持。
- 検索メニューの「放送中のみ」スイッチでオン／オフ。取得元の状態を基本に、未来の開始日・過去の終了日を除外。状態未定の作品は開始日と終了日が両方分かる場合だけ補完し、推定表示を付けます。終了・延期・放送予定という明示状態は推定で上書きしません。
- TVmazeの番組表と作品・出演者情報、TMDBのドラマ・日本Watch Providers、MALの季節別アニメ、許諾を条件とするAniListアダプター。
- 声優／俳優／女優検索、今期／来期・指定年月の出演作品、人物プロフィール。
- 未収録人物の外部API検索と、人物を選択した後の過去・今後の出演履歴取得（ログインが必要、1回30作品）。
- Wikidataの外部IDを照合した日本語名とWikipediaリンク。同名だけでは自動リンクしない。
- 日本の見放題／レンタル／購入／無料／広告付き無料を区別。ロゴ、出典、確認日時。確認済み公式発表の手動補正。
- 登録／ログイン／ログアウト、表示名・パスワード変更、アカウント削除。ユーザーごとの視聴状態・メモと端末間共有。
- JSTの月間初回カレンダー・週間番組表、分類・マイリストの切り替え。
- 初回取得、24時間ごとのworker、管理者用手動更新、排他制御、レート制限、タイムアウト・リトライ、保存済みデータの維持。
- PWA、専用アイコン、Windowsショートカットスクリプト、Docker Compose、Caddy HTTPS、バックアップ／復元、CI。
- Linux CIでDockerの起動、DB再起動後の保存内容、認証なしの管理者操作拒否、バックアップ復元も検査。

## 技術と構成

Node.js **24 LTS**、Next.js 16.3、React 19.3、TypeScript 5.9、Tailwind CSS 4、Prisma **7.10 stable**、PostgreSQL 18。Prismaのnpm `latest` がリリース候補を指していたため、安定版7.10を固定しています。正確な依存関係はpackage-lock.jsonを参照してください。

```text
src/app/                  画面・サーバーAPI
src/components/           共通UIとクライアント操作
src/lib/collector/        取得元アダプター・正規化・DB保存・収集制御
src/lib/search.ts         検索条件の検証とPrisma検索式
src/lib/wikipedia.ts      外部IDによる本人照合
src/lib/auth.ts           password hash・セッション
prisma/                   DBスキーマ・バージョン管理されたマイグレーション
scripts/                  セットアップ・worker・Windows起動・運用
deploy/                   HTTPS・systemd
public/                   アイコン・service worker・オフライン案内
tests/unit/               日付・検索・正規化・本人照合・認証・リトライ
tests/integration/        専用PostgreSQLでの保存と検索
tests/e2e/                Edge／Chromiumによる画面とAPIのテスト
.github/workflows/        CI・設定済みサーバーへの手動デプロイ
```

## Windows 11 / VS Codeで始める

1. [Node.js公式サイト](https://nodejs.org/)から24 LTSをインストールしてください。GitとVS Codeも用意します。
2. リポジトリを開き、VS Codeの「ターミナル → 新しいターミナル」を選びます。

```powershell
git clone https://github.com/kosukechun/New_wAnime.git
cd New_wAnime
npm ci
npm run db:generate
npm run setup
```

既にこのフォルダーで開発している場合はcloneを省略します。このPCでは既存Node.js 20を変更せず、`.tools` にNode.js 24を配置しています。現在のPCでは `npm` の代わりに `./scripts/npm.ps1` を使ってください（例：`./scripts/npm.ps1 run dev`）。`.tools` はGitに含めません。

PowerShellの実行ポリシーでスクリプトが止まる場合は、そのターミナルだけに `Set-ExecutionPolicy -Scope Process Bypass` を適用するか、通常のNode.js 24とnpmを使ってください。

### ローカルDBとアプリ

`npm run setup` は、ランダムなDBパスワードを含む `.env` を新規作成します。既存 `.env` は上書きしません。

ターミナルA：

```powershell
npm run db:local
```

DockerがなくてもPostgreSQL 18を **127.0.0.1:55432** で起動します。DBファイルは `data/postgres` に残ります。Windows用開発補助パッケージembedded-postgresは提供元のbeta版です。本番では公式PostgreSQLコンテナを使用します。

ターミナルB：

```powershell
npm run db:migrate
npm run collect
npm run dev
```

ブラウザーで **http://localhost:3000** を開きます。初回取得は数分かかります。取得中は保存済みの作品を閲覧できます。以後の自動更新にはターミナルCで `npm run worker` を起動してください。管理者画面の更新ボタンも使えます。

`./scripts/start-local.ps1` はローカルDBと開発サーバーの起動をまとめます。初回収集と継続workerは上記の別コマンドです。設定済みDBが標準以外のポートの場合は、個別に起動してください。

### 管理者

```powershell
npm run admin:create
```

メールアドレスとパスワード（12文字以上）を対話入力します。パスワード入力は表示されません。既存ユーザーを勝手に昇格・変更しません。管理者でログインすると上部の設定アイコンから `/admin` を開けます。通常の登録アカウントには管理権限を付けません。

## API設定と情報の制限

秘密情報は `.env` に保存します。`.env.example` 以外の環境設定、DB、バックアップはGit対象外です。`NEXT_PUBLIC_` 付きの環境変数にAPIトークンを置かないでください。設定変更後はアプリとworkerを再起動します。

| 取得元               | 必要な設定                                                    | 用途・制限                                                                                                                                         |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| TVmaze               | なし                                                          | 公開API。番組表・画像・出演者。日本作品は未収録も多く、あらすじが英語の場合があります                                                              |
| TMDB                 | `TMDB_READ_TOKEN`                                             | [アカウントのAPI設定](https://www.themoviedb.org/settings/api)でAPI Read Access Tokenを取得。日本語ドラマ・出演者・JP配信情報                      |
| MAL                  | `MAL_CLIENT_ID`                                               | [MyAnimeListのAPI設定](https://myanimelist.net/apiconfig)でアプリを登録。アニメの季節分類と作品情報                                                |
| AniList              | `ANILIST_ENABLED=true` と `ANILIST_PERMISSION_CONFIRMED=true` | [利用規約](https://docs.anilist.co/guide/terms-of-use)に一覧・視聴管理サービス等の制限があります。この用途について提供元の許諾を得た場合のみ有効化 |
| Wikidata / Wikipedia | なし                                                          | 外部ID、または名前・生年月日・職業の一致で本人確認。日本語記事がない／一致しない場合は検索リンク                                                   |

TMDBの[Watch Providers仕様](https://developer.themoviedb.org/reference/tv-series-watch-providers)はサービスへの完全な直接リンクを返しません。APIが返す確認ページを表示し、**直接視聴リンク・独占・先行・配信開始日を生成しません**。公式発表から管理者が確認した情報だけ追加できます。TMDBトークン未設定の状態では、配信情報は原則「未確認」です。

TVmazeの世界／国別番組表と日本の前後14日の日別番組表から、公開済みの未来約12か月の予定を収集します。1回の取得上限は `SYNC_MAX_WORKS`（初期160、最大500）。25%の枠を海外ドラマへ確保し、保存済みの古い作品も取得日時の古い順で更新します。未発表作品まで網羅する保証はありません。

毎回の取得は最終確認日時を更新し、内容が変わった場合だけ作品の更新日時・履歴を進めます。「最近見つかった作品」は当サービスへの登録順で、公式の発表順ではありません。公式発表日の自動収集、放送局公式サイトの自動解析は未対応です。各公式サイトを勝手にスクレイピングしません。

日本の日付が未確認の作品は、日本の年月検索・カレンダーに入れません。「世界初公開日を含む」へ変更すると取得元の公開日でも検索できます。アニメのクール分類は初回月から推測せず、MAL／許諾済みAniList／確認済み公式補正がある場合だけ登録します。原作媒体や続編区分も、出典がない場合は未確認です。

## 公式発表による補正

`announcedAt` は確認済み公式発表日です。「最近発表された作品」には、この日付を確認して登録した作品だけ表示します。`originalWorkTitle` は原作名、`staff` は「監督：氏名」などの確認済みスタッフ情報です。

`/admin` のJSON入力に、公式サイトで確認した作品情報を貼り付けます。形式は [docs/official-import.example.json](docs/official-import.example.json) を参照してください。例の空欄を、実際の確認済み値で置き換えます。

- `externalIds`：既存作品の詳細にあるTVMAZE／TMDB／MAL等のID。同じ作品をIDで関連付けます。
- `sourceUrl`：内容を実際に確認した公式発表ページ。
- `jpPremiere` と `worldPremiere` は別々です。日付不明は省略またはnull。
- `schedules` は日本のテレビ／配信の予定。`offers` は日本で確認済みのサービス・料金区分・視聴URL。
- `confirmed: true` は画面上の照合確認操作で付与します。公式情報は他の取得元より優先します。

公式補正の予定一覧は、その作品の公式予定を置き換えます。過去の履歴は保持します。過去の公式補正を解除する管理UIは未対応です。編集し直す場合は同じ外部IDで再登録してください。

## 認証とアカウント

パスワードはsalt付きscrypt、セッションは推測不能な乱数のハッシュをDB保存し、HttpOnly／SameSite Cookieで扱います。本番CookieはSecureです。変更系APIはAPP_URLに一致するOriginを要求します。ログイン・更新処理にはDB単位のレート制限があります。お気に入りの読み書きは認証ユーザーのIDで限定します。

メールアドレスの所有確認、メール送信によるパスワード再設定、MFAは未実装です。メールを受け取らずとも個人用アカウントを作成できます。一般公開する場合は運営者の連絡先・プライバシーポリシーを追記し、必要なら `REGISTRATION_ENABLED=false` で登録を停止してください。`/account` で表示名・パスワード変更とアカウント削除ができます。

## テスト

```powershell
npm run db:generate
npm run lint
npm run typecheck
npm test
# ローカルだけ。通常のwanimeとは別にwanime_testを作成
node --import tsx scripts/test-db.ts
npm run test:db
npm run build
npm run test:e2e
```

Windowsの画面テストはインストール済みEdgeを使用します。Linux CIは `npx playwright install --with-deps chromium` でテスト用ブラウザーを準備します。既にサーバーが起動していれば再利用します。

DBテストは `.env.test` の `TEST_DATABASE_URL` が末尾 `_test` の専用DBを指す場合だけ実行します。テストデータの削除は自身が作成したレコードに限定します。E2Eのテストアカウントは終了時に自身を削除します。作品がない環境では詳細・マイリストの作品操作テストを省略するため、実データ検証には `npm run collect` を先に実行してください。

[docs/verification.md](docs/verification.md) に今回の動作確認と未確認項目を記録します。

## Dockerで起動

WindowsはDocker DesktopのLinuxコンテナ、Ubuntuは[Docker公式の導入手順](https://docs.docker.com/engine/install/ubuntu/)でEngineとComposeを用意します。**この開発PCにはDockerがないため、コンテナの実動作はこのPCでは未検証です。CIにLinuxでのDockerビルドを用意しています。**

`.env.example` を `.env` にコピーし、少なくとも `POSTGRES_PASSWORD` を安全な乱数にします。URLへそのまま組み込むため、パスワードには長い英数字／hexを使用してください。開発用は次の設定です。

```dotenv
APP_URL=http://localhost:3000
DOMAIN=localhost
ACME_EMAIL=your-email@example.com
```

```powershell
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
docker compose logs -f worker
docker compose -f compose.yaml -f compose.dev.yaml exec worker npm run admin:create
```

http://localhost:3000 を開きます。Composeのmigrateサービスがスキーマを適用し、workerが初回取得を行います。秘密情報はbuildへ渡さず、実行時環境変数として注入します。PostgreSQLはホストへ公開しません。データは `postgres_data` 名前付きvolumeに永続化します。

停止は `docker compose stop`、再起動は `docker compose up -d`。**`docker compose down -v` はDB volumeを削除するため、通常の更新に使わないでください。** PostgreSQL 18のマウント先は `/var/lib/postgresql` です。

## Ubuntuサーバー・ドメイン・HTTPS

サーバーIP、ドメイン、SSH情報が未提供のため、公開先の作成・DNS設定・実際のHTTPS公開はまだ行っていません。準備済みの構成は以下の手順で利用できます。

1. Ubuntuサーバー（Dockerが動作するメモリー・ディスク容量）を用意し、SSHで接続します。
2. Docker EngineとComposeを導入します。デプロイ用ユーザーにDocker実行権限を付けます。
3. サーバー／クラウドのファイアウォールでSSHとTCP 80/443を許可します。HTTPS HTTP/3を利用するならUDP 443も許可します。DBの5432やアプリの3000は公開しません。
4. ドメインのAレコードをサーバーのIPv4へ向けます。IPv6を設定する場合は実際に到達できるIPv6だけAAAAへ登録します。
5. `/opt/New_wAnime` へcloneし、サーバー内で `.env` を作成します。

```bash
git clone https://github.com/kosukechun/New_wAnime.git /opt/New_wAnime
cd /opt/New_wAnime
cp .env.example .env
chmod 600 .env
```

`.env` の必須設定：

```dotenv
POSTGRES_USER=wanime
POSTGRES_DB=wanime
POSTGRES_PASSWORD=ここを長い乱数の英数字へ置き換える
APP_URL=https://anime.example.com
DOMAIN=anime.example.com
ACME_EMAIL=運営者の実際のメールアドレス
TMDB_READ_TOKEN=取得したReadAccessToken
```

`APP_URL` は実際にブラウザーで開くURLと厳密に一致させます。別のドメイン／IPへ直接アクセスした場合、更新操作はOrigin検査で拒否されます。秘密情報をコミットしません。

```bash
docker compose up -d --build --wait
docker compose exec worker npm run admin:create
docker compose ps
docker compose logs --tail=100 app worker caddy
curl -f https://anime.example.com/api/health
```

CaddyがTLS証明書を自動発行・更新します。DNSの反映と80/443への外部到達性が必要です。証明書とDBをvolumeに保持します。コンテナは `restart: unless-stopped`、DockerもOS起動時に有効化してください。

```bash
sudo systemctl enable --now docker
# systemdでCompose構成も管理する場合
sudo cp deploy/new-wanime.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now new-wanime
```

PCとスマートフォンから同じ **https://anime.example.com** へアクセスします。自宅以外から使うには公開IPを持つサーバー、またはネットワーク側の適切な設定が必要です。ルーター越しの自宅サーバーでは運営者が公開範囲・ポート転送を設定してください。

## バックアップ・更新

```bash
bash scripts/backup.sh
# 既存DB置換の確認入力あり
bash scripts/restore.sh backups/wanime-日時.dump
# バックアップ → fast-forward pull → build → migration → restart
bash scripts/deploy.sh
```

バックアップは `backups/` にpg_dumpのcustom形式で作成します。初回デプロイでDBがまだない場合は `deploy.sh` ではなく前述の `docker compose up` を使います。復元はappとworkerを停止し、既存DBを置き換えます。失敗した場合はエラーを確認してからサービスを再開してください。

毎日保存する例（crontab、時刻はサーバー設定のタイムゾーン）：

```cron
30 4 * * * cd /opt/New_wAnime && bash scripts/backup.sh >> /opt/New_wAnime/logs/backup.log 2>&1
```

先に `mkdir -p logs` を実行します。バックアップの別サーバー保管、保管期間、定期的な復元テストは運営者が設定します。秘密情報と個人データを含むため外部共有しません。

## GitHub Actions

Push／PRでlint、型検査、ユニット、PostgreSQL統合テスト、ビルド、Chromium操作テストとLinux Dockerビルドを実行します。強制Pushは使用しません。

デプロイworkflowは初期状態で無効です。サーバー準備後にGitHubのSettings → Secrets and variables → Actionsで設定します。

- Repository variable：`DEPLOY_ENABLED=true`
- Secrets：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS`
- Environment：`production`（必要なら運営者の承認ルールを設定）

サーバー側のリポジトリ取得権限も必要です。known_hostsはサーバーのホスト鍵を信頼できる経路で確認した値を登録してください。設定済みの場合だけActionsの「Deploy」を手動実行します。Push直後の自動本番デプロイは行いません。

## Windowsデスクトップ／スマートフォンPWA

Edge／ChromeでローカルURLまたは公開HTTPS URLを開き、アドレスバーのインストールアイコンからインストールします。Edgeでは「メニュー → アプリ → このサイトをアプリとしてインストール」も使えます。デスクトップ・スタートメニューへの追加を選択してください。PWAは `display: standalone` の専用ウィンドウで開きます。

スクリプトで専用ウィンドウ起動用ショートカットを作る場合：

```powershell
./scripts/windows-shortcut.ps1
# 公開後
./scripts/windows-shortcut.ps1 -Url https://anime.example.com -Browser Edge
```

デスクトップとスタートメニューに `New_wAnime.lnk` を作成します。既存ショートカットは上書きしません。これは `--app` 起動ショートカットで、ブラウザーの正式PWAインストールとは別です。ショートカットはサーバーを起動しないので、ローカル利用時はDBとアプリを先に起動してください。変更する場合は既存リンクを手動で整理してから再実行します。

Android：公開HTTPS URLをChromeで開き「アプリをインストール」／「ホーム画面に追加」。iPhone：Safariの共有 →「ホーム画面に追加」。スマートフォンのlocalhostはPCを指さないため、公開HTTPS URLを使用してください。認証データをservice workerのキャッシュへ保存せず、オフライン中は接続案内を表示します。

## トラブルと改修

| 状況                                   | 確認すること                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `uv_os_get_passwd` 等で起動しない      | 制限された実行環境のOS権限。通常のVS CodeターミナルでNode.js 24を使用        |
| 画面に接続エラー                       | `db:local` が動いているか、DATABASE_URL、マイグレーション、`/api/health`     |
| ポート55432が使用中                    | 既にDBが起動していないか。既存DBファイルを削除せずプロセスを確認             |
| 管理操作・ログインが403                | APP_URLとブラウザーのOriginが一致しているか、管理者としてログインしているか  |
| 配信情報が未確認                       | TMDB_READ_TOKEN、管理画面の取得ログ、JPデータの有無                          |
| 作品が見つからない                     | 日本日付と世界日付の基準、複数ジャンルAND／OR、取得範囲、外部API未収録       |
| 人物の日本語名がない                   | Wikidataの外部ID収録の有無。プロフィールからWikipedia確認も利用              |
| 証明書が発行されない                   | DNS、80/443到達性、Caddyログ、実際のドメイン指定                             |
| 自動更新されない                       | workerが起動しているか、管理画面の最終完了時刻、`docker compose logs worker` |
| ビルド／テスト用のネイティブ依存が不足 | Node.js 24で `npm ci` を再実行。異なるOSのnode_modulesをコピーしない         |

取得元を追加する際は `collector/types.ts` のWorkRecordへ正規化し、`saveWork` と `runSync` へ接続します。タイトルだけで作品を結合せず、外部IDと公式確認を使います。DB変更はスキーマ変更と新しいPrismaマイグレーションを一緒にコミットします。既存適用済みマイグレーションを上書きしません。

TVmaze由来データ・Wikipedia本文・外部画像の権利と帰属は [docs/data-sources.md](docs/data-sources.md) を参照してください。
