/**
 * Excel单词音标生成器 - 单词处理与音标查询模块
 */

// 词典数据缓存
let ukDictionary = null;
let usDictionary = null;
let phoneticsCache = {};

/**
 * 初始化音标查询模块
 * @returns {Promise} - 初始化完成的Promise
 */
async function initPhonetics() {
    Logger.info('音标模块', '初始化音标查询模块');
    
    // 加载本地词典数据
    try {
        const [ukResponse, usResponse] = await Promise.all([
            fetch('openDictUK.json'),
            fetch('openDictUS.json')
        ]);
        
        ukDictionary = await ukResponse.json();
        usDictionary = await usResponse.json();
        
        Logger.info('音标模块', `词典加载完成，英式词典包含 ${Object.keys(ukDictionary).length} 个单词，美式词典包含 ${Object.keys(usDictionary).length} 个单词`);
        
        // 尝试从localStorage加载缓存
        try {
            const cachedData = localStorage.getItem('phoneticsCache');
            if (cachedData) {
                phoneticsCache = JSON.parse(cachedData);
                Logger.info('音标模块', `从缓存加载了 ${Object.keys(phoneticsCache).length} 个单词的音标数据`);
            }
        } catch (error) {
            Logger.warning('音标模块', `无法从localStorage加载缓存: ${error.message}`);
        }
        
        return true;
    } catch (error) {
        Logger.error('音标模块', `加载词典数据失败: ${error.message}`);
        throw new Error(`无法加载音标词典: ${error.message}`);
    }
}

/**
 * 预处理单词
 * @param {string} word - 原始单词或短语
 * @returns {string} - 处理后的单词
 */
function preprocessWord(word) {
    if (!word) return '';
    
    // 等号截断处理：截取等号前的内容
    if (word.includes('=')) {
        word = word.split('=')[0].trim();
        Logger.debug('单词处理', `等号截断: "${word}"`);
    }
    
    // 空白字符规范化：移除首尾空格，多个空格转为单个
    word = word.trim().replace(/\s+/g, ' ');
    
    // 大小写标准化：转为小写用于查询
    const lowerWord = word.toLowerCase();
    
    // 特殊符号过滤：保留撇号，移除其他标点
    const filteredWord = lowerWord.replace(/[^\w\s']/g, '');
    
    if (filteredWord !== word) {
        Logger.debug('单词处理', `特殊符号过滤: "${word}" -> "${filteredWord}"`);
    }
    
    return filteredWord;
}

/**
 * 判断是否需要分词处理
 * @param {string} phrase - 可能包含多个单词的短语
 * @returns {boolean} - 是否需要分词
 */
function shouldTokenize(phrase) {
    // 如果不包含空格，肯定是单个单词
    if (!phrase.includes(' ')) return false;
    
    // 常见短语和短虚词组合可以作为整体查询
    const commonPhrases = [
        'a lot', 'a little', 'a few', 'in order to', 'as well as', 
        'such as', 'thanks to', 'so that', 'used to', 'would like to',
        'get up', 'look after', 'take care', 'come back', 'find out'
    ];
    
    // 检查是否是常见短语
    if (commonPhrases.includes(phrase)) {
        Logger.debug('单词处理', `短语"${phrase}"作为整体处理`);
        return false;
    }
    
    // 对于包含空格的短语，始终返回true进行分词处理
    return true;
}

/**
 * 分词处理
 * @param {string} phrase - 包含多个单词的短语
 * @returns {string[]} - 分词后的单词数组
 */
function tokenize(phrase) {
    if (!phrase.includes(' ')) return [phrase];
    
    // 首先判断是否需要分词
    if (!shouldTokenize(phrase)) return [phrase];
    
    // 空格分词并过滤空字符串
    const words = phrase.split(' ').filter(word => word.trim().length > 0);
    Logger.debug('单词处理', `分词: "${phrase}" -> ${JSON.stringify(words)}`);
    
    return words;
}

/**
 * 从本地词典查询音标
 * @param {string} word - 处理后的单词
 * @returns {Object|null} - 音标对象 {uk: '英式音标', us: '美式音标'} 或 null
 */
function queryLocalDictionary(word) {
    if (!ukDictionary || !usDictionary) {
        Logger.warning('音标查询', '本地词典尚未加载');
        return null;
    }
    
    const ukPhonetic = ukDictionary[word] || null;
    const usPhonetic = usDictionary[word] || null;
    
    if (ukPhonetic || usPhonetic) {
        Logger.debug('音标查询', `本地词典查询成功: ${word}`);
        return {
            uk: ukPhonetic ? `/${ukPhonetic}/` : 'Not Found',
            us: usPhonetic ? `/${usPhonetic}/` : 'Not Found'
        };
    }
    
    Logger.debug('音标查询', `本地词典查询失败: ${word}`);
    return null;
}

/**
 * 从缓存中查询音标
 * @param {string} word - 处理后的单词
 * @returns {Object|null} - 音标对象或null
 */
function queryCache(word) {
    if (phoneticsCache[word]) {
        Logger.debug('音标查询', `缓存命中: ${word}`);
        return phoneticsCache[word];
    }
    Logger.debug('音标查询', `缓存未命中: ${word}`);
    return null;
}

/**
 * 保存音标到缓存
 * @param {string} word - 处理后的单词
 * @param {Object} phoneticData - 音标数据对象
 */
function saveToCache(word, phoneticData) {
    phoneticsCache[word] = phoneticData;
    Logger.debug('音标查询', `保存到缓存: ${word}`);
    
    // 保存到localStorage
    try {
        // 限制缓存大小，最多存储1000个单词
        const keys = Object.keys(phoneticsCache);
        if (keys.length > 1000) {
            // 移除最旧的100个缓存
            const keysToRemove = keys.slice(0, 100);
            keysToRemove.forEach(key => delete phoneticsCache[key]);
            Logger.debug('音标查询', `缓存超出限制，已清理最旧的100个条目`);
        }
        
        localStorage.setItem('phoneticsCache', JSON.stringify(phoneticsCache));
    } catch (error) {
        Logger.warning('音标查询', `保存缓存到localStorage失败: ${error.message}`);
    }
}

/**
 * 从远程API查询音标（示例使用有道词典API）
 * @param {string} word - 要查询的单词
 * @returns {Promise<Object>} - 音标对象
 */
async function queryRemoteAPI(word) {
    Logger.info('音标查询', `开始远程查询: ${word}`);
    
    try {
        // 这里使用有道词典API作为示例
        // 实际使用时需要替换为真实的API地址和密钥
        // const url = `https://api.example.com/dictionary?word=${encodeURIComponent(word)}&key=YOUR_API_KEY`;
        
        // 模拟API响应，实际项目中需要替换为真实API调用
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟API返回结果
        const mockResult = {
            uk: 'Not Found',
            us: 'Not Found'
        };
        
        Logger.info('音标查询', `远程查询完成: ${word}`);
        return mockResult;
        
        // 实际API调用代码示例：
        // const response = await fetch(url);
        // if (!response.ok) throw new Error(`API返回错误状态: ${response.status}`);
        // const data = await response.json();
        // return {
        //     uk: data.uk_phonetic ? `/${data.uk_phonetic}/` : 'Not Found',
        //     us: data.us_phonetic ? `/${data.us_phonetic}/` : 'Not Found'
        // };
    } catch (error) {
        Logger.error('音标查询', `远程API查询失败: ${error.message}`);
        return {
            uk: 'Not Found',
            us: 'Not Found'
        };
    }
}

/**
 * 查询单词的音标
 * @param {string} originalWord - 原始单词
 * @returns {Promise<Object>} - 包含英式和美式音标的对象
 */
async function queryPhonetic(originalWord) {
    // 预处理单词
    const processedWord = preprocessWord(originalWord);
    if (!processedWord) {
        return { uk: 'Not Found', us: 'Not Found' };
    }
    
    Logger.info('音标查询', `查询单词: ${originalWord} -> ${processedWord}`);
    
    // 分词处理
    const tokens = tokenize(processedWord);
    
    // 如果是多个单词，逐个查询音标并合并结果
    if (tokens.length > 1) {
        Logger.info('音标查询', `分词处理: ${processedWord} -> ${tokens.join(', ')}`);
        
        // 存储每个单词的音标结果
        const ukPhonetics = [];
        const usPhonetics = [];
        
        // 逐个查询每个单词的音标
        for (const token of tokens) {
            const result = await queryPhoneticSingle(token);
            
            // 只添加有效的音标（不是"Not Found"的音标）
            if (result.uk !== 'Not Found') {
                ukPhonetics.push(result.uk);
            }
            
            if (result.us !== 'Not Found') {
                usPhonetics.push(result.us);
            }
        }
        
        // 合并音标结果
        return {
            uk: ukPhonetics.length > 0 ? ukPhonetics.join(' ') : 'Not Found',
            us: usPhonetics.length > 0 ? usPhonetics.join(' ') : 'Not Found'
        };
    }
    
    return await queryPhoneticSingle(processedWord);
}

/**
 * 查询单个单词的音标（不进行分词）
 * @param {string} word - 处理后的单词
 * @returns {Promise<Object>} - 包含英式和美式音标的对象
 */
async function queryPhoneticSingle(word) {
    // 1. 首先检查缓存
    const cachedResult = queryCache(word);
    if (cachedResult) return cachedResult;
    
    // 2. 查询本地词典
    const localResult = queryLocalDictionary(word);
    if (localResult) {
        saveToCache(word, localResult);
        return localResult;
    }
    
    // 3. 查询远程API
    const remoteResult = await queryRemoteAPI(word);
    saveToCache(word, remoteResult);
    return remoteResult;
}

/**
 * 批量查询单词音标
 * @param {Array} wordList - 单词对象数组 [{word: '单词'}]
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Array>} - 包含音标的单词对象数组
 */
async function batchQueryPhonetics(wordList, progressCallback) {
    Logger.info('音标查询', `开始批量查询，共 ${wordList.length} 个单词`);
    
    // 确保音标模块已初始化
    if (!ukDictionary || !usDictionary) {
        try {
            await initPhonetics();
        } catch (error) {
            Logger.error('音标查询', `初始化失败: ${error.message}`);
            throw error;
        }
    }
    
    const results = [];
    let processed = 0;
    
    // 使用Promise.all会同时发起所有请求，可能导致API限流
    // 因此使用for循环，每次处理一个单词
    for (const item of wordList) {
        const phoneticData = await queryPhonetic(item.word);
        results.push({
            word: item.word,
            ukPhonetic: phoneticData.uk,
            usPhonetic: phoneticData.us
        });
        
        processed++;
        
        // 调用进度回调
        if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(processed, wordList.length);
        }
    }
    
    Logger.info('音标查询', `批量查询完成，处理了 ${results.length} 个单词`);
    return results;
}

// 导出模块功能
window.PhonicsProcessor = {
    initPhonetics,
    preprocessWord,
    queryPhonetic,
    batchQueryPhonetics
}; 