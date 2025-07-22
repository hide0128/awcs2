document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('code-input');
    const scanButton = document.getElementById('scan-button');
    const generateButton = document.getElementById('generate-button');
    const importButton = document.getElementById('import-button');
    const fileInput = document.getElementById('file-input');
    const resultsArea = document.getElementById('results-area');
    const postMaskActions = document.getElementById('post-mask-actions');
    const downloadMaskedButton = document.getElementById('download-masked-button');

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

    const sampleCode = `import boto3\n\n# This is a dummy AWS Access Key ID\nAWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\n\n# This is a dummy AWS Secret Access Key\nAWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"\n\n# Some other code\ndef get_s3_client():\n    s3 = boto3.client(\n        's3',\n        aws_access_key_id=AWS_ACCESS_KEY_ID,\n        aws_secret_access_key=AWS_SECRET_ACCESS_KEY\n    )\n    return s3\n\n# Another line with a similar looking string, but not a key\nSOME_OTHER_ID = "BKIASDFGHJKLMNBVCX"\nSOME_OTHER_SECRET = "abcdefghijklmnopqrstuvwxyz1234567890ABCD"\n\n# A comment with a key-like string\n# AKIA1234567890ABCDEF\n\n# A line with a partial key\nPARTIAL_KEY = "AKIA"\n`;

    codeInput.value = sampleCode; // デフォルトでサンプルコードをセット

    let foundCredentialsGlobal = []; // マスクボタンのために見つかった認証情報を保持

    scanButton.addEventListener('click', () => {
        const code = codeInput.value;
        resultsArea.innerHTML = ''; // 以前の結果をクリア
        foundCredentialsGlobal = []; // グローバルで見つかった認証情報をリセット
        postMaskActions.classList.add('hidden'); // Reset button visibility

        // AWSアクセスキーIDとシークレットアクセスキーの正規表現
        const accessKeyIdRegex = /(AKIA[0-9A-Z]{16})/g;
        // 注意: この正規表現は誤検知が多い可能性があるため、基本的な検証を追加
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
                // 誤検知を減らすための基本的な検証：行に 'secret' または 'key' が含まれているか
                if (line.toLowerCase().includes('secret') || line.toLowerCase().includes('key')) {
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

        if (foundCredentialsGlobal.length > 0) {
            // 機能2: スキャンサマリーの作成と表示
            const summary = foundCredentialsGlobal.reduce((acc, cred) => {
                acc[cred.type] = (acc[cred.type] || 0) + 1;
                return acc;
            }, {});
            let summaryHtml = '<p><strong>スキャン概要:</strong> ';
            summaryHtml += Object.entries(summary).map(([type, count]) => `${type}: ${count}件`).join(', ');
            summaryHtml += '</p>';

            // 詳細な結果の表示
            let resultsHtml = '<ul>';
            foundCredentialsGlobal.forEach(cred => {
                resultsHtml += `<li><strong>${cred.type}</strong>: ${cred.value} (Line: ${cred.lineNumber})</li>`;
            });
            resultsHtml += '</ul>';

            resultsArea.innerHTML = summaryHtml + resultsHtml;

            // アクションボタン用のコンテナ
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('results-actions');
            resultsArea.appendChild(actionsContainer);

            // マスクボタン
            const maskButtonDynamic = document.createElement('button');
            maskButtonDynamic.textContent = '認証情報をマスク';
            maskButtonDynamic.classList.add('mask-button-dynamic');
            actionsContainer.appendChild(maskButtonDynamic);

            // 機能4: エクスポートボタン
            const exportCsvButton = document.createElement('button');
            exportCsvButton.textContent = 'CSV形式でエクスポート';
            exportCsvButton.classList.add('export-button');
            actionsContainer.appendChild(exportCsvButton);

            const exportJsonButton = document.createElement('button');
            exportJsonButton.textContent = 'JSON形式でエクスポート';
            exportJsonButton.classList.add('export-button');
            actionsContainer.appendChild(exportJsonButton);

            // --- ボタンのイベントリスナー ---

            // マスク処理
            maskButtonDynamic.addEventListener('click', () => {
                let currentCode = codeInput.value;
                foundCredentialsGlobal.sort((a, b) => b.lineNumber - a.lineNumber || b.index - a.index);

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
                postMaskActions.classList.remove('hidden'); // Show download button
            });

            // CSVエクスポート処理
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

            // JSONエクスポート処理
            exportJsonButton.addEventListener('click', () => {
                const jsonContent = JSON.stringify(foundCredentialsGlobal, null, 2);
                downloadFile(jsonContent, 'scan_results.json', 'application/json;charset=utf-8;');
            });

        } else {
            resultsArea.innerHTML = '<p>認証情報は見つかりませんでした。</p>';
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
        postMaskActions.classList.add('hidden');
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
                resultsArea.innerHTML = '<p>ファイルが正常に読み込まれました。</p>';
                // マスクボタンが存在すれば削除
                const existingMaskButton = resultsArea.querySelector('.mask-button-dynamic');
                if (existingMaskButton) {
                    existingMaskButton.remove();
                }
                foundCredentialsGlobal = []; // 認証情報リストをクリア
                postMaskActions.classList.add('hidden');
            };
            reader.onerror = (e) => {
                resultsArea.innerHTML = '<p>ファイルの読み込み中にエラーが発生しました。</p>';
                console.error("File reading error:", e);
            };
            reader.readAsText(file);
        }
    });

    // マスク済みファイルのダウンロードボタンのイベントリスナー
    downloadMaskedButton.addEventListener('click', () => {
        const maskedContent = codeInput.value;
        const originalFileName = fileInput.files[0]?.name || 'redacted_file.txt';
        downloadFile(maskedContent, `redacted-${originalFileName}`, 'text/plain;charset=utf-8;');
    });

    // ファイルダウンロード用のヘルパー関数
    function downloadFile(content, fileName, mimeType) {
        const a = document.createElement('a');
        const blob = new Blob([content], { type: mimeType });
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});