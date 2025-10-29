# 開発者ガイド

## 開発環境のセットアップ

### 必要な環境
- Node.js 14以上
- npm または yarn
- モダンなWebブラウザ（Chrome, Firefox, Safari, Edge）
- テキストエディタ（VS Code推奨）

### プロジェクトのクローン

```bash
git clone https://github.com/hide0128/awcs2.git
cd awcs2
```

### 依存関係のインストール

```bash
npm install
```

### プロジェクト構造

```
awcs2/
├── .claude/           # Claude Code設定
├── .git/              # Gitリポジトリ
├── docs/              # ドキュメント（このディレクトリ）
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   └── DEVELOPMENT.md
├── node_modules/      # npmパッケージ
├── .gitattributes     # Git属性設定
├── eslint.config.js   # ESLint設定
├── index.html         # メインHTMLファイル
├── package.json       # npmパッケージ設定
├── package-lock.json  # npmパッケージロック
├── script.js          # メインJavaScriptファイル
└── style.css          # スタイルシート
```

## 開発ワークフロー

### ローカルでの実行

#### 方法1: 直接HTMLファイルを開く
```bash
# ブラウザで index.html を直接開く
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

#### 方法2: ローカルサーバーを使用（推奨）
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000
```

ブラウザで `http://localhost:8000` を開く

### コードリンティング

```bash
npm run lint
```

ESLintが自動的にコードをチェックします。

### ESLint設定（eslint.config.js）

```javascript
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: globals.browser
    }
  }
];
```

## コーディング規約

### JavaScript

#### 命名規則
- **変数・関数**: camelCase（例: `codeInput`, `generateRandomString`）
- **定数**: UPPER_SNAKE_CASE（例: `AWS_ACCESS_KEY_ID`）
- **DOM要素ID**: kebab-case（例: `code-input`, `scan-button`）
- **CSSクラス**: kebab-case（例: `.button-group`, `.section-title`）

#### コードスタイル
- インデント: 4スペース
- セミコロン: 使用する
- 文字列: シングルクォート（`'`）またはダブルクォート（`"`）を一貫して使用
- 配列・オブジェクトの最後の要素にカンマをつけない

#### コメント
```javascript
// 1行コメント: 処理の説明

/**
 * 複数行コメント: 関数の説明
 * @param {string} param - パラメータの説明
 * @returns {string} - 戻り値の説明
 */
```

### HTML

- インデント: 4スペース
- 属性の順序: `id` → `class` → その他
- 閉じタグを必ず使用

### CSS

- インデント: 4スペース
- プロパティのアルファベット順ソート（任意）
- コメントでセクションを区切る

```css
/* ========== ボタンスタイル ========== */
button {
    /* プロパティ */
}
```

## 機能追加ガイド

### 新しいスキャンパターンの追加

#### 例: GitHub Personal Access Token の検出

1. **正規表現パターンを定義**

```javascript
// script.js に追加
const githubTokenRegex = /(ghp_[a-zA-Z0-9]{36})/g;
```

2. **スキャンロジックに追加**

```javascript
// scanButton イベントリスナー内に追加
while ((match = githubTokenRegex.exec(line)) !== null) {
    foundCredentialsGlobal.push({
        type: 'GitHub Personal Access Token',
        value: match[0],
        lineNumber: lineNumber,
        index: match.index,
        originalLine: line
    });
}
```

3. **マスク処理を追加**

```javascript
// maskButtonDynamic イベントリスナー内に追加
else if (cred.type === 'GitHub Personal Access Token') {
    maskedValue = cred.value.substring(0, 7) + '*****************************';
}
```

### 新しいエクスポート形式の追加

#### 例: XML形式のエクスポート

```javascript
// エクスポートボタンを作成
const exportXmlButton = document.createElement('button');
exportXmlButton.textContent = 'XML形式でエクスポート';
exportXmlButton.classList.add('export-button');
actionsContainer.appendChild(exportXmlButton);

// イベントリスナーを追加
exportXmlButton.addEventListener('click', () => {
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<scan-results>\n';

    foundCredentialsGlobal.forEach(cred => {
        xmlContent += '  <credential>\n';
        xmlContent += `    <type>${cred.type}</type>\n`;
        xmlContent += `    <value>${cred.value}</value>\n`;
        xmlContent += `    <line-number>${cred.lineNumber}</line-number>\n`;
        xmlContent += `    <original-line><![CDATA[${cred.originalLine}]]></original-line>\n`;
        xmlContent += '  </credential>\n';
    });

    xmlContent += '</scan-results>';

    downloadFile(xmlContent, 'scan_results.xml', 'application/xml;charset=utf-8;');
});
```

## テストガイド

### 手動テスト

#### テストケース1: 基本的なスキャン
1. アプリケーションを開く
2. デフォルトのサンプルコードがロードされていることを確認
3. 「スキャン実行」ボタンをクリック
4. 結果エリアに2つの認証情報が表示されることを確認
   - Access Key ID: AKIAIOSFODNN7EXAMPLE
   - Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

#### テストケース2: マスク処理
1. スキャンを実行
2. 「認証情報をマスク」ボタンをクリック
3. テキストエリアの認証情報がマスクされていることを確認
4. 「マスク済みファイルをダウンロード」ボタンが表示されることを確認

#### テストケース3: CSV/JSONエクスポート
1. スキャンを実行
2. 「CSV形式でエクスポート」ボタンをクリック
3. `scan_results.csv` ファイルがダウンロードされることを確認
4. CSVファイルの内容を確認
5. 「JSON形式でエクスポート」ボタンをクリック
6. `scan_results.json` ファイルがダウンロードされることを確認
7. JSONファイルの内容を確認

#### テストケース4: ファイルインポート
1. テストファイル（例: `test.py`）を準備
2. 「ファイルからインポート」ボタンをクリック
3. ファイルを選択
4. テキストエリアにファイルの内容が表示されることを確認

#### テストケース5: ダミー認証情報生成
1. 「ダミー認証情報を作成」ボタンをクリック
2. テキストエリアに新しいコードが表示されることを確認
3. ランダムな認証情報が生成されていることを確認

### エッジケース

#### テストケース6: 空の入力
1. テキストエリアをクリア
2. 「スキャン実行」ボタンをクリック
3. 「認証情報は見つかりませんでした。」と表示されることを確認

#### テストケース7: 複数の認証情報
1. 複数の認証情報を含むコードを入力
```python
KEY1 = "AKIA1234567890ABCDEF"
KEY2 = "AKIA9876543210ZYXWVU"
SECRET1 = "abc123def456ghi789jkl012mno345pqr678stu="
SECRET2 = "zyx987wvu654tsr321qpo098nml765kji432hgf="
```
2. 「スキャン実行」ボタンをクリック
3. すべての認証情報が検出されることを確認

#### テストケース8: 誤検知のテスト
1. 40文字の文字列を含むが、'secret'や'key'を含まない行を入力
```python
RANDOM_STRING = "abcdefghijklmnopqrstuvwxyz1234567890ABCD"
```
2. 「スキャン実行」ボタンをクリック
3. 誤検知されないことを確認

### 自動テスト（今後の課題）

現在、自動テストは実装されていません。以下のテストフレームワークの導入を検討してください：

- **ユニットテスト**: Jest, Mocha, Chai
- **E2Eテスト**: Cypress, Playwright, Puppeteer
- **コードカバレッジ**: Istanbul, nyc

## デバッグ

### ブラウザ開発者ツール

#### Chromeデベロッパーツール
- Windows/Linux: `F12` または `Ctrl+Shift+I`
- macOS: `Cmd+Option+I`

#### 便利な機能
- **Console**: エラーメッセージとログの確認
- **Elements**: DOMとCSSの検査
- **Sources**: JavaScriptのデバッグ（ブレークポイント）
- **Network**: ネットワークリクエストの監視（このアプリでは不使用）

### デバッグテクニック

#### console.log()を使用
```javascript
console.log('変数の値:', variable);
console.log('foundCredentials:', foundCredentialsGlobal);
```

#### ブレークポイントを設定
```javascript
debugger; // この行でブラウザが停止
```

#### エラーハンドリング
```javascript
try {
    // 処理
} catch (error) {
    console.error('エラーが発生しました:', error);
    resultsArea.innerHTML = `<p>エラー: ${error.message}</p>`;
}
```

## パフォーマンス最適化

### 大きなファイルの処理

現在、非常に大きなファイルを処理するとブラウザがフリーズする可能性があります。

#### 解決策: Web Workersの使用

```javascript
// worker.js
self.addEventListener('message', (e) => {
    const { code } = e.data;
    const accessKeyIdRegex = /(AKIA[0-9A-Z]{16})/g;
    const secretAccessKeyRegex = /([0-9a-zA-Z\/\+\=]{40})/g;

    const lines = code.split('\n');
    const foundCredentials = [];

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let match;

        while ((match = accessKeyIdRegex.exec(line)) !== null) {
            foundCredentials.push({
                type: 'Access Key ID',
                value: match[0],
                lineNumber: lineNumber,
                index: match.index,
                originalLine: line
            });
        }

        while ((match = secretAccessKeyRegex.exec(line)) !== null) {
            if (line.toLowerCase().includes('secret') ||
                line.toLowerCase().includes('key')) {
                foundCredentials.push({
                    type: 'Secret Access Key',
                    value: match[0],
                    lineNumber: lineNumber,
                    index: match.index,
                    originalLine: line
                });
            }
        }
    });

    self.postMessage({ foundCredentials });
});

// script.js
const worker = new Worker('worker.js');

scanButton.addEventListener('click', () => {
    const code = codeInput.value;
    resultsArea.innerHTML = '<p>スキャン中...</p>';

    worker.postMessage({ code });
});

worker.addEventListener('message', (e) => {
    const { foundCredentials } = e.data;
    foundCredentialsGlobal = foundCredentials;

    // 結果を表示
    // ...
});
```

## ビルドとデプロイ

### GitHub Pagesへのデプロイ

このプロジェクトはすでにGitHub Pagesでホストされています：
https://hide0128.github.io/awcs2/

#### デプロイ手順
1. 変更をコミット
```bash
git add .
git commit -m "Update application"
```

2. GitHubにプッシュ
```bash
git push origin main
```

3. GitHub Pagesの設定
   - GitHubリポジトリページへ移動
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

4. デプロイを待つ（数分）
5. `https://<username>.github.io/<repository>/` でアクセス

### 他のホスティングサービス

#### Netlify
```bash
# Netlifyにログイン
netlify login

# サイトをデプロイ
netlify deploy --prod
```

#### Vercel
```bash
# Vercelにログイン
vercel login

# サイトをデプロイ
vercel --prod
```

## トラブルシューティング

### よくある問題

#### 問題1: ファイルインポートが動作しない
**原因**: ブラウザのセキュリティ制限
**解決策**: ローカルサーバーを使用してアプリケーションを実行

#### 問題2: マスク処理後に認証情報が残っている
**原因**: 同じ行に複数の認証情報がある場合、位置がずれる可能性
**解決策**: 降順ソートの実装を確認（script.js:127）

#### 問題3: シークレットキーが検出されない
**原因**: 行に'secret'または'key'が含まれていない
**解決策**: 検出条件を緩和（ただし誤検知のリスクあり）

## コントリビューションガイドライン

### Issueの作成
- バグレポート: バグの詳細、再現手順、期待される動作を記載
- 機能リクエスト: 機能の説明、ユースケース、実装案を記載

### Pull Requestの提出
1. フォークしてクローン
2. 新しいブランチを作成
```bash
git checkout -b feature/new-feature
```
3. 変更を実装
4. ESLintでコードをチェック
```bash
npm run lint
```
5. コミット
```bash
git commit -m "Add new feature"
```
6. プッシュ
```bash
git push origin feature/new-feature
```
7. GitHubでPull Requestを作成

### コードレビュー
- コードの品質
- パフォーマンス
- セキュリティ
- ドキュメント

## リソース

### 公式ドキュメント
- [MDN Web Docs](https://developer.mozilla.org/)
- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

### セキュリティ
- [AWS Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html)
- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)

### ツール
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Git](https://git-scm.com/)

## ライセンス

ISC License

## サポート

問題が発生した場合は、GitHubのIssueで報告してください：
https://github.com/hide0128/awcs2/issues
