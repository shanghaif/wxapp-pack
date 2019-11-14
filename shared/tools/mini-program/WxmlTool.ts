// 库
import * as path from 'path';
import * as fs from 'fs-extra';
// 自己的库
import FileTool from '../FileTool';
import TreeTool from '../tree-tool';
import PromptTool from '../PromptTool';
import ProgressTool from '../ProgressTool';
// 定义
import {
    Result,
} from '../../interface';

/**
 * WXML文件工具类
 */
export default class WxmlTool {
    /**
     * 获取文件
     * @param result [编译结果对象]
     */
    public static getFiles(result: Result): void {
        // 提示
        PromptTool.info('开始解析WXML');
        // 开始解析wxml
        WxmlTool.analyze(result);
        // 停止进度条
        ProgressTool.stop();
    }

    /**
     * 复制文件到输出目录
     * @param output [输出目录]
     * @param result [编译结果]
     */
    public static async copy(output: string, { wxmlFiles }: Result): Promise<void> {
        // 获取入口
        const entry = [...wxmlFiles];

        // 提示
        PromptTool.info('开始复制WXML文件');
        // 初始化进度条
        ProgressTool.init({
            prefix: 'WXML复制进度',
            total: entry.length,
        });
        // 遍历复制
        for (let i = 0, len = entry.length; i < len; i += 1) {
            const filePath = entry[i];
            // 读取文件内容
            const content = await FileTool.readFileAsync(filePath);
            // 移除注释
            const code = TreeTool.removeComment(content, 'wxml');
            // 获取目标路径
            const target = FileTool.getCopyTargetPath(output, filePath);
            // 开始复制
            await fs.outputFile(target, code);
            // 更新进度
            ProgressTool.update();
        }
        // 停止进度条
        ProgressTool.stop();
    }

    // ------------------------------私有函数------------------------------
    /**
     * 分析文件
     * @param result [编译结果对象]
     */
    private static analyze({
        jsFiles, wxsFiles, wxmlFiles, invalidFiles,
    }: Result): void {
        // 所有待分析的入口
        const entry = new Set<string>();

        // 遍历获取所有wxml文件
        jsFiles.forEach((item) => {
            const filePath = FileTool.replaceExt(item, '.wxml');

            // 检查wxml文件是否存在
            fs.existsSync(filePath) && entry.add(filePath);
        });

        // 初始化进度条
        ProgressTool.init({
            prefix: 'WXML解析进度',
            total: entry.size,
        });

        // 遍历获取
        entry.forEach((item) => {
            // 获取依赖分析树
            TreeTool.toList(item).forEach((filePath) => {
                // 校验文件是否存在
                if (!FileTool.checkExists(item, filePath, invalidFiles)) {
                    return;
                }

                // 获取文件后缀
                const ext = path.extname(filePath);

                // 根据类型添加到对应的结果
                if (ext === '.wxs') {
                    wxsFiles.add(filePath);
                } else {
                    wxmlFiles.add(filePath);
                }
            });
            // 更新进度
            ProgressTool.update();
        });
    }
}
