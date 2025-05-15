/**
 * Excel单词音标生成器 - 主应用脚本
 */

// 全局变量
let workbook = null; // 存储当前工作簿
let excelData = null; // 存储提取的数据
let currentFileName = ''; // 当前处理的文件名
let isProcessingPhonetics = false; // 是否正在处理音标

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
 * 初始化UI事件
 */
function initUIEvents() {
    Logger.debug('UI', '初始化UI事件');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusText = document.getElementById('statusText');
    const previewSection = document.getElementById('previewSection');
    
    // 确保所有必要的DOM元素存在
    if (!uploadArea || !fileInput || !selectFileBtn || !downloadBtn || !statusText || !previewSection) {
        Logger.error('UI', '无法找到必要的DOM元素');
        return;
    }
    
    // 点击选择文件按钮
    selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault(); // 防止可能的表单提交
        Logger.debug('UI', '用户点击了选择文件按钮');
        fileInput.click();
        
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
            showError('没有可用的数据可以导出。请先上传Excel文件。');
        }
    });
    
    // 响应式布局调整
    window.addEventListener('resize', debounce(() => {
        adjustLayout();
    }, 250));
    
    // 初始调整
    adjustLayout();
    
    Logger.info('UI', 'UI事件初始化完成');
}

/**
 * 防抖函数，限制函数在一定时间内只执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} - 防抖处理后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * 调整响应式布局
 */
function adjustLayout() {
    const width = window.innerWidth;
    const main = document.querySelector('main');
    const previewSection = document.getElementById('previewSection');
    
    if (width < 768) {
        Logger.debug('UI', '调整为移动布局');
        if (previewSection) {
            previewSection.style.opacity = '1'; // 在移动设备上始终显示预览区
        }
    } else {
        Logger.debug('UI', '调整为桌面布局');
    }
}

/**
 * 处理Excel文件
 * @param {File} file - 上传的Excel文件
 */
function handleExcelFile(file) {
    Logger.info('文件处理', `开始处理Excel文件: ${file.name}`);
    currentFileName = file.name;
    
    // 检查文件类型
    if (!file.name.endsWith('.xlsx')) {
        Logger.warning('文件处理', `文件类型不是.xlsx: ${file.name}`);
        showError('请上传.xlsx格式的Excel文件。');
        return;
    }
    
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) { // 10MB
        Logger.warning('文件处理', `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        showError('文件大小超过10MB，请上传更小的文件。');
        return;
    }
    
    // 更新状态
    updateStatus(`正在处理文件: ${file.name}...`);
    document.querySelector('.container').classList.add('loading');
    
    // 创建FileReader读取文件
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // 使用SheetJS库读取Excel数据
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });
            Logger.info('文件处理', `成功读取Excel文件，包含 ${workbook.SheetNames.length} 个工作表`);
            
            // 获取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 将工作表转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            Logger.debug('文件处理', `工作表包含 ${jsonData.length} 行数据`);
            
            // 查找"词"列的索引
            let wordColumnIndex = -1;
            if (jsonData.length > 0) {
                const headers = jsonData[0];
                for (let i = 0; i < headers.length; i++) {
                    if (headers[i] === '词') {
                        wordColumnIndex = i;
                        Logger.info('文件处理', `找到"词"列，索引为 ${wordColumnIndex}`);
                        break;
                    }
                }
            }
            
            if (wordColumnIndex === -1) {
                Logger.warning('文件处理', '未找到"词"列');
                showError('Excel文件中未找到"词"列。请确保文件包含一个名为"词"的列。');
                document.querySelector('.container').classList.remove('loading');
                return;
            }
            
            // 提取"词"列的数据
            excelData = [];
            for (let i = 1; i < jsonData.length; i++) { // 从第2行开始，跳过标题行
                if (jsonData[i] && jsonData[i][wordColumnIndex]) {
                    // 去重处理 - 如果单词已经存在，跳过
                    const word = jsonData[i][wordColumnIndex];
                    if (!excelData.some(item => item.word === word)) {
                        excelData.push({
                            word: word,
                            usPhonetic: 'Loading...', // 加载中状态
                            ukPhonetic: 'Loading...'  // 加载中状态
                        });
                    }
                }
            }
            
            Logger.info('文件处理', `成功提取了 ${excelData.length} 个单词`);
            
            // 显示前5行预览数据
            const previewData = excelData.slice(0, Math.min(5, excelData.length));
            displayPreview(previewData);
            
            // 启用下载按钮
            document.getElementById('downloadBtn').disabled = false;
            
            // 更新状态
            updateStatus(`文件 ${file.name} 处理完成，共提取 ${excelData.length} 个单词`);
            
            // 开始查询音标
            processPhonetics();
            
            Logger.info('文件处理', `文件 ${file.name} 处理完成`);
        } catch (err) {
            Logger.error('文件处理', `处理Excel文件时出错: ${err.message}`);
            showError(`无法处理Excel文件: ${err.message}`);
        } finally {
            document.querySelector('.container').classList.remove('loading');
        }
    };
    
    reader.onerror = function() {
        Logger.error('文件处理', '读取文件时发生错误');
        showError('读取文件时发生错误，请检查文件是否损坏。');
        document.querySelector('.container').classList.remove('loading');
    };
    
    // 读取文件
    reader.readAsArrayBuffer(file);
}

/**
 * 处理单词音标
 */
async function processPhonetics() {
    if (isProcessingPhonetics || !excelData || excelData.length === 0) return;
    
    isProcessingPhonetics = true;
    Logger.info('音标处理', '开始处理单词音标');
    
    try {
        // 显示处理状态
        updateStatus('正在查询音标，请稍候...');
        
        // 预计算需要处理的单词数量
        const totalWords = excelData.length;
        let processedCount = 0;
        
        // 批量处理音标，并更新进度
        const results = await PhonicsProcessor.batchQueryPhonetics(excelData, (processed, total) => {
            processedCount = processed;
            const percent = Math.floor((processed / total) * 100);
            updateStatus(`正在查询音标 (${percent}%)，已处理 ${processed}/${total} 个单词...`);
            
            // 不在每个进度回调中更新预览，避免频繁刷新UI导致显示问题
        });
        
        // 更新数据和UI
        excelData = results;
        
        // 更新预览显示 - 只显示前5个单词
        const previewData = excelData.slice(0, Math.min(5, excelData.length));
        displayPreview(previewData);
        
        // 更新状态
        updateStatus(`音标查询完成，共处理 ${excelData.length} 个单词`);
        
        Logger.info('音标处理', `音标处理完成，共处理 ${excelData.length} 个单词`);
    } catch (error) {
        Logger.error('音标处理', `处理音标时出错: ${error.message}`);
        showError(`音标查询过程中出错: ${error.message}`);
    } finally {
        isProcessingPhonetics = false;
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
        
        // 找到"词"列的索引
        let wordColumnIndex = -1;
        if (jsonData.length > 0) {
            const headers = jsonData[0];
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] === '词') {
                    wordColumnIndex = i;
                    break;
                }
            }
        }
        
        if (wordColumnIndex === -1) {
            showError('无法找到"词"列，导出失败。');
            return;
        }
        
        // 检查是否已经存在音标列
        let usPhoneticIndex = -1;
        let ukPhoneticIndex = -1;
        
        if (jsonData.length > 0) {
            const headers = jsonData[0];
            for (let i = 0; i < headers.length; i++) {
                if (headers[i] === '美式音标') {
                    usPhoneticIndex = i;
                }
                if (headers[i] === '英式音标') {
                    ukPhoneticIndex = i;
                }
            }
        }
        
        // 如果没有音标列，添加音标列标题
        // 否则，使用已有的列
        if (usPhoneticIndex === -1 && ukPhoneticIndex === -1) {
            // 添加新的音标列
            jsonData[0].push('美式音标');
            jsonData[0].push('英式音标');
            
            // 更新索引值
            usPhoneticIndex = jsonData[0].length - 2;
            ukPhoneticIndex = jsonData[0].length - 1;
            
            // 为所有数据行添加空值，保持数组长度一致
            for (let i = 1; i < jsonData.length; i++) {
                if (jsonData[i]) {
                    // 确保每行长度与标题行一致
                    while (jsonData[i].length < jsonData[0].length) {
                        jsonData[i].push('');
                    }
                }
            }
            
            Logger.info('导出', '添加了音标列');
        } else {
            Logger.info('导出', '使用已有的音标列');
        }
        
        // 为每行数据添加或更新音标
        for (let i = 1; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i][wordColumnIndex]) {
                const word = jsonData[i][wordColumnIndex];
                
                // 在excelData中查找对应单词的音标
                const wordData = excelData.find(item => item.word === word);
                
                if (wordData) {
                    // 更新音标数据
                    if (usPhoneticIndex >= 0) {
                        jsonData[i][usPhoneticIndex] = wordData.usPhonetic;
                    }
                    if (ukPhoneticIndex >= 0) {
                        jsonData[i][ukPhoneticIndex] = wordData.ukPhonetic;
                    }
                } else {
                    // 没有找到音标数据时
                    if (usPhoneticIndex >= 0) {
                        jsonData[i][usPhoneticIndex] = 'Not Found';
                    }
                    if (ukPhoneticIndex >= 0) {
                        jsonData[i][ukPhoneticIndex] = 'Not Found';
                    }
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

/**
 * 显示预览数据
 * @param {Array} data - 预览数据
 */
function displayPreview(data) {
    Logger.debug('预览', `显示预览数据: ${data.length} 条记录`);
    
    const tableBody = document.getElementById('previewTableBody');
    const previewSection = document.getElementById('previewSection');
    
    if (!tableBody) {
        Logger.error('预览', '找不到预览表格主体元素');
        return;
    }
    
    // 清空现有内容
    tableBody.innerHTML = '';
    
    // 插入数据行 - 直接插入全部数据，不使用延迟
    data.forEach((item) => {
        const row = document.createElement('tr');
        row.classList.add('fade-in');
        
        const wordCell = document.createElement('td');
        wordCell.textContent = item.word;
        row.appendChild(wordCell);
        
        const usCell = document.createElement('td');
        usCell.textContent = item.usPhonetic;
        usCell.classList.add('highlight');
        row.appendChild(usCell);
        
        const ukCell = document.createElement('td');
        ukCell.textContent = item.ukPhonetic;
        ukCell.classList.add('highlight');
        row.appendChild(ukCell);
        
        tableBody.appendChild(row);
    });
    
    // 显示预览区域
    if (previewSection) {
        previewSection.style.opacity = '1';
    }
    
    Logger.info('预览', '预览数据显示完成');
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