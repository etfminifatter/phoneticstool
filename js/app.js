/**
 * Excel单词音标生成器 - 主应用脚本
 */

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    Logger.info('初始化', '应用开始初始化');
    
    // 检查浏览器兼容性
    checkBrowserSupport();
    
    // 初始化UI事件
    initUIEvents();
    
    // 检查外部库
    checkExternalLibraries();
    
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
        
        // 在这里实现下载功能
        // 此功能将在阶段五实现
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
    
    // 此处将在阶段三完成文件读取和处理
    // 目前仅显示模拟数据作为示例
    
    // 模拟处理延迟
    setTimeout(() => {
        // 移除加载状态
        document.querySelector('.container').classList.remove('loading');
        
        // 显示示例预览数据
        const previewData = [
            { word: 'Hello', usPhonetic: '/həˈloʊ/', ukPhonetic: '/həˈləʊ/' },
            { word: 'World', usPhonetic: '/wɜːrld/', ukPhonetic: '/wɜːld/' },
            { word: 'Example', usPhonetic: '/ɪɡˈzæmpəl/', ukPhonetic: '/ɪɡˈzɑːmpəl/' }
        ];
        
        displayPreview(previewData);
        
        // 启用下载按钮
        document.getElementById('downloadBtn').disabled = false;
        
        // 更新状态
        updateStatus(`文件 ${file.name} 处理完成，可以下载结果`);
        
        Logger.info('文件处理', `文件 ${file.name} 初步处理完成`);
    }, 1500);
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
    
    // 插入数据行
    data.forEach((item, index) => {
        // 为每行添加延迟动画效果
        setTimeout(() => {
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
        }, index * 100); // 每行延迟100ms
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