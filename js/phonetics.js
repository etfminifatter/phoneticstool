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
    
    // 所有包含空格的短语都需要分词
    return true;
}

/**
 * 分词处理
 * @param {string} phrase - 包含多个单词的短语
 * @returns {string[]} - 分词后的单词数组
 */
function tokenize(phrase) {
    if (!phrase.includes(' ')) return [phrase];
    
    // 所有包含空格的短语都进行分词处理
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
    
    // 记录详细的本地查询日志
    if (ukPhonetic) {
        console.log(`[phonetics.js:150] 从UK词典查到单词 "${word}" 的音标: /${ukPhonetic}/`);
    }
    
    if (usPhonetic) {
        console.log(`[phonetics.js:154] 从US词典查到单词 "${word}" 的音标: /${usPhonetic}/`);
    }
    
    if (ukPhonetic || usPhonetic) {
        Logger.debug('音标查询', `本地词典查询成功: ${word}`);
        const result = {
            uk: ukPhonetic ? `/${ukPhonetic}/` : 'Not Found',
            us: usPhonetic ? `/${usPhonetic}/` : 'Not Found'
        };
        
        // 汇总日志，显示单词的完整音标查询结果
        console.log(`[phonetics.js:165] 本地词典查询结果: "${word}" - US: ${result.us}, UK: ${result.uk}`);
        
        return result;
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
        
        // 添加详细的缓存查询日志
        console.log(`[phonetics.js:179] 从缓存中查到单词 "${word}" 的音标 - US: ${phoneticsCache[word].us}, UK: ${phoneticsCache[word].uk}`);
        
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
 * 从远程API查询音标（使用Free Dictionary API）
 * @param {string} word - 要查询的单词
 * @returns {Promise<Object>} - 音标对象
 */
async function queryRemoteAPI(word) {
    Logger.info('音标查询', `开始远程查询: ${word}`);
    
    // 检查输入是否为空或包含空格（API不支持短语查询）
    if (!word || word.includes(' ')) {
        Logger.warning('音标查询', `远程API不支持查询空字符串或短语: "${word}"`);
        return {
            uk: 'Not Found',
            us: 'Not Found'
        };
    }
    
    // API调用日志 - 按用户要求的格式
    console.log(`通过远程api 查询 ${word}`);
    
    // 最大重试次数
    const maxRetries = 3; // 增加重试次数，因为可能需要尝试不同代理
    let retryCount = 0;
    let lastError = null;
    let proxyChanged = false;
    
    while (retryCount <= maxRetries) {
        try {
            // 添加重试延迟，避免立即重试
            if (retryCount > 0) {
                const delay = retryCount * 500; // 递增延迟
                Logger.info('音标查询', `第${retryCount}次重试，延迟${delay}ms: ${word}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // 在第二次重试时尝试切换到下一个代理
                if (retryCount >= 2 && typeof window.switchCORSProxy === 'function' && !proxyChanged) {
                    window.switchCORSProxy();
                    proxyChanged = true;
                    Logger.info('音标查询', `已切换到新的代理服务`);
                }
            }
            
            // 使用CORS代理服务替代本地代理服务器
            const timestamp = Date.now();
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
            const url = `${window.CORS_PROXY}${encodeURIComponent(apiUrl)}?t=${timestamp}`;
            
            Logger.debug('音标查询', `通过CORS代理请求API: ${url}`);
            console.log(`尝试${retryCount > 0 ? '第'+(retryCount)+'次' : ''}CORS代理请求: ${url}`);
            
            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            // 记录请求开始
            const startTime = Date.now();
            Logger.debug('API诊断', `开始代理请求 - ${url}`);
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId); // 清除超时计时器
                
                // 记录请求结束
                const endTime = Date.now();
                Logger.debug('API诊断', `请求完成 - 耗时: ${endTime - startTime}ms, 状态: ${response.status}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        Logger.warning('音标查询', `单词未找到: ${word}`);
                        return {
                            uk: 'Not Found',
                            us: 'Not Found'
                        };
                    }
                    throw new Error(`API返回错误状态: ${response.status} - ${word}`);
                }
                
                const data = await response.json();
                
                // 提取音标信息
                let ukPhonetic = 'Not Found';
                let usPhonetic = 'Not Found';
                
                // API返回的是数组，取第一个结果
                if (data && Array.isArray(data) && data.length > 0) {
                    // 记录完整API响应用于调试
                    Logger.debug('音标查询', `API响应数据结构有效`);
                    
                    // 先尝试从根级别获取通用音标作为备选
                    const generalPhonetic = data[0].phonetic;
                    
                    // 然后遍历phonetics数组查找详细音标
                    const phonetics = data[0].phonetics || [];
                    
                    // 遍历音标数组查找美式和英式音标
                    for (const phonetic of phonetics) {
                        // 跳过没有文本的音标
                        if (!phonetic.text || phonetic.text.trim() === '') continue;
                        
                        // 根据audio URL判断音标类型
                        const audioUrl = phonetic.audio || '';
                        
                        if (audioUrl.includes('us') || audioUrl.includes('-us.')) {
                            // 明确的美式音标
                            usPhonetic = phonetic.text;
                            Logger.debug('音标查询', `找到美式音标: ${usPhonetic}`);
                        }
                        else if (audioUrl.includes('uk') || audioUrl.includes('gb') || 
                                audioUrl.includes('-uk.') || audioUrl.includes('-gb.')) {
                            // 明确的英式音标
                            ukPhonetic = phonetic.text;
                            Logger.debug('音标查询', `找到英式音标: ${ukPhonetic}`);
                        }
                        else if (phonetic.text) {
                            // 未标明方言的音标作为备选
                            if (usPhonetic === 'Not Found') {
                                usPhonetic = phonetic.text;
                                Logger.debug('音标查询', `使用通用音标作为美式备选: ${usPhonetic}`);
                            }
                            if (ukPhonetic === 'Not Found') {
                                ukPhonetic = phonetic.text;
                                Logger.debug('音标查询', `使用通用音标作为英式备选: ${ukPhonetic}`);
                            }
                        }
                    }
                    
                    // 如果仍未找到音标，使用通用音标
                    if (usPhonetic === 'Not Found' && generalPhonetic) {
                        usPhonetic = generalPhonetic;
                        Logger.debug('音标查询', `使用根级别音标作为美式备选: ${usPhonetic}`);
                    }
                    
                    if (ukPhonetic === 'Not Found' && generalPhonetic) {
                        ukPhonetic = generalPhonetic;
                        Logger.debug('音标查询', `使用根级别音标作为英式备选: ${ukPhonetic}`);
                    }
                } else {
                    Logger.warning('音标查询', `API返回数据格式不正确：${JSON.stringify(data).substring(0, 100)}...`);
                }
                
                Logger.info('音标查询', `远程查询完成: ${word} - US: ${usPhonetic}, UK: ${ukPhonetic}`);
                return {
                    uk: ukPhonetic,
                    us: usPhonetic
                };
            } catch (fetchError) {
                clearTimeout(timeoutId); // 确保清除超时计时器
                
                // 记录详细的网络错误信息
                const endTime = Date.now();
                Logger.error('API诊断', `请求失败 - 耗时: ${endTime - startTime}ms, 错误: ${fetchError.message}, 类型: ${fetchError.name}`);
                
                // 重新抛出以便外层catch处理
                throw fetchError;
            }
        } catch (error) {
            lastError = error;
            Logger.warning('音标查询', `远程API查询失败(尝试 ${retryCount+1}/${maxRetries+1}): ${error.message}`);
            retryCount++;
        }
    }
    
    // 所有重试都失败了，记录错误
    Logger.error('音标查询', `远程API查询彻底失败: ${lastError.message}`);
    Logger.error('API诊断', `远程API请求失败，可能是网络问题或API服务不可用，已尝试所有可用代理`);
    
    return {
        uk: 'Not Found',
        us: 'Not Found'
    };
}

/**
 * 处理音标格式，确保统一的显示格式
 * @param {string} phonetic - 原始音标
 * @returns {string} - 格式化后的音标
 */
function formatPhonetic(phonetic) {
    if (!phonetic || phonetic === 'Not Found') {
        return 'Not Found';
    }
    
    // 清理音标，移除可能的多余斜杠
    let cleaned = phonetic;
    
    // 如果已经被斜杠包围，先提取内容
    if (cleaned.startsWith('/') && cleaned.endsWith('/')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    
    // 确保结果格式为 /xxx/
    return `/${cleaned}/`;
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
        
        // 存储每个单词的音标结果（不含斜杠）
        const ukPhonetics = [];
        const usPhonetics = [];
        
        // 逐个查询每个单词的音标
        for (const token of tokens) {
            Logger.debug('短语处理', `处理短语中的单词: "${token}"`);
            const result = await queryPhoneticSingle(token);
            
            // 提取音标内容（去除斜杠）
            let usPhonetic = result.us;
            let ukPhonetic = result.uk;
            
            // 如果音标被斜杠包围，提取内容
            if (usPhonetic !== 'Not Found' && usPhonetic.startsWith('/') && usPhonetic.endsWith('/')) {
                usPhonetic = usPhonetic.substring(1, usPhonetic.length - 1);
            }
            
            if (ukPhonetic !== 'Not Found' && ukPhonetic.startsWith('/') && ukPhonetic.endsWith('/')) {
                ukPhonetic = ukPhonetic.substring(1, ukPhonetic.length - 1);
            }
            
            Logger.debug('短语处理', `单词"${token}"的处理后音标 - 美式: ${usPhonetic}, 英式: ${ukPhonetic}`);
            
            // 只添加有效的音标（不是"Not Found"的音标）
            if (ukPhonetic !== 'Not Found') {
                ukPhonetics.push(ukPhonetic);
            }
            
            if (usPhonetic !== 'Not Found') {
                usPhonetics.push(usPhonetic);
            }
        }
        
        // 合并音标结果，并加上斜杠
        const combinedResult = {
            uk: ukPhonetics.length > 0 ? `/${ukPhonetics.join(' ')}` : 'Not Found',
            us: usPhonetics.length > 0 ? `/${usPhonetics.join(' ')}` : 'Not Found'
        };
        
        // 如果合并结果不是Not Found，确保末尾有斜杠
        if (combinedResult.uk !== 'Not Found') {
            combinedResult.uk += '/';
        }
        
        if (combinedResult.us !== 'Not Found') {
            combinedResult.us += '/';
        }
        
        Logger.info('短语处理', `短语"${originalWord}"的合并音标 - 美式: ${combinedResult.us}, 英式: ${combinedResult.uk}`);
        return combinedResult;
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
    
    // 如果缓存结果完整（两种音标都有），直接返回
    if (cachedResult && 
        cachedResult.uk !== 'Not Found' && 
        cachedResult.us !== 'Not Found') {
        Logger.debug('音标查询', `缓存完整命中: ${word}`);
        return cachedResult;
    }
    
    // 2. 查询本地词典
    const localResult = queryLocalDictionary(word);
    if (localResult && 
        localResult.uk !== 'Not Found' && 
        localResult.us !== 'Not Found') {
        // 只有当两种音标都找到时才保存到缓存
        saveToCache(word, localResult);
        return localResult;
    }
    
    // 3. 查询远程API获取最新数据
    // 即使有缓存但不完整，或者有本地结果但不完整，也查询远程API
    Logger.info('音标查询', `本地数据不完整，查询远程API: ${word}`);
    const remoteResult = await queryRemoteAPI(word);
    
    // 合并结果，优先使用远程API的结果，本地缺失的部分由远程补充
    const result = {
        uk: 'Not Found',
        us: 'Not Found'
    };
    
    // 尝试使用远程结果
    if (remoteResult.uk !== 'Not Found') result.uk = remoteResult.uk;
    if (remoteResult.us !== 'Not Found') result.us = remoteResult.us;
    
    // 如果远程结果缺失，尝试使用本地结果补充
    if (result.uk === 'Not Found' && localResult && localResult.uk !== 'Not Found') {
        result.uk = localResult.uk;
    }
    
    if (result.us === 'Not Found' && localResult && localResult.us !== 'Not Found') {
        result.us = localResult.us;
    }
    
    // 结果完整才保存到缓存
    if (result.uk !== 'Not Found' || result.us !== 'Not Found') {
        saveToCache(word, result);
        Logger.debug('音标查询', `保存合并结果到缓存: ${word} - US: ${result.us}, UK: ${result.uk}`);
    }
    
    return result;
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
        
        // 确保音标格式一致性
        const usPhonetic = phoneticData.us !== 'Not Found' ? formatPhonetic(phoneticData.us) : 'Not Found';
        const ukPhonetic = phoneticData.uk !== 'Not Found' ? formatPhonetic(phoneticData.uk) : 'Not Found';
        
        const resultItem = {
            word: item.word,
            ukPhonetic: ukPhonetic,
            usPhonetic: usPhonetic
        };
        
        Logger.debug('批量处理', `单词"${item.word}"的最终结果 - 美式: ${resultItem.usPhonetic}, 英式: ${resultItem.ukPhonetic}`);
        
        results.push(resultItem);
        
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