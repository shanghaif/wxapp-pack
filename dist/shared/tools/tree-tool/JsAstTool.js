"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const terser = require("terser");
const traverse_1 = require("@babel/traverse");
const parser = require("@babel/parser");
// 自己的库
const AstBase_1 = require("./AstBase");
// 变量
const visited = {};
/**
 * JS AST解析工具类
 */
class JsAstTool extends AstBase_1.default {
    /**
     * 获取AST树
     * @param entry    [入口路径]
     * @param wxsFiles [.wxs文件]
     */
    static getAst(entry, wxsFiles) {
        const result = {};
        // 获取解析结果
        const source = JsAstTool.getDependency(entry);
        // 过滤.wxs文件
        JsAstTool.filterWxsFiles(entry, source, wxsFiles).forEach((item) => {
            const filePath = JsAstTool.formatFilePath(item, entry, 'js');
            // 缓存中不存在，则进行递归
            if (!visited[filePath]) {
                // TODO: 怎么解决死循环的问题，暂时全部都先用空对象来解决
                visited[filePath] = {};
                visited[filePath] = JsAstTool.getAst(filePath, wxsFiles);
            }
            // 赋值
            result[filePath] = visited[filePath];
        });
        return result;
    }
    /**
     * 删除注释
     * @param js           [待删除注释的js代码]
     * @param terserConfig [JS压缩配置]
     */
    static removeComment(js, terserConfig) {
        // 压缩代码
        const { code, error, } = terser.minify(js, terserConfig);
        // 如果出现异常，直接抛出
        if (error) {
            throw error;
        }
        return code;
    }
    /**
     * 获取依赖文件
     * @param filePath [文件路径]
     */
    static getDependency(filePath) {
        // 包含wxs文件的结果
        const result = new Set();
        // 如果文件不存在，则直接返回空
        if (!fs.existsSync(filePath)) {
            return [];
        }
        // 获取文件内容
        const content = fs.readFileSync(filePath, 'utf8');
        // 生成AST树
        const ast = parser.parse(content, {
            allowImportExportEverywhere: true,
        });
        // 遍历AST树
        traverse_1.default(ast, {
            // 参考precinct库中的detective-es库（https://github.com/dependents/node-detective-es6）
            ImportDeclaration({ node }) {
                if (node.importKind === 'type') {
                    return;
                }
                // 对应引用存在才加入结果
                node.source && node.source.value && result.add(node.source.value);
            },
            ExportAllDeclaration({ node }) {
                // 对应引用存在才加入结果
                node.source && node.source.value && result.add(node.source.value);
            },
            ExportNamedDeclaration({ node }) {
                // 对应引用存在才加入结果
                node.source && node.source.value && result.add(node.source.value);
            },
            CallExpression({ node }) {
                // 对应引用存在才加入结果
                // 该分支属于动态引入import，后续如果需要开启则启用babel以下配置
                // plugins: [
                //     'dynamicImport'
                // ],
                node.callee.type === 'Import' && node.arguments.length && result.add(node.arguments[0].value);
            },
            // 参考precinct库中的detective-cjs库（https://github.com/dependents/node-detective-cjs）
            Identifier(nodePath) {
                if (nodePath.node.name === 'require') {
                    const parent = nodePath.parent;
                    // 如果类型不等于CallExpression则直接返回
                    if (parent.type !== 'CallExpression') {
                        return;
                    }
                    const { value, } = parent.arguments[0];
                    // 值存在才加入结果
                    value && result.add(value);
                }
            },
        });
        // 返回结果
        return [...result];
    }
}
exports.default = JsAstTool;
