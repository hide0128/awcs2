document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('code-input');
    const scanButton = document.getElementById('scan-button');
    const generateButton = document.getElementById('generate-button');
    const importButton = document.getElementById('import-button');
    const fileInput = document.getElementById('file-input');
    const resultsArea = document.getElementById('results-area');

    // ランダムな文字列を生成するヘルパー関数
    function generateRandomString(length, chars) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // ダミーのAWSアクセスキーIDを生成する関数
    function generateDummyAwsAccessKeyId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return "AKIA" + generateRandomString(16, chars);
    }

    // ダミーのAWSシークレットアクセスキーを生成する関数
    function generateDummyAwsSecretAccessKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        return generateRandomString(40, chars);
    }

    const sampleCode = `import boto3\n\n# This is a dummy AWS Access Key ID\nAWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\n\n# This is a dummy AWS Secret Access Key\nAWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"\n\n# Some other code\ndef get_s3_client():\n    s3 = boto3.client(\n        's3',\n        aws_access_key_id=AWS_ACCESS_KEY_ID,\n        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )\n    return s3\n
# Another line with a similar looking string, but not a key
SOME_OTHER_ID = "BKIASDFGHJKLMNBVCX"
SOME_OTHER_SECRET = "abcdefghijklmnopqrstuvwxyz1234567890ABCD"

# A comment with a key-like string
# AKIA1234567890ABCDEF

# A line with a partial key
PARTIAL_KEY = "AKIA"
`;

    codeInput.value = sampleCode; // デフォルトでサンプルコードをセット

    let foundCredentialsGlobal = []; // マスクボタンのために見つかった認証情報を保持

    scanButton.addEventListener('click', () => {
        const code = codeInput.value;
        resultsArea.innerHTML = ''; // Clear previous results
        foundCredentialsGlobal = []; // Reset global found credentials

        // 正規表現でAWSアクセスキーIDとシークレットアクセスキーを検索
        // アクセスキーID: AKIAから始まる20文字の英数字
        const accessKeyIdRegex = /(AKIA[0-9A-Z]{16})/g;
        // シークレットアクセスキー: 40文字の英数字記号
        const secretAccessKeyRegex = /([0-9a-zA-Z\/\+\=]{40})/g;

        const lines = code.split('\n');

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
                foundCredentialsGlobal.push({
                    type: 'Secret Access Key',
                    value: match[0],
                    lineNumber: lineNumber,
                    index: match.index,
                    originalLine: line
                });
            }
        });

        if (foundCredentialsGlobal.length > 0) {
            let resultsHtml = '<p>Credentials found:</p><ul>';
            foundCredentialsGlobal.forEach(cred => {
                resultsHtml += `<li><strong>${cred.type}</strong>: ${cred.value} (Line: ${cred.lineNumber})</li>`;
            });
            resultsHtml += '</ul>';
            resultsArea.innerHTML = resultsHtml;

            // マスクボタンを動的に作成して追加
            const maskButtonDynamic = document.createElement('button');
            maskButtonDynamic.textContent = 'Redact Credentials';
            maskButtonDynamic.classList.add('mask-button-dynamic');
            resultsArea.appendChild(maskButtonDynamic);

            maskButtonDynamic.addEventListener('click', () => {
                let currentCode = codeInput.value;
                // 認証情報が見つかった行を逆順に処理して、インデックスがずれないようにする
                foundCredentialsGlobal.sort((a, b) => b.lineNumber - a.lineNumber || b.index - a.index);

                foundCredentialsGlobal.forEach(cred => {
                    const lines = currentCode.split('\n');
                    const targetLineIndex = cred.lineNumber - 1;
                    const targetLine = lines[targetLineIndex];

                    let maskedValue;
                    if (cred.type === 'Access Key ID') {
                        maskedValue = cred.value.substring(0, 4) + '****************'; // AKIA + 16個のアスタリスク
                    }
                    // シークレットアクセスキーは単独で存在することが少ないため、
                    // より厳密なパターンが必要な場合があるが、ここでは一般的な40文字のパターンを使用
                    // 注意: この正規表現は誤検知が多い可能性があります。
                    // 実際のAWSシークレットキーはBase64エンコードされた40文字の文字列です。
                    // より正確な検出には、周辺のコンテキストも考慮する必要があります。
                    else if (cred.type === 'Secret Access Key') {
                        maskedValue = cred.value.substring(0, 8) + '********************************'; // 最初の8文字 + 32個のアスタリスク
                    }

                    // 行全体を置き換えるのではなく、見つかった値だけを置き換える
                    const newLine = targetLine.substring(0, cred.index) +
                                    maskedValue +
                                    targetLine.substring(cred.index + cred.value.length);
                    lines[targetLineIndex] = newLine;
                    currentCode = lines.join('\n');
                });

                codeInput.value = currentCode;
                resultsArea.innerHTML = '<p>Credentials redacted.</p>';
                // マスク後はボタンを削除
                maskButtonDynamic.remove();
                foundCredentialsGlobal = []; // マスク後は認証情報リストをクリア
            });

        } else {
            resultsArea.innerHTML = '<p>No credentials found.</p>';
        }
    });

    // 認証情報生成ボタンのイベントリスナー
    generateButton.addEventListener('click', () => {
        const newAccessKeyId = generateDummyAwsAccessKeyId();
        const newSecretAccessKey = generateDummyAwsSecretAccessKey();

        const generatedCode = `import boto3\n\n# This is a dummy AWS Access Key ID\nAWS_ACCESS_KEY_ID = "${newAccessKeyId}"\n\n# This is a dummy AWS Secret Access Key\nAWS_SECRET_ACCESS_KEY = "${newSecretAccessKey}"\n\ndef get_s3_client():\n    s3 = boto3.client(\n        's3',\n        aws_access_key_id=AWS_ACCESS_KEY_ID,\n        aws_secret_access_key=AWS_SECRET_ACCESS_KEY\n    )\n    return s3\n`;

        codeInput.value = generatedCode;
        resultsArea.innerHTML = '<p>New credentials generated and displayed in the code area.</p>';
        // マスクボタンが存在すれば削除
        const existingMaskButton = resultsArea.querySelector('.mask-button-dynamic');
        if (existingMaskButton) {
            existingMaskButton.remove();
        }
        foundCredentialsGlobal = []; // 認証情報リストをクリア
    });

    // インポートボタンのイベントリスナー
    importButton.addEventListener('click', () => {
        fileInput.click(); // 隠しファイル入力要素をクリック
    });

    // ファイルが選択されたときの処理
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                codeInput.value = e.target.result;
                resultsArea.innerHTML = '<p>File loaded successfully.</p>';
                // マスクボタンが存在すれば削除
                const existingMaskButton = resultsArea.querySelector('.mask-button-dynamic');
                if (existingMaskButton) {
                    existingMaskButton.remove();
                }
                foundCredentialsGlobal = []; // 認証情報リストをクリア
            };
            reader.onerror = (e) => {
                resultsArea.innerHTML = '<p>Error reading file.</p>';
                console.error("File reading error:", e);
            };
            reader.readAsText(file);
        }
    });
});