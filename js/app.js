/**
 * Excel单词音标生成器 - 主应用脚本
 */

// 全局变量
let workbook = null; // 存储当前工作簿
let excelData = null; // 存储提取的数据
let currentFileName = ''; // 当前处理的文件名
let isProcessingPhonetics = false; // 是否正在处理音标
let currentHeaders = []; // 存储当前表头
let selectedColumnIndex = -1; // 当前选中的单词列索引

// 可接受的列名数组
const acceptableColumnNames = ["词", "单词", "word", "term", "vocabulary", "phrase", "expression", "英文", "words", "英语单词", "english", "vocabulary word", "单词列", "生词", "词汇", "newword", "key", "关键词"];

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    Logger.info('初始化', '应用开始初始化');
    
    // 检查浏览器兼容性
    checkBrowserSupport();
    
    // 初始化UI事件
    initUIEvents();
    
    // 检查外部库
    checkExternalLibraries();
    
    // 初始化音标处理模块
    initPhoneticModule();
    
    Logger.info('初始化', '应用初始化完成');
});

/**
 * 检查浏览器兼容性
 */
function checkBrowserSupport() {
    Logger.debug('兼容性', '开始检查浏览器兼容性');
    
    // 检查File API支持
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        Logger.info('兼容性', 'File API支持正常');
    } else {
        Logger.error('兼容性', '浏览器不支持File API，部分功能可能无法正常工作');
        showError('您的浏览器不支持现代文件处理功能，请使用Chrome、Firefox、Edge或Safari的最新版本。');
    }
    
    // 检查拖放API支持
    if ('draggable' in document.createElement('div')) {
        Logger.info('兼容性', '拖放API支持正常');
    } else {
        Logger.warning('兼容性', '浏览器可能不支持拖放功能，将回退到点击上传');
    }
    
    // 检查localStorage支持
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        Logger.info('兼容性', 'localStorage支持正常');
    } catch (e) {
        Logger.warning('兼容性', 'localStorage不可用，日志和设置将不会被保存');
    }
}

/**
 * 检查外部库
 */
function checkExternalLibraries() {
    Logger.debug('依赖', '检查外部库');
    
    // 检查SheetJS
    if (typeof XLSX !== 'undefined') {
        Logger.info('依赖', `SheetJS库加载成功，版本：${XLSX.version}`);
    } else {
        Logger.critical('依赖', 'SheetJS库加载失败，Excel处理功能无法使用');
        showError('无法加载Excel处理库(SheetJS)，请检查网络连接后刷新页面。');
    }
}

/**
 * 初始化音标处理模块
 */
async function initPhoneticModule() {
    Logger.debug('初始化', '开始初始化音标处理模块');
    try {
        await PhonicsProcessor.initPhonetics();
        Logger.info('初始化', '音标处理模块初始化成功');
    } catch (error) {
        Logger.error('初始化', `音标处理模块初始化失败: ${error.message}`);
        showError('无法加载音标词典，部分功能可能无法正常工作。');
    }
}

/**
 * 重置处理状态
 */
function resetProcessingState() {
    isProcessingPhonetics = false;
    excelData = null;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('resultTableBody').innerHTML = '';
    document.getElementById('progressBar').style.width = '0%';
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showError(message) {
    Logger.error('UI', `显示错误: ${message}`);
    
    // 检查是否已有错误消息
    let errorDiv = document.querySelector('.error-message');
    
    if (!errorDiv) {
        // 创建新的错误消息元素
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        // 插入到上传区域之后
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.parentNode.insertBefore(errorDiv, uploadSection.nextSibling);
        } else {
            document.querySelector('main').appendChild(errorDiv);
        }
    }
    
    // 设置错误消息
    errorDiv.textContent = message;
    
    // 3秒后自动移除错误消息
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                    Logger.debug('UI', '错误消息已自动移除');
                }
            }, 300);
        }
    }, 3000);
}

function initUIEvents() {
    Logger.debug('UI', '初始化UI事件');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const columnSelect = document.getElementById('columnSelect');
    
    // 确保所有必要的DOM元素存在
    if (!uploadArea || !fileInput || !selectFileBtn) {
        Logger.error('UI', '无法找到必要的DOM元素');
        return;
    }
    
    // 点击选择文件按钮
    selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault(); // 防止可能的表单提交
        Logger.debug('UI', '用户点击了选择文件按钮');
        fileInput.click(); // 触发隐藏的文件输入框
        
        // 添加按钮点击效果
        selectFileBtn.classList.add('active');
        setTimeout(() => {
            selectFileBtn.classList.remove('active');
        }, 200);
    });
    
    // 文件选择变更
    fileInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];
            Logger.info('文件', `用户选择了文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB`);
            handleExcelFile(file);
        }
    });
    
    // 列选择下拉菜单变更事件
    if (columnSelect) {
        columnSelect.addEventListener('change', () => {
            // 获取选中的列索引
            selectedColumnIndex = parseInt(columnSelect.value);
            
            // 自动更新预览
            updateColumnPreview();
            
            // 记住选择的列名
            const selectedHeader = currentHeaders[selectedColumnIndex];
            if (selectedHeader) {
                localStorage.setItem('lastSelectedColumn', selectedHeader);
                Logger.info('列选择', `用户选择了列: ${selectedHeader}，已记住此选择`);
            }
        });
    }
    
    // 开始处理按钮点击事件
    if (processBtn) {
        processBtn.addEventListener('click', () => {
            if (!workbook || selectedColumnIndex === -1) {
                showError('请先上传Excel文件并选择单词列');
                return;
            }
            
            if (!isProcessingPhonetics) {
                Logger.info('UI', '用户点击了开始处理按钮');
                processPhonetics();
            } else {
                showError('正在处理中，请稍候...');
            }
        });
    }
    
    // 重置按钮点击事件
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Logger.info('UI', '用户点击了重置按钮');
            resetApplication();
        });
    }
    
    // 拖放事件 - 拖动进入
    uploadArea.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
        Logger.debug('UI', '拖动进入上传区域');
    });
    
    // 拖放事件 - 拖动经过
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });
    
    // 拖放事件 - 拖动离开
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        Logger.debug('UI', '拖动离开上传区域');
    });
    
    // 拖放事件 - 拖放
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            const file = dt.files[0];
            Logger.info('文件', `用户拖放了文件: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB`);
            handleExcelFile(file);
        }
    });
    
    // 下载按钮点击
    downloadBtn.addEventListener('click', () => {
        Logger.info('UI', '用户点击了下载按钮');
        
        // 添加按钮点击效果
        downloadBtn.classList.add('active');
        setTimeout(() => {
            downloadBtn.classList.remove('active');
        }, 200);
        
        // 检查是否有数据可以下载
        if (workbook && excelData) {
            exportExcelWithPhonetics();
        } else {
            showError('没有可用的数据可以导出。请先上传Excel文件并处理。');
        }
    });
    
    Logger.info('UI', 'UI事件初始化完成');
}

/**
 * 重置应用状态
 */
function resetApplication() {
    // 重置所有状态
    workbook = null;
    excelData = null;
    currentFileName = '';
    isProcessingPhonetics = false;
    selectedColumnIndex = -1;
    
    // 重置UI状态
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('resultTableBody').innerHTML = '';
    document.getElementById('columnPreviewTable').getElementsByTagName('tbody')[0].innerHTML = '';
    document.getElementById('selectedColumnName').textContent = '-';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('downloadBtn').disabled = true;
    
    // 清空列选择
    const columnSelect = document.getElementById('columnSelect');
    if (columnSelect) {
        columnSelect.innerHTML = '';
    }
    
    // 更新状态
    updateStatus('已重置，请上传新的Excel文件');
    
    Logger.info('UI', '应用已重置');
}

/**
 * 更新列预览
 */
function updateColumnPreview() {
    const columnSelect = document.getElementById('columnSelect');
    const selectedColumnName = document.getElementById('selectedColumnName');
    const previewTable = document.getElementById('columnPreviewTable').getElementsByTagName('tbody')[0];
    
    if (!columnSelect || !selectedColumnName || !previewTable || !workbook) {
        Logger.error('UI', '无法找到预览相关的DOM元素或数据不完整');
        return;
    }
    
    // 获取选中的列索引
    const selectedIndex = parseInt(columnSelect.value);
    selectedColumnIndex = selectedIndex;
    
    // 更新选中的列名显示
    selectedColumnName.textContent = currentHeaders[selectedIndex] || `列 ${selectedIndex+1}`;
    
    // 清空预览表格
    previewTable.innerHTML = '';
    
    // 使用第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 显示前10行数据（不含表头）
    const maxPreviewRows = Math.min(10, jsonData.length - 1);
    for (let i = 1; i <= maxPreviewRows; i++) {
        if (jsonData[i] && jsonData[i].length > selectedIndex) {
            const row = document.createElement('tr');
            
            // 行号单元格
            const rowNumCell = document.createElement('td');
            rowNumCell.textContent = i;
            row.appendChild(rowNumCell);
            
            // 列名单元格
            const colNameCell = document.createElement('td');
            colNameCell.textContent = currentHeaders[selectedIndex] || `列 ${selectedIndex+1}`;
            row.appendChild(colNameCell);
            
            // 内容单元格
            const contentCell = document.createElement('td');
            contentCell.textContent = jsonData[i][selectedIndex] || '';
            row.appendChild(contentCell);
            
            previewTable.appendChild(row);
        }
    }
    
    Logger.info('UI', `更新了列预览，显示第${selectedIndex+1}列的数据`);
}

/**
 * 处理上传的Excel文件
 * @param {File} file - 上传的Excel文件
 */
function handleExcelFile(file) {
    // 检查文件类型
    if (!file.name.endsWith('.xlsx')) {
        Logger.warning('文件', '文件格式不正确，仅支持.xlsx格式');
        showError('文件格式不正确，请上传.xlsx格式的Excel文件。');
        return;
    }
    
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) { // 10MB限制
        Logger.warning('文件', '文件过大，超过10MB限制');
        showError('文件过大，请将文件大小控制在10MB以内。');
        return;
    }
    
    // 重置状态
    resetProcessingState();
    
    // 显示状态
    updateStatus('正在读取Excel文件...');
    
    // 更新文件信息显示
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <p><strong>文件名:</strong> ${file.name}</p>
            <p><strong>大小:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
        `;
    }
    
    // 保存文件名
    currentFileName = file.name;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel文件格式不正确或没有工作表');
            }
            
            Logger.info('文件', `Excel文件读取成功，共${workbook.SheetNames.length}个工作表`);
            
            // 使用第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                throw new Error('Excel文件内容不足，至少需要表头行和一行数据');
            }
            
            // 保存表头
            currentHeaders = jsonData[0].map(h => h ? h.toString() : '');
            
            // 查找单词列
            selectedColumnIndex = findWordColumn(currentHeaders);
            
            // 准备列选择下拉菜单
            const columnSelect = document.getElementById('columnSelect');
            if (columnSelect) {
                // 清空现有选项
                columnSelect.innerHTML = '';
                
                // 添加所有列作为选项
                currentHeaders.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = header || `列 ${index+1}`;
                    
                    // 如果是自动检测到的单词列，则预选中
                    if (index === selectedColumnIndex) {
                        option.selected = true;
                    }
                    
                    columnSelect.appendChild(option);
                });
            }
            
            // 更新列预览
            updateColumnPreview();
            
            // 更新状态
            updateStatus('文件已加载，请选择要处理的单词列');
            
        } catch (error) {
            Logger.error('文件', `Excel文件解析错误: ${error.message}`);
            showError(`无法解析Excel文件: ${error.message}`);
        }
    };
    
    reader.onerror = function() {
        Logger.error('文件', '文件读取失败');
        showError('文件读取失败，请检查文件是否损坏或重试。');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * 查找单词列索引
 * @param {Array} headers - 表头数组
 * @returns {number} - 找到的列索引，未找到返回-1
 */
function findWordColumn(headers) {
    // 检查localStorage是否有上次选择的列名
    const lastSelectedColumn = localStorage.getItem('lastSelectedColumn');
    
    // 1. 先尝试使用上次选择的列名
    if (lastSelectedColumn) {
        const index = headers.findIndex(header => 
            header === lastSelectedColumn
        );
        if (index !== -1) {
            Logger.info('列识别', `使用上次选择的列名: ${lastSelectedColumn}`);
            return index;
        }
    }
    
    // 2. 精确匹配预设列名
    for (const name of acceptableColumnNames) {
        const index = headers.findIndex(header => 
            header && header.toLowerCase() === name.toLowerCase()
        );
        if (index !== -1) {
            Logger.info('列识别', `精确匹配列名: ${headers[index]}`);
            return index;
        }
    }
    
    // 3. 模糊匹配（包含预设关键词的列名）
    for (const name of acceptableColumnNames) {
        const index = headers.findIndex(header => 
            header && header.toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) {
            Logger.info('列识别', `模糊匹配列名: ${headers[index]}，包含关键词: ${name}`);
            return index;
        }
    }
    
    // 4. 如果只有一列，直接返回该列
    if (headers.length === 1) {
        Logger.info('列识别', `表格只有一列: ${headers[0]}，自动选择`);
        return 0;
    }
    
    // 5. 如果都没有找到，返回第一列
    Logger.warning('列识别', `未找到匹配的单词列，默认选择第一列`);
    return 0;
}

/**
 * 处理单词音标
 */
async function processPhonetics() {
    if (isProcessingPhonetics || !workbook || selectedColumnIndex === -1) {
        showError('无法处理：没有选择Excel文件或未确认单词列');
        return;
    }
    
    isProcessingPhonetics = true;
    Logger.info('音标处理', '开始处理单词音标');
    
    try {
        // 显示处理状态
        updateStatus('正在查询音标，请稍候...');
        
        // 从工作表提取数据
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 跳过表头行，提取单词数据
        excelData = jsonData.slice(1).map(row => {
            // 确保行数据存在且单词列有值
            if (row && row.length > selectedColumnIndex && row[selectedColumnIndex]) {
                return { word: row[selectedColumnIndex].toString() };
            }
            return { word: '' }; // 空单元格处理
        }).filter(item => item.word.trim() !== ''); // 过滤空值
        
        Logger.info('数据', `成功提取${excelData.length}个单词，开始处理音标`);
        
        // 清空结果表格
        document.getElementById('resultTableBody').innerHTML = '';
        
        // 重置进度条
        document.getElementById('progressBar').style.width = '0%';
        
        // 预计算需要处理的单词数量
        const totalWords = excelData.length;
        let processedCount = 0;
        
        // 批量处理音标，并更新进度
        const results = await PhonicsProcessor.batchQueryPhonetics(excelData, (processed, total) => {
            processedCount = processed;
            const percent = Math.floor((processed / total) * 100);
            
            // 更新进度条
            document.getElementById('progressBar').style.width = `${percent}%`;
            
            // 更新状态
            updateStatus(`正在查询音标 (${percent}%)，已处理 ${processed}/${total} 个单词...`);
            
            // 实时更新已处理的结果
            if (processed % 5 === 0 || processed === total) { // 每5个单词更新一次，或处理完成时
                const currentResults = excelData.slice(0, processed).filter(item => item.usPhonetic || item.ukPhonetic);
                displayResults(currentResults.slice(0, 10)); // 只显示最多10个结果
            }
        });
        
        // 更新数据和UI
        excelData = results;
        
        // 显示最终处理结果（最多显示10个）
        displayResults(excelData.slice(0, 10));
        
        // 更新状态
        updateStatus(`音标查询完成，共处理 ${excelData.length} 个单词`);
        
        // 启用下载按钮
        document.getElementById('downloadBtn').disabled = false;
        
        Logger.info('音标处理', `音标处理完成，共处理 ${excelData.length} 个单词`);
    } catch (error) {
        Logger.error('音标处理', `处理音标时出错: ${error.message}`);
        showError(`音标查询过程中出错: ${error.message}`);
    } finally {
        isProcessingPhonetics = false;
    }
}

/**
 * 显示处理结果
 * @param {Array} data - 处理结果数据
 */
function displayResults(data) {
    Logger.debug('结果', `显示处理结果预览: ${data.length} 条记录`);
    
    const tableBody = document.getElementById('resultTableBody');
    
    if (!tableBody) {
        Logger.error('结果', '找不到结果表格主体元素');
        return;
    }
    
    // 清空现有内容
    tableBody.innerHTML = '';
    
    // 插入数据行
    data.forEach((item) => {
        const row = document.createElement('tr');
        row.classList.add('fade-in');
        
        const wordCell = document.createElement('td');
        wordCell.textContent = item.word;
        row.appendChild(wordCell);
        
        const usCell = document.createElement('td');
        usCell.textContent = item.usPhonetic || 'Not Found';
        usCell.classList.add('highlight');
        row.appendChild(usCell);
        
        const ukCell = document.createElement('td');
        ukCell.textContent = item.ukPhonetic || 'Not Found';
        ukCell.classList.add('highlight');
        row.appendChild(ukCell);
        
        tableBody.appendChild(row);
    });
    
    Logger.info('结果', '处理结果预览显示完成');
}

/**
 * 更新状态栏文本
 * @param {string} message - 状态消息
 */
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        // 添加淡入淡出效果
        statusText.style.opacity = '0';
        setTimeout(() => {
            statusText.textContent = message;
            statusText.style.opacity = '1';
        }, 300);
        
        Logger.debug('状态', `状态更新: ${message}`);
    }
}

/**
 * 导出带音标的Excel文件
 */
function exportExcelWithPhonetics() {
    if (!workbook || !excelData || excelData.length === 0) {
        showError('没有可用的数据可以导出。');
        return;
    }
    
    Logger.info('导出', '开始导出带音标的Excel文件');
    
    try {
        // 获取工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将工作表转换为JSON进行处理
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 检查是否已经存在音标列
        let usPhoneticIndex = -1;
        let ukPhoneticIndex = -1;
        
        if (jsonData.length > 0) {
            const headers = jsonData[0];
            
            // 检查是否已存在音标列
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] === '美式音标') {
                    usPhoneticIndex = i;
                }
                if (headers[i] === '英式音标') {
                    ukPhoneticIndex = i;
                }
            }
            
            // 如果没有音标列，添加音标列标题
            if (usPhoneticIndex === -1) {
                headers.push('美式音标');
                usPhoneticIndex = headers.length - 1;
            }
            
            if (ukPhoneticIndex === -1) {
                headers.push('英式音标');
                ukPhoneticIndex = headers.length - 1;
            }
            
            // 为所有数据行添加空音标，保持数组长度一致
            for (let i = 1; i < jsonData.length; i++) {
                if (jsonData[i]) {
                    // 确保每行长度至少与新的标题行一致
                    while (jsonData[i].length < headers.length) {
                        jsonData[i].push('');
                    }
                }
            }
        }
        
        // 为每行数据添加或更新音标
        for (let i = 1; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i][selectedColumnIndex]) {
                const word = jsonData[i][selectedColumnIndex];
                
                // 在excelData中查找对应单词的音标
                const wordData = excelData.find(item => item.word === word);
                
                if (wordData) {
                    // 更新音标数据
                    jsonData[i][usPhoneticIndex] = wordData.usPhonetic || 'Not Found';
                    jsonData[i][ukPhoneticIndex] = wordData.ukPhonetic || 'Not Found';
                } else {
                    // 没有找到音标数据时
                    jsonData[i][usPhoneticIndex] = 'Not Found';
                    jsonData[i][ukPhoneticIndex] = 'Not Found';
                }
            }
        }
        
        // 将修改后的数据转回Excel格式
        const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
        workbook.Sheets[firstSheetName] = newWorksheet;
        
        // 生成Excel二进制数据
        const excelBinaryData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        // 创建Blob对象
        const blob = new Blob([excelBinaryData], { type: 'application/octet-stream' });
        
        // 生成下载链接
        const fileNameWithoutExt = currentFileName.replace('.xlsx', '');
        const downloadName = `${fileNameWithoutExt}_带音标.xlsx`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Logger.info('导出', `Excel文件导出成功: ${downloadName}`);
        updateStatus(`文件已导出: ${downloadName}`);
    } catch (error) {
        Logger.error('导出', `导出Excel文件时出错: ${error.message}`);
        showError(`导出文件失败: ${error.message}`);
    }
}

// ... existing code ...