# 機能詳細ドキュメント

## 機能一覧

### 1. 認証情報スキャン機能

#### 概要
入力されたソースコードを解析し、AWSの認証情報を検出します。

#### 検出対象

##### AWSアクセスキーID
- **パターン**: `AKIA` + 16文字の大文字英数字
- **正規表現**: `/(AKIA[0-9A-Z]{16})/g`
- **例**: `AKIAIOSFODNN7EXAMPLE`

##### AWSシークレットアクセスキー
- **パターン**: 40文字の英数字と記号（`/`, `+`, `=`）
- **正規表現**: `/([0-9a-zA-Z\/\+\=]{40})/g`
- **追加条件**: 行内に `secret` または `key` を含む（大文字小文字不問）
- **例**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

#### 検出結果の表示項目
- **タイプ**: Access Key ID または Secret Access Key
- **値**: 検出された認証情報の文字列
- **行番号**: 認証情報が見つかった行

#### 実装詳細

```javascript
// script.js:44-78
const accessKeyIdRegex = /(AKIA[0-9A-Z]{16})/g;
const secretAccessKeyRegex = /([0-9a-zA-Z\/\+\=]{40})/g;

lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let match;

    // アクセスキーIDの検索
    while ((match = accessKeyIdRegex.exec(line)) !== null) {
        foundCredentialsGlobal.push({
            type: 'Access Key ID',
            value: match[0],
            lineNumber: lineNumber,
            index: match.index,
            originalLine: line
        });
    }

    // シークレットアクセスキーの検索
    while ((match = secretAccessKeyRegex.exec(line)) !== null) {
        if (line.toLowerCase().includes('secret') ||
            line.toLowerCase().includes('key')) {
            foundCredentialsGlobal.push({
                type: 'Secret Access Key',
                value: match[0],
                lineNumber: lineNumber,
                index: match.index,
                originalLine: line
            });
        }
    }
});
```

---

### 2. スキャン結果サマリー

#### 概要
検出された認証情報をタイプ別に集計し、概要を表示します。

#### 表示内容
- **Access Key ID**: X件
- **Secret Access Key**: Y件

#### 詳細リスト
各認証情報について：
- タイプ
- 値（完全な文字列）
- 行番号

#### 実装詳細

```javascript
// script.js:82-98
const summary = foundCredentialsGlobal.reduce((acc, cred) => {
    acc[cred.type] = (acc[cred.type] || 0) + 1;
    return acc;
}, {});

let summaryHtml = '<p><strong>スキャン概要:</strong> ';
summaryHtml += Object.entries(summary)
    .map(([type, count]) => `${type}: ${count}件`)
    .join(', ');
summaryHtml += '</p>';
```

---

### 3. 認証情報マスク機能

#### 概要
検出された認証情報を部分的に隠し、安全な形式に変換します。

#### マスク形式

##### アクセスキーID
- **元の形式**: `AKIAIOSFODNN7EXAMPLE` (20文字)
- **マスク後**: `AKIA****************` (最初の4文字 + 16個の`*`)

##### シークレットアクセスキー
- **元の形式**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (40文字)
- **マスク後**: `wJalrXUt********************************` (最初の8文字 + 32個の`*`)

#### マスク処理アルゴリズム

1. **ソート**: 認証情報を行番号と位置の降順でソート（後ろから処理）
2. **置換**: 各認証情報について
   - 該当行を特定
   - マスク文字列を生成
   - 元の文字列を置換
3. **更新**: テキストエリアの内容を更新

#### 実装詳細

```javascript
// script.js:125-150
maskButtonDynamic.addEventListener('click', () => {
    let currentCode = codeInput.value;

    // 降順ソート（重要: 後ろから処理することで位置ずれを防ぐ）
    foundCredentialsGlobal.sort((a, b) =>
        b.lineNumber - a.lineNumber || b.index - a.index
    );

    foundCredentialsGlobal.forEach(cred => {
        const lines = currentCode.split('\n');
        const targetLineIndex = cred.lineNumber - 1;
        const targetLine = lines[targetLineIndex];

        let maskedValue;
        if (cred.type === 'Access Key ID') {
            maskedValue = cred.value.substring(0, 4) + '****************';
        } else if (cred.type === 'Secret Access Key') {
            maskedValue = cred.value.substring(0, 8) + '********************************';
        }

        const newLine = targetLine.substring(0, cred.index) +
                        maskedValue +
                        targetLine.substring(cred.index + cred.value.length);
        lines[targetLineIndex] = newLine;
        currentCode = lines.join('\n');
    });

    codeInput.value = currentCode;
    resultsArea.innerHTML = '<p>認証情報をマスクしました。</p>';
    foundCredentialsGlobal = [];
    postMaskActions.classList.remove('hidden');
});
```

---

### 4. エクスポート機能

#### CSV形式エクスポート

##### ファイル形式
- **ファイル名**: `scan_results.csv`
- **エンコーディング**: UTF-8
- **区切り文字**: カンマ

##### CSV構造
```csv
Type,Value,LineNumber,OriginalLine
Access Key ID,"AKIAIOSFODNN7EXAMPLE",4,"AWS_ACCESS_KEY_ID = ""AKIAIOSFODNN7EXAMPLE"""
Secret Access Key,"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",7,"AWS_SECRET_ACCESS_KEY = ""wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"""
```

##### 実装詳細
```javascript
// script.js:152-163
exportCsvButton.addEventListener('click', () => {
    const headers = ['Type', 'Value', 'LineNumber', 'OriginalLine'];
    const csvRows = [headers.join(',')];

    foundCredentialsGlobal.forEach(cred => {
        const sanitizedLine = `"${cred.originalLine.replace(/"/g, '""')}"`;
        const values = [cred.type, `"${cred.value}"`, cred.lineNumber, sanitizedLine];
        csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, 'scan_results.csv', 'text/csv;charset=utf-8;');
});
```

#### JSON形式エクスポート

##### ファイル形式
- **ファイル名**: `scan_results.json`
- **エンコーディング**: UTF-8
- **インデント**: 2スペース

##### JSON構造
```json
[
  {
    "type": "Access Key ID",
    "value": "AKIAIOSFODNN7EXAMPLE",
    "lineNumber": 4,
    "index": 20,
    "originalLine": "AWS_ACCESS_KEY_ID = \"AKIAIOSFODNN7EXAMPLE\""
  },
  {
    "type": "Secret Access Key",
    "value": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "lineNumber": 7,
    "index": 24,
    "originalLine": "AWS_SECRET_ACCESS_KEY = \"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\""
  }
]
```

##### 実装詳細
```javascript
// script.js:165-169
exportJsonButton.addEventListener('click', () => {
    const jsonContent = JSON.stringify(foundCredentialsGlobal, null, 2);
    downloadFile(jsonContent, 'scan_results.json', 'application/json;charset=utf-8;');
});
```

---

### 5. ファイルインポート機能

#### 対応ファイル
- テキストファイル（.txt, .py, .js, .java, .json, .yaml, .yml, など）
- すべてのテキストベースのファイル

#### 動作フロー
1. 「ファイルからインポート」ボタンをクリック
2. ファイル選択ダイアログが表示
3. ファイルを選択
4. FileReader APIで非同期読み込み
5. テキストエリアに内容を表示

#### 実装詳細

```javascript
// script.js:194-221
importButton.addEventListener('click', () => {
    fileInput.click(); // 隠しファイル入力要素をクリック
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            codeInput.value = e.target.result;
            resultsArea.innerHTML = '<p>ファイルが正常に読み込まれました。</p>';
            foundCredentialsGlobal = [];
            postMaskActions.classList.add('hidden');
        };

        reader.onerror = (e) => {
            resultsArea.innerHTML = '<p>ファイルの読み込み中にエラーが発生しました。</p>';
            console.error("File reading error:", e);
        };

        reader.readAsText(file);
    }
});
```

---

### 6. ダミー認証情報生成機能

#### 概要
テスト用のダミーAWS認証情報を生成します。

#### 生成される認証情報

##### アクセスキーID
- **形式**: `AKIA` + ランダムな16文字の大文字英数字
- **文字セット**: `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
- **例**: `AKIAT7XFNP2QM8K3JLRD`

##### シークレットアクセスキー
- **形式**: ランダムな40文字
- **文字セット**: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`
- **例**: `xP9mK2nL5vQ8wR3tY7zA1bC4dE6fG0hJ9iK2lM3nO5p=`

#### 生成されるコード
```python
import boto3

# This is a dummy AWS Access Key ID
AWS_ACCESS_KEY_ID = "AKIAT7XFNP2QM8K3JLRD"

# This is a dummy AWS Secret Access Key
AWS_SECRET_ACCESS_KEY = "xP9mK2nL5vQ8wR3tY7zA1bC4dE6fG0hJ9iK2lM3nO5p="

def get_s3_client():
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
    return s3
```

#### 実装詳細

```javascript
// script.js:11-30
function generateRandomString(length, chars) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateDummyAwsAccessKeyId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return "AKIA" + generateRandomString(16, chars);
}

function generateDummyAwsSecretAccessKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    return generateRandomString(40, chars);
}
```

---

### 7. マスク済みファイルダウンロード機能

#### 概要
マスク処理後のコードをファイルとしてダウンロードします。

#### ファイル名規則
- **元のファイル**: `example.py`
- **マスク済み**: `redacted-example.py`
- **デフォルト**: `redacted-redacted_file.txt`（ファイルインポートなしの場合）

#### 動作フロー
1. 認証情報をマスク
2. 「マスク済みファイルをダウンロード」ボタンが表示
3. ボタンをクリック
4. テキストエリアの内容をダウンロード

#### 実装詳細

```javascript
// script.js:223-228
downloadMaskedButton.addEventListener('click', () => {
    const maskedContent = codeInput.value;
    const originalFileName = fileInput.files[0]?.name || 'redacted_file.txt';
    downloadFile(maskedContent, `redacted-${originalFileName}`, 'text/plain;charset=utf-8;');
});
```

---

## ヘルパー関数

### downloadFile()

#### 概要
ファイルダウンロードを処理する汎用関数

#### パラメータ
- `content`: ファイルの内容
- `fileName`: ダウンロードファイル名
- `mimeType`: MIMEタイプ

#### 実装

```javascript
// script.js:230-239
function downloadFile(content, fileName, mimeType) {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
```

#### 使用例
```javascript
downloadFile('Hello, World!', 'hello.txt', 'text/plain;charset=utf-8;');
downloadFile('[{"key": "value"}]', 'data.json', 'application/json;charset=utf-8;');
downloadFile('Name,Age\nJohn,30', 'data.csv', 'text/csv;charset=utf-8;');
```

---

## デフォルトサンプルコード

アプリケーション起動時にテキストエリアに表示されるサンプルコード：

```python
import boto3

# This is a dummy AWS Access Key ID
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"

# This is a dummy AWS Secret Access Key
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Some other code
def get_s3_client():
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
    return s3

# Another line with a similar looking string, but not a key
SOME_OTHER_ID = "BKIASDFGHJKLMNBVCX"
SOME_OTHER_SECRET = "abcdefghijklmnopqrstuvwxyz1234567890ABCD"

# A comment with a key-like string
# AKIA1234567890ABCDEF

# A line with a partial key
PARTIAL_KEY = "AKIA"
```

このサンプルコードは：
- 有効な認証情報パターン（検出される）
- 無効なパターン（検出されない）
- コメント内の認証情報（検出される）
- 部分的なパターン（検出されない）

を含み、スキャナーの動作を理解するのに役立ちます。
