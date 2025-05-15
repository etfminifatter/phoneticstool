# Excel单词音标生成器 - 日志规范

## 日志级别定义

| 级别 | 名称 | 说明 | 使用场景 |
|------|------|------|----------|
| 0 | DEBUG | 详细调试信息 | 开发阶段，记录详细的执行流程和变量值 |
| 1 | INFO | 常规信息 | 记录正常的操作流程、功能启动和完成 |
| 2 | WARNING | 警告信息 | 记录可能的问题但不影响主要功能的情况 |
| 3 | ERROR | 错误信息 | 记录阻碍功能正常执行的错误 |
| 4 | CRITICAL | 严重错误 | 记录导致应用崩溃或无法继续的严重问题 |

## 日志格式规范

每条日志应包含以下信息：
```
[时间] [级别] [模块/功能] - 具体消息
```

示例：
```
[2023-07-18 14:30:25] [INFO] [文件上传] - 开始处理上传的Excel文件：example.xlsx
[2023-07-18 14:30:26] [DEBUG] [数据提取] - 在第5行发现列名"词"
[2023-07-18 14:30:27] [WARNING] [音标查询] - 单词"uncommon"在本地词典未找到，尝试远程查询
[2023-07-18 14:30:28] [ERROR] [API请求] - 远程API请求失败：超时
```

## 各阶段日志记录要点

### 阶段一：项目搭建与基础设施

- 记录库和依赖的加载状态
- 记录配置文件的读取结果
- 记录环境变量和运行环境信息

```javascript
console.log("[INFO] [初始化] - SheetJS库加载成功，版本：x.x.x");
console.log("[DEBUG] [配置] - 当前运行环境：" + navigator.userAgent);
```

### 阶段二：前端界面开发

- 记录UI组件的初始化和挂载
- 记录用户交互事件（点击、拖拽等）
- 记录视图更新和状态变化

```javascript
console.log("[INFO] [界面] - 文件上传组件初始化完成");
console.log("[DEBUG] [交互] - 用户触发点击上传按钮事件");
```

### 阶段三：Excel文件处理功能

- 记录文件读取的开始和完成
- 记录文件大小、格式和基本信息
- 记录数据解析过程和结果
- 记录错误和异常情况

```javascript
console.log("[INFO] [文件] - 开始读取Excel文件：" + filename);
console.log("[DEBUG] [解析] - 文件大小：" + fileSize + "KB，格式：" + fileType);
console.log("[WARNING] [验证] - 文件缺少必要的列"词"");
```

### 阶段四：单词处理与音标查询

- 记录单词处理前后的状态
- 记录查询源（本地/缓存/远程）
- 记录音标查询的详细结果
- 记录性能数据（查询时间等）

```javascript
console.log("[DEBUG] [处理] - 原始单词："Hello!"，处理后："hello"");
console.log("[INFO] [查询] - 单词"hello"从本地词典查询成功");
console.log("[DEBUG] [性能] - 批量查询完成，平均每个单词耗时：" + avgTime + "ms");
```

### 阶段五：导出功能

- 记录导出过程的各个阶段
- 记录生成文件的信息（大小、行数等）
- 记录文件保存和下载状态

```javascript
console.log("[INFO] [导出] - 开始生成Excel文件");
console.log("[DEBUG] [合并] - 已处理" + processedCount + "个单词，合并完成");
console.log("[INFO] [下载] - 文件生成完成，大小：" + fileSize + "KB");
```

### 阶段六：测试与优化

- 记录测试用例的执行和结果
- 记录性能瓶颈和优化点
- 记录Bug修复过程

```javascript
console.log("[INFO] [测试] - 开始执行单元测试：音标查询模块");
console.log("[DEBUG] [性能] - 发现瓶颈：远程API查询响应时间过长");
console.log("[INFO] [修复] - Bug #12 已修复：特殊字符处理错误");
```

### 阶段七：部署与文档

- 记录部署过程和环境信息
- 记录版本信息和更新内容
- 记录用户反馈和问题

```javascript
console.log("[INFO] [部署] - 应用已部署到生产环境，版本：1.0.0");
console.log("[DEBUG] [文档] - 用户手册已更新");
```

## 日志实现方法

为了统一管理日志，建议实现一个简单的日志工具类：

```javascript
// logger.js
class Logger {
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4
  }
  
  // 当前日志级别（开发时可设为DEBUG，生产环境可设为INFO或更高）
  static currentLevel = Logger.LEVELS.DEBUG;
  
  static log(level, module, message) {
    if (level >= this.currentLevel) {
      const now = new Date().toISOString();
      const levelName = Object.keys(this.LEVELS).find(key => this.LEVELS[key] === level);
      console.log(`[${now}] [${levelName}] [${module}] - ${message}`);
      
      // 在这里可以添加将日志保存到文件或发送到服务器的代码
    }
  }
  
  static debug(module, message) {
    this.log(this.LEVELS.DEBUG, module, message);
  }
  
  static info(module, message) {
    this.log(this.LEVELS.INFO, module, message);
  }
  
  static warning(module, message) {
    this.log(this.LEVELS.WARNING, module, message);
  }
  
  static error(module, message) {
    this.log(this.LEVELS.ERROR, module, message);
  }
  
  static critical(module, message) {
    this.log(this.LEVELS.CRITICAL, module, message);
  }
}

// 使用示例
Logger.debug("文件上传", "开始处理文件：example.xlsx");
Logger.error("API请求", "远程服务器连接失败");
```

## 日志收集与查看

考虑到这是一个前端应用，有以下几种方式查看和管理日志：

1. **浏览器控制台**：开发阶段直接使用浏览器控制台查看
2. **本地存储**：将关键日志存储在localStorage，实现简单的日志历史查看
3. **日志面板**：在应用中添加一个隐藏的日志查看面板（可通过特定快捷键打开）
4. **远程收集**：对于关键错误，可以考虑发送到远程服务收集和分析

## 最佳实践

1. **适度记录**：既不要过多也不要过少，重点关注关键流程和可能出错的地方
2. **信息完整**：确保日志中包含足够的上下文信息，便于理解和排查
3. **隐私保护**：不要记录用户敏感信息
4. **性能考虑**：大量的日志可能影响性能，尤其是在生产环境中
5. **分级使用**：开发环境使用详细日志，生产环境只记录重要信息 