/**
 * 日志工具类
 * 实现统一的日志记录功能
 */
class Logger {
    static LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARNING: 2,
        ERROR: 3,
        CRITICAL: 4
    };
    
    // 当前日志级别（开发时可设为DEBUG，生产环境可设为INFO或更高）
    static currentLevel = Logger.LEVELS.DEBUG;
    
    // 存储最近的日志（用于UI显示或本地存储）
    static recentLogs = [];
    static maxRecentLogs = 100;
    
    /**
     * 通用日志记录方法
     * @param {number} level - 日志级别
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static log(level, module, message) {
        if (level >= this.currentLevel) {
            const now = new Date().toISOString();
            const levelName = Object.keys(this.LEVELS).find(key => this.LEVELS[key] === level);
            const logMessage = `[${now}] [${levelName}] [${module}] - ${message}`;
            
            // 输出到控制台
            console.log(logMessage);
            
            // 存储到最近日志
            this.recentLogs.unshift({
                time: now,
                level: levelName,
                module,
                message,
                raw: logMessage
            });
            
            // 限制最近日志数量
            if (this.recentLogs.length > this.maxRecentLogs) {
                this.recentLogs.pop();
            }
            
            // 可以在这里添加将日志保存到localStorage的代码
            if (level >= Logger.LEVELS.ERROR) {
                this.saveToLocalStorage();
            }
        }
    }
    
    /**
     * 保存关键日志到localStorage
     */
    static saveToLocalStorage() {
        try {
            localStorage.setItem('appLogs', JSON.stringify(this.recentLogs.slice(0, 20)));
        } catch (e) {
            console.error('无法保存日志到localStorage', e);
        }
    }
    
    /**
     * 获取日志历史
     * @returns {Array} 日志记录数组
     */
    static getLogHistory() {
        return this.recentLogs;
    }
    
    /**
     * 清除日志历史
     */
    static clearLogHistory() {
        this.recentLogs = [];
        try {
            localStorage.removeItem('appLogs');
        } catch (e) {
            console.error('无法从localStorage清除日志', e);
        }
    }
    
    /**
     * 调试级别日志
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static debug(module, message) {
        this.log(this.LEVELS.DEBUG, module, message);
    }
    
    /**
     * 信息级别日志
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static info(module, message) {
        this.log(this.LEVELS.INFO, module, message);
    }
    
    /**
     * 警告级别日志
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static warning(module, message) {
        this.log(this.LEVELS.WARNING, module, message);
    }
    
    /**
     * 错误级别日志
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static error(module, message) {
        this.log(this.LEVELS.ERROR, module, message);
    }
    
    /**
     * 严重错误级别日志
     * @param {string} module - 模块/功能名称
     * @param {string} message - 日志消息
     */
    static critical(module, message) {
        this.log(this.LEVELS.CRITICAL, module, message);
    }
}

// 初始化时尝试从localStorage加载日志
try {
    const savedLogs = localStorage.getItem('appLogs');
    if (savedLogs) {
        Logger.recentLogs = JSON.parse(savedLogs).concat(Logger.recentLogs)
            .slice(0, Logger.maxRecentLogs);
    }
    Logger.info('初始化', '日志系统初始化完成');
} catch (e) {
    console.error('无法从localStorage加载日志', e);
    Logger.error('初始化', '加载本地日志失败: ' + e.message);
} 